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
        .run(tauri::generate_context!())
        .expect("error while running Velocity");
}
