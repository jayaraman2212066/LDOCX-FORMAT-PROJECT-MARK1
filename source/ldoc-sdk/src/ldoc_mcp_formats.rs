// LDOC MCP - Formats Server (Corrected)
use tiny_http::{Server, Response, Request, Header};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;

use uuid::Uuid;

pub struct FormatsMcpServer {
    port: u16,
    conversions: Arc<Mutex<HashMap<String, String>>>,
}

impl FormatsMcpServer {
    pub fn new(port: u16) -> Self {
        Self {
            port,
            conversions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn start(&self) {
        let server = Server::http(format!("127.0.0.1:{}", self.port)).unwrap();
        println!("[MCP-Formats] Running on port {}", self.port);
        
        for mut request in server.incoming_requests() {
            let convs = Arc::clone(&self.conversions);
            std::thread::spawn(move || {
                Self::handle(request, &convs);
            });
        }
    }

    fn handle(mut request: Request, conversions: &Arc<Mutex<HashMap<String, String>>>) {
        let method = request.method().to_string();
        let path = request.url().to_string();

        let response = match (method.as_str(), path.as_str()) {
            ("GET", "/ldoc.formats.list") => {
                let formats = json!({
                    "formats": ["pdf", "docx", "glb", "usdz", "stl", "fbx"],
                    "count": 6
                }).to_string();
                Response::from_string(formats).with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
            ("POST", "/ldoc.formats.convert") => {
                let body = Self::read_body(&mut request);
                let from_fmt = body["from_format"].as_str().unwrap_or("pdf");
                let to_fmt = body["to_format"].as_str().unwrap_or("docx");
                let id = format!("conv-{}", Uuid::new_v4());
                
                conversions.lock().unwrap().insert(id.clone(), format!("{}->{}", from_fmt, to_fmt));
                
                let resp = json!({"conversion_id": id, "status": "started"}).to_string();
                Response::from_string(resp).with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
            ("POST", "/ldoc.formats.export") => {
                let body = Self::read_body(&mut request);
                let target = body["target_format"].as_str().unwrap_or("pdf");
                let resp = json!({"status": "exported", "format": target}).to_string();
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






