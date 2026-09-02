// LDOC MCP - Forms Server (Corrected)
use tiny_http::{Server, Response, Request, Header};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;

use uuid::Uuid;

pub struct FormsMcpServer {
    port: u16,
    forms: Arc<Mutex<HashMap<String, String>>>,
}

impl FormsMcpServer {
    pub fn new(port: u16) -> Self {
        Self {
            port,
            forms: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn start(&self) {
        let server = Server::http(format!("127.0.0.1:{}", self.port)).unwrap();
        println!("[MCP-Forms] Running on port {}", self.port);
        
        for mut request in server.incoming_requests() {
            let forms = Arc::clone(&self.forms);
            std::thread::spawn(move || {
                Self::handle(request, &forms);
            });
        }
    }

    fn handle(mut request: Request, forms: &Arc<Mutex<HashMap<String, String>>>) {
        let method = request.method().to_string();
        let path = request.url().to_string();

        let response = match (method.as_str(), path.as_str()) {
            ("POST", "/ldoc.forms.create") => {
                let body = Self::read_body(&mut request);
                let title = body["title"].as_str().unwrap_or("Form");
                let id = format!("form-{}", Uuid::new_v4());
                
                forms.lock().unwrap().insert(id.clone(), title.to_string());
                
                let resp = json!({"form_id": id, "status": "created"}).to_string();
                Response::from_string(resp).with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
            ("GET", "/ldoc.forms.list") => {
                let forms_lock = forms.lock().unwrap();
                let list: Vec<_> = forms_lock.keys().collect();
                let resp = json!({"forms": list, "count": list.len()}).to_string();
                Response::from_string(resp).with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
            ("POST", "/ldoc.forms.submit") => {
                let resp = json!({"status": "submitted"}).to_string();
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






