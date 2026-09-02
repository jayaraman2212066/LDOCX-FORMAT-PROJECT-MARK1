// Module 10 — LDOC Asset Management System Specification

use serde::{Deserialize, Serialize};
use crate::LdocError;

/// Content-addressed asset naming: first 32 hex chars of SHA-256 + extension.
pub fn content_addressed_name(hash_hex: &str, extension: &str) -> String {
    format!("{}.{}", &hash_hex[..32.min(hash_hex.len())], extension)
}

/// Validate that an asset name follows the content-addressed convention.
pub fn is_content_addressed(name: &str) -> bool {
    if let Some(dot) = name.rfind('.') {
        let stem = &name[..dot];
        stem.len() == 32 && stem.chars().all(|c| c.is_ascii_hexdigit())
    } else {
        false
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetIndex {
    pub schema_version: String,
    pub assets: Vec<AssetEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetEntry {
    pub id: String,
    #[serde(rename = "type")]
    pub asset_type: String,
    pub subtype: String,
    pub path: String,
    pub original_name: Option<String>,
    pub size_bytes: u64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub duration_ms: Option<u64>,
    pub checksum: String,
    pub mime_type: String,
    pub created_at: String,
    pub alt_text: Option<String>,
    pub license_ref: Option<String>,
    pub tags: Vec<String>,
}

impl AssetIndex {
    pub fn new() -> Self {
        Self { schema_version: "1.0.0".into(), assets: vec![] }
    }

    pub fn from_bytes(data: &[u8]) -> Result<Self, LdocError> {
        serde_json::from_slice(data).map_err(|e| LdocError::MetadataParseError(e.to_string()))
    }

    pub fn to_bytes(&self) -> Result<Vec<u8>, LdocError> {
        serde_json::to_vec_pretty(self).map_err(LdocError::Json)
    }

    pub fn find_by_id(&self, id: &str) -> Option<&AssetEntry> {
        self.assets.iter().find(|a| a.id == id)
    }

    pub fn find_by_hash(&self, hash_hex: &str) -> Option<&AssetEntry> {
        let prefix = format!("sha256:{}", hash_hex);
        self.assets.iter().find(|a| a.checksum.starts_with(&prefix))
    }

    /// Validate the asset index. Returns warnings; fatal errors as Err.
    pub fn validate(&self) -> Result<Vec<String>, LdocError> {
        let mut warnings = Vec::new();
        let mut seen_ids = std::collections::HashSet::new();

        for asset in &self.assets {
            if !seen_ids.insert(asset.id.clone()) {
                return Err(LdocError::ManifestFieldInvalid(
                    "asset.id".into(),
                    format!("Duplicate asset ID: {}", asset.id),
                ));
            }

            // Content-addressed naming
            let filename = asset.path.split('/').last().unwrap_or("");
            if !is_content_addressed(filename) {
                warnings.push(format!(
                    "Asset '{}' does not follow content-addressed naming convention", asset.path
                ));
            }

            // Images should have alt_text
            if asset.asset_type == "image" && asset.alt_text.is_none() {
                warnings.push(format!("Image asset '{}' is missing alt_text", asset.path));
            }

            // Validate asset is in correct subdirectory
            let expected_dir = match asset.asset_type.as_str() {
                "image"  => "assets/images/",
                "audio"  => "assets/audio/",
                "video"  => "assets/video/",
                "font"   => "assets/fonts/",
                "vector" => "assets/vector/",
                "3d"     => "assets/3d/",
                "data"   => "assets/data/",
                _        => "",
            };
            if !expected_dir.is_empty() && !asset.path.starts_with(expected_dir) {
                warnings.push(format!(
                    "Asset '{}' of type '{}' is not in expected directory '{}'",
                    asset.path, asset.asset_type, expected_dir
                ));
            }
        }
        Ok(warnings)
    }
}

/// Supported asset formats per Module 10 §4.
pub mod formats {
    pub const IMAGES: &[&str]  = &["webp", "avif", "png", "jpeg", "jpg", "gif", "svg"];
    pub const AUDIO: &[&str]   = &["opus", "aac", "mp3", "flac", "wav"];
    pub const VIDEO: &[&str]   = &["webm", "mp4"];
    pub const FONTS: &[&str]   = &["woff2", "woff", "ttf", "otf"];
    pub const VECTOR: &[&str]  = &["svg", "pdf"];
    pub const MODEL_3D: &[&str] = &["glb", "gltf", "usdz"];
    pub const DATA: &[&str]    = &["json", "csv", "parquet"];

    pub fn is_valid_for_type(asset_type: &str, ext: &str) -> bool {
        let ext = ext.to_lowercase();
        let list = match asset_type {
            "image"  => IMAGES,
            "audio"  => AUDIO,
            "video"  => VIDEO,
            "font"   => FONTS,
            "vector" => VECTOR,
            "3d"     => MODEL_3D,
            "data"   => DATA,
            _        => return false,
        };
        list.contains(&ext.as_str())
    }
}
