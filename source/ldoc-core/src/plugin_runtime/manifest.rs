use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::plugin_runtime::types::{PluginId, PluginType, LoadStrategy};

// ── PluginAuthor ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginAuthor {
    pub name:    String,
    pub email:   Option<String>,
    pub url:     Option<String>,
    pub org:     Option<String>,
}

// ── PluginDependency ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginDependency {
    pub plugin_id:       PluginId,
    pub version_req:     String,
    #[serde(default)]
    pub optional:        bool,
    pub platform:        Option<String>,
}

// ── PluginPermissions ─────────────────────────────────────────────────────────

/// Declared capability requirements for a plugin.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PluginPermissions {
    #[serde(default)]
    pub vfs:       Vec<String>,
    #[serde(default)]
    pub events:    Vec<String>,
    #[serde(default)]
    pub ipc:       Vec<String>,
    #[serde(default)]
    pub storage:   Vec<String>,
    #[serde(default)]
    pub resources: Vec<String>,
    #[serde(default)]
    pub network:   Vec<String>,
    #[serde(default)]
    pub system:    Vec<String>,
}

impl PluginPermissions {
    /// Returns all declared permission strings as a flat iterator.
    pub fn all_permissions(&self) -> impl Iterator<Item = &str> {
        self.vfs.iter()
            .chain(self.events.iter())
            .chain(self.ipc.iter())
            .chain(self.storage.iter())
            .chain(self.resources.iter())
            .chain(self.network.iter())
            .chain(self.system.iter())
            .map(|s| s.as_str())
    }
}

// ── PluginEntryPoints ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginEntryPoints {
    /// Path to the WASM module within the bundle.
    pub wasm:        String,
    /// Optional path to a UI component entry point.
    pub ui:          Option<String>,
    /// Optional path to a worker entry point.
    pub worker:      Option<String>,
}

// ── PluginAssets ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PluginAssets {
    /// Icon path within the bundle (PNG or SVG).
    pub icon:        Option<String>,
    /// Additional asset paths declared by the plugin.
    #[serde(default)]
    pub files:       Vec<String>,
}

// ── PluginSignature ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginSignature {
    /// Base64-encoded signature value.
    pub value:             String,
    /// Signing algorithm identifier (e.g. "ecdsa-sha256").
    pub algorithm:         String,
    /// PEM-encoded certificate chain (leaf first).
    pub certificate_chain: Vec<String>,
    /// RFC 3161 timestamp token (Base64), if present.
    pub timestamp:         Option<String>,
}

// ── PluginIntegrity ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginIntegrity {
    /// Map of bundle-relative file path → expected SHA-256 hex digest.
    pub files: HashMap<String, String>,
}

// ── PluginTelemetry ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PluginTelemetry {
    #[serde(default)]
    pub crash_reports: bool,
    #[serde(default)]
    pub usage_stats:   bool,
}

// ── PluginManifest ────────────────────────────────────────────────────────────

/// The complete plugin manifest as declared in `manifest.json` inside a `.ldocplugin` bundle.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    /// Schema version of this manifest format (e.g. "2.0").
    pub schema_version:  String,

    /// Unique reverse-domain plugin identifier.
    pub plugin_id:       PluginId,

    /// Semantic version of this plugin release.
    pub version:         String,

    /// Human-readable display name.
    pub name:            String,

    /// Short description (≤ 200 characters).
    pub description:     String,

    /// Plugin category.
    pub plugin_type:     PluginType,

    /// Author information.
    pub author:          PluginAuthor,

    /// Declared capability requirements.
    #[serde(default)]
    pub permissions:     PluginPermissions,

    /// Declared plugin dependencies.
    #[serde(default)]
    pub dependencies:    Vec<PluginDependency>,

    /// Entry point paths within the bundle.
    pub entry_points:    PluginEntryPoints,

    /// Declared assets.
    #[serde(default)]
    pub assets:          PluginAssets,

    /// Cryptographic signature over the canonical manifest bytes.
    pub signature:       Option<PluginSignature>,

    /// Per-file SHA-256 integrity hashes.
    pub integrity:       Option<PluginIntegrity>,

    /// Loading strategy hint.
    #[serde(default)]
    pub load_strategy:   LoadStrategy,

    /// Minimum LDOC runtime version required.
    pub min_runtime:     Option<String>,

    /// Maximum LDOC runtime version supported.
    pub max_runtime:     Option<String>,

    /// Supported platform triples (empty = all platforms).
    #[serde(default)]
    pub platforms:       Vec<String>,

    /// Telemetry opt-in settings.
    #[serde(default)]
    pub telemetry:       PluginTelemetry,

    /// Arbitrary extra fields (forward compatibility — ignored by runtime).
    #[serde(flatten)]
    pub extra:           HashMap<String, serde_json::Value>,
}

impl PluginManifest {
    /// Parse a manifest from JSON bytes.
    pub fn from_json(bytes: &[u8]) -> Result<Self, serde_json::Error> {
        serde_json::from_slice(bytes)
    }

    /// Serialise the manifest to canonical JSON bytes (sorted keys, no extra whitespace).
    pub fn to_canonical_json(&self) -> Result<Vec<u8>, serde_json::Error> {
        // Serialise to Value first so we can sort keys deterministically.
        let value = serde_json::to_value(self)?;
        serde_json::to_vec(&value)
    }

    /// Returns true if the manifest has a signature block.
    pub fn is_signed(&self) -> bool {
        self.signature.is_some()
    }

    /// Returns true if the manifest has an integrity block.
    pub fn has_integrity(&self) -> bool {
        self.integrity.as_ref().map_or(false, |i| !i.files.is_empty())
    }

    /// Returns all declared permission strings across all categories.
    pub fn all_permissions(&self) -> impl Iterator<Item = &str> {
        self.permissions.all_permissions()
    }
}

// ── ValidationResult ──────────────────────────────────────────────────────────

/// Result of validating a plugin bundle.
#[derive(Debug, Clone)]
pub enum ValidationResult {
    Ok {
        plugin_id:   PluginId,
        trust_level: crate::plugin_runtime::types::TrustLevel,
    },
    ManifestInvalid {
        plugin_id: PluginId,
        reason:    String,
    },
    SignatureInvalid {
        plugin_id: PluginId,
        reason:    String,
    },
    CertificateExpired {
        plugin_id: PluginId,
    },
    CertificateRevoked {
        plugin_id: PluginId,
    },
    UntrustedIssuer {
        plugin_id: PluginId,
    },
    IntegrityFailed {
        plugin_id: PluginId,
        path:      String,
    },
    SchemaVersionMismatch {
        plugin_id: PluginId,
        found:     String,
        supported: String,
    },
}

impl ValidationResult {
    pub fn is_ok(&self) -> bool {
        matches!(self, Self::Ok { .. })
    }

    pub fn plugin_id(&self) -> &PluginId {
        match self {
            Self::Ok { plugin_id, .. }                  => plugin_id,
            Self::ManifestInvalid { plugin_id, .. }     => plugin_id,
            Self::SignatureInvalid { plugin_id, .. }     => plugin_id,
            Self::CertificateExpired { plugin_id }       => plugin_id,
            Self::CertificateRevoked { plugin_id }       => plugin_id,
            Self::UntrustedIssuer { plugin_id }          => plugin_id,
            Self::IntegrityFailed { plugin_id, .. }      => plugin_id,
            Self::SchemaVersionMismatch { plugin_id, .. }=> plugin_id,
        }
    }
}

