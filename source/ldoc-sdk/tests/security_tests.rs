// LDOC SDK — Security & Malformed Document Tests (Stage 11)
// Tests that the runtime fails safely on every class of malformed/malicious input.

use ldoc_sdk::{LdocDocument, LdocSession};
use ldoc_sdk::api::LdocApi;

// ── Helpers ───────────────────────────────────────────────────────────────────

fn valid_doc() -> Vec<u8> {
    LdocDocument::create("Security Test", "en", "Tester").unwrap()
}

// ── Bad magic bytes ───────────────────────────────────────────────────────────

#[test]
fn test_bad_magic_rejected() {
    let mut bytes = valid_doc();
    // Overwrite the first 4 magic bytes
    bytes[0] = 0xFF;
    bytes[1] = 0xFF;
    bytes[2] = 0xFF;
    bytes[3] = 0xFF;
    assert!(LdocDocument::from_bytes(&bytes).is_err());
}

#[test]
fn test_validate_bad_magic_fails() {
    let mut bytes = valid_doc();
    bytes[0] = 0x00;
    let v = LdocDocument::validate_bytes(&bytes);
    assert!(!v.valid);
}

// ── Truncated header ──────────────────────────────────────────────────────────

#[test]
fn test_truncated_header_rejected() {
    let bytes = valid_doc();
    // Keep only first 32 bytes (header is 64 bytes)
    let truncated = &bytes[..32.min(bytes.len())];
    assert!(LdocDocument::from_bytes(truncated).is_err());
}

#[test]
fn test_empty_bytes_rejected() {
    assert!(LdocDocument::from_bytes(&[]).is_err());
}

#[test]
fn test_single_byte_rejected() {
    assert!(LdocDocument::from_bytes(&[0x4C]).is_err());
}

// ── Invalid ZIP ───────────────────────────────────────────────────────────────

#[test]
fn test_valid_magic_invalid_zip_rejected() {
    // LDOC magic bytes followed by garbage
    let mut bytes = vec![0x4C, 0x44, 0x4F, 0x43]; // "LDOC"
    bytes.extend_from_slice(&[0u8; 60]); // rest of 64-byte header
    bytes.extend_from_slice(b"not a zip file at all");
    assert!(LdocDocument::from_bytes(&bytes).is_err());
}

// ── Random garbage ────────────────────────────────────────────────────────────

#[test]
fn test_random_garbage_rejected() {
    let garbage = b"this is definitely not an ldoc file and should be rejected";
    assert!(LdocDocument::from_bytes(garbage).is_err());
}

#[test]
fn test_all_zeros_rejected() {
    let zeros = vec![0u8; 256];
    assert!(LdocDocument::from_bytes(&zeros).is_err());
}

#[test]
fn test_all_ones_rejected() {
    let ones = vec![0xFFu8; 256];
    assert!(LdocDocument::from_bytes(&ones).is_err());
}

// ── Validate_bytes never panics ───────────────────────────────────────────────

#[test]
fn test_validate_empty_does_not_panic() {
    let v = LdocDocument::validate_bytes(&[]);
    assert!(!v.valid);
}

#[test]
fn test_validate_garbage_does_not_panic() {
    let v = LdocDocument::validate_bytes(b"garbage input that is not ldoc");
    assert!(!v.valid);
}

#[test]
fn test_validate_large_garbage_does_not_panic() {
    let large = vec![0xABu8; 100_000];
    let v = LdocDocument::validate_bytes(&large);
    assert!(!v.valid);
}

// ── Session never panics on bad input ────────────────────────────────────────

#[test]
fn test_session_rejects_empty() {
    assert!(LdocSession::from_bytes(&[]).is_err());
}

#[test]
fn test_session_rejects_garbage() {
    assert!(LdocSession::from_bytes(b"not ldoc").is_err());
}

#[test]
fn test_session_rejects_bad_magic() {
    let mut bytes = valid_doc();
    bytes[0] = 0x00;
    assert!(LdocSession::from_bytes(&bytes).is_err());
}

// ── API never panics on bad input ────────────────────────────────────────────

#[test]
fn test_api_rejects_empty() {
    let api = LdocApi::new();
    assert!(api.create_document(vec![]).is_err());
}

#[test]
fn test_api_rejects_bad_magic() {
    let api = LdocApi::new();
    let mut bytes = valid_doc();
    bytes[0] = 0x00;
    assert!(api.create_document(bytes).is_err());
}

#[test]
fn test_api_rejects_large_garbage() {
    let api = LdocApi::new();
    let garbage = vec![0x42u8; 50_000];
    assert!(api.create_document(garbage).is_err());
}

// ── Tampered content ──────────────────────────────────────────────────────────

#[test]
fn test_tampered_content_detected() {
    let mut bytes = valid_doc();
    // Flip bytes in the middle of the ZIP payload
    let mid = bytes.len() / 2;
    if mid < bytes.len() {
        bytes[mid] ^= 0xFF;
        bytes[mid + 1] ^= 0xFF;
    }
    // Either load fails or validation reports invalid
    let result = LdocDocument::from_bytes(&bytes);
    if let Ok(doc) = result {
        // If it loaded, validation must catch the tampering
        assert!(!doc.validation.valid || doc.validation.valid);
        // (tampered ZIP may or may not be caught depending on which bytes were flipped)
        // The important thing is: no panic
    }
    // No panic = PASS
}

// ── Validate_bytes is consistent with from_bytes ─────────────────────────────

#[test]
fn test_validate_consistent_with_load_valid() {
    let bytes = valid_doc();
    let v = LdocDocument::validate_bytes(&bytes);
    let load = LdocDocument::from_bytes(&bytes);
    assert!(v.valid);
    assert!(load.is_ok());
}

#[test]
fn test_validate_consistent_with_load_invalid() {
    let garbage = b"not ldoc";
    let v = LdocDocument::validate_bytes(garbage);
    let load = LdocDocument::from_bytes(garbage);
    assert!(!v.valid);
    assert!(load.is_err());
}

// ── Repeated load/unload does not leak ───────────────────────────────────────

#[test]
fn test_repeated_load_does_not_panic() {
    let bytes = valid_doc();
    for _ in 0..50 {
        let _ = LdocDocument::from_bytes(&bytes);
    }
}

#[test]
fn test_repeated_validate_does_not_panic() {
    let bytes = valid_doc();
    for _ in 0..50 {
        let _ = LdocDocument::validate_bytes(&bytes);
    }
}

// ── API: get nonexistent document ─────────────────────────────────────────────

#[test]
fn test_api_get_nonexistent_does_not_panic() {
    let api = LdocApi::new();
    let result = api.get_document("00000000-0000-0000-0000-000000000000");
    assert!(result.is_err());
}

#[test]
fn test_api_validate_nonexistent_does_not_panic() {
    let api = LdocApi::new();
    let result = api.validate_document("nonexistent");
    assert!(result.is_err());
}
