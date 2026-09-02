// src/tauri_main.rs
// LDOC Desktop App - Tauri entry point
// Launches the LDOC server and opens the UI in a native window

use std::process::Command;
use std::time::Duration;
use std::thread;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

fn main() {
    tauri::Builder::default()
        .setup(|_app| {
            // Start the LDOC server as a background process
            let server_path = std::env::current_exe()?
                .parent()
                .unwrap()
                .join("ldoc-server.exe");

            if server_path.exists() {
                println!("[Tauri] Starting LDOC server from: {}", server_path.display());
                let mut cmd = Command::new(&server_path);
                #[cfg(target_os = "windows")]
                cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
                let _server = cmd.spawn()
                    .expect("Failed to start LDOC server");
                
                // Wait for server to be ready
                thread::sleep(Duration::from_millis(2000));
            } else {
                eprintln!("[Tauri] Server not found at: {}", server_path.display());
            }

            Ok(())
        })
        .on_window_event(|event| {
            match event.event() {
                tauri::WindowEvent::Destroyed => {
                    // Kill any remaining server processes
                    let _ = Command::new("taskkill")
                        .args(&["/IM", "ldoc-server.exe", "/F"])
                        .output();
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
