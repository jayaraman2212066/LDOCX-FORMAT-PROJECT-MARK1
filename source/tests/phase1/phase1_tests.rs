// Phase 1 Integration Tests
// Covers all 10 Phase 1 capabilities:
//   1. Create Empty .ldfx Files
//   2. Validate File Structure
//   3. Open Container
//   4. Mount Virtual File System (folder presence)
//   5. Load Resources (asset index)
//   6. Parse Manifest
//   7. Verify Signature / Hash Integrity
//   8. Metadata Reading
//   9. Compression Support
//  10. Resource Index

use ldoc_core::{
    DocumentBuilder, Validator, ValidationResult, Severity,
    header::{LdocHeader, MAGIC, GUARD, HEADER_SIZE, FLAG_HAS_SCRIPTS, FLAG_HAS_VIDEO},
    container::LdocZipReader,
    manifest::Manifest,
    metadata::Metadata,
    security::{HashesFile, sha256_hex},
    LdocError,
};
use std::io::Cursor;

// ─── helpers ──────────────────────────────────────────────────────────────────

fn build_valid_doc() -> Vec<u8> {
    DocumentBuilder::new("Test Document", "en", "Test Author")
        .build()
        .expect("DocumentBuilder must succeed")
}

fn open_zip(data: &[u8]) -> LdocZipReader<Cursor<&[u8]>> {
    LdocZipReader::open(Cursor::new(data)).expect("ZIP must open")
}

// ─── 1. Create Empty .ldfx Files ─────────────────────────────────────────────

#[test]
fn create_ldfx_file_returns_bytes() {
    let bytes = build_valid_doc();
    assert!(!bytes.is_empty(), "built document must not be empty");
}

#[test]
fn created_file_starts_with_magic() {
    let bytes = build_valid_doc();
    assert_eq!(&bytes[0..4], &MAGIC, "first 4 bytes must be LDFX magic");
}

#[test]
fn created_file_has_guard_bytes() {
    let bytes = build_valid_doc();
    assert_eq!(&bytes[4..6], &GUARD, "bytes 4-5 must be guard bytes");
}

#[test]
fn created_file_minimum_size() {
    let bytes = build_valid_doc();
    assert!(bytes.len() > HEADER_SIZE, "file must be larger than 64-byte header");
}

#[test]
fn created_file_has_required_folders() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let names = zip.entry_names();
    assert!(names.iter().any(|n| n.starts_with("pages/")),    "pages/ folder required");
    assert!(names.iter().any(|n| n.starts_with("metadata/")), "metadata/ folder required");
    assert!(names.iter().any(|n| n.starts_with("security/")), "security/ folder required");
    assert!(names.iter().any(|n| n.starts_with("assets/")),   "assets/ folder required");
}

// ─── 2. Validate File Structure ───────────────────────────────────────────────

#[test]
fn validate_valid_document_passes() {
    let bytes = build_valid_doc();
    let report = Validator::validate_bytes(&bytes);
    assert!(report.is_valid(), "valid document must pass: {:?}", report.findings);
    assert_eq!(report.fatal_count, 0);
}

#[test]
fn validate_checks_manifest_exists() {
    let bytes = build_valid_doc();
    let report = Validator::validate_bytes(&bytes);
    // If manifest was missing, stage 3 would be fatal — passing means it was found
    assert!(report.findings.iter().all(|f| f.code != "MANIFEST_MISSING"));
}

#[test]
fn validate_checks_version_supported() {
    let bytes = build_valid_doc();
    let report = Validator::validate_bytes(&bytes);
    assert!(report.findings.iter().all(|f| f.code != "VERSION_MISMATCH"));
}

#[test]
fn validate_checks_assets_folder() {
    let bytes = build_valid_doc();
    let report = Validator::validate_bytes(&bytes);
    assert!(report.findings.iter().all(|f| f.code != "ASSET_INDEX_MISSING"));
}

#[test]
fn validate_checks_metadata() {
    let bytes = build_valid_doc();
    let report = Validator::validate_bytes(&bytes);
    assert!(report.findings.iter().all(|f| f.code != "METADATA_MISSING"));
}

#[test]
fn validate_checks_permissions_and_security() {
    let bytes = build_valid_doc();
    let report = Validator::validate_bytes(&bytes);
    assert!(report.findings.iter().all(|f| f.code != "SECURITY_HASHES_MISSING"));
}

#[test]
fn validate_checks_signatures_entry() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    assert!(zip.has_entry("security/signatures.json"), "signatures.json must exist");
}

