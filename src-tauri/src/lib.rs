mod pty;

use tauri::Manager;

/// The tray reflects how much needs the human: the frontend calls this
/// whenever the cross-project inbox count changes.
#[tauri::command]
fn set_attention_count(app: tauri::AppHandle, count: u32) {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let tip = if count == 0 {
            "Velocity — all clear".to_string()
        } else {
            format!("Velocity — {count} need you")
        };
        let _ = tray.set_tooltip(Some(tip.as_str()));
    }
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Ollama requests use Tauri's Rust HTTP client in the desktop build.
        // Its capability is deliberately restricted to the local Ollama port.
        .plugin(tauri_plugin_http::init())
        // Real project access: open a folder from disk and read/write it. The
        // filesystem scope is broad because the user explicitly picks the folder
        // (this is their machine and their code — same trust model as any editor).
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        // Native banners for "checkpoint ready" — the web Notification API is
        // the fallback in the browser preview (see src/velocity/notify.ts).
        .plugin(tauri_plugin_notification::init())
        // Remember window size/position across launches.
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(pty::PtyState::default())
        .invoke_handler(tauri::generate_handler![
            set_attention_count,
            pty::pty_spawn,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_kill
        ])
        .setup(|app| {
            // Tray: a persistent presence with an attention tooltip.
            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::TrayIconBuilder;
            let open = MenuItem::with_id(app, "open", "Open Velocity", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &quit])?;
            TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().expect("bundled icon").clone())
                .menu(&menu)
                .tooltip("Velocity")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            // Global shortcut: summon Velocity from anywhere.
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::ShortcutState;
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_shortcuts(["CommandOrControl+Shift+V"])?
                        .with_handler(|app, _shortcut, event| {
                            if event.state() == ShortcutState::Pressed {
                                show_main(app);
                            }
                        })
                        .build(),
                )?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Velocity");
}
