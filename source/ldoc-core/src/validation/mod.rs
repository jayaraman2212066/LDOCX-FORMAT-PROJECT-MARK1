// Module 08 — LDOC Validation Architecture — 14-stage pipeline

use serde::{Deserialize, Serialize};
use crate::{
    header::{LdocHeader, HEADER_SIZE},
    container::LdocZipReader,
    manifest::Manifest,
    metadata::Metadata,
    security::{HashesFile, SignaturesFile},
    assets::AssetIndex,
    pages::{PageIndex, PageContent},
};

// ── Finding ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Severity { Fatal, Warning, Info }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Finding {
    pub stage: u8,
    pub severity: Severity,
    pub code: String,
    pub message: String,
    pub path: Option<String>,
    pub repairable: bool,
}

impl Finding {
    fn fatal(stage: u8, code: &str, msg: impl Into<String>) -> Self {
        Self { stage, severity: Severity::Fatal, code: code.into(), message: msg.into(), path: None, repairable: false }
    }
    fn warn(stage: u8, code: &str, msg: impl Into<String>) -> Self {
        Self { stage, severity: Severity::Warning, code: code.into(), message: msg.into(), path: None, repairable: false }
    }
    fn info(stage: u8, code: &str, msg: impl Into<String>) -> Self {
        Self { stage, severity: Severity::Info, code: code.into(), message: msg.into(), path: None, repairable: false }
    }
    fn with_path(mut self, p: impl Into<String>) -> Self { self.path = Some(p.into()); self }
    fn repairable(mut self) -> Self { self.repairable = true; self }
}

// ── Report ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ValidationResult { Pass, PassWithWarnings, Fail }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationReport {
    pub schema_version: String,
    pub document_id: Option<String>,
    pub validated_at: String,
    pub runtime_version: String,
    pub result: ValidationResult,
    pub fatal_count: usize,
    pub warning_count: usize,
    pub info_count: usize,
    pub findings: Vec<Finding>,
}

impl ValidationReport {
    fn new() -> Self {
        Self {
            schema_version: "1.0.0".into(),
            document_id: None,
            validated_at: chrono::Utc::now().to_rfc3339(),
            runtime_version: crate::SPEC_VERSION.into(),
            result: ValidationResult::Pass,
            fatal_count: 0,
            warning_count: 0,
            info_count: 0,
            findings: vec![],
        }
    }

    fn add(&mut self, f: Finding) {
        match f.severity {
            Severity::Fatal   => self.fatal_count += 1,
            Severity::Warning => self.warning_count += 1,
            Severity::Info    => self.info_count += 1,
        }
        self.findings.push(f);
    }

    fn finalize(&mut self) {
        self.result = if self.fatal_count > 0 {
            ValidationResult::Fail
        } else if self.warning_count > 0 {
            ValidationResult::PassWithWarnings
        } else {
            ValidationResult::Pass
        };
    }

    pub fn is_valid(&self) -> bool { self.fatal_count == 0 }
}

// ── Validator ─────────────────────────────────────────────────────────────────

pub struct Validator;