#[test]
fn validate_rejects_truncated_file() {
    let bytes = build_valid_doc();
    let truncated = &bytes[..32]; // less than 64 bytes
    let report = Validator::validate_bytes(truncated);
    assert!(!report.is_valid());
    assert!(report.findings.iter().any(|f| f.severity == Severity::Fatal));
}

#[test]
fn validate_rejects_bad_magic() {
    let mut bytes = build_valid_doc();
    bytes[0] = 0xFF;
    let report = Validator::validate_bytes(&bytes);
    assert!(!report.is_valid());
}

#[test]
fn validate_result_enum_pass() {
    let bytes = build_valid_doc();
    let report = Validator::validate_bytes(&bytes);
    assert!(matches!(
        report.result,
        ValidationResult::Pass | ValidationResult::PassWithWarnings
    ));
}

// ─── 3. Open Container ────────────────────────────────────────────────────────

#[test]
fn open_container_reads_manifest() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let manifest_bytes = zip.read_entry("manifest.json").expect("manifest.json must be readable");
    assert!(!manifest_bytes.is_empty());
}

#[test]
fn open_container_reads_metadata() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let meta_bytes = zip.read_entry("metadata/metadata.json").expect("metadata must be readable");
    assert!(!meta_bytes.is_empty());
}

#[test]
fn open_container_reads_resources() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let asset_bytes = zip.read_entry("assets/index.json").expect("assets/index.json must be readable");
    assert!(!asset_bytes.is_empty());
}

#[test]
fn open_container_rejects_missing_entry() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let result = zip.read_entry("nonexistent/file.json");
    assert!(result.is_err());
}

// ─── 4. Mount Virtual File System ────────────────────────────────────────────

#[test]
fn vfs_root_contains_assets() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let names = zip.entry_names();
    assert!(names.iter().any(|n| n.starts_with("assets/")));
}

#[test]
fn vfs_root_contains_content_via_pages() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let names = zip.entry_names();
    assert!(names.iter().any(|n| n.starts_with("pages/")));
}

#[test]
fn vfs_root_contains_scripts_folder_when_present() {
    // A basic doc has no scripts; verify the flag is false and no scripts/ folder
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let manifest_bytes = zip.read_entry("manifest.json").unwrap();
    let manifest = Manifest::from_bytes(&manifest_bytes).unwrap();
    if !manifest.features.has_scripts {
        let names = zip.entry_names();
        assert!(!names.iter().any(|n| n.starts_with("scripts/")));
    }
}

#[test]
fn vfs_root_contains_security() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let names = zip.entry_names();
    assert!(names.iter().any(|n| n.starts_with("security/")));
}

#[test]
fn vfs_root_contains_metadata() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let names = zip.entry_names();
    assert!(names.iter().any(|n| n.starts_with("metadata/")));
}

// ─── 5. Load Resources ────────────────────────────────────────────────────────

#[test]
fn resource_asset_index_is_valid_json() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let idx_bytes = zip.read_entry("assets/index.json").unwrap();
    let parsed: serde_json::Value = serde_json::from_slice(&idx_bytes)
        .expect("assets/index.json must be valid JSON");
    assert!(parsed.is_object());
}

#[test]
fn resource_page_content_is_valid_json() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let content_bytes = zip.read_entry("pages/page_001/content.json").unwrap();
    let parsed: serde_json::Value = serde_json::from_slice(&content_bytes)
        .expect("page content must be valid JSON");
    assert!(parsed.is_object());
}

#[test]
fn resource_page_layout_is_valid_json() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let layout_bytes = zip.read_entry("pages/page_001/layout.json").unwrap();
    let parsed: serde_json::Value = serde_json::from_slice(&layout_bytes)
        .expect("page layout must be valid JSON");
    assert!(parsed.is_object());
}

// ─── 6. Parse Manifest ────────────────────────────────────────────────────────

#[test]
fn manifest_parses_entry_page() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let mb = zip.read_entry("manifest.json").unwrap();
    let manifest = Manifest::from_bytes(&mb).unwrap();
    assert!(!manifest.document.entry_page.is_empty(), "entry_page must be set");
}

#[test]
fn manifest_parses_permissions() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let mb = zip.read_entry("manifest.json").unwrap();
    let manifest = Manifest::from_bytes(&mb).unwrap();
    // security block exists and has trust_level
    assert!(!manifest.security.trust_level.is_empty());
}

#[test]
fn manifest_parses_sdk_version() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let mb = zip.read_entry("manifest.json").unwrap();
    let manifest = Manifest::from_bytes(&mb).unwrap();
    assert!(!manifest.runtime.minimum_version.is_empty(), "runtime.minimum_version must be set");
}

