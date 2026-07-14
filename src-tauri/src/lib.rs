#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Ollama requests use Tauri's Rust HTTP client in the desktop build.
        // Its capability is deliberately restricted to the local Ollama port.
        .plugin(tauri_plugin_http::init())
        .run(tauri::generate_context!())
        .expect("error while running Velocity");
}
