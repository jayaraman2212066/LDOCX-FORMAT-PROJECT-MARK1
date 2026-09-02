// LDOC Studio Server — robust launcher with port fallback and self-checks

use std::net::TcpListener;

fn find_free_port(preferred: u16) -> u16 {
    // Try preferred port first, then scan upward
    for port in preferred..preferred + 20 {
        if TcpListener::bind(format!("127.0.0.1:{}", port)).is_ok() {
            return port;
        }
    }
    // Last resort: let OS assign
    let l = TcpListener::bind("127.0.0.1:0").expect("Cannot bind any port");
    l.local_addr().unwrap().port()
}

fn open_browser(url: &str) {
    #[cfg(target_os = "windows")]
    { let _ = std::process::Command::new("cmd").args(["/c", "start", url]).spawn(); }
    #[cfg(target_os = "macos")]
    { let _ = std::process::Command::new("open").arg(url).spawn(); }
    #[cfg(target_os = "linux")]
    { let _ = std::process::Command::new("xdg-open").arg(url).spawn(); }
}

fn main() {
    // ── Locate exe directory ──────────────────────────────────────────────────
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    // ── Viewer folder check ───────────────────────────────────────────────────
    let viewer_dir = exe_dir.join("viewer");
    let viewer_index = viewer_dir.join("index.html");
    if !viewer_index.exists() {
        eprintln!("[LDOC] ERROR: viewer/index.html not found next to ldoc-server.exe");
        eprintln!("[LDOC] Expected: {}", viewer_index.display());
        eprintln!("[LDOC] Make sure the 'viewer' folder is in the same directory as ldoc-server.exe");
        #[cfg(target_os = "windows")]
        {
            // Keep window open so user can read the error
            eprintln!("\nPress Enter to exit...");
            let mut s = String::new();
            let _ = std::io::stdin().read_line(&mut s);
        }
        std::process::exit(1);
    }

    // ── Port selection ────────────────────────────────────────────────────────
    let preferred: u16 = std::env::var("LDOC_PORT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(8080);
    let port = find_free_port(preferred);
    if port != preferred {
        eprintln!("[LDOC] Port {} in use, using port {} instead", preferred, port);
    }
    let addr = format!("127.0.0.1:{}", port);

    // ── Start server ──────────────────────────────────────────────────────────
    let viewer_dir_str = viewer_dir.to_string_lossy().to_string();
    let (bound, _handle) = match ldoc_sdk::server::try_start_server(&addr, Some(viewer_dir_str)) {
        Ok(r) => r,
        Err(e) => {
            eprintln!("[LDOC] Failed to start server: {}", e);
            eprintln!("[LDOC] Try setting LDOC_PORT=9090 environment variable to use a different port");
            #[cfg(target_os = "windows")]
            {
                eprintln!("\nPress Enter to exit...");
                let mut s = String::new();
                let _ = std::io::stdin().read_line(&mut s);
            }
            std::process::exit(1);
        }
    };

    // ── Print info ────────────────────────────────────────────────────────────
    eprintln!("╔══════════════════════════════════════════╗");
    eprintln!("║          LDOC Studio  v1.0               ║");
    eprintln!("╠══════════════════════════════════════════╣");
    eprintln!("║  Viewer : http://{:<24} ║", format!("{}/", bound));
    eprintln!("║  Creator: http://{:<24} ║", format!("{}/creator", bound));
    eprintln!("║  API    : http://{:<24} ║", format!("{}/documents", bound));
    eprintln!("║  WS     : ws://{:<26} ║", format!("127.0.0.1:{}/ws", port));
    eprintln!("╚══════════════════════════════════════════╝");
    eprintln!("[LDOC] Opening browser...");

    // ── Open browser ─────────────────────────────────────────────────────────
    let url = format!("http://{}/", bound);
    // Small delay so server is ready before browser hits it
    std::thread::sleep(std::time::Duration::from_millis(300));
    open_browser(&url);

    eprintln!("[LDOC] Server running. Close this window to stop.");
    loop { std::thread::sleep(std::time::Duration::from_secs(3600)); }
}
