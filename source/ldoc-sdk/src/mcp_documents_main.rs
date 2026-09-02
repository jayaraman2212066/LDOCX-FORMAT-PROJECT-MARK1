// Documents MCP Server Main Entry Point
// Include the module from the same directory and start the server

mod documents_mcp {
    include!("ldoc_mcp_documents.rs");
}

use documents_mcp::DocumentsMcpServer;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let port = if args.len() > 2 && args[1] == "--port" {
        args[2].parse::<u16>().unwrap_or(7001)
    } else {
        7001
    };

    println!("╔════════════════════════════════════════════╗");
    println!("║  LDOC Documents MCP Server                ║");
    println!("║  Starting on port {}                      ║", port);
    println!("╚════════════════════════════════════════════╝");
    println!();

    let server = DocumentsMcpServer::new(port);
    server.start();
}