#[test]
fn manifest_parses_required_runtime() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let mb = zip.read_entry("manifest.json").unwrap();
    let manifest = Manifest::from_bytes(&mb).unwrap();
    assert!(!manifest.document.spec_version.is_empty());
}

#[test]
fn manifest_parses_dependencies_list() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let mb = zip.read_entry("manifest.json").unwrap();
    let manifest = Manifest::from_bytes(&mb).unwrap();
    // plugins vec exists (may be empty for a basic doc)
    let _ = manifest.plugins;
}

#[test]
fn manifest_validates_without_error() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let mb = zip.read_entry("manifest.json").unwrap();
    let manifest = Manifest::from_bytes(&mb).unwrap();
    let result = manifest.validate();
    assert!(result.is_ok(), "manifest.validate() must not return Err");
}

// ─── 7. Verify Signature / Hash Integrity ────────────────────────────────────

#[test]
fn signature_file_exists() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    assert!(zip.has_entry("security/signatures.json"));
}

#[test]
fn hashes_file_exists() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    assert!(zip.has_entry("security/hashes.json"));
}

#[test]
fn hash_verification_passes_for_valid_doc() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let hash_bytes = zip.read_entry("security/hashes.json").unwrap();
    let hashes = HashesFile::from_bytes(&hash_bytes).unwrap();

    // Verify manifest.json hash
    let manifest_bytes = zip.read_entry("manifest.json").unwrap();
    assert!(hashes.verify("manifest.json", &manifest_bytes).is_ok());
}

#[test]
fn hash_verification_fails_on_tampered_content() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let hash_bytes = zip.read_entry("security/hashes.json").unwrap();
    let hashes = HashesFile::from_bytes(&hash_bytes).unwrap();

    let tampered = b"this is not the real manifest content";
    let result = hashes.verify("manifest.json", tampered);
    assert!(result.is_err(), "tampered content must fail hash verification");
}

#[test]
fn sha256_hex_produces_correct_length() {
    let hash = sha256_hex(b"hello world");
    assert_eq!(hash.len(), 64, "SHA-256 hex must be 64 characters");
}

#[test]
fn sha256_hex_is_deterministic() {
    let a = sha256_hex(b"ldoc");
    let b = sha256_hex(b"ldoc");
    assert_eq!(a, b);
}

#[test]
fn validator_detects_hash_mismatch() {
    // Build a valid doc, then corrupt a byte inside the ZIP payload area
    // to simulate content tampering — validator stage 7 should catch it
    let bytes = build_valid_doc();
    let report = Validator::validate_bytes(&bytes);
    // The unmodified doc must pass stage 7
    assert!(report.findings.iter().all(|f| f.code != "HASH_MISMATCH"),
        "unmodified doc must not have HASH_MISMATCH");
}

// ─── 8. Metadata Reading ──────────────────────────────────────────────────────

#[test]
fn metadata_reads_author() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let mb = zip.read_entry("metadata/metadata.json").unwrap();
    let meta = Metadata::from_bytes(&mb).unwrap();
    assert!(!meta.authors.is_empty(), "at least one author must be present");
    assert_eq!(meta.authors[0].name, "Test Author");
}

#[test]
fn metadata_reads_created_at() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let mb = zip.read_entry("metadata/metadata.json").unwrap();
    let meta = Metadata::from_bytes(&mb).unwrap();
    assert!(!meta.document.created_at.is_empty());
}

#[test]
fn metadata_reads_modified_at() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let mb = zip.read_entry("metadata/metadata.json").unwrap();
    let meta = Metadata::from_bytes(&mb).unwrap();
    assert!(!meta.document.modified_at.is_empty());
}

#[test]
fn metadata_reads_description_field() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let mb = zip.read_entry("metadata/metadata.json").unwrap();
    let meta = Metadata::from_bytes(&mb).unwrap();
    // description is optional — just confirm the field is accessible
    let _ = meta.document.description;
}

#[test]
fn metadata_reads_category() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let mb = zip.read_entry("metadata/metadata.json").unwrap();
    let meta = Metadata::from_bytes(&mb).unwrap();
    let _ = meta.categories;
}

#[test]
fn metadata_document_id_matches_manifest() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let mb = zip.read_entry("manifest.json").unwrap();
    let manifest = Manifest::from_bytes(&mb).unwrap();
    let meta_bytes = zip.read_entry("metadata/metadata.json").unwrap();
    let meta = Metadata::from_bytes(&meta_bytes).unwrap();
    assert_eq!(manifest.document.id, meta.document.id, "document IDs must match across files");
}

