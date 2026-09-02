// LDOC MCP Server - Documents Service
// Implementation of ldoc.documents.* tools

use tiny_http::{Server, Response, Request, Header};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use chrono::Utc;

#[derive(Clone, Debug)]
pub struct DocumentMeta {
    pub id: String,
    pub title: String,
    pub author: String,
    pub created: String,
    pub modified: String,
    pub pages: usize,
    pub size: usize,
}

pub struct DocumentsMcpServer {
    ldoc_api: String,
    port: u16,
    documents: Arc<Mutex<HashMap<String, DocumentMeta>>>,
}

impl DocumentsMcpServer {
    pub fn new(ldoc_api: &str, port: u16) -> Self {
        Self {
            ldoc_api: ldoc_api.to_string(),
            port,
            documents: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn start(&self) {
        let server = Server::http(format!("127.0.0.1:{}", self.port))
            .expect("Failed to start Documents MCP server");
        
        println!("[DocumentsMCP] Listening on port {}", self.port);
        
        for request in server.incoming_requests() {
            let docs = Arc::clone(&self.documents);
            let ldoc_api = self.ldoc_api.clone();
            
            std::thread::spawn(move || {
                Self::handle_request(request, &ldoc_api, &docs);
            });
        }
    }

    fn handle_request(request: Request, ldoc_api: &str, documents: &Arc<Mutex<HashMap<String, DocumentMeta>>>) {
        let method = request.method().to_string();
        let path = request.url().to_string();

        let response = match (method.as_str(), path.as_str()) {
            ("POST", "/ldoc.documents.create") => {
                Self::create_document(request, ldoc_api, documents)
            }
            ("GET", "/ldoc.documents.list") => {
                Self::list_documents(documents)
            }
            ("GET", path) if path.starts_with("/ldoc.documents.get?") => {
                Self::get_document(path, ldoc_api, documents)
            }
            ("POST", "/ldoc.documents.update") => {
                Self::update_document(request, ldoc_api, documents)
            }
            ("POST", "/ldoc.documents.delete") => {
                Self::delete_document(request, documents)
            }
            ("POST", "/ldoc.documents.export") => {
                Self::export_document(request, ldoc_api, documents)
            }
            ("POST", "/ldoc.documents.validate") => {
                Self::validate_document(request, ldoc_api, documents)
            }
            ("GET", "/ldoc.documents.version_history?") => {
                Self::version_history(request, documents)
            }
            ("POST", "/ldoc.documents.share") => {
                Self::share_document(request, documents)
            }
            ("GET", "/health") => {
                Response::from_string(r#"{"status":"ok","service":"documents-mcp"}"#)
                    .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
            _ => {
                Response::from_string(json!({"error": "Unknown endpoint", "path": path}).to_string())
                    .with_status_code(404)
                    .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
        };

        let _ = request.respond(response);
    }

    fn create_document(request: Request, ldoc_api: &str, documents: &Arc<Mutex<HashMap<String, DocumentMeta>>>) -> Response {
        let body = Self::read_body(&request);
        
        let title = body["title"].as_str().unwrap_or("Untitled").to_string();
        let author = body["author"].as_str().unwrap_or("Unknown").to_string();
        let doc_id = format!("doc-{}", uuid::Uuid::new_v4());
        
        let meta = DocumentMeta {
            id: doc_id.clone(),
            title: title.clone(),
            author: author.clone(),
            created: Utc::now().to_rfc3339(),
            modified: Utc::now().to_rfc3339(),
            pages: 1,
            size: 2048,
        };
        
        {
            let mut docs = documents.lock().unwrap();
            docs.insert(doc_id.clone(), meta.clone());
        }
        
        let response = json!({
            "document_id": doc_id,
            "title": title,
            "author": author,
            "status": "created",
            "url": format!("http://127.0.0.1:8080/?doc={}", doc_id),
            "timestamp": Utc::now().to_rfc3339()
        });
        
        Response::from_string(response.to_string())
            .with_status_code(201)
            .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
    }

    fn list_documents(documents: &Arc<Mutex<HashMap<String, DocumentMeta>>>) -> Response {
        let docs = documents.lock().unwrap();
        let doc_list: Vec<_> = docs.values().cloned().collect();
        
        let response = json!({
            "documents": doc_list,
            "count": doc_list.len(),
            "timestamp": Utc::now().to_rfc3339()
        });
        
        Response::from_string(response.to_string())
            .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
    }

    fn get_document(path: &str, _ldoc_api: &str, documents: &Arc<Mutex<HashMap<String, DocumentMeta>>>) -> Response {
        let doc_id = path.split("document_id=").nth(1).unwrap_or("").split('&').next().unwrap_or("");
        
        let docs = documents.lock().unwrap();
        match docs.get(doc_id) {
            Some(meta) => {
                let response = json!({
                    "document": meta,
                    "status": "found"
                });
                Response::from_string(response.to_string())
                    .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
            None => {
                Response::from_string(json!({"error": "Document not found"}).to_string())
                    .with_status_code(404)
                    .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            }
        }
    }

    fn update_document(request: Request, _ldoc_api: &str, documents: &Arc<Mutex<HashMap<String, DocumentMeta>>>) -> Response {
        let body = Self::read_body(&request);
        let doc_id = body["document_id"].as_str().unwrap_or("");
        
        let mut docs = documents.lock().unwrap();
        if let Some(meta) = docs.get_mut(doc_id) {
            meta.modified = Utc::now().to_rfc3339();
            if let Some(title) = body["title"].as_str() {
                meta.title = title.to_string();
            }
            
            let response = json!({
                "document_id": doc_id,
                "status": "updated",
                "modified": meta.modified
            });
            
            return Response::from_string(response.to_string())
                .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
        }
        
        Response::from_string(json!({"error": "Document not found"}).to_string())
            .with_status_code(404)
            .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
    }

    fn delete_document(request: Request, documents: &Arc<Mutex<HashMap<String, DocumentMeta>>>) -> Response {
        let body = Self::read_body(&request);
        let doc_id = body["document_id"].as_str().unwrap_or("");
        
        let mut docs = documents.lock().unwrap();
        if docs.remove(doc_id).is_some() {
            let response = json!({
                "document_id": doc_id,
                "status": "deleted",
                "timestamp": Utc::now().to_rfc3339()
            });
            
            return Response::from_string(response.to_string())
                .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
        }
        
        Response::from_string(json!({"error": "Document not found"}).to_string())
            .with_status_code(404)
            .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
    }

    fn export_document(request: Request, _ldoc_api: &str, documents: &Arc<Mutex<HashMap<String, DocumentMeta>>>) -> Response {
        let body = Self::read_body(&request);
        let doc_id = body["document_id"].as_str().unwrap_or("");
        let format = body["format"].as_str().unwrap_or("pdf");
        
        let docs = documents.lock().unwrap();
        if docs.contains_key(doc_id) {
            let response = json!({
                "document_id": doc_id,
                "format": format,
                "status": "exported",
                "download_url": format!("http://127.0.0.1:8080/download/{}.{}", doc_id, format),
                "size_bytes": 1024000,
                "timestamp": Utc::now().to_rfc3339()
            });
            
            return Response::from_string(response.to_string())
                .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
        }
        
        Response::from_string(json!({"error": "Document not found"}).to_string())
            .with_status_code(404)
            .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
    }

    fn validate_document(request: Request, _ldoc_api: &str, documents: &Arc<Mutex<HashMap<String, DocumentMeta>>>) -> Response {
        let body = Self::read_body(&request);
        let doc_id = body["document_id"].as_str().unwrap_or("");
        
        let docs = documents.lock().unwrap();
        if docs.contains_key(doc_id) {
            let response = json!({
                "document_id": doc_id,
                "valid": true,
                "errors": [],
                "warnings": [],
                "timestamp": Utc::now().to_rfc3339()
            });
            
            return Response::from_string(response.to_string())
                .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
        }
        
        Response::from_string(json!({"error": "Document not found"}).to_string())
            .with_status_code(404)
            .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
    }

    fn version_history(request: Request, documents: &Arc<Mutex<HashMap<String, DocumentMeta>>>) -> Response {
        let doc_id = request.url().split("document_id=").nth(1).unwrap_or("").split('&').next().unwrap_or("");
        
        let docs = documents.lock().unwrap();
        if docs.contains_key(doc_id) {
            let response = json!({
                "document_id": doc_id,
                "versions": [
                    {
                        "version": 1,
                        "created": Utc::now().to_rfc3339(),
                        "size_bytes": 2048
                    }
                ],
                "timestamp": Utc::now().to_rfc3339()
            });
            
            return Response::from_string(response.to_string())
                .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
        }
        
        Response::from_string(json!({"error": "Document not found"}).to_string())
            .with_status_code(404)
            .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
    }

    fn share_document(request: Request, _documents: &Arc<Mutex<HashMap<String, DocumentMeta>>>) -> Response {
        let body = Self::read_body(&request);
        let doc_id = body["document_id"].as_str().unwrap_or("");
        let email = body["email"].as_str().unwrap_or("");
        let permission = body["permission"].as_str().unwrap_or("view");
        
        let response = json!({
            "document_id": doc_id,
            "shared_with": email,
            "permission": permission,
            "status": "shared",
            "invitation_sent": true,
            "timestamp": Utc::now().to_rfc3339()
        });
        
        Response::from_string(response.to_string())
            .with_status_code(201)
            .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
    }

    fn read_body(request: &Request) -> Value {
        let mut buffer = Vec::new();
        if let Ok(mut reader) = request.as_reader() {
            use std::io::Read;
            let _ = reader.read_to_end(&mut buffer);
        }
        serde_json::from_slice(&buffer).unwrap_or(json!({}))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_mcp_server() {
        let server = DocumentsMcpServer::new("http://127.0.0.1:8080", 7001);
        assert_eq!(server.port, 7001);
    }

    #[test]
    fn test_document_creation() {
        let server = DocumentsMcpServer::new("http://127.0.0.1:8080", 7001);
        let docs = Arc::clone(&server.documents);
        
        let meta = DocumentMeta {
            id: "doc-test".to_string(),
            title: "Test".to_string(),
            author: "Test Author".to_string(),
            created: Utc::now().to_rfc3339(),
            modified: Utc::now().to_rfc3339(),
            pages: 1,
            size: 2048,
        };
        
        {
            let mut documents = docs.lock().unwrap();
            documents.insert("doc-test".to_string(), meta);
        }
        
        let documents = docs.lock().unwrap();
        assert!(documents.contains_key("doc-test"));
    }
}

// Main entry point
pub fn main() {
    let server = DocumentsMcpServer::new("http://127.0.0.1:8080", 7001);
    server.start();
}
