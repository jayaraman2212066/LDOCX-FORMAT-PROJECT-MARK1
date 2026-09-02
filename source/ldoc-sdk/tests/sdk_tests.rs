// LDOC SDK — Integration Tests

use ldoc_sdk::{LdocDocument, LdocSession};
use ldoc_sdk::api::LdocApi;

fn test_doc_bytes() -> Vec<u8> {
    LdocDocument::create("SDK Test Doc", "en", "Test Author")
        .expect("create must succeed")
}

// ── LdocDocument ──────────────────────────────────────────────────────────────

#[test]
fn test_document_from_bytes() {
    let bytes = test_doc_bytes();
    let doc = LdocDocument::from_bytes(&bytes).expect("load");
    assert_eq!(doc.manifest.title, "SDK Test Doc");
}

#[test]
fn test_document_author() {
    let bytes = test_doc_bytes();
    let doc = LdocDocument::from_bytes(&bytes).unwrap();
    assert!(doc.metadata.authors.contains(&"Test Author".to_string()));
}

#[test]
fn test_document_has_pages() {
    let bytes = test_doc_bytes();
    let doc = LdocDocument::from_bytes(&bytes).unwrap();
    assert!(!doc.pages.is_empty());
}

#[test]
fn test_document_validation_valid() {
    let bytes = test_doc_bytes();
    let doc = LdocDocument::from_bytes(&bytes).unwrap();
    assert!(doc.validation.valid);
}

#[test]
fn test_validate_bytes_standalone() {
    let bytes = test_doc_bytes();
    let v = LdocDocument::validate_bytes(&bytes);
    assert!(v.valid);
}

#[test]
fn test_validate_bytes_rejects_garbage() {
    let v = LdocDocument::validate_bytes(b"not an ldoc file");
    assert!(!v.valid);
}

#[test]
fn test_document_raw_size() {
    let bytes = test_doc_bytes();
    let len = bytes.len() as u64;
    let doc = LdocDocument::from_bytes(&bytes).unwrap();
    assert_eq!(doc.raw_size_bytes, len);
}

#[test]
fn test_document_from_bytes_rejects_empty() {
    assert!(LdocDocument::from_bytes(&[]).is_err());
}

// ── LdocSession ───────────────────────────────────────────────────────────────

#[test]
fn test_session_from_bytes() {
    let bytes = test_doc_bytes();
    let s = LdocSession::from_bytes(&bytes).expect("session");
    assert!(s.page_count() >= 1);
}

#[test]
fn test_session_open_entry() {
    let bytes = test_doc_bytes();
    let s = LdocSession::from_bytes(&bytes).unwrap();
    let title = s.open_entry().unwrap();
    assert!(!title.is_empty());
}

#[test]
fn test_session_set_get_field() {
    let bytes = test_doc_bytes();
    let s = LdocSession::from_bytes(&bytes).unwrap();
    s.set_field("name", "Alice").unwrap();
    assert_eq!(s.get_field("name"), Some("Alice".to_string()));
}

#[test]
fn test_session_submit_form() {
    let bytes = test_doc_bytes();
    let s = LdocSession::from_bytes(&bytes).unwrap();
    s.submit_form("contact").unwrap();
    assert_eq!(s.get_state("form.contact.submitted"), Some("true".to_string()));
}

#[test]
fn test_session_set_get_state() {
    let bytes = test_doc_bytes();
    let s = LdocSession::from_bytes(&bytes).unwrap();
    s.set_state("theme", "dark").unwrap();
    assert_eq!(s.get_state("theme"), Some("dark".to_string()));
}

// ── LdocApi ───────────────────────────────────────────────────────────────────

#[test]
fn test_api_create_document() {
    let api = LdocApi::new();
    let id = api.create_document(test_doc_bytes()).expect("create");
    assert!(!id.is_empty());
}

#[test]
fn test_api_get_document() {
    let api = LdocApi::new();
    let id = api.create_document(test_doc_bytes()).unwrap();
    let doc = api.get_document(&id).unwrap();
    assert_eq!(doc.manifest.title, "SDK Test Doc");
}

#[test]
fn test_api_get_pages() {
    let api = LdocApi::new();
    let id = api.create_document(test_doc_bytes()).unwrap();
    let pages = api.get_pages(&id).unwrap();
    assert!(!pages.is_empty());
}

#[test]
fn test_api_validate_document() {
    let api = LdocApi::new();
    let id = api.create_document(test_doc_bytes()).unwrap();
    let v = api.validate_document(&id).unwrap();
    assert!(v.valid);
}

#[test]
fn test_api_not_found() {
    let api = LdocApi::new();
    assert!(api.get_document("nonexistent-id").is_err());
}

#[test]
fn test_api_multiple_documents() {
    let api = LdocApi::new();
    let id1 = api.create_document(test_doc_bytes()).unwrap();
    let id2 = api.create_document(test_doc_bytes()).unwrap();
    assert_ne!(id1, id2);
    assert!(api.get_document(&id1).is_ok());
    assert!(api.get_document(&id2).is_ok());
}

#[test]
fn test_api_rejects_invalid_bytes() {
    let api = LdocApi::new();
    assert!(api.create_document(b"garbage".to_vec()).is_err());
}
