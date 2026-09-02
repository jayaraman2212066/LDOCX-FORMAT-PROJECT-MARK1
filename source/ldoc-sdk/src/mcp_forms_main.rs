// Forms MCP Server Main Entry Point

mod forms_mcp {
    include!("ldoc_mcp_forms.rs");
}

use forms_mcp::FormsMcpServer;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let port = if args.len() > 2 && args[1] == "--port" {
        args[2].parse::<u16>().unwrap_or(7004)
    } else {
        7004
    };

    println!("╔════════════════════════════════════════════╗");
    println!("║  LDOC Forms MCP Server                    ║");
    println!("║  Starting on port {}                      ║", port);
    println!("╚════════════════════════════════════════════╝");
    println!();

    let server = FormsMcpServer::new(port);
    server.start();
}

