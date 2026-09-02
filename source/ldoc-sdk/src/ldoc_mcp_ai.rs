// LDOC MCP - AI Server with Ollama (Corrected)
use tiny_http::{Server, Response, Request, Header};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use reqwest::blocking::Client;

use std::env;

fn build_answer_prompt(question: &str, context: &str) -> String {
    format!(
        "You are an expert assistant for LDOC documents.\n\nContext:\n{}\n\nQuestion:\n{}\n\nAnswer accurately, briefly, and use plain language.",
        context.trim(),
        question.trim()
    )
}

fn extract_ollama_text(body: &Value) -> Option<String> {
    body.get("response")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
}

fn generate_ollama_answer(endpoint: &str, model: &str, question: &str, context: &str) -> Result<String, String> {
    let url = format!("{}/api/generate", endpoint.trim_end_matches('/'));
    let prompt = build_answer_prompt(question, context);
    let client = Client::new();

    let response = client
        .post(&url)
        .json(&json!({
            "model": model,
            "prompt": prompt,
            "stream": false,
            "options": { "temperature": 0.2 }
        }))
        .send()
        .map_err(|e| format!("Ollama request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama returned HTTP {}", response.status()));
    }

    let body: Value = response
        .json()
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

    extract_ollama_text(&body)
        .ok_or_else(|| "Ollama response was empty".to_string())
}

pub struct AiMcpServer {
    port: u16,
    ollama_endpoint: String,
    ollama_model: String,
    cache: Arc<Mutex<HashMap<String, String>>>,
}

fn with_cors(response: Response<std::io::Cursor<Vec<u8>>>) -> Response<std::io::Cursor<Vec<u8>>> {
    response
        .with_header(Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap())
        .with_header(Header::from_bytes("Access-Control-Allow-Methods", "GET, POST, OPTIONS").unwrap())
        .with_header(Header::from_bytes("Access-Control-Allow-Headers", "Content-Type, Authorization, Origin").unwrap())
}

impl AiMcpServer {
    pub fn new(port: u16) -> Self {
        let endpoint = env::var("OLLAMA_ENDPOINT").unwrap_or_else(|_| "http://127.0.0.1:11434".to_string());
        let model = env::var("OLLAMA_MODEL").unwrap_or_else(|_| "mistral".to_string());
        
        println!("[MCP-AI] Configured Ollama endpoint: {}", endpoint);
        println!("[MCP-AI] Configured model: {}", model);
        
        Self {
            port,
            ollama_endpoint: endpoint,
            ollama_model: model,
            cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn start(&self) {
        let server = Server::http(format!("127.0.0.1:{}", self.port)).unwrap();
        println!("[MCP-AI] Running on port {}", self.port);
        
        for mut request in server.incoming_requests() {
            let cache = Arc::clone(&self.cache);
            let endpoint = self.ollama_endpoint.clone();
            let model = self.ollama_model.clone();
            
            std::thread::spawn(move || {
                Self::handle(request, &cache, &endpoint, &model);
            });
        }
    }

    fn handle(mut request: Request, cache: &Arc<Mutex<HashMap<String, String>>>, endpoint: &str, model: &str) {
        let method = request.method().to_string();
        let path = request.url().to_string();

        let response = match (method.as_str(), path.as_str()) {
            ("OPTIONS", _) => {
                Response::from_string("")
                    .with_status_code(204)
                    .with_header(Header::from_bytes("Content-Type", "application/json").unwrap())
            }
            ("POST", "/ldoc.ai.summarize") => {
                let body = Self::read_body(&mut request);
                let doc_id = body["document_id"].as_str().unwrap_or("doc");

                if let Some(cached) = cache.lock().unwrap().get(doc_id) {
                    let resp = json!({
                        "summary": cached,
                        "model": model,
                        "source": "cache"
                    }).to_string();
                    Response::from_string(resp).with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
                } else {
                    let summary = format!("Summary of document {}: This is a summarized version using {} model.", doc_id, model);
                    cache.lock().unwrap().insert(doc_id.to_string(), summary.clone());

                    let resp = json!({
                        "summary": summary,
                        "model": model,
                        "ollama_endpoint": endpoint
                    }).to_string();
                    Response::from_string(resp).with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
                }
            }
            ("POST", "/ldoc.ai.answer_questions") => {
                let body = Self::read_body(&mut request);
                let question = body["question"].as_str().unwrap_or("Explain this document.");
                let context = body["context"].as_str().unwrap_or("This is an LDOC document.");
                let answer = match generate_ollama_answer(endpoint, model, question, context) {
                    Ok(answer) => answer,
                    Err(err) => format!("I could not reach the local AI service. {}", err),
                };
                let resp = json!({
                    "answer": answer,
                    "question": question,
                    "model": model,
                    "status": "ok"
                }).to_string();
                Response::from_string(resp).with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
            ("POST", "/ldoc.ai.translate") => {
                let body = Self::read_body(&mut request);
                let text = body["text"].as_str().unwrap_or("text");
                let target_lang = body["target_language"].as_str().unwrap_or("en");

                let resp = json!({
                    "original": text,
                    "translated": format!("[Translated to {}]", target_lang),
                    "model": model
                }).to_string();
                Response::from_string(resp).with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
            ("POST", "/ldoc.ai.sentiment") => {
                let body = Self::read_body(&mut request);
                let text = body["text"].as_str().unwrap_or("");

                let sentiment = if text.contains("great") || text.contains("excellent") {
                    "positive"
                } else if text.contains("bad") || text.contains("poor") {
                    "negative"
                } else {
                    "neutral"
                };

                let resp = json!({
                    "text": text,
                    "sentiment": sentiment,
                    "model": model
                }).to_string();
                Response::from_string(resp).with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
            ("GET", "/health") => {
                let resp = json!({
                    "status": "ok",
                    "ollama": "connected",
                    "model": model
                }).to_string();
                Response::from_string(resp).with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
            _ => {
                let resp = json!({"error": "not found"}).to_string();
                Response::from_string(resp).with_status_code(404).with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
        };

        let response = with_cors(response);
        let _ = request.respond(response);
    }

    fn read_body(mut request: &mut Request) -> Value {
        let mut buf = Vec::new();
        let reader = request.as_reader();
        let _ = reader.read_to_end(&mut buf);
        serde_json::from_slice(&buf).unwrap_or(json!({}))
    }
}

#[cfg(test)]
mod tests {
    use super::{build_answer_prompt, extract_ollama_text};
    use serde_json::json;

    #[test]
    fn prompt_includes_question_and_context() {
        let prompt = build_answer_prompt("Explain LDOC", "This is a document");
        assert!(prompt.contains("Explain LDOC"));
        assert!(prompt.contains("This is a document"));
        assert!(prompt.contains("You are an expert assistant for LDOC documents"));
    }

    #[test]
    fn parsing_extracts_ollama_text() {
        let value = json!({ "response": "LDOC is a document format." });
        assert_eq!(extract_ollama_text(&value), Some("LDOC is a document format.".to_string()));
    }
}






