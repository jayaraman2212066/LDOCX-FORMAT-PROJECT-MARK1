// LDOC SDK — Document API
// High-level types for loading, inspecting, and creating LDOC documents.

use serde::{Deserialize, Serialize};
use crate::error::SdkError;

// ── Public types ──────────────────────────────────────────────────────────────

/// Validation result returned by the SDK.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LdocValidation {
    pub valid: bool,
    pub fatal_count: u32,
    pub warning_count: u32,
    pub info_count: u32,
    pub document_id: Option<String>,
    pub findings: Vec<LdocFinding>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LdocFinding {
    pub severity: String,
    pub code: String,
    pub message: String,
    pub path: Option<String>,
}

/// Manifest-level document info.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LdocManifest {
    pub document_id: String,
    pub title: String,
    pub language: String,
    pub page_count: u32,
    pub entry_page: String,
    pub spec_version: String,
    pub created_at: String,
    pub modified_at: String,
}

/// Metadata-level document info.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LdocMetadata {
    pub document_version: String,
    pub revision: u32,
    pub is_draft: bool,
    pub license: String,
    pub authors: Vec<String>,
}

/// A single page summary.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LdocPage {
    pub id: String,
    pub title: String,
    pub number: u32,
    pub visible: bool,
    pub node_count: usize,
}

/// A fully loaded LDOC document exposed through the SDK.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LdocDocument {
    pub manifest: LdocManifest,
    pub metadata: LdocMetadata,
    pub pages: Vec<LdocPage>,
    pub raw_size_bytes: u64,
    pub validation: LdocValidation,
}

// ── SDK functions ─────────────────────────────────────────────────────────────

impl LdocDocument {
    /// Load an LDOC document from bytes.
    pub fn from_bytes(data: &[u8]) -> Result<Self, SdkError> {
        use ldoc_core::{Validator, Severity};
        use ldoc_core::container::LdocZipReader;
        use ldoc_core::manifest::Manifest;
        use ldoc_core::metadata::Metadata;
        use ldoc_core::pages::PageIndex;
        use std::io::Cursor;

        // Validate
        let report = Validator::validate_bytes(data);
        let validation = LdocValidation {
            valid: report.is_valid(),
            fatal_count: report.fatal_count as u32,
            warning_count: report.warning_count as u32,
            info_count: report.info_count as u32,
            document_id: report.document_id.clone(),
            findings: report.findings.iter().map(|f| LdocFinding {
                severity: format!("{:?}", f.severity),
                code: f.code.clone(),
                message: f.message.clone(),
                path: f.path.clone(),
            }).collect(),
        };

        if !report.is_valid() {
            let msg = report.findings.iter()
                .filter(|f| f.severity == Severity::Fatal)
                .map(|f| f.message.as_str())
                .collect::<Vec<_>>()
                .join("; ");
            return Err(SdkError::ValidationFailed(msg));
        }

        // Parse ZIP
        let mut zip = LdocZipReader::open(Cursor::new(data))
            .map_err(|e| SdkError::Core(e))?;

        let manifest: Manifest = {
            let b = zip.read_entry("manifest.json").map_err(|e| SdkError::Core(e))?;
            Manifest::from_bytes(&b).map_err(|e| SdkError::Core(e))?
        };

        let meta: Metadata = {
            let b = zip.read_entry("metadata/metadata.json").map_err(|e| SdkError::Core(e))?;
            Metadata::from_bytes(&b).map_err(|e| SdkError::Core(e))?
        };

        let page_index: PageIndex = {
            let b = zip.read_entry("pages/index.json").map_err(|e| SdkError::Core(e))?;
            PageIndex::from_bytes(&b).map_err(|e| SdkError::Core(e))?
        };

        // Build page summaries
        let pages: Vec<LdocPage> = page_index.pages.iter().map(|e| {
            // Try to count nodes in content
            let node_count = zip.read_entry(&format!("{}/content.json", e.path))
                .ok()
                .and_then(|b| ldoc_core::pages::PageContent::from_bytes(&b).ok())
                .map(|c| c.root.children.len())
                .unwrap_or(0);

            LdocPage {
                id: e.id.clone(),
                title: e.title.clone().unwrap_or_else(|| format!("Page {}", e.number)),
                number: e.number,
                visible: e.visible,
                node_count,
            }
        }).collect();

        let ldoc_manifest = LdocManifest {
            document_id: manifest.document.id.clone(),
            title: manifest.document.title.clone(),
            language: manifest.document.language.clone(),
            page_count: manifest.document.page_count,
            entry_page: manifest.document.entry_page.clone(),
            spec_version: manifest.document.spec_version.clone(),
            created_at: manifest.document.created_at.clone(),
            modified_at: manifest.document.modified_at.clone(),
        };

        let ldoc_meta = LdocMetadata {
            document_version: meta.version.document_version.clone(),
            revision: meta.version.revision,
            is_draft: meta.version.is_draft,
            license: meta.license.name.clone(),
            authors: meta.authors.iter().map(|a| a.name.clone()).collect(),
        };

        Ok(LdocDocument {
            manifest: ldoc_manifest,
            metadata: ldoc_meta,
            pages,
            raw_size_bytes: data.len() as u64,
            validation,
        })
    }

    /// Load an LDOC document from a file path.
    pub fn from_file(path: &str) -> Result<Self, SdkError> {
        let data = std::fs::read(path)?;
        Self::from_bytes(&data)
    }

    /// Validate bytes without fully loading the document.
    pub fn validate_bytes(data: &[u8]) -> LdocValidation {
        let report = ldoc_core::Validator::validate_bytes(data);
        LdocValidation {
            valid: report.is_valid(),
            fatal_count: report.fatal_count as u32,
            warning_count: report.warning_count as u32,
            info_count: report.info_count as u32,
            document_id: report.document_id,
            findings: report.findings.iter().map(|f| LdocFinding {
                severity: format!("{:?}", f.severity),
                code: f.code.clone(),
                message: f.message.clone(),
                path: f.path.clone(),
            }).collect(),
        }
    }

    /// Create a new LDOC document from a builder spec and return the bytes.
    pub fn create(title: &str, language: &str, author: &str) -> Result<Vec<u8>, SdkError> {
        let bytes = ldoc_core::DocumentBuilder::new(title, language, author)
            .build()?;
        Ok(bytes)
    }
}
