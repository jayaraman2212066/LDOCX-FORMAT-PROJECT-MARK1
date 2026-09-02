use std::env;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

#[derive(Debug, Clone)]
struct LauncherConfig {
    studio_port: u16,
    ai_port: u16,
    ollama_port: u16,
    model: String,
    auto_kill: bool,
    no_browser: bool,
}

fn print_banner() {
    println!("╔══════════════════════════════════════════════════════════╗");
    println!("║         LDOC ONE-CLICK LAUNCHER                     ║");
    println!("╚══════════════════════════════════════════════════════════╝");
}

fn find_free_port(start: u16, tries: u16) -> Result<u16, String> {
    for port in start..start + tries {
        if !port_in_use(port) {
            return Ok(port);
        }
    }
    Err(format!(
        "No free port found in range {}..{}",
        start,
        start + tries - 1
    ))
}

fn port_in_use(port: u16) -> bool {
    TcpListener::bind(("127.0.0.1", port)).is_err()
}

fn kill_processes(names: &[&str]) {
    for name in names {
        let _ = Command::new("cmd")
            .args(["/C", "taskkill", "/F", "/IM", name, "/T"])
            .output();
    }
}

fn parse_args() -> Result<LauncherConfig, String> {
    let mut studio_port = 8080u16;
    let mut ai_port = 7005u16;
    let mut ollama_port = 11434u16;
    let mut model = "mistral".to_string();
    let mut auto_kill = true;
    let mut no_browser = false;

    let args: Vec<String> = env::args().skip(1).collect();
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--studio-port" => {
                studio_port = args.get(i + 1)
                    .ok_or_else(|| "Missing value for --studio-port".to_string())?
                    .parse()
                    .map_err(|_| format!("Invalid studio port: {}", args[i + 1]))?;
                i += 2;
            }
            "--ai-port" => {
                ai_port = args.get(i + 1)
                    .ok_or_else(|| "Missing value for --ai-port".to_string())?
                    .parse()
                    .map_err(|_| format!("Invalid AI port: {}", args[i + 1]))?;
                i += 2;
            }
            "--ollama-port" => {
                ollama_port = args.get(i + 1)
                    .ok_or_else(|| "Missing value for --ollama-port".to_string())?
                    .parse()
                    .map_err(|_| format!("Invalid Ollama port: {}", args[i + 1]))?;
                i += 2;
            }
            "--model" => {
                model = args.get(i + 1)
                    .ok_or_else(|| "Missing value for --model".to_string())?
                    .clone();
                i += 2;
            }
            "--no-kill" => {
                auto_kill = false;
                i += 1;
            }
            "--no-browser" => {
                no_browser = true;
                i += 1;
            }
            "--help" | "-h" => {
                print_help();
                std::process::exit(0);
            }
            _ => {
                return Err(format!("Unknown argument: {}", args[i]));
            }
        }
    }

    Ok(LauncherConfig {
        studio_port,
        ai_port,
        ollama_port,
        model,
        auto_kill,
        no_browser,
    })
}

fn print_help() {
    println!("LDOC launcher usage:");
    println!("  ldoc-launcher [--studio-port 8080] [--ai-port 7005] [--ollama-port 11434] [--model mistral] [--no-kill] [--no-browser]");
    println!();
    println!("Notes:");
    println!("  - stale ldoc processes are auto-killed by default");
    println!("  - when a requested port is busy, the launcher picks the next free port automatically");
    println!("  - if startup fails, it exits with a clear error and leaves a clean state");
}

fn default_ollama_path() -> Option<PathBuf> {
    let candidates = [
        PathBuf::from(r"C:\Users\JAYARAMAN K\AppData\Local\Programs\Ollama\ollama.exe"),
        PathBuf::from(r"C:\Program Files\Ollama\ollama.exe"),
        PathBuf::from(r"C:\Program Files (x86)\Ollama\ollama.exe"),
    ];
    candidates.into_iter().find(|p| p.exists())
}

fn default_binary_dir() -> PathBuf {
    let exe = env::current_exe().expect("cannot read current exe");
    exe.parent().unwrap_or(Path::new(".")).to_path_buf()
}

fn wait_for_tcp(port: u16, timeout: Duration) -> bool {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return true;
        }
        thread::sleep(Duration::from_millis(250));
    }
    false
}