impl Validator {
    /// Run the full 14-stage validation pipeline against raw LDOC file bytes.
    pub fn validate_bytes(data: &[u8]) -> ValidationReport {
        let mut report = ValidationReport::new();

        // ── Stage 1: Header ───────────────────────────────────────────────────
        if data.len() < HEADER_SIZE {
            report.add(Finding::fatal(1, "HEADER_FILE_TOO_SMALL",
                format!("File is {} bytes, minimum is 64", data.len())));
            report.finalize();
            return report;
        }

        let header_buf = &data[..HEADER_SIZE];
        let header = match LdocHeader::from_bytes(header_buf) {
            Ok(h) => h,
            Err(e) => {
                report.add(Finding::fatal(1, "HEADER_INVALID", e.to_string()));
                report.finalize();
                return report;
            }
        };
        for w in LdocHeader::validate_warnings(header_buf) {
            report.add(Finding::warn(1, "HEADER_RESERVED_NONZERO", w));
        }

        // ── Stage 2: Container ────────────────────────────────────────────────
        let cursor = std::io::Cursor::new(data);
        let mut zip = match LdocZipReader::open(cursor) {
            Ok(z) => z,
            Err(e) => {
                report.add(Finding::fatal(2, "CONTAINER_INVALID", e.to_string()));
                report.finalize();
                return report;
            }
        };
        // ZIP bomb guard: total decompressed size must not exceed 512 MiB
        const MAX_TOTAL_DECOMPRESSED: u64 = 512 * 1024 * 1024;
        let total_decompressed: u64 = zip.entry_names().iter()
            .filter_map(|name| zip.read_entry(name).ok())
            .map(|data| data.len() as u64)
            .sum();
        if total_decompressed > MAX_TOTAL_DECOMPRESSED {
            report.add(Finding::fatal(2, "CONTAINER_ZIP_BOMB",
                format!("Total decompressed size {} MiB exceeds limit of 512 MiB",
                    total_decompressed / (1024 * 1024))));
            report.finalize();
            return report;
        }
        match zip.validate() {
            Ok(warnings) => {
                for w in warnings {
                    report.add(Finding::warn(2, "CONTAINER_WARNING", w));
                }
            }
            Err(e) => {
                report.add(Finding::fatal(2, "CONTAINER_INVALID", e.to_string()));
                report.finalize();
                return report;
            }
        }

        // ── Stage 3: Manifest ─────────────────────────────────────────────────
        let manifest_bytes = match zip.read_entry("manifest.json") {
            Ok(b) => b,
            Err(_) => {
                report.add(Finding::fatal(3, "MANIFEST_MISSING", "manifest.json not found"));
                report.finalize();
                return report;
            }
        };
        if manifest_bytes.len() > crate::manifest::MAX_MANIFEST_SIZE {
            report.add(Finding::warn(3, "MANIFEST_TOO_LARGE",
                format!("manifest.json is {} bytes (> 256 KB)", manifest_bytes.len())).repairable());
        }
        let manifest = match Manifest::from_bytes(&manifest_bytes) {
            Ok(m) => m,
            Err(e) => {
                report.add(Finding::fatal(3, "MANIFEST_PARSE_ERROR", e.to_string()));
                report.finalize();
                return report;
            }
        };
        match manifest.validate() {
            Ok(warnings) => {
                for w in warnings {
                    report.add(Finding::warn(3, "MANIFEST_WARNING", w));
                }
            }
            Err(e) => {
                report.add(Finding::fatal(3, "MANIFEST_INVALID", e.to_string()));
                report.finalize();
                return report;
            }
        }
        // Feature flags must match binary header
        if let Err(e) = manifest.features.validate_against_header_flags(header.feature_flags) {
            report.add(Finding::fatal(3, "MANIFEST_FEATURE_FLAGS_MISMATCH", e.to_string()));
            report.finalize();
            return report;
        }
        report.document_id = Some(manifest.document.id.clone());

        // ── Stage 4: Metadata ─────────────────────────────────────────────────
        let meta_bytes = match zip.read_entry("metadata/metadata.json") {
            Ok(b) => b,
            Err(_) => {
                report.add(Finding::fatal(4, "METADATA_MISSING", "metadata/metadata.json not found"));
                report.finalize();
                return report;
            }
        };
        let metadata = match Metadata::from_bytes(&meta_bytes) {
            Ok(m) => m,
            Err(e) => {
                report.add(Finding::fatal(4, "METADATA_PARSE_ERROR", e.to_string()));
                report.finalize();
                return report;
            }
        };
        match metadata.validate(
            &manifest.document.id,
            &manifest.document.created_at,
            &manifest.document.modified_at,
            &manifest.document.spec_version,
        ) {
            Ok(warnings) => {
                for w in warnings {
                    report.add(Finding::warn(4, "METADATA_WARNING", w));
                }
            }
            Err(e) => {
                report.add(Finding::fatal(4, "METADATA_INVALID", e.to_string()));
                report.finalize();
                return report;
            }
        }

        // ── Stage 5: Version Compatibility ────────────────────────────────────
        let header_ver = header.spec_version_string();
        let manifest_ver = &manifest.document.spec_version;
        if header_ver != *manifest_ver {
            report.add(Finding::fatal(5, "VERSION_MISMATCH",
                format!("Header version {header_ver} != manifest spec_version {manifest_ver}")));
            report.finalize();
            return report;
        }
        if metadata.document.spec_version != *manifest_ver {
            report.add(Finding::fatal(5, "VERSION_MISMATCH",
                format!("Metadata spec_version {} != manifest spec_version {manifest_ver}",
                    metadata.document.spec_version)));
            report.finalize();
            return report;
        }
        if header.minor_version > crate::SPEC_MINOR {
            report.add(Finding::warn(5, "VERSION_MINOR_AHEAD",
                format!("Document minor version {} > runtime minor version {}",
                    header.minor_version, crate::SPEC_MINOR)));
        }

        // ── Stage 6: Security Validation ─────────────────────────────────────
        if !zip.has_entry("security/hashes.json") {
            report.add(Finding::warn(6, "SECURITY_HASHES_MISSING",
                "security/hashes.json not present — integrity unverifiable").repairable());
        }
        if zip.has_entry("security/signatures.json") {
            match zip.read_entry("security/signatures.json") {
                Ok(sig_bytes) => match SignaturesFile::from_bytes(&sig_bytes) {
                    Ok(sigs) => {
                        if let Err(e) = sigs.validate() {
                            report.add(Finding::fatal(6, "SECURITY_SIG_INVALID", e.to_string()));
                            report.finalize();
                            return report;
                        }
                    }
                    Err(e) => report.add(Finding::warn(6, "SECURITY_SIG_PARSE_ERROR", e.to_string())),
                },
                Err(_) => {}
            }
        } else {
            report.add(Finding::info(6, "SECURITY_UNSIGNED", "Document is unsigned"));
        }

        // ── Stage 7: Hash Verification ────────────────────────────────────────
        // Memory guard: limit total bytes read during hash verification to 500 MiB
        const MAX_HASH_VERIFY_BYTES: usize = 500 * 1024 * 1024;
        if zip.has_entry("security/hashes.json") {
            match zip.read_entry("security/hashes.json") {
                Ok(hash_bytes) => match HashesFile::from_bytes(&hash_bytes) {
                    Ok(hashes) => {
                        let mut total_bytes_read: usize = 0;
                        for name in zip.entry_names() {
                            if name.ends_with('/') { continue; }
                            if crate::security::HASH_EXCLUDED_PREFIXES.iter().any(|p| name.starts_with(p)) { continue; }
                            if let Ok(entry_data) = zip.read_entry(&name) {
                                total_bytes_read = total_bytes_read.saturating_add(entry_data.len());
                                if total_bytes_read > MAX_HASH_VERIFY_BYTES {
                                    report.add(Finding::warn(7, "HASH_VERIFY_MEMORY_LIMIT",
                                        format!("Hash verification stopped: total bytes read ({}) exceeds limit ({})",
                                            total_bytes_read, MAX_HASH_VERIFY_BYTES)));
                                    break;
                                }
                                if let Err(e) = hashes.verify(&name, &entry_data) {
                                    report.add(Finding::fatal(7, "HASH_MISMATCH", e.to_string())
                                        .with_path(name));
                                    report.finalize();
                                    return report;
                                }
                            }
                        }
                    }
                    Err(e) => report.add(Finding::fatal(7, "HASH_FILE_INVALID", e.to_string())),
                },
                Err(_) => {}
            }
        }

        // ── Stage 8: Asset Validation ─────────────────────────────────────────
        let has_assets = zip.entry_names().iter().any(|n| n.starts_with("assets/"));
        if has_assets {
            match zip.read_entry("assets/index.json") {
                Ok(idx_bytes) => match AssetIndex::from_bytes(&idx_bytes) {
                    Ok(idx) => {
                        match idx.validate() {
                            Ok(warnings) => {
                                for w in warnings {
                                    report.add(Finding::warn(8, "ASSET_WARNING", w));
                                }
                            }
                            Err(e) => report.add(Finding::fatal(8, "ASSET_INVALID", e.to_string())),
                        }
                        // Verify each asset file exists
                        for asset in &idx.assets {
                            if !zip.has_entry(&asset.path) {
                                report.add(Finding::fatal(8, "ASSET_FILE_MISSING",
                                    format!("Asset file missing: {}", asset.path))
                                    .with_path(asset.path.clone()));
                            }
                        }
                    }
                    Err(e) => report.add(Finding::fatal(8, "ASSET_INDEX_INVALID", e.to_string())),
                },
                Err(_) => report.add(Finding::fatal(8, "ASSET_INDEX_MISSING",
                    "assets/ folder present but assets/index.json missing")),
            }
        }

        // ── Stage 9: Page Validation ──────────────────────────────────────────
        match zip.read_entry("pages/index.json") {
            Ok(idx_bytes) => match PageIndex::from_bytes(&idx_bytes) {
                Ok(idx) => {
                    match idx.validate(manifest.document.page_count) {
                        Ok(warnings) => {
                            for w in warnings {
                                report.add(Finding::warn(9, "PAGE_WARNING", w));
                            }
                        }
                        Err(e) => {
                            report.add(Finding::fatal(9, "PAGE_INDEX_INVALID", e.to_string()));
                            report.finalize();
                            return report;
                        }
                    }
                    // Verify each page directory has content.json and layout.json
                    for page in &idx.pages {
                        let content_path = format!("{}/content.json", page.path);
                        let layout_path  = format!("{}/layout.json",  page.path);
                        if !zip.has_entry(&content_path) {
                            report.add(Finding::fatal(9, "PAGE_CONTENT_MISSING",
                                format!("content.json missing for page {}", page.path))
                                .with_path(content_path));
                        } else if let Ok(cb) = zip.read_entry(&format!("{}/content.json", page.path)) {
                            match PageContent::from_bytes(&cb) {
                                Ok(pc) => {
                                    if let Err(e) = pc.validate() {
                                        report.add(Finding::fatal(9, "PAGE_CONTENT_INVALID", e.to_string()));
                                    }
                                }
                                Err(e) => report.add(Finding::fatal(9, "PAGE_CONTENT_PARSE_ERROR", e.to_string())),
                            }
                        }
                        if !zip.has_entry(&layout_path) {
                            report.add(Finding::fatal(9, "PAGE_LAYOUT_MISSING",
                                format!("layout.json missing for page {}", page.path))
                                .with_path(layout_path));
                        }
                    }
                }
                Err(e) => {
                    report.add(Finding::fatal(9, "PAGE_INDEX_PARSE_ERROR", e.to_string()));
                    report.finalize();
                    return report;
                }
            },
            Err(_) => {
                report.add(Finding::fatal(9, "PAGE_INDEX_MISSING", "pages/index.json not found"));
                report.finalize();
                return report;
            }
        }

        // ── Stage 10: Script Validation ───────────────────────────────────────
        if manifest.features.has_scripts {
            match zip.read_entry("scripts/index.json") {
                Ok(sb) => {
                    if serde_json::from_slice::<serde_json::Value>(&sb).is_err() {
                        report.add(Finding::fatal(10, "SCRIPT_INDEX_INVALID", "scripts/index.json is not valid JSON"));
                    }
                }
                Err(_) => report.add(Finding::fatal(10, "SCRIPT_INDEX_MISSING",
                    "HAS_SCRIPTS is set but scripts/index.json is missing")),
            }
        }

        // ── Stage 11: Annotation Validation ──────────────────────────────────
        if manifest.features.has_annotations {
            match zip.read_entry("annotations/index.json") {
                Ok(ab) => {
                    if serde_json::from_slice::<serde_json::Value>(&ab).is_err() {
                        report.add(Finding::warn(11, "ANNOTATION_INDEX_INVALID",
                            "annotations/index.json is not valid JSON"));
                    }
                }
                Err(_) => report.add(Finding::fatal(11, "ANNOTATION_INDEX_MISSING",
                    "HAS_ANNOTATIONS is set but annotations/index.json is missing")),
            }
        }

        // ── Stage 12: AI Data Validation ──────────────────────────────────────
        if manifest.features.has_ai {
            match zip.read_entry("ai/index.json") {
                Ok(ab) => {
                    if serde_json::from_slice::<serde_json::Value>(&ab).is_err() {
                        report.add(Finding::fatal(12, "AI_INDEX_INVALID", "ai/index.json is not valid JSON"));
                    }
                }
                Err(_) => report.add(Finding::fatal(12, "AI_INDEX_MISSING",
                    "HAS_AI is set but ai/index.json is missing")),
            }
        }

        // ── Stage 13: Broken Link Validation ─────────────────────────────────
        for plugin in &manifest.plugins {
            if plugin.embedded {
                if let Some(path) = &plugin.path {
                    let plugin_json = format!("{}/plugin.json", path.trim_end_matches('/'));
                    if !zip.has_entry(&plugin_json) {
                        if plugin.required {
                            report.add(Finding::fatal(13, "PLUGIN_MISSING",
                                format!("Required plugin '{}' not found at {}", plugin.id, plugin_json))
                                .with_path(plugin_json));
                        } else {
                            report.add(Finding::warn(13, "PLUGIN_MISSING",
                                format!("Optional plugin '{}' not found at {}", plugin.id, plugin_json))
                                .with_path(plugin_json));
                        }
                    }
                }
            }
        }

        // ── Stage 14: Performance Validation ─────────────────────────────────
        let total_size = data.len();
        report.add(Finding::info(14, "PERF_TOTAL_SIZE",
            format!("Total document size: {} bytes ({:.1} KB)", total_size, total_size as f64 / 1024.0)));
        report.add(Finding::info(14, "PERF_PAGE_COUNT",
            format!("Page count: {}", manifest.document.page_count)));

        let asset_count = zip.entry_names().iter()
            .filter(|n| n.starts_with("assets/") && !n.ends_with('/') && *n != "assets/index.json")
            .count();
        report.add(Finding::info(14, "PERF_ASSET_COUNT",
            format!("Asset count: {}", asset_count)));

        if !zip.has_entry("thumbnails/cover.webp") {
            report.add(Finding::info(14, "PERF_NO_THUMBNAIL",
                "No cover thumbnail (thumbnails/cover.webp) — recommended for file browsers"));
        }

        report.finalize();
        report
    }
}
