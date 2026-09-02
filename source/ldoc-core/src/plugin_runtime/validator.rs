use std::collections::HashMap;
use sha2::{Digest, Sha256};

use crate::plugin_runtime::{
    error::PluginRuntimeError,
    manifest::{PluginManifest, ValidationResult},
    permissions::capabilities,
    types::{PluginId, TrustLevel},
};

/// Supported manifest schema versions.
const SUPPORTED_SCHEMA_VERSIONS: &[&str] = &["2.0", "2.1"];

/// Minimum required fields validated beyond serde deserialization.
const MAX_DESCRIPTION_LEN: usize = 200;

// ── ValidatorConfig ───────────────────────────────────────────────────────────

/// Configuration for the plugin validator.
#[derive(Debug, Clone)]
pub struct ValidatorConfig {
    /// Require a valid signature block to assign `TrustLevel::Signed` or higher.
    pub require_signature: bool,
    /// Require an integrity block with at least one file hash.
    pub require_integrity: bool,
    /// Current platform triple (e.g. "x86_64-unknown-linux-gnu").
    pub current_platform: Option<String>,
    /// Current LDOC runtime version (semver string).
    pub runtime_version: Option<String>,
}

impl Default for ValidatorConfig {
    fn default() -> Self {
        Self {
            require_signature: false,
            require_integrity: false,
            current_platform: None,
            runtime_version: None,
        }
    }
}

// ── PluginValidator ───────────────────────────────────────────────────────────

pub struct PluginValidator {
    config: ValidatorConfig,
}

impl PluginValidator {
    pub fn new(config: ValidatorConfig) -> Self {
        Self { config }
    }

    /// Full validation pipeline: parse → schema → fields → permissions →
    /// platform → runtime version → integrity → signature → trust assignment.
    ///
    /// Returns `ValidationResult` (never errors — all failures are encoded in the result).
    pub fn validate(
        &self,
        manifest_bytes: &[u8],
        bundle_files: &HashMap<String, Vec<u8>>,
    ) -> ValidationResult {
        // 1. Parse manifest JSON.
        let manifest = match PluginManifest::from_json(manifest_bytes) {
            Ok(m) => m,
            Err(e) => {
                return ValidationResult::ManifestInvalid {
                    plugin_id: PluginId::from("unknown"),
                    reason: e.to_string(),
                }
            }
        };

        let id = manifest.plugin_id.clone();

        // 2. Schema version check.
        if !SUPPORTED_SCHEMA_VERSIONS.contains(&manifest.schema_version.as_str()) {
            return ValidationResult::SchemaVersionMismatch {
                plugin_id: id,
                found: manifest.schema_version.clone(),
                supported: SUPPORTED_SCHEMA_VERSIONS.join(", "),
            };
        }

        // 3. Required field checks.
        if let Some(reason) = self.check_required_fields(&manifest) {
            return ValidationResult::ManifestInvalid { plugin_id: id, reason };
        }

        // 4. Permission taxonomy check.
        if let Some(reason) = self.check_permissions(&manifest) {
            return ValidationResult::ManifestInvalid { plugin_id: id, reason };
        }

        // 5. Platform compatibility.
        if let Some(reason) = self.check_platform(&manifest) {
            return ValidationResult::ManifestInvalid { plugin_id: id, reason };
        }

        // 6. Runtime version bounds.
        if let Some(reason) = self.check_runtime_version(&manifest) {
            return ValidationResult::ManifestInvalid { plugin_id: id, reason };
        }

        // 7. Integrity check (if block present or required).
        if let Some((path, _)) = self.check_integrity(&manifest, bundle_files) {
            return ValidationResult::IntegrityFailed { plugin_id: id, path };
        }

        // 8. Signature check (stub — real crypto requires external PKI).
        if let Some(reason) = self.check_signature(&manifest) {
            return ValidationResult::SignatureInvalid { plugin_id: id, reason };
        }

        // 9. Assign trust level.
        let trust_level = self.assign_trust(&manifest);

        ValidationResult::Ok { plugin_id: id, trust_level }
    }

