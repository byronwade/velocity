// ---------------------------------------------------------------------------
// PTY sessions — the real terminal under the desktop build.
//
// Each session is a native pseudo-terminal (ConPTY on Windows, openpty on
// unix) running the user's shell. Output streams to the webview as
// `pty-output` events; xterm.js renders it and writes keystrokes back.
// The browser preview never calls these — it keeps the workspace shell.
// ---------------------------------------------------------------------------

use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;

use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

pub struct PtySession {
    writer: Box<dyn Write + Send>,
    master: Box<dyn MasterPty + Send>,
    child: Box<dyn Child + Send + Sync>,
}

#[derive(Default)]
pub struct PtyState(pub Mutex<HashMap<String, PtySession>>);

#[derive(Clone, Serialize)]
struct PtyOutput<'a> {
    id: &'a str,
    data: &'a str,
}

/// Resolve a friendly shell name to something this OS can actually run.
fn resolve_shell(shell: &str) -> String {
    #[cfg(windows)]
    {
        match shell {
            "pwsh" => "pwsh.exe".into(),
            "powershell" => "powershell.exe".into(),
            "cmd" => "cmd.exe".into(),
            // Git for Windows puts bash on PATH; zsh usually isn't a thing here.
            "bash" | "zsh" => "bash.exe".into(),
            other => other.into(),
        }
    }
    #[cfg(not(windows))]
    {
        match shell {
            "bash" => "/bin/bash".into(),
            "zsh" => "/bin/zsh".into(),
            other => other.into(),
        }
    }
}

#[tauri::command]
pub fn pty_spawn(
    app: AppHandle,
    state: State<PtyState>,
    id: String,
    shell: String,
    cols: u16,
    rows: u16,
    cwd: Option<String>,
) -> Result<(), String> {
    let pty = native_pty_system();
    let pair = pty
        .openpty(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| e.to_string())?;

    let mut cmd = CommandBuilder::new(resolve_shell(&shell));
    if let Some(dir) = cwd {
        cmd.cwd(dir);
    }
    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    drop(pair.slave);

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    // Stream output until the shell exits, then tell the frontend.
    let out_app = app.clone();
    let out_id = id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]);
                    let _ = out_app.emit("pty-output", PtyOutput { id: &out_id, data: &data });
                }
            }
        }
        let _ = out_app.emit("pty-exit", &out_id);
    });

    state
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .insert(id, PtySession { writer, master: pair.master, child });
    Ok(())
}

#[tauri::command]
pub fn pty_write(state: State<PtyState>, id: String, data: String) -> Result<(), String> {
    let mut sessions = state.0.lock().map_err(|e| e.to_string())?;
    let session = sessions.get_mut(&id).ok_or("no such session")?;
    session.writer.write_all(data.as_bytes()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pty_resize(state: State<PtyState>, id: String, cols: u16, rows: u16) -> Result<(), String> {
    let sessions = state.0.lock().map_err(|e| e.to_string())?;
    let session = sessions.get(&id).ok_or("no such session")?;
    session
        .master
        .resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pty_kill(state: State<PtyState>, id: String) {
    if let Ok(mut sessions) = state.0.lock() {
        if let Some(mut session) = sessions.remove(&id) {
            let _ = session.child.kill();
        }
    }
}
