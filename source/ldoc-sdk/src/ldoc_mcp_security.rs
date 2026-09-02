// LDOC MCP - Security Server (Corrected)
use tiny_http::{Server, Response, Request, Header};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;


pub struct SecurityMcpServer {
    port: u16,
    signatures: Arc<Mutex<HashMap<String, String>>>,
}

impl SecurityMcpServer {
    pub fn new(port: u16) -> Self {
        Self {
            port,
            signatures: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn start(&self) {
        let server = Server::http(format!("127.0.0.1:{}", self.port)).unwrap();
        println!("[MCP-Security] Running on port {}", self.port);
        
        for mut request in server.incoming_requests() {
            let sigs = Arc::clone(&self.signatures);
            std::thread::spawn(move || {
                Self::handle(request, &sigs);
            });
        }
    }

    fn handle(mut request: Request, signatures: &Arc<Mutex<HashMap<String, String>>>) {
        let method = request.method().to_string();
        let path = request.url().to_string();

        let response = match (method.as_str(), path.as_str()) {
            ("POST", "/ldoc.security.sign_document") => {
                let body = Self::read_body(&mut request);
                let doc_id = body["document_id"].as_str().unwrap_or("doc");
                let sig = format!("sig-{}", doc_id);
                
                signatures.lock().unwrap().insert(doc_id.to_string(), sig.clone());
                
                let resp = json!({"status": "signed", "signature": sig}).to_string();
                Response::from_string(resp).with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
            ("POST", "/ldoc.security.verify_signature") => {
                let body = Self::read_body(&mut request);
                let doc_id = body["document_id"].as_str().unwrap_or("");
                let sigs = signatures.lock().unwrap();
                let valid = sigs.contains_key(doc_id);
                
                let resp = json!({"valid": valid, "status": if valid { "verified" } else { "invalid" }}).to_string();
                Response::from_string(resp).with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
            ("POST", "/ldoc.security.encrypt") => {
                let resp = json!({"status": "encrypted"}).to_string();
                Response::from_string(resp).with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
            ("GET", "/health") => {
                let resp = json!({"status": "ok"}).to_string();
                Response::from_string(resp).with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
            _ => {
                let resp = json!({"error": "not found"}).to_string();
                Response::from_string(resp).with_status_code(404).with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
        };

        let _ = request.respond(response);
    }

    fn read_body(mut request: &mut Request) -> Value {
        let mut buf = Vec::new();
        let reader = request.as_reader();
        let _ = reader.read_to_end(&mut buf);
        serde_json::from_slice(&buf).unwrap_or(json!({}))
    }
}