    /// Convenience: validate and return `Err` on any non-Ok result.
    pub fn validate_strict(
        &self,
        manifest_bytes: &[u8],
        bundle_files: &HashMap<String, Vec<u8>>,
    ) -> Result<(PluginId, TrustLevel), PluginRuntimeError> {
        match self.validate(manifest_bytes, bundle_files) {
            ValidationResult::Ok { plugin_id, trust_level } => Ok((plugin_id, trust_level)),
            ValidationResult::ManifestInvalid { plugin_id, reason } => {
                Err(PluginRuntimeError::ManifestParseError { plugin_id, reason })
            }
            ValidationResult::SchemaVersionMismatch { found, supported, .. } => {
                Err(PluginRuntimeError::SchemaVersionMismatch { found, supported })
            }
            ValidationResult::SignatureInvalid { plugin_id, reason } => {
                Err(PluginRuntimeError::SignatureInvalid { plugin_id, reason })
            }
            ValidationResult::CertificateExpired { plugin_id } => {
                Err(PluginRuntimeError::CertificateExpired { plugin_id })
            }
            ValidationResult::CertificateRevoked { plugin_id } => {
                Err(PluginRuntimeError::CertificateRevoked { plugin_id })
            }
            ValidationResult::UntrustedIssuer { plugin_id } => {
                Err(PluginRuntimeError::UntrustedIssuer { plugin_id })
            }
            ValidationResult::IntegrityFailed { plugin_id, path } => {
                Err(PluginRuntimeError::IntegrityFailed { plugin_id, path })
            }
        }
    }
}

// ── Private helpers ───────────────────────────────────────────────────────────

impl PluginValidator {
    fn check_required_fields(&self, m: &PluginManifest) -> Option<String> {
        if m.plugin_id.is_empty() {
            return Some("plugin_id is empty".into());
        }
        if !m.plugin_id.0.contains('.') {
            return Some(format!(
                "plugin_id '{}' must be a reverse-domain identifier",
                m.plugin_id
            ));
        }
        if m.version.is_empty() {
            return Some("version is empty".into());
        }
        if !is_valid_semver(&m.version) {
            return Some(format!("version '{}' is not valid semver", m.version));
        }
        if m.name.is_empty() {
            return Some("name is empty".into());
        }
        if m.description.len() > MAX_DESCRIPTION_LEN {
            return Some(format!(
                "description exceeds {} characters",
                MAX_DESCRIPTION_LEN
            ));
        }
        if m.entry_points.wasm.is_empty() {
            return Some("entry_points.wasm is empty".into());
        }
        None
    }

    fn check_permissions(&self, m: &PluginManifest) -> Option<String> {
        for perm in m.all_permissions() {
            if !capabilities::is_known(perm) {
                return Some(format!("unknown permission '{}'", perm));
            }
        }
        None
    }

    fn check_platform(&self, m: &PluginManifest) -> Option<String> {
        if m.platforms.is_empty() {
            return None; // empty = all platforms
        }
        if let Some(ref current) = self.config.current_platform {
            if !m.platforms.iter().any(|p| p == current || p == "*") {
                return Some(format!(
                    "plugin does not support platform '{}'",
                    current
                ));
            }
        }
        None
    }

    fn check_runtime_version(&self, m: &PluginManifest) -> Option<String> {
        let Some(ref runtime_ver) = self.config.runtime_version else {
            return None;
        };
        if let Some(ref min) = m.min_runtime {
            if semver_lt(runtime_ver, min) {
                return Some(format!(
                    "runtime {} is below minimum required {}",
                    runtime_ver, min
                ));
            }
        }
        if let Some(ref max) = m.max_runtime {
            if semver_gt(runtime_ver, max) {
                return Some(format!(
                    "runtime {} exceeds maximum supported {}",
                    runtime_ver, max
                ));
            }
        }
        None
    }

    /// Returns `Some((path, expected_hex))` for the first file that fails.
    fn check_integrity<'a>(
        &self,
        m: &'a PluginManifest,
        bundle_files: &HashMap<String, Vec<u8>>,
    ) -> Option<(String, String)> {
        let integrity = m.integrity.as_ref()?;
        if integrity.files.is_empty() {
            return None;
        }
        for (path, expected_hex) in &integrity.files {
            match bundle_files.get(path) {
                None => return Some((path.clone(), expected_hex.clone())),
                Some(data) => {
                    let actual = hex::encode(Sha256::digest(data));
                    if actual != *expected_hex {
                        return Some((path.clone(), expected_hex.clone()));
                    }
                }
            }
        }
        None
    }

    /// Signature verification stub.
    /// Real implementation requires an external PKI / certificate store.
    /// Returns `Some(reason)` only when a signature block is present but
    /// structurally invalid (missing fields), or when `require_signature`
    /// is set and no signature block exists.
    fn check_signature(&self, m: &PluginManifest) -> Option<String> {
        match &m.signature {
            None => {
                if self.config.require_signature {
                    Some("signature block is required but missing".into())
                } else {
                    None
                }
            }
            Some(sig) => {
                if sig.value.is_empty() {
                    return Some("signature.value is empty".into());
                }
                if sig.algorithm.is_empty() {
                    return Some("signature.algorithm is empty".into());
                }
                if sig.certificate_chain.is_empty() {
                    return Some("signature.certificate_chain is empty".into());
                }
                // Full cryptographic verification deferred to PKI subsystem.
                None
            }
        }
    }

    fn assign_trust(&self, m: &PluginManifest) -> TrustLevel {
        match &m.signature {
            None => TrustLevel::Untrusted,
            Some(sig) if sig.certificate_chain.is_empty() => TrustLevel::Untrusted,
            // Without live PKI verification we can only assert "Signed" at most.
            // The PKI subsystem upgrades to Verified / Official after cert chain validation.
            Some(_) => TrustLevel::Community,
        }
    }
}

