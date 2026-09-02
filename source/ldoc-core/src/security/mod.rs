// Module 09 — LDOC Security Policy Specification
// Covers: SHA-256 hashing, hashes.json, signatures.json, trust levels.

use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use crate::LdocError;

/// Supported signature algorithms.
pub const ALGO_ED25519: &str = "ed25519";
pub const ALGO_ECDSA_P256: &str = "ecdsa-p256-sha256";
pub const ALGO_RSA_PSS: &str = "rsa-pss-sha256";

/// Entries excluded from hashing (system folders).
pub const HASH_EXCLUDED_PREFIXES: &[&str] = &["cache/", "logs/", "security/hashes.json"];

/// Compute SHA-256 of bytes, return lowercase hex string.
pub fn sha256_hex(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
}

/// `security/hashes.json` — integrity manifest for all content entries.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HashesFile {
    pub schema_version: String,
    pub algorithm: String,
    pub computed_at: String,
    pub entries: HashMap<String, String>,
}

impl HashesFile {
    pub fn new(computed_at: &str) -> Self {
        Self {
            schema_version: "1.0.0".into(),
            algorithm: "sha256".into(),
            computed_at: computed_at.to_string(),
            entries: HashMap::new(),
        }
    }

    pub fn add(&mut self, path: &str, data: &[u8]) {
        if !should_exclude(path) {
            self.entries.insert(path.to_string(), format!("sha256:{}", sha256_hex(data)));
        }
    }

    pub fn verify(&self, path: &str, data: &[u8]) -> Result<(), LdocError> {
        if should_exclude(path) {
            return Ok(());
        }
        let expected = self.entries.get(path)
            .ok_or_else(|| LdocError::HashEntryMissing(path.to_string()))?;
        let computed = format!("sha256:{}", sha256_hex(data));
        if *expected != computed {
            return Err(LdocError::HashMismatch(path.to_string()));
        }
        Ok(())
    }

    pub fn from_bytes(data: &[u8]) -> Result<Self, LdocError> {
        serde_json::from_slice(data).map_err(|e| LdocError::ManifestParseError(format!("hashes.json: {e}")))
    }

    pub fn to_bytes(&self) -> Result<Vec<u8>, LdocError> {
        serde_json::to_vec_pretty(self).map_err(LdocError::Json)
    }
}

fn should_exclude(path: &str) -> bool {
    HASH_EXCLUDED_PREFIXES.iter().any(|p| path.starts_with(p))
}

/// `security/signatures.json` — digital signature records.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignaturesFile {
    pub schema_version: String,
    pub signatures: Vec<SignatureRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignatureRecord {
    pub id: String,
    pub algorithm: String,
    pub signer_id: String,
    pub signer_name: String,
    pub certificate_path: String,
    pub signed_at: String,
    pub coverage: String,
    pub signature_value: String,
    pub hashes_ref: String,
}

impl SignaturesFile {
    pub fn empty() -> Self {
        Self {
            schema_version: "1.0.0".into(),
            signatures: vec![],
        }
    }

    pub fn from_bytes(data: &[u8]) -> Result<Self, LdocError> {
        serde_json::from_slice(data).map_err(|e| LdocError::ManifestParseError(format!("signatures.json: {e}")))
    }

    pub fn to_bytes(&self) -> Result<Vec<u8>, LdocError> {
        serde_json::to_vec_pretty(self).map_err(LdocError::Json)
    }

    /// Validate that all declared signature algorithms are supported.
    pub fn validate(&self) -> Result<Vec<String>, LdocError> {
        let supported = [ALGO_ED25519, ALGO_ECDSA_P256, ALGO_RSA_PSS];
        for sig in &self.signatures {
            if !supported.contains(&sig.algorithm.as_str()) {
                return Err(LdocError::UnsupportedSignatureAlgorithm(sig.algorithm.clone()));
            }
        }
        Ok(vec![])
    }
}

/// Permission names as defined in Module 09 §3.3.
pub mod permissions {
    pub const READ_ALL_PAGES: &str = "read_all_pages";
    pub const WRITE_ANNOTATIONS: &str = "write_annotations";
    pub const READ_ANNOTATIONS: &str = "read_annotations";
    pub const NETWORK_READ: &str = "network_read";
    pub const NETWORK_WRITE: &str = "network_write";
    pub const FILESYSTEM_READ: &str = "filesystem_read";
    pub const FILESYSTEM_WRITE: &str = "filesystem_write";
    pub const EXECUTE_AI: &str = "execute_ai";
    pub const CLIPBOARD_READ: &str = "clipboard_read";
    pub const CLIPBOARD_WRITE: &str = "clipboard_write";
    pub const NOTIFICATIONS: &str = "notifications";
    pub const CAMERA: &str = "camera";
    pub const MICROPHONE: &str = "microphone";
    pub const GEOLOCATION: &str = "geolocation";

    pub const ALL: &[&str] = &[
        READ_ALL_PAGES, WRITE_ANNOTATIONS, READ_ANNOTATIONS,
        NETWORK_READ, NETWORK_WRITE, FILESYSTEM_READ, FILESYSTEM_WRITE,
        EXECUTE_AI, CLIPBOARD_READ, CLIPBOARD_WRITE, NOTIFICATIONS,
        CAMERA, MICROPHONE, GEOLOCATION,
    ];

    pub fn is_valid(p: &str) -> bool {
        ALL.contains(&p)
    }
}
