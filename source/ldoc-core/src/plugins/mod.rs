// Module 12 — LDOC Plugin Architecture Specification

use serde::{Deserialize, Serialize};
use crate::LdocError;

/// Plugin types as defined in Module 12 §3.
pub const PLUGIN_TYPES: &[&str] = &[
    "renderer", "editor", "importer", "exporter",
    "ai_provider", "sync_provider", "theme", "tool",
];

/// `plugin.json` — manifest for a single plugin package.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub schema_version: String,
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub minimum_runtime_version: String,
    pub maximum_runtime_version: Option<String>,
    #[serde(rename = "type")]
    pub plugin_type: String,
    pub author: PluginAuthor,
    pub license: String,
    pub homepage: Option<String>,
    pub entry_point: String,
    pub permissions: Vec<String>,
    pub network_domains: Vec<String>,
    pub node_types: Vec<String>,
    pub exports: Vec<PluginExport>,
    pub checksum: String,
    pub signed: bool,
    pub signature: Option<String>,
    pub trust_level: String,
    pub _reserved: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginAuthor {
    pub name: String,
    pub email: Option<String>,
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginExport {
    pub name: String,
    pub description: String,
}

impl PluginManifest {
    pub fn from_bytes(data: &[u8]) -> Result<Self, LdocError> {
        serde_json::from_slice(data).map_err(|e| LdocError::MetadataParseError(e.to_string()))
    }

    pub fn to_bytes(&self) -> Result<Vec<u8>, LdocError> {
        serde_json::to_vec_pretty(self).map_err(LdocError::Json)
    }

    pub fn validate(&self) -> Result<Vec<String>, LdocError> {
        let mut warnings = Vec::new();

        if self.id.trim().is_empty() {
            return Err(LdocError::ManifestFieldInvalid("plugin.id".into(), "must not be empty".into()));
        }
        if !PLUGIN_TYPES.contains(&self.plugin_type.as_str()) {
            return Err(LdocError::ManifestFieldInvalid(
                "plugin.type".into(),
                format!("'{}' is not a valid plugin type", self.plugin_type),
            ));
        }
        if self.entry_point.trim().is_empty() {
            return Err(LdocError::ManifestFieldInvalid("plugin.entry_point".into(), "must not be empty".into()));
        }

        // Validate permissions
        for perm in &self.permissions {
            if !crate::security::permissions::is_valid(perm) {
                warnings.push(format!("Unknown permission declared: '{perm}'"));
            }
        }

        // network_domains required if network permissions declared
        let needs_domains = self.permissions.iter().any(|p| {
            p == crate::security::permissions::NETWORK_READ
                || p == crate::security::permissions::NETWORK_WRITE
        });
        if needs_domains && self.network_domains.is_empty() {
            warnings.push("Plugin declares network permissions but no network_domains are listed".into());
        }

        if !self.signed {
            warnings.push(format!("Plugin '{}' is not signed (trust_level: untrusted)", self.id));
        }

        Ok(warnings)
    }
}

/// `plugins/index.json` — index of all embedded plugins.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginIndex {
    pub schema_version: String,
    pub plugins: Vec<PluginIndexEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginIndexEntry {
    pub id: String,
    pub version: String,
    pub path: String,
    pub required: bool,
    pub checksum: String,
}

impl PluginIndex {
    pub fn new() -> Self {
        Self { schema_version: "1.0.0".into(), plugins: vec![] }
    }

    pub fn from_bytes(data: &[u8]) -> Result<Self, LdocError> {
        serde_json::from_slice(data).map_err(|e| LdocError::MetadataParseError(e.to_string()))
    }

    pub fn to_bytes(&self) -> Result<Vec<u8>, LdocError> {
        serde_json::to_vec_pretty(self).map_err(LdocError::Json)
    }

    pub fn validate(&self) -> Result<Vec<String>, LdocError> {
        let warnings = Vec::new();
        for entry in &self.plugins {
            if entry.id.trim().is_empty() {
                return Err(LdocError::ManifestFieldInvalid("plugin index entry id".into(), "must not be empty".into()));
            }
            if entry.path.trim().is_empty() {
                return Err(LdocError::ManifestFieldInvalid("plugin index entry path".into(), "must not be empty".into()));
            }
        }
        Ok(warnings)
    }
}

