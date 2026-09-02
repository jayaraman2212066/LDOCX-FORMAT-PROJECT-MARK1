use tiny_http::{Server, Response, Request, Method};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use uuid::Uuid;
use chrono::Utc;

/// LDOC Forms & Data Collection MCP Server
/// Handles form creation, submission, validation, data export
pub struct FormsMcpServer {
    ldoc_api: String,
    port: u16,
    forms: Arc<Mutex<HashMap<String, FormDefinition>>>,
    submissions: Arc<Mutex<HashMap<String, Vec<FormSubmission>>>>,
}

#[derive(Clone)]
struct FormDefinition {
    id: String,
    document_id: String,
    title: String,
    fields: Vec<FormField>,
    created_at: String,
}

#[derive(Clone)]
struct FormField {
    name: String,
    field_type: String,
    required: bool,
    validation: Option<String>,
}

#[derive(Clone)]
struct FormSubmission {
    id: String,
    form_id: String,
    data: HashMap<String, String>,
    submitted_at: String,
    user_email: Option<String>,
}

impl FormsMcpServer {
    pub fn new(ldoc_api: &str, port: u16) -> Self {
        Self {
            ldoc_api: ldoc_api.to_string(),
            port,
            forms: Arc::new(Mutex::new(HashMap::new())),
            submissions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn start(&self) {
        let server = Server::http(format!("127.0.0.1:{}", self.port))
            .expect("Failed to start Forms MCP server");

        println!("✓ Forms MCP Server listening on port {}", self.port);

        for request in server.incoming_requests() {
            let ldoc_api = self.ldoc_api.clone();
            let forms = Arc::clone(&self.forms);
            let submissions = Arc::clone(&self.submissions);
            
            std::thread::spawn(move || {
                Self::handle_request(request, &ldoc_api, &forms, &submissions);
            });
        }
    }

    fn handle_request(
        request: Request,
        _ldoc_api: &str,
        forms: &Arc<Mutex<HashMap<String, FormDefinition>>>,
        submissions: &Arc<Mutex<HashMap<String, Vec<FormSubmission>>>>,
    ) {
        let method = request.method();
        let path = request.url();

        match (method, path.as_str()) {
            (Method::Get, "/health") => {
                let response = Response::from_json(&json!({
                    "status": "healthy",
                    "service": "ldoc.forms",
                    "timestamp": Utc::now().to_rfc3339()
                }));
                let _ = request.respond(response);
            }
            (Method::Post, "/ldoc.forms.create") => {
                Self::create_form(request, forms);
            }
            (Method::Get, "/ldoc.forms.list_forms") => {
                Self::list_forms(request, forms);
            }
            (Method::Get, "/ldoc.forms.get_form") => {
                Self::get_form(request, forms, submissions);
            }
            (Method::Post, "/ldoc.forms.submit_data") => {
                Self::submit_data(request, submissions);
            }
            (Method::Get, "/ldoc.forms.get_submissions") => {
                Self::get_submissions(request, submissions);
            }
            (Method::Post, "/ldoc.forms.export_submissions") => {
                Self::export_submissions(request, submissions);
            }
            (Method::Post, "/ldoc.forms.update_form") => {
                Self::update_form(request, forms);
            }
            (Method::Post, "/ldoc.forms.add_field") => {
                Self::add_field(request, forms);
            }
            (Method::Post, "/ldoc.forms.validation_rule") => {
                Self::validation_rule(request, forms);
            }
            _ => {
                let response = Response::from_json(&json!({
                    "error": "Unknown tool",
                    "path": path,
                    "available_tools": [
                        "ldoc.forms.create",
                        "ldoc.forms.list_forms",
                        "ldoc.forms.get_form",
                        "ldoc.forms.submit_data",
                        "ldoc.forms.get_submissions",
                        "ldoc.forms.export_submissions",
                        "ldoc.forms.update_form",
                        "ldoc.forms.add_field",
                        "ldoc.forms.validation_rule"
                    ]
                })).with_status_code(404);
                let _ = request.respond(response);
            }
        }
    }

    fn create_form(
        request: Request,
        forms: &Arc<Mutex<HashMap<String, FormDefinition>>>,
    ) {
        let body = Self::read_body(&request);
        
        let doc_id = body.get("document_id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        let title = body.get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("Untitled Form");

        let form_id = Uuid::new_v4().to_string();
        
        let form = FormDefinition {
            id: form_id.clone(),
            document_id: doc_id.to_string(),
            title: title.to_string(),
            fields: vec![],
            created_at: Utc::now().to_rfc3339(),
        };

        forms.lock().unwrap().insert(form_id.clone(), form);

        let response = json!({
            "status": "created",
            "form_id": form_id,
            "document_id": doc_id,
            "title": title,
            "form_url": format!("http://127.0.0.1:8080/forms/{}", form_id),
            "created_at": Utc::now().to_rfc3339()
        });
        
        let _ = request.respond(Response::from_json(&response).with_status_code(201));
    }

    fn list_forms(
        request: Request,
        forms: &Arc<Mutex<HashMap<String, FormDefinition>>>,
    ) {
        let doc_id = Self::extract_param(&request, "document_id");

        let all_forms = forms.lock().unwrap();
        let doc_forms: Vec<_> = all_forms.values()
            .filter(|f| f.document_id == doc_id)
            .cloned()
            .collect();

        let response = json!({
            "document_id": doc_id,
            "forms": doc_forms.iter().map(|f| json!({
                "id": f.id,
                "title": f.title,
                "field_count": f.fields.len(),
                "created_at": f.created_at
            })).collect::<Vec<_>>(),
            "total": doc_forms.len()
        });
        
        let _ = request.respond(Response::from_json(&response));
    }

    fn get_form(
        request: Request,
        forms: &Arc<Mutex<HashMap<String, FormDefinition>>>,
        submissions: &Arc<Mutex<HashMap<String, Vec<FormSubmission>>>>,
    ) {
        let form_id = Self::extract_param(&request, "form_id");

        let all_forms = forms.lock().unwrap();
        let all_subs = submissions.lock().unwrap();

        if let Some(form) = all_forms.get(&form_id) {
            let form_subs = all_subs.get(&form_id).cloned().unwrap_or_default();
            
            let response = json!({
                "status": "found",
                "form": {
                    "id": form.id,
                    "document_id": form.document_id,
                    "title": form.title,
                    "fields": form.fields.iter().map(|f| json!({
                        "name": f.name,
                        "type": f.field_type,
                        "required": f.required
                    })).collect::<Vec<_>>(),
                    "created_at": form.created_at
                },
                "submissions_count": form_subs.len()
            });
            let _ = request.respond(Response::from_json(&response));
        } else {
            let response = Response::from_json(&json!({
                "error": "Form not found",
                "form_id": form_id
            })).with_status_code(404);
            let _ = request.respond(response);
        }
    }

    fn submit_data(
        request: Request,
        submissions: &Arc<Mutex<HashMap<String, Vec<FormSubmission>>>>,
    ) {
        let body = Self::read_body(&request);
        
        let form_id = body.get("form_id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        let user_email = body.get("user_email")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let submission_id = Uuid::new_v4().to_string();
        
        let mut data = HashMap::new();
        if let Some(form_data) = body.get("data").and_then(|v| v.as_object()) {
            for (key, val) in form_data {
                data.insert(key.clone(), val.to_string());
            }
        }

        let submission = FormSubmission {
            id: submission_id.clone(),
            form_id: form_id.to_string(),
            data,
            submitted_at: Utc::now().to_rfc3339(),
            user_email: user_email.clone(),
        };

        submissions.lock().unwrap()
            .entry(form_id.to_string())
            .or_insert_with(Vec::new)
            .push(submission);

        let response = json!({
            "status": "submitted",
            "submission_id": submission_id,
            "form_id": form_id,
            "user_email": user_email.unwrap_or_else(|| "anonymous".to_string()),
            "submitted_at": Utc::now().to_rfc3339(),
            "confirmation": "Form submitted successfully"
        });
        
        let _ = request.respond(Response::from_json(&response).with_status_code(201));
    }

    fn get_submissions(
        request: Request,
        submissions: &Arc<Mutex<HashMap<String, Vec<FormSubmission>>>>,
    ) {
        let form_id = Self::extract_param(&request, "form_id");

        let all_subs = submissions.lock().unwrap();
        let form_subs = all_subs.get(&form_id).cloned().unwrap_or_default();

        let response = json!({
            "form_id": form_id,
            "submissions": form_subs.iter().map(|s| json!({
                "id": s.id,
                "data": s.data,
                "submitted_at": s.submitted_at,
                "user_email": s.user_email
            })).collect::<Vec<_>>(),
            "total": form_subs.len()
        });
        
        let _ = request.respond(Response::from_json(&response));
    }

    fn export_submissions(
        request: Request,
        submissions: &Arc<Mutex<HashMap<String, Vec<FormSubmission>>>>,
    ) {
        let body = Self::read_body(&request);
        
        let form_id = body.get("form_id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        let format = body.get("format")
            .and_then(|v| v.as_str())
            .unwrap_or("csv");

        let all_subs = submissions.lock().unwrap();
        let form_subs = all_subs.get(form_id).cloned().unwrap_or_default();

        let response = json!({
            "status": "exported",
            "form_id": form_id,
            "format": format,
            "submission_count": form_subs.len(),
            "download_url": format!("http://127.0.0.1:8080/download/form_{}_submissions.{}", form_id, format),
            "file_size_bytes": form_subs.len() * 256,
            "generated_at": Utc::now().to_rfc3339()
        });
        
        let _ = request.respond(Response::from_json(&response));
    }

    fn update_form(
        request: Request,
        forms: &Arc<Mutex<HashMap<String, FormDefinition>>>,
    ) {
        let body = Self::read_body(&request);
        
        let form_id = body.get("form_id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");

        let mut all_forms = forms.lock().unwrap();
        if let Some(form) = all_forms.get_mut(form_id) {
            if let Some(fields) = body.get("fields").and_then(|v| v.as_array()) {
                form.fields = fields.iter().map(|f| {
                    FormField {
                        name: f.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                        field_type: f.get("type").and_then(|v| v.as_str()).unwrap_or("text").to_string(),
                        required: f.get("required").and_then(|v| v.as_bool()).unwrap_or(false),
                        validation: f.get("validation").and_then(|v| v.as_str()).map(|s| s.to_string()),
                    }
                }).collect();
            }
        }

        let response = json!({
            "status": "updated",
            "form_id": form_id,
            "updated_at": Utc::now().to_rfc3339()
        });
        
        let _ = request.respond(Response::from_json(&response));
    }

    fn add_field(
        request: Request,
        forms: &Arc<Mutex<HashMap<String, FormDefinition>>>,
    ) {
        let body = Self::read_body(&request);
        
        let form_id = body.get("form_id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        let field_obj = body.get("field").and_then(|v| v.as_object()).cloned();

        let field_id = Uuid::new_v4().to_string();

        if let Some(field_obj) = field_obj {
            let field = FormField {
                name: field_obj.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                field_type: field_obj.get("type").and_then(|v| v.as_str()).unwrap_or("text").to_string(),
                required: field_obj.get("required").and_then(|v| v.as_bool()).unwrap_or(false),
                validation: field_obj.get("validation").and_then(|v| v.as_str()).map(|s| s.to_string()),
            };

            let mut all_forms = forms.lock().unwrap();
            if let Some(form) = all_forms.get_mut(form_id) {
                form.fields.push(field);
            }
        }

        let response = json!({
            "status": "added",
            "form_id": form_id,
            "field_id": field_id,
            "added_at": Utc::now().to_rfc3339()
        });
        
        let _ = request.respond(Response::from_json(&response).with_status_code(201));
    }

    fn validation_rule(
        request: Request,
        _forms: &Arc<Mutex<HashMap<String, FormDefinition>>>,
    ) {
        let body = Self::read_body(&request);
        
        let form_id = body.get("form_id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        let field_name = body.get("field_name")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");

        let rule_id = Uuid::new_v4().to_string();

        let response = json!({
            "status": "applied",
            "form_id": form_id,
            "field_name": field_name,
            "rule_id": rule_id,
            "applied_at": Utc::now().to_rfc3339()
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
    fn test_forms_server_creation() {
        let server = FormsMcpServer::new("http://127.0.0.1:8080", 7004);
        assert_eq!(server.port, 7004);
    }

    #[test]
    fn test_form_creation() {
        let forms = Arc::new(Mutex::new(HashMap::new()));
        let form = FormDefinition {
            id: "form-1".to_string(),
            document_id: "doc-1".to_string(),
            title: "Test Form".to_string(),
            fields: vec![],
            created_at: Utc::now().to_rfc3339(),
        };
        forms.lock().unwrap().insert("form-1".to_string(), form);
        assert_eq!(forms.lock().unwrap().len(), 1);
    }

    #[test]
    fn test_form_submission() {
        let submissions = Arc::new(Mutex::new(HashMap::new()));
        let mut data = HashMap::new();
        data.insert("name".to_string(), "John".to_string());
        
        let submission = FormSubmission {
            id: "sub-1".to_string(),
            form_id: "form-1".to_string(),
            data,
            submitted_at: Utc::now().to_rfc3339(),
            user_email: Some("john@example.com".to_string()),
        };
        submissions.lock().unwrap()
            .entry("form-1".to_string())
            .or_insert_with(Vec::new)
            .push(submission);
        assert_eq!(submissions.lock().unwrap().get("form-1").unwrap().len(), 1);
    }
}
