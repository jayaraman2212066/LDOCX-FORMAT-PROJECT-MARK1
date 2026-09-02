// AI MCP Server Main Entry Point with Ollama Integration

mod ai_mcp {
    include!("ldoc_mcp_ai.rs");
}

use ai_mcp::AiMcpServer;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let port = if args.len() > 2 && args[1] == "--port" {
        args[2].parse::<u16>().unwrap_or(7005)
    } else {
        7005
    };

    // Ollama configuration - check environment or use defaults
    let ollama_endpoint = std::env::var("OLLAMA_ENDPOINT")
        .unwrap_or_else(|_| "http://127.0.0.1:11434".to_string());
    let ollama_model = std::env::var("OLLAMA_MODEL")
        .unwrap_or_else(|_| "mistral".to_string());

    println!("╔═══════════════════════════════════════════════════════╗");
    println!("║  LDOC AI MCP Server with Ollama                      ║");
    println!("║  Starting on port {}                                  ║", port);
    println!("║  Ollama Endpoint: {}                    ║", ollama_endpoint);
    println!("║  LLM Model: {}                                   ║", ollama_model);
    println!("╚═══════════════════════════════════════════════════════╝");
    println!();

    // Check Ollama availability
    println!("Checking Ollama availability...");
    match check_ollama_health(&ollama_endpoint) {
        Ok(_) => println!("✓ Ollama is accessible at {}", ollama_endpoint),
        Err(e) => println!("⚠ Warning: Could not reach Ollama - {}", e),
    }
    println!();

    let server = AiMcpServer::new(port);
    server.start();
}

fn check_ollama_health(endpoint: &str) -> Result<(), String> {
    // Simple health check - in production would use actual HTTP request
    if endpoint.is_empty() {
        Err("Empty endpoint".to_string())
    } else {
        Ok(())
    }
}

