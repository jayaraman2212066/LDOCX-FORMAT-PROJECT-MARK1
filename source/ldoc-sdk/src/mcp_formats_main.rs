// Formats MCP Server Main Entry Point

mod formats_mcp {
    include!("ldoc_mcp_formats.rs");
}

use formats_mcp::FormatsMcpServer;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let port = if args.len() > 2 && args[1] == "--port" {
        args[2].parse::<u16>().unwrap_or(7002)
    } else {
        7002
    };

    println!("╔════════════════════════════════════════════╗");
    println!("║  LDOC Formats MCP Server                  ║");
    println!("║  Starting on port {}                      ║", port);
    println!("╚════════════════════════════════════════════╝");
    println!();

    let server = FormatsMcpServer::new(port);
    server.start();
}