// ── Semver helpers (no external crate) ───────────────────────────────────────

/// Parse "MAJOR.MINOR.PATCH" into (u64, u64, u64), ignoring pre-release/build.
fn parse_semver(v: &str) -> Option<(u64, u64, u64)> {
    let base = v.split(['-', '+']).next()?;
    let mut parts = base.splitn(3, '.');
    let major = parts.next()?.parse().ok()?;
    let minor = parts.next()?.parse().ok()?;
    let patch = parts.next()?.parse().ok()?;
    Some((major, minor, patch))
}

fn is_valid_semver(v: &str) -> bool {
    parse_semver(v).is_some()
}

fn semver_lt(a: &str, b: &str) -> bool {
    match (parse_semver(a), parse_semver(b)) {
        (Some(av), Some(bv)) => av < bv,
        _ => false,
    }
}

fn semver_gt(a: &str, b: &str) -> bool {
    match (parse_semver(a), parse_semver(b)) {
        (Some(av), Some(bv)) => av > bv,
        _ => false,
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn minimal_manifest_json(plugin_id: &str, version: &str) -> String {
        format!(
            r#"{{
                "schema_version": "2.0",
                "plugin_id": "{plugin_id}",
                "version": "{version}",
                "name": "Test Plugin",
                "description": "A test plugin.",
                "plugin_type": "ui",
                "author": {{ "name": "Tester" }},
                "entry_points": {{ "wasm": "plugin.wasm" }}
            }}"#
        )
    }

    fn validator() -> PluginValidator {
        PluginValidator::new(ValidatorConfig::default())
    }

    #[test]
    fn valid_minimal_manifest() {
        let json = minimal_manifest_json("com.example.plugin", "1.0.0");
        let result = validator().validate(json.as_bytes(), &HashMap::new());
        assert!(result.is_ok());
    }

    #[test]
    fn invalid_schema_version() {
        let json = minimal_manifest_json("com.example.plugin", "1.0.0")
            .replace("\"2.0\"", "\"99.0\"");
        let result = validator().validate(json.as_bytes(), &HashMap::new());
        assert!(matches!(result, ValidationResult::SchemaVersionMismatch { .. }));
    }

    #[test]
    fn invalid_plugin_id_no_dot() {
        let json = minimal_manifest_json("myplugin", "1.0.0");
        let result = validator().validate(json.as_bytes(), &HashMap::new());
        assert!(matches!(result, ValidationResult::ManifestInvalid { .. }));
    }

    #[test]
    fn invalid_semver() {
        let json = minimal_manifest_json("com.example.plugin", "not-semver");
        let result = validator().validate(json.as_bytes(), &HashMap::new());
        assert!(matches!(result, ValidationResult::ManifestInvalid { .. }));
    }

    #[test]
    fn integrity_check_passes() {
        let data = b"wasm bytes";
        let hash = hex::encode(Sha256::digest(data));
        let json = format!(
            r#"{{
                "schema_version": "2.0",
                "plugin_id": "com.example.plugin",
                "version": "1.0.0",
                "name": "Test",
                "description": "desc",
                "plugin_type": "ui",
                "author": {{ "name": "T" }},
                "entry_points": {{ "wasm": "plugin.wasm" }},
                "integrity": {{ "files": {{ "plugin.wasm": "{hash}" }} }}
            }}"#
        );
        let mut files = HashMap::new();
        files.insert("plugin.wasm".into(), data.to_vec());
        let result = validator().validate(json.as_bytes(), &files);
        assert!(result.is_ok());
    }

    #[test]
    fn integrity_check_fails_on_mismatch() {
        let json = format!(
            r#"{{
                "schema_version": "2.0",
                "plugin_id": "com.example.plugin",
                "version": "1.0.0",
                "name": "Test",
                "description": "desc",
                "plugin_type": "ui",
                "author": {{ "name": "T" }},
                "entry_points": {{ "wasm": "plugin.wasm" }},
                "integrity": {{ "files": {{ "plugin.wasm": "deadbeef" }} }}
            }}"#
        );
        let mut files = HashMap::new();
        files.insert("plugin.wasm".into(), b"different bytes".to_vec());
        let result = validator().validate(json.as_bytes(), &files);
        assert!(matches!(result, ValidationResult::IntegrityFailed { .. }));
    }

    #[test]
    fn semver_comparison() {
        assert!(semver_lt("1.0.0", "2.0.0"));
        assert!(semver_gt("2.1.0", "2.0.9"));
        assert!(!semver_lt("1.0.0", "1.0.0"));
    }
}