fn http_get_status(url: &str, timeout: Duration) -> Result<u16, String> {
    let start = Instant::now();
    while start.elapsed() < timeout {
        match TcpStream::connect("127.0.0.1:8080") {
            Ok(mut stream) => {
                let request = format!(
                    "GET {} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n",
                    url.strip_prefix("http://127.0.0.1").unwrap_or(url)
                );
                if stream.write_all(request.as_bytes()).is_ok() {
                    let mut buf = [0u8; 512];
                    let _ = stream.read(&mut buf);
                    let text = String::from_utf8_lossy(&buf);
                    if let Some(code) = text.split_whitespace().nth(1) {
                        return code.parse::<u16>().map_err(|_| format!("Bad HTTP status: {}", code));
                    }
                }
            }
            Err(_) => {}
        }
        thread::sleep(Duration::from_millis(250));
    }
    Err(format!("Timed out waiting for {}", url))
}

fn http_status_for_port(port: u16, path: &str, timeout: Duration) -> Result<u16, String> {
    let start = Instant::now();
    while start.elapsed() < timeout {
        match TcpStream::connect(("127.0.0.1", port)) {
            Ok(mut stream) => {
                let request = format!(
                    "GET {} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n",
                    path
                );
                if stream.write_all(request.as_bytes()).is_ok() {
                    let mut buf = [0u8; 1024];
                    let _ = stream.read(&mut buf);
                    let text = String::from_utf8_lossy(&buf);
                    if let Some(code) = text.split_whitespace().nth(1) {
                        return code.parse::<u16>().map_err(|_| format!("Bad HTTP status: {}", code));
                    }
                }
            }
            Err(_) => {}
        }
        thread::sleep(Duration::from_millis(250));
    }
    Err(format!("Timed out waiting for port {}{}", port, path))
}

fn start_process(bin: &Path, args: &[&str], envs: &[(&str, &str)]) -> Result<Child, String> {
    let mut command = Command::new(bin);
    command.args(args);
    command.stdin(Stdio::null());
    command.stdout(Stdio::inherit());
    command.stderr(Stdio::inherit());
    for (k, v) in envs {
        command.env(k, v);
    }
    command.spawn().map_err(|e| format!("Failed to start {}: {}", bin.display(), e))
}

fn cleanup_known_processes() {
    kill_processes(&["ldoc-server.exe", "ldoc-mcp-ai.exe", "ollama.exe"]);
    thread::sleep(Duration::from_secs(2));
}

fn ensure_ollama_running(port: u16, model: &str) -> Result<(), String> {
    let ollama_path = default_ollama_path().ok_or_else(|| {
        "Ollama executable not found. Install Ollama and make sure it is available at the default Windows location.".to_string()
    })?;

    if port_in_use(port) {
        println!("[launcher] Port {} is in use. Trying to free Ollama port.", port);
        kill_processes(&["ollama.exe"]);
        thread::sleep(Duration::from_secs(2));
    }

    if !wait_for_tcp(port, Duration::from_secs(5)) {
        println!("[launcher] Starting Ollama service...");
        let mut cmd = Command::new(&ollama_path);
        cmd.arg("serve");
        cmd.env("OLLAMA_HOST", format!("http://127.0.0.1:{}", port));
        cmd.stdin(Stdio::null());
        cmd.stdout(Stdio::inherit());
        cmd.stderr(Stdio::inherit());
        let _ = cmd.spawn().map_err(|e| format!("Failed to start Ollama: {}", e))?;
    }

    if !wait_for_tcp(port, Duration::from_secs(15)) {
        return Err(format!("Ollama did not become ready on port {}", port));
    }

    println!("[launcher] Ollama ready on http://127.0.0.1:{}/", port);
    println!("[launcher] Active model: {}", model);
    Ok(())
}

fn ensure_ai_service(ai_port: u16, bind_dir: &Path) -> Result<Child, String> {
    let ai_path = bind_dir.join("ldoc-mcp-ai.exe");
    if !ai_path.exists() {
        return Err(format!(
            "AI service binary not found: {}\nPlease build the project with cargo build --release first.",
            ai_path.display()
        ));
    }

    if port_in_use(ai_port) {
        println!("[launcher] AI port {} is busy; using next free port.", ai_port);
    }

    let resolved_port = if port_in_use(ai_port) {
        find_free_port(ai_port, 25)?
    } else {
        ai_port
    };

    let child = start_process(
        &ai_path,
        &["--port", &resolved_port.to_string()],
        &[("OLLAMA_ENDPOINT", "http://127.0.0.1:11434"), ("OLLAMA_MODEL", "mistral")],
    )?;

    if !wait_for_tcp(resolved_port, Duration::from_secs(12)) {
        return Err(format!("AI service did not bind to port {}", resolved_port));
    }

    Ok(child)
}