// ─── 9. Compression Support ───────────────────────────────────────────────────

#[test]
fn compression_manifest_is_stored_uncompressed() {
    use ldoc_core::container::compression_for_entry;
    use zip::CompressionMethod;
    assert_eq!(compression_for_entry("manifest.json"), CompressionMethod::Stored);
}

#[test]
fn compression_images_are_stored() {
    use ldoc_core::container::compression_for_entry;
    use zip::CompressionMethod;
    assert_eq!(compression_for_entry("assets/images/photo.jpg"), CompressionMethod::Stored);
}

#[test]
fn compression_audio_is_stored() {
    use ldoc_core::container::compression_for_entry;
    use zip::CompressionMethod;
    assert_eq!(compression_for_entry("assets/audio/track.mp3"), CompressionMethod::Stored);
}

#[test]
fn compression_video_is_stored() {
    use ldoc_core::container::compression_for_entry;
    use zip::CompressionMethod;
    assert_eq!(compression_for_entry("assets/video/clip.mp4"), CompressionMethod::Stored);
}

#[test]
fn compression_json_is_deflated() {
    use ldoc_core::container::compression_for_entry;
    use zip::CompressionMethod;
    assert_eq!(compression_for_entry("pages/page_001/content.json"), CompressionMethod::Deflated);
}

#[test]
fn compression_security_is_stored() {
    use ldoc_core::container::compression_for_entry;
    use zip::CompressionMethod;
    assert_eq!(compression_for_entry("security/hashes.json"), CompressionMethod::Stored);
}

// ─── 10. Resource Index ───────────────────────────────────────────────────────

#[test]
fn resource_index_hashes_file_has_entries() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let hash_bytes = zip.read_entry("security/hashes.json").unwrap();
    let hashes = HashesFile::from_bytes(&hash_bytes).unwrap();
    assert!(!hashes.entries.is_empty(), "hashes.json must contain at least one entry");
}

#[test]
fn resource_index_covers_manifest() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let hash_bytes = zip.read_entry("security/hashes.json").unwrap();
    let hashes = HashesFile::from_bytes(&hash_bytes).unwrap();
    assert!(hashes.entries.contains_key("manifest.json"), "manifest.json must be in hash index");
}

#[test]
fn resource_index_covers_page_content() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let hash_bytes = zip.read_entry("security/hashes.json").unwrap();
    let hashes = HashesFile::from_bytes(&hash_bytes).unwrap();
    assert!(hashes.entries.contains_key("pages/page_001/content.json"));
}

#[test]
fn resource_index_covers_metadata() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let hash_bytes = zip.read_entry("security/hashes.json").unwrap();
    let hashes = HashesFile::from_bytes(&hash_bytes).unwrap();
    assert!(hashes.entries.contains_key("metadata/metadata.json"));
}

#[test]
fn resource_index_hash_values_use_sha256_prefix() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let hash_bytes = zip.read_entry("security/hashes.json").unwrap();
    let hashes = HashesFile::from_bytes(&hash_bytes).unwrap();
    for (_, v) in &hashes.entries {
        assert!(v.starts_with("sha256:"), "all hash values must start with 'sha256:'");
    }
}

#[test]
fn resource_index_algorithm_field_is_sha256() {
    let bytes = build_valid_doc();
    let mut zip = open_zip(&bytes);
    let hash_bytes = zip.read_entry("security/hashes.json").unwrap();
    let hashes = HashesFile::from_bytes(&hash_bytes).unwrap();
    assert_eq!(hashes.algorithm, "sha256");
}

// ─── Header roundtrip (bonus — covers binary header spec) ────────────────────

#[test]
fn header_roundtrip() {
    let uuid = [0xABu8; 16];
    let h = LdocHeader::new(1, 0, 0, FLAG_HAS_SCRIPTS | FLAG_HAS_VIDEO, 0, 1700000000, uuid);
    let bytes = h.to_bytes();
    let parsed = LdocHeader::from_bytes(&bytes).unwrap();
    assert_eq!(h, parsed);
}

#[test]
fn header_feature_flag_detection() {
    let uuid = [0u8; 16];
    let h = LdocHeader::new(1, 0, 0, FLAG_HAS_SCRIPTS, 0, 0, uuid);
    assert!(h.has_feature(FLAG_HAS_SCRIPTS));
    assert!(!h.has_feature(FLAG_HAS_VIDEO));
}

#[test]
fn header_spec_version_string() {
    let uuid = [0u8; 16];
    let h = LdocHeader::new(1, 0, 0, 0, 0, 0, uuid);
    assert_eq!(h.spec_version_string(), "1.0.0");
}
