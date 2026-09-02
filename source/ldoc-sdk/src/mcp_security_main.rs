// Security MCP Server Main Entry Point

mod security_mcp {
    include!("ldoc_mcp_security.rs");
}

use security_mcp::SecurityMcpServer;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let port = if args.len() > 2 && args[1] == "--port" {
        args[2].parse::<u16>().unwrap_or(7003)
    } else {
        7003
    };

    println!("╔════════════════════════════════════════════╗");
    println!("║  LDOC Security MCP Server                 ║");
    println!("║  Starting on port {}                      ║", port);
    println!("╚════════════════════════════════════════════╝");
    println!();

    let server = SecurityMcpServer::new(port);
    server.start();
}

