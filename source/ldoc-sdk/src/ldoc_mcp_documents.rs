// LDOC MCP - Documents Server (Corrected)
use tiny_http::{Server, Response, Request, Header};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;

use uuid::Uuid;

#[derive(Clone, Debug, serde::Serialize)]
pub struct DocumentMeta {
    pub id: String,
    pub title: String,
    pub author: String,
}

pub struct DocumentsMcpServer {
    port: u16,
    documents: Arc<Mutex<HashMap<String, DocumentMeta>>>,
}

impl DocumentsMcpServer {
    pub fn new(port: u16) -> Self {
        Self {
            port,
            documents: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn start(&self) {
        let server = Server::http(format!("127.0.0.1:{}", self.port)).unwrap();
        println!("[MCP-Documents] Running on port {}", self.port);
        
        for mut request in server.incoming_requests() {
            let docs = Arc::clone(&self.documents);
            std::thread::spawn(move || {
                Self::handle(request, &docs);
            });
        }
    }

    fn handle(mut request: Request, documents: &Arc<Mutex<HashMap<String, DocumentMeta>>>) {
        let method = request.method().to_string();
        let path = request.url().to_string();

        let response = match (method.as_str(), path.as_str()) {
            ("POST", "/ldoc.documents.create") => {
                let body = Self::read_body(&mut request);
                let title = body["title"].as_str().unwrap_or("Doc").to_string();
                let author = body["author"].as_str().unwrap_or("Author").to_string();
                let id = format!("doc-{}", Uuid::new_v4());
                
                documents.lock().unwrap().insert(id.clone(), DocumentMeta { id: id.clone(), title, author });
                
                let resp = json!({"document_id": id, "status": "created"}).to_string();
                Response::from_string(resp).with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
            ("GET", "/ldoc.documents.list") => {
                let docs = documents.lock().unwrap();
                let list: Vec<_> = docs.values().collect();
                let resp = json!({"documents": list, "count": list.len()}).to_string();
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

    fn read_body(request: &mut Request) -> Value {
        let mut buf = Vec::new();
        let reader = request.as_reader();
        let _ = reader.read_to_end(&mut buf);
        serde_json::from_slice(&buf).unwrap_or(json!({}))
    }
}



