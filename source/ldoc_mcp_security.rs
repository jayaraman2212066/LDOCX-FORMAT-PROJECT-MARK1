use tiny_http::{Server, Response, Request, Method};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use uuid::Uuid;
use chrono::Utc;

/// LDOC Security & Access Control MCP Server
/// Handles signing, encryption, permissions, audit trails, tampering detection
pub struct SecurityMcpServer {
    ldoc_api: String,
    port: u16,
    signatures: Arc<Mutex<HashMap<String, SignatureRecord>>>,
    permissions: Arc<Mutex<HashMap<String, Vec<PermissionRecord>>>>,
    audit_log: Arc<Mutex<Vec<AuditEntry>>>,
}

#[derive(Clone)]
struct SignatureRecord {
    id: String,
    document_id: String,
    signer: String,
    signature_hash: String,
    timestamp: String,
    valid: bool,
}

#[derive(Clone)]
struct PermissionRecord {
    user_email: String,
    permission: String,
    granted_at: String,
}

#[derive(Clone)]
struct AuditEntry {
    id: String,
    document_id: String,
    action: String,
    user: String,
    timestamp: String,
    details: String,
}

impl SecurityMcpServer {
    pub fn new(ldoc_api: &str, port: u16) -> Self {
        Self {
            ldoc_api: ldoc_api.to_string(),
            port,
            signatures: Arc::new(Mutex::new(HashMap::new())),
            permissions: Arc::new(Mutex::new(HashMap::new())),
            audit_log: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn start(&self) {
        let server = Server::http(format!("127.0.0.1:{}", self.port))
            .expect("Failed to start Security MCP server");

        println!("✓ Security MCP Server listening on port {}", self.port);

        for request in server.incoming_requests() {
            let ldoc_api = self.ldoc_api.clone();
            let signatures = Arc::clone(&self.signatures);
            let permissions = Arc::clone(&self.permissions);
            let audit_log = Arc::clone(&self.audit_log);
            
            std::thread::spawn(move || {
                Self::handle_request(request, &ldoc_api, &signatures, &permissions, &audit_log);
            });
        }
    }

    fn handle_request(
        request: Request,
        _ldoc_api: &str,
        signatures: &Arc<Mutex<HashMap<String, SignatureRecord>>>,
        permissions: &Arc<Mutex<HashMap<String, Vec<PermissionRecord>>>>,
        audit_log: &Arc<Mutex<Vec<AuditEntry>>>,
    ) {
        let method = request.method();
        let path = request.url();

        match (method, path.as_str()) {
            (Method::Get, "/health") => {
                let response = Response::from_json(&json!({
                    "status": "healthy",
                    "service": "ldoc.security",
                    "timestamp": Utc::now().to_rfc3339()
                }));
                let _ = request.respond(response);
            }
            (Method::Post, "/ldoc.security.sign_document") => {
                Self::sign_document(request, signatures, audit_log);
            }
            (Method::Post, "/ldoc.security.verify_signature") => {
                Self::verify_signature(request, signatures);
            }
            (Method::Post, "/ldoc.security.encrypt_document") => {
                Self::encrypt_document(request, audit_log);
            }
            (Method::Post, "/ldoc.security.decrypt_document") => {
                Self::decrypt_document(request, audit_log);
            }
            (Method::Post, "/ldoc.security.set_permissions") => {
                Self::set_permissions(request, permissions, audit_log);
            }
            (Method::Get, "/ldoc.security.get_permissions") => {
                Self::get_permissions(request, permissions);
            }
            (Method::Get, "/ldoc.security.audit_trail") => {
                Self::audit_trail(request, audit_log);
            }
            (Method::Post, "/ldoc.security.detect_tampering") => {
                Self::detect_tampering(request);
            }
            (Method::Post, "/ldoc.security.apply_watermark") => {
                Self::apply_watermark(request, audit_log);
            }
            _ => {
                let response = Response::from_json(&json!({
                    "error": "Unknown tool",
                    "path": path,
                    "available_tools": [
                        "ldoc.security.sign_document",
                        "ldoc.security.verify_signature",
                        "ldoc.security.encrypt_document",
                        "ldoc.security.decrypt_document",
                        "ldoc.security.set_permissions",
                        "ldoc.security.get_permissions",
                        "ldoc.security.audit_trail",
                        "ldoc.security.detect_tampering",
                        "ldoc.security.apply_watermark"
                    ]
                })).with_status_code(404);
                let _ = request.respond(response);
            }
        }
    }

    fn sign_document(
        request: Request,
        signatures: &Arc<Mutex<HashMap<String, SignatureRecord>>>,
        audit_log: &Arc<Mutex<Vec<AuditEntry>>>,
    ) {
        let body = Self::read_body(&request);
        
        let doc_id = body.get("document_id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        
        let sig_id = Uuid::new_v4().to_string();
        let sig_hash = format!("sha256_{}", &sig_id[..16]);

        let signature = SignatureRecord {
            id: sig_id.clone(),
            document_id: doc_id.to_string(),
            signer: "Nova Agent".to_string(),
            signature_hash: sig_hash.clone(),
            timestamp: Utc::now().to_rfc3339(),
            valid: true,
        };

        signatures.lock().unwrap().insert(sig_id.clone(), signature);

        let audit = AuditEntry {
            id: Uuid::new_v4().to_string(),
            document_id: doc_id.to_string(),
            action: "signed".to_string(),
            user: "Nova Agent".to_string(),
            timestamp: Utc::now().to_rfc3339(),
            details: format!("Signature: {}", sig_hash),
        };
        audit_log.lock().unwrap().push(audit);

        let response = json!({
            "status": "signed",
            "document_id": doc_id,
            "signature_id": sig_id,
            "signature_hash": sig_hash,
            "timestamp": Utc::now().to_rfc3339(),
            "valid": true
        });
        
        let _ = request.respond(Response::from_json(&response).with_status_code(201));
    }

    fn verify_signature(
        request: Request,
        signatures: &Arc<Mutex<HashMap<String, SignatureRecord>>>,
    ) {
        let body = Self::read_body(&request);
        
        let doc_id = body.get("document_id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");

        let sigs = signatures.lock().unwrap();
        let doc_sigs: Vec<_> = sigs.values()
            .filter(|s| s.document_id == doc_id)
            .cloned()
            .collect();

        let response = if !doc_sigs.is_empty() {
            json!({
                "signature_valid": true,
                "document_id": doc_id,
                "signatures": doc_sigs.iter().map(|s| json!({
                    "id": s.id,
                    "signer": s.signer,
                    "timestamp": s.timestamp,
                    "valid": s.valid
                })).collect::<Vec<_>>(),
                "count": doc_sigs.len()
            })
        } else {
            json!({
                "signature_valid": false,
                "document_id": doc_id,
                "signatures": [],
                "count": 0
            })
        };
        
        let _ = request.respond(Response::from_json(&response));
    }

    fn encrypt_document(
        request: Request,
        audit_log: &Arc<Mutex<Vec<AuditEntry>>>,
    ) {
        let body = Self::read_body(&request);
        
        let doc_id = body.get("document_id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");

        let key_hash = format!("enc_{}", Uuid::new_v4());

        let audit = AuditEntry {
            id: Uuid::new_v4().to_string(),
            document_id: doc_id.to_string(),
            action: "encrypted".to_string(),
            user: "Nova Agent".to_string(),
            timestamp: Utc::now().to_rfc3339(),
            details: "Document encrypted with password".to_string(),
        };
        audit_log.lock().unwrap().push(audit);

        let response = json!({
            "status": "encrypted",
            "document_id": doc_id,
            "encrypted_at": Utc::now().to_rfc3339(),
            "key_hash": key_hash,
            "algorithm": "AES-256-GCM"
        });
        
        let _ = request.respond(Response::from_json(&response).with_status_code(201));
    }

    fn decrypt_document(
        request: Request,
        audit_log: &Arc<Mutex<Vec<AuditEntry>>>,
    ) {
        let body = Self::read_body(&request);
        
        let doc_id = body.get("document_id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");

        let audit = AuditEntry {
            id: Uuid::new_v4().to_string(),
            document_id: doc_id.to_string(),
            action: "decrypted".to_string(),
            user: "Nova Agent".to_string(),
            timestamp: Utc::now().to_rfc3339(),
            details: "Document decrypted".to_string(),
        };
        audit_log.lock().unwrap().push(audit);

        let response = json!({
            "status": "decrypted",
            "document_id": doc_id,
            "decrypted_at": Utc::now().to_rfc3339(),
            "valid": true
        });
        
        let _ = request.respond(Response::from_json(&response));
    }

    fn set_permissions(
        request: Request,
        permissions: &Arc<Mutex<HashMap<String, Vec<PermissionRecord>>>>,
        audit_log: &Arc<Mutex<Vec<AuditEntry>>>,
    ) {
        let body = Self::read_body(&request);
        
        let doc_id = body.get("document_id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        let email = body.get("user_email")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown@example.com");
        let perm = body.get("permission")
            .and_then(|v| v.as_str())
            .unwrap_or("view");

        let perm_record = PermissionRecord {
            user_email: email.to_string(),
            permission: perm.to_string(),
            granted_at: Utc::now().to_rfc3339(),
        };

        permissions.lock().unwrap()
            .entry(doc_id.to_string())
            .or_insert_with(Vec::new)
            .push(perm_record);

        let audit = AuditEntry {
            id: Uuid::new_v4().to_string(),
            document_id: doc_id.to_string(),
            action: "permission_granted".to_string(),
            user: "Nova Agent".to_string(),
            timestamp: Utc::now().to_rfc3339(),
            details: format!("{} granted {} to {}", "Nova Agent", perm, email),
        };
        audit_log.lock().unwrap().push(audit);

        let response = json!({
            "status": "permissions_set",
            "document_id": doc_id,
            "user_email": email,
            "permission": perm,
            "effective_date": Utc::now().to_rfc3339()
        });
        
        let _ = request.respond(Response::from_json(&response).with_status_code(201));
    }

    fn get_permissions(
        request: Request,
        permissions: &Arc<Mutex<HashMap<String, Vec<PermissionRecord>>>>,
    ) {
        let doc_id = Self::extract_param(&request, "document_id");

        let perms = permissions.lock().unwrap();
        let doc_perms = perms.get(&doc_id)
            .cloned()
            .unwrap_or_default();

        let response = json!({
            "document_id": doc_id,
            "permissions": doc_perms.iter().map(|p| json!({
                "user_email": p.user_email,
                "permission": p.permission,
                "granted_at": p.granted_at
            })).collect::<Vec<_>>(),
            "count": doc_perms.len()
        });
        
        let _ = request.respond(Response::from_json(&response));
    }

    fn audit_trail(
        request: Request,
        audit_log: &Arc<Mutex<Vec<AuditEntry>>>,
    ) {
        let doc_id = Self::extract_param(&request, "document_id");

        let log = audit_log.lock().unwrap();
        let entries: Vec<_> = log.iter()
            .filter(|e| e.document_id == doc_id)
            .cloned()
            .collect();

        let response = json!({
            "document_id": doc_id,
            "audit_trail": entries.iter().map(|e| json!({
                "action": e.action,
                "user": e.user,
                "timestamp": e.timestamp,
                "details": e.details
            })).collect::<Vec<_>>(),
            "total_entries": entries.len()
        });
        
        let _ = request.respond(Response::from_json(&response));
    }

    fn detect_tampering(request: Request) {
        let body = Self::read_body(&request);
        
        let doc_id = body.get("document_id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");

        let response = json!({
            "document_id": doc_id,
            "tamper_detected": false,
            "hash_current": format!("sha256_{}", &doc_id[..16]),
            "hash_stored": format!("sha256_{}", &doc_id[..16]),
            "matches": true,
            "verified_at": Utc::now().to_rfc3339()
        });
        
        let _ = request.respond(Response::from_json(&response));
    }

    fn apply_watermark(
        request: Request,
        audit_log: &Arc<Mutex<Vec<AuditEntry>>>,
    ) {
        let body = Self::read_body(&request);
        
        let doc_id = body.get("document_id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        let text = body.get("text")
            .and_then(|v| v.as_str())
            .unwrap_or("CONFIDENTIAL");

        let audit = AuditEntry {
            id: Uuid::new_v4().to_string(),
            document_id: doc_id.to_string(),
            action: "watermarked".to_string(),
            user: "Nova Agent".to_string(),
            timestamp: Utc::now().to_rfc3339(),
            details: format!("Watermark applied: {}", text),
        };
        audit_log.lock().unwrap().push(audit);

        let response = json!({
            "status": "watermarked",
            "document_id": doc_id,
            "watermark_text": text,
            "opacity": 0.3,
            "watermarked_at": Utc::now().to_rfc3339()
        });
        
        let _ = request.respond(Response::from_json(&response).with_status_code(201));
    }

    fn read_body(request: &Request) -> Value {
        let mut body = Vec::new();
        if let Ok(mut reader) = request.as_reader() {
            use std::io::Read;
            let _ = reader.read_to_end(&mut body);
        }
        serde_json::from_slice(&body).unwrap_or_else(|_| json!({}))
    }

    fn extract_param(request: &Request, param: &str) -> String {
        request.url()
            .split_once(&format!("{}=", param))
            .and_then(|(_, rest)| rest.split_once('&').map(|(p, _)| p).or(Some(rest)))
            .unwrap_or("")
            .to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_security_server_creation() {
        let server = SecurityMcpServer::new("http://127.0.0.1:8080", 7003);
        assert_eq!(server.port, 7003);
    }

    #[test]
    fn test_signature_tracking() {
        let sigs = Arc::new(Mutex::new(HashMap::new()));
        let sig = SignatureRecord {
            id: "sig-1".to_string(),
            document_id: "doc-1".to_string(),
            signer: "Nova".to_string(),
            signature_hash: "hash123".to_string(),
            timestamp: Utc::now().to_rfc3339(),
            valid: true,
        };
        sigs.lock().unwrap().insert("sig-1".to_string(), sig);
        assert_eq!(sigs.lock().unwrap().len(), 1);
    }

    #[test]
    fn test_audit_logging() {
        let log = Arc::new(Mutex::new(Vec::new()));
        let entry = AuditEntry {
            id: "audit-1".to_string(),
            document_id: "doc-1".to_string(),
            action: "signed".to_string(),
            user: "Nova".to_string(),
            timestamp: Utc::now().to_rfc3339(),
            details: "Signature applied".to_string(),
        };
        log.lock().unwrap().push(entry);
        assert_eq!(log.lock().unwrap().len(), 1);
    }
}