fn ensure_studio_service(studio_port: u16, bind_dir: &Path, no_browser: bool) -> Result<Child, String> {
    let studio_path = bind_dir.join("ldoc-server.exe");
    if !studio_path.exists() {
        return Err(format!(
            "Studio binary not found: {}\nPlease build the project with cargo build --release first.",
            studio_path.display()
        ));
    }

    let resolved_port = if port_in_use(studio_port) {
        find_free_port(studio_port, 25)?
    } else {
        studio_port
    };

    let mut cmd = Command::new(&studio_path);
    cmd.env("LDOC_PORT", resolved_port.to_string());
    if no_browser {
        cmd.env("LDOC_NO_BROWSER", "1");
    }
    cmd.stdin(Stdio::null());
    cmd.stdout(Stdio::inherit());
    cmd.stderr(Stdio::inherit());
    let child = cmd.spawn().map_err(|e| format!("Failed to start Studio: {}", e))?;

    if !wait_for_tcp(resolved_port, Duration::from_secs(15)) {
        return Err(format!("Studio did not bind to port {}", resolved_port));
    }

    Ok(child)
}

fn main() {
    print_banner();
    let config = match parse_args() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[launcher] ERROR: {}", e);
            print_help();
            std::process::exit(1);
        }
    };

    let bind_dir = default_binary_dir();
    println!("[launcher] Binary directory: {}", bind_dir.display());

    if config.auto_kill {
        cleanup_known_processes();
    }

    let resolved_ai_port = match find_free_port(config.ai_port, 20) {
        Ok(p) => p,
        Err(err) => {
            eprintln!("[launcher] ERROR: {}", err);
            std::process::exit(1);
        }
    };

    let resolved_studio_port = match find_free_port(config.studio_port, 20) {
        Ok(p) => p,
        Err(err) => {
            eprintln!("[launcher] ERROR: {}", err);
            std::process::exit(1);
        }
    };

    if resolved_ai_port != config.ai_port {
        println!("[launcher] Requested AI port {} is busy; using {} instead.", config.ai_port, resolved_ai_port);
    }
    if resolved_studio_port != config.studio_port {
        println!("[launcher] Requested Studio port {} is busy; using {} instead.", config.studio_port, resolved_studio_port);
    }

    if let Err(err) = ensure_ollama_running(config.ollama_port, &config.model) {
        eprintln!("[launcher] ERROR: {}", err);
        eprintln!("[launcher] Fallback: install Ollama or run 'ollama pull mistral' before starting LDOC.");
        std::process::exit(1);
    }

    let mut ai_child = match ensure_ai_service(resolved_ai_port, &bind_dir) {
        Ok(child) => child,
        Err(err) => {
            eprintln!("[launcher] ERROR: {}", err);
            if config.auto_kill {
                kill_processes(&["ldoc-server.exe", "ldoc-mcp-ai.exe", "ollama.exe"]);
            }
            std::process::exit(1);
        }
    };

    let mut studio_child = match ensure_studio_service(resolved_studio_port, &bind_dir, config.no_browser) {
        Ok(child) => child,
        Err(err) => {
            eprintln!("[launcher] ERROR: {}", err);
            if config.auto_kill {
                let _ = ai_child.kill();
                kill_processes(&["ldoc-server.exe", "ldoc-mcp-ai.exe", "ollama.exe"]);
            }
            std::process::exit(1);
        }
    };

    println!("════════════════════════════════════════════════════");
    println!("✅ LDOC launched successfully");
    println!("   Studio: http://127.0.0.1:{}/", resolved_studio_port);
    println!("   AI:     http://127.0.0.1:{}/health", resolved_ai_port);
    println!("   Ollama: http://127.0.0.1:{}/", config.ollama_port);
    println!("════════════════════════════════════════════════════");

    let _ = (ai_child, studio_child);
    loop {
        thread::sleep(Duration::from_secs(60));
    }
}

#[cfg(test)]
mod tests {
    use super::find_free_port;
    use std::net::TcpListener;

    #[test]
    fn port_finder_uses_next_available_port() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let used = listener.local_addr().unwrap().port();
        let next = find_free_port(used, 10).unwrap();
        assert_ne!(next, used);
    }
}
