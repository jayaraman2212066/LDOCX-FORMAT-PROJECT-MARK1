// Module 05 — LDOC manifest.json Specification

use serde::{Deserialize, Serialize};
use crate::LdocError;

/// Maximum allowed size of manifest.json in bytes.
pub const MAX_MANIFEST_SIZE: usize = 256 * 1024; // 256 KB

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Manifest {
    #[serde(rename = "$schema")]
    pub schema: Option<String>,
    pub schema_version: String,
    pub document: DocumentBlock,
    pub runtime: RuntimeBlock,
    pub features: FeaturesBlock,
    pub plugins: Vec<PluginDeclaration>,
    pub security: SecurityBlock,
    pub localization: LocalizationBlock,
    pub accessibility: AccessibilityBlock,
    pub compatibility: CompatibilityBlock,
    #[serde(rename = "_reserved")]
    pub reserved: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentBlock {
    pub id: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub language: String,
    pub locales: Vec<String>,
    pub direction: String,
    pub entry_page: String,
    pub page_count: u32,
    pub document_type: String,
    pub created_at: String,
    pub modified_at: String,
    pub spec_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeBlock {
    pub minimum_version: String,
    pub recommended_version: Option<String>,
    pub offline_capable: bool,
    pub requires_network: bool,
    pub requires_gpu: bool,
    pub target_platforms: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeaturesBlock {
    pub has_scripts: bool,
    pub has_ai: bool,
    pub has_plugins: bool,
    pub has_encryption: bool,
    pub has_digital_signature: bool,
    pub has_annotations: bool,
    pub has_collaboration: bool,
    pub has_cloud_sync: bool,
    pub has_3d: bool,
    pub has_video: bool,
    pub has_audio: bool,
    pub has_forms: bool,
    pub has_version_history: bool,
    pub readonly: bool,
}

impl FeaturesBlock {
    /// Convert features block to the u16 feature flags bitmask (Module 02 §4).
    pub fn to_feature_flags(&self) -> u16 {
        use crate::header::*;
        let mut flags: u16 = 0;
        if self.has_scripts         { flags |= FLAG_HAS_SCRIPTS; }
        if self.has_ai              { flags |= FLAG_HAS_AI; }
        if self.has_plugins         { flags |= FLAG_HAS_PLUGINS; }
        if self.has_encryption      { flags |= FLAG_HAS_ENCRYPTION; }
        if self.has_digital_signature { flags |= FLAG_HAS_DIGITAL_SIG; }
        if self.has_annotations     { flags |= FLAG_HAS_ANNOTATIONS; }
        if self.has_collaboration   { flags |= FLAG_HAS_COLLABORATION; }
        if self.has_cloud_sync      { flags |= FLAG_HAS_CLOUD_SYNC; }
        if self.has_3d              { flags |= FLAG_HAS_3D; }
        if self.has_video           { flags |= FLAG_HAS_VIDEO; }
        if self.has_audio           { flags |= FLAG_HAS_AUDIO; }
        if self.has_forms           { flags |= FLAG_HAS_FORMS; }
        if self.has_version_history { flags |= FLAG_HAS_VERSION_HISTORY; }
        if self.readonly            { flags |= FLAG_READONLY; }
        flags
    }

    /// Validate that the features block matches the binary header feature flags.
    pub fn validate_against_header_flags(&self, header_flags: u16) -> Result<(), LdocError> {
        if self.to_feature_flags() != header_flags {
            return Err(LdocError::FeatureFlagsMismatch);
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginDeclaration {
    pub id: String,
    pub version: String,
    pub minimum_version: String,
    pub embedded: bool,
    pub path: Option<String>,
    pub required: bool,
    pub permissions: Vec<String>,
    pub checksum: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityBlock {
    pub signed: bool,
    pub signer_id: Option<String>,
    pub signature_algorithm: Option<String>,
    pub trust_level: String,
    pub content_hash_algorithm: String,
    pub hashes_file: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalizationBlock {
    pub default_locale: String,
    pub available_locales: Vec<String>,
    pub locale_data_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessibilityBlock {
    pub has_alt_text: bool,
    pub has_aria_labels: bool,
    pub has_reading_order: bool,
    pub wcag_level: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompatibilityBlock {
    pub min_spec_version: String,
    pub max_tested_spec_version: String,
    pub deprecated_features: Vec<String>,
    pub unknown_feature_policy: String,
}

impl Manifest {
    /// Parse manifest.json bytes into a Manifest struct.
    pub fn from_bytes(data: &[u8]) -> Result<Self, LdocError> {
        serde_json::from_slice(data).map_err(|e| LdocError::ManifestParseError(e.to_string()))
    }

    /// Serialize to JSON bytes (uncompressed, UTF-8, no BOM).
    pub fn to_bytes(&self) -> Result<Vec<u8>, LdocError> {
        serde_json::to_vec_pretty(self).map_err(LdocError::Json)
    }

    /// Validate the manifest. Returns warnings; fatal errors are returned as Err.
    pub fn validate(&self) -> Result<Vec<String>, LdocError> {
        let mut warnings = Vec::new();

        // schema_version required
        if self.schema_version.is_empty() {
            return Err(LdocError::ManifestFieldInvalid(
                "schema_version".into(), "must not be empty".into(),
            ));
        }

        // document.id must be valid UUID v4
        validate_uuid(&self.document.id, "document.id")?;

        // document.title must not be empty
        if self.document.title.trim().is_empty() {
            return Err(LdocError::ManifestFieldInvalid(
                "document.title".into(), "must not be empty".into(),
            ));
        }

        // document.language must be non-empty BCP 47
        if self.document.language.trim().is_empty() {
            return Err(LdocError::ManifestFieldInvalid(
                "document.language".into(), "must be a valid BCP 47 tag".into(),
            ));
        }

        // entry_page required
        if self.document.entry_page.trim().is_empty() {
            return Err(LdocError::ManifestFieldInvalid(
                "document.entry_page".into(), "must not be empty".into(),
            ));
        }

        // page_count >= 1
        if self.document.page_count < 1 {
            return Err(LdocError::ManifestFieldInvalid(
                "document.page_count".into(), "must be >= 1".into(),
            ));
        }

        // direction must be ltr or rtl
        if self.document.direction != "ltr" && self.document.direction != "rtl" {
            return Err(LdocError::ManifestFieldInvalid(
                "document.direction".into(), "must be 'ltr' or 'rtl'".into(),
            ));
        }

        // security.hashes_file should exist
        if self.security.hashes_file.is_empty() {
            warnings.push("security.hashes_file is empty".into());
        }

        // reserved should be empty object
        if !self.reserved.is_null() {
            if let Some(obj) = self.reserved.as_object() {
                if !obj.is_empty() {
                    warnings.push("_reserved contains unexpected fields".into());
                }
            }
        }

        Ok(warnings)
    }

    /// Build a default manifest for a new document.
    pub fn new_document(
        id: &str,
        title: &str,
        language: &str,
        page_count: u32,
        spec_version: &str,
        created_at: &str,
    ) -> Self {
        Self {
            schema: Some("https://spec.ldoc.org/schemas/manifest/1.0.0.json".into()),
            schema_version: "1.0.0".into(),
            document: DocumentBlock {
                id: id.to_string(),
                title: title.to_string(),
                subtitle: None,
                language: language.to_string(),
                locales: vec![language.to_string()],
                direction: "ltr".into(),
                entry_page: "pages/page_001".into(),
                page_count,
                document_type: "document".into(),
                created_at: created_at.to_string(),
                modified_at: created_at.to_string(),
                spec_version: spec_version.to_string(),
            },
            runtime: RuntimeBlock {
                minimum_version: "1.0.0".into(),
                recommended_version: Some("1.0.0".into()),
                offline_capable: true,
                requires_network: false,
                requires_gpu: false,
                target_platforms: vec!["windows".into(), "linux".into(), "macos".into(), "web".into()],
            },
            features: FeaturesBlock {
                has_scripts: false, has_ai: false, has_plugins: false,
                has_encryption: false, has_digital_signature: false,
                has_annotations: false, has_collaboration: false,
                has_cloud_sync: false, has_3d: false, has_video: false,
                has_audio: false, has_forms: false, has_version_history: false,
                readonly: false,
            },
            plugins: vec![],
            security: SecurityBlock {
                signed: false,
                signer_id: None,
                signature_algorithm: None,
                trust_level: "untrusted".into(),
                content_hash_algorithm: "sha256".into(),
                hashes_file: "security/hashes.json".into(),
            },
            localization: LocalizationBlock {
                default_locale: language.to_string(),
                available_locales: vec![language.to_string()],
                locale_data_path: None,
            },
            accessibility: AccessibilityBlock {
                has_alt_text: false,
                has_aria_labels: false,
                has_reading_order: false,
                wcag_level: None,
            },
            compatibility: CompatibilityBlock {
                min_spec_version: "1.0.0".into(),
                max_tested_spec_version: "1.0.0".into(),
                deprecated_features: vec![],
                unknown_feature_policy: "warn".into(),
            },
            reserved: serde_json::json!({}),
        }
    }
}

/// Validate that a string is a valid UUID v4 format.
pub fn validate_uuid(s: &str, field: &str) -> Result<(), LdocError> {
    // UUID v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // where y must be 8, 9, a, or b (variant 1 bits)
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() != 5
        || parts[0].len() != 8
        || parts[1].len() != 4
        || parts[2].len() != 4
        || parts[3].len() != 4
        || parts[4].len() != 12
        || parts[2].chars().next() != Some('4')
        || !s.chars().all(|c| c.is_ascii_hexdigit() || c == '-')
    {
        return Err(LdocError::ManifestFieldInvalid(
            field.to_string(),
            format!("'{s}' is not a valid UUID v4"),
        ));
    }
    // Validate variant bits: first character of parts[3] must be 8, 9, a, or b
    let variant_char = parts[3].chars().next().unwrap_or('0');
    if !matches!(variant_char, '8' | '9' | 'a' | 'A' | 'b' | 'B') {
        return Err(LdocError::ManifestFieldInvalid(
            field.to_string(),
            format!("'{s}' has invalid UUID v4 variant bits (y must be 8, 9, a, or b)"),
        ));
    }
    Ok(())
}
