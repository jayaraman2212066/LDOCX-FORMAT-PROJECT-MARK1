// Module 06 — LDOC Metadata Subsystem Specification

use serde::{Deserialize, Serialize};
use crate::LdocError;

pub const MAX_METADATA_SIZE: usize = 2 * 1024 * 1024; // 2 MB
pub const MAX_REVISION_HISTORY: usize = 1000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Metadata {
    #[serde(rename = "$schema")]
    pub schema: Option<String>,
    pub schema_version: String,
    pub document: MetaDocumentBlock,
    pub authors: Vec<Author>,
    pub contributors: Vec<Author>,
    pub version: VersionBlock,
    pub license: LicenseBlock,
    pub permissions: PermissionsBlock,
    pub keywords: Vec<String>,
    pub categories: Vec<Category>,
    pub ai_metadata: AiMetadataBlock,
    pub accessibility: MetaAccessibilityBlock,
    pub localization: MetaLocalizationBlock,
    pub revision_history: Vec<RevisionEntry>,
    #[serde(rename = "_reserved")]
    pub reserved: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaDocumentBlock {
    pub id: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub r#abstract: Option<String>,
    pub description: Option<String>,
    pub document_type: String,
    pub language: String,
    pub direction: String,
    pub created_at: String,
    pub modified_at: String,
    pub published_at: Option<String>,
    pub expires_at: Option<String>,
    pub spec_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Author {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub organization: Option<String>,
    pub role: String,
    pub orcid: Option<String>,
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionBlock {
    pub document_version: String,
    pub revision: u32,
    pub branch: Option<String>,
    pub is_draft: bool,
    pub is_template: bool,
    pub changelog: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseBlock {
    pub spdx_id: Option<String>,
    pub name: String,
    pub url: Option<String>,
    pub custom_license_text: Option<String>,
    pub commercial_use: bool,
    pub modification_allowed: bool,
    pub distribution_allowed: bool,
    pub attribution_required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionsBlock {
    pub allow_printing: bool,
    pub allow_copying: bool,
    pub allow_editing: bool,
    pub allow_annotation: bool,
    pub allow_extraction: bool,
    pub allow_accessibility: bool,
    pub password_protected: bool,
    pub drm_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub scheme: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiMetadataBlock {
    pub ai_generated: bool,
    pub ai_assisted: bool,
    pub ai_model_ids: Vec<String>,
    pub ai_content_policy: String,
    pub ai_disclosure: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaAccessibilityBlock {
    pub wcag_level: Option<String>,
    pub has_alt_text: bool,
    pub has_captions: bool,
    pub has_audio_description: bool,
    pub has_reading_order: bool,
    pub has_aria_labels: bool,
    pub language_declared: bool,
    pub color_contrast_verified: bool,
    pub keyboard_navigable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaLocalizationBlock {
    pub default_locale: String,
    pub available_locales: Vec<String>,
    pub rtl_locales: Vec<String>,
    pub locale_completeness: std::collections::HashMap<String, u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevisionEntry {
    pub revision: u32,
    pub version: String,
    pub author_id: String,
    pub timestamp: String,
    pub action: String,
    pub summary: Option<String>,
    pub spec_version: String,
}

impl Metadata {
    pub fn from_bytes(data: &[u8]) -> Result<Self, LdocError> {
        serde_json::from_slice(data).map_err(|e| LdocError::MetadataParseError(e.to_string()))
    }

    pub fn to_bytes(&self) -> Result<Vec<u8>, LdocError> {
        serde_json::to_vec_pretty(self).map_err(LdocError::Json)
    }

    /// Validate metadata and cross-validate against manifest fields.
    pub fn validate(
        &self,
        manifest_id: &str,
        manifest_created_at: &str,
        manifest_modified_at: &str,
        manifest_spec_version: &str,
    ) -> Result<Vec<String>, LdocError> {
        let mut warnings = Vec::new();

        if self.document.id != manifest_id {
            return Err(LdocError::CrossFileMismatch("document.id".into()));
        }

        if self.document.title.trim().is_empty() {
            return Err(LdocError::MetadataFieldInvalid("document.title".into(), "must not be empty".into()));
        }

        if self.document.created_at != manifest_created_at {
            return Err(LdocError::CrossFileMismatch("document.created_at".into()));
        }
        if self.document.modified_at != manifest_modified_at {
            return Err(LdocError::CrossFileMismatch("document.modified_at".into()));
        }

        if self.document.spec_version != manifest_spec_version {
            return Err(LdocError::CrossFileMismatch("document.spec_version".into()));
        }

        if self.version.revision < 1 {
            return Err(LdocError::MetadataFieldInvalid("version.revision".into(), "must be >= 1".into()));
        }

        // warnings
        if self.authors.is_empty() {
            warnings.push("No authors declared in metadata".into());
        }
        if !self.permissions.allow_accessibility {
            warnings.push("permissions.allow_accessibility should not be false".into());
        }
        if self.revision_history.len() > MAX_REVISION_HISTORY {
            warnings.push(format!(
                "revision_history has {} entries (> {}), should be archived",
                self.revision_history.len(), MAX_REVISION_HISTORY
            ));
        }

        Ok(warnings)
    }

    /// Build a default metadata record for a new document.
    pub fn new_document(
        id: &str,
        title: &str,
        language: &str,
        spec_version: &str,
        created_at: &str,
        author_name: &str,
    ) -> Self {
        let author_id = uuid::Uuid::new_v4().to_string();
        Self {
            schema: Some("https://spec.ldoc.org/schemas/metadata/1.0.0.json".into()),
            schema_version: "1.0.0".into(),
            document: MetaDocumentBlock {
                id: id.to_string(),
                title: title.to_string(),
                subtitle: None,
                r#abstract: None,
                description: None,
                document_type: "document".into(),
                language: language.to_string(),
                direction: "ltr".into(),
                created_at: created_at.to_string(),
                modified_at: created_at.to_string(),
                published_at: None,
                expires_at: None,
                spec_version: spec_version.to_string(),
            },
            authors: vec![Author {
                id: author_id.clone(),
                name: author_name.to_string(),
                email: None,
                organization: None,
                role: "author".into(),
                orcid: None,
                url: None,
            }],
            contributors: vec![],
            version: VersionBlock {
                document_version: "1.0.0".into(),
                revision: 1,
                branch: Some("main".into()),
                is_draft: false,
                is_template: false,
                changelog: Some("Initial document creation".into()),
            },
            license: LicenseBlock {
                spdx_id: Some("CC-BY-4.0".into()),
                name: "Creative Commons Attribution 4.0 International".into(),
                url: Some("https://creativecommons.org/licenses/by/4.0/".into()),
                custom_license_text: None,
                commercial_use: true,
                modification_allowed: true,
                distribution_allowed: true,
                attribution_required: true,
            },
            permissions: PermissionsBlock {
                allow_printing: true,
                allow_copying: true,
                allow_editing: true,
                allow_annotation: true,
                allow_extraction: true,
                allow_accessibility: true,
                password_protected: false,
                drm_enabled: false,
            },
            keywords: vec![],
            categories: vec![],
            ai_metadata: AiMetadataBlock {
                ai_generated: false,
                ai_assisted: false,
                ai_model_ids: vec![],
                ai_content_policy: "none".into(),
                ai_disclosure: None,
            },
            accessibility: MetaAccessibilityBlock {
                wcag_level: None,
                has_alt_text: false,
                has_captions: false,
                has_audio_description: false,
                has_reading_order: false,
                has_aria_labels: false,
                language_declared: true,
                color_contrast_verified: false,
                keyboard_navigable: false,
            },
            localization: MetaLocalizationBlock {
                default_locale: language.to_string(),
                available_locales: vec![language.to_string()],
                rtl_locales: vec![],
                locale_completeness: {
                    let mut m = std::collections::HashMap::new();
                    m.insert(language.to_string(), 100u8);
                    m
                },
            },
            revision_history: vec![RevisionEntry {
                revision: 1,
                version: "1.0.0".into(),
                author_id,
                timestamp: created_at.to_string(),
                action: "created".into(),
                summary: Some("Initial document creation".into()),
                spec_version: spec_version.to_string(),
            }],
            reserved: serde_json::json!({}),
        }
    }
}
