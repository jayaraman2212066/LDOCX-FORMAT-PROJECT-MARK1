use thiserror::Error;

#[derive(Debug, Error)]
pub enum LdocError {
    // Header errors
    #[error("Not an LDOC file: magic bytes mismatch")]
    MagicBytesMismatch,
    #[error("File corrupted: guard bytes mismatch (possible line-ending conversion)")]
    GuardBytesMismatch,
    #[error("Header CRC32 mismatch: header is corrupted")]
    HeaderCrc32Mismatch,
    #[error("Unsupported container type: {0:#04x}")]
    UnsupportedContainerType(u8),
    #[error("Unsupported major version: file requires v{0}, runtime supports v{1}")]
    UnsupportedMajorVersion(u8, u8),
    #[error("File too small to contain a valid LDOC header (need 64 bytes, got {0})")]
    FileTooSmall(usize),

    // Container errors
    #[error("Invalid ZIP archive: {0}")]
    InvalidZip(String),
    #[error("Required entry missing: {0}")]
    MissingRequiredEntry(String),
    #[error("ZIP-level encryption is prohibited")]
    ZipEncryptionProhibited,
    #[error("Path traversal detected in ZIP entry: {0}")]
    PathTraversal(String),
    #[error("ZIP bomb detected: entry '{0}' exceeds decompressed size limit")]
    ZipBombDetected(String),

    // Manifest errors
    #[error("manifest.json parse error: {0}")]
    ManifestParseError(String),
    #[error("manifest.json field '{0}' is invalid: {1}")]
    ManifestFieldInvalid(String, String),
    #[error("Feature flags mismatch between binary header and manifest")]
    FeatureFlagsMismatch,

    // Metadata errors
    #[error("metadata.json parse error: {0}")]
    MetadataParseError(String),
    #[error("metadata.json field '{0}' is invalid: {1}")]
    MetadataFieldInvalid(String, String),
    #[error("Cross-file mismatch: field '{0}' differs between manifest and metadata")]
    CrossFileMismatch(String),

    // Version errors
    #[error("Version mismatch: binary header {0} vs manifest {1}")]
    VersionMismatch(String, String),

    // Security errors
    #[error("Hash entry not recorded for '{0}': file was added after hashes.json was created")]
    HashEntryMissing(String),
    #[error("Hash mismatch for entry '{0}': content has been tampered")]
    HashMismatch(String),
    #[error("Invalid digital signature")]
    InvalidSignature,
    #[error("Unsupported signature algorithm: {0}")]
    UnsupportedSignatureAlgorithm(String),

    // Asset errors
    #[error("Asset index missing")]
    AssetIndexMissing,
    #[error("Asset file missing: {0}")]
    AssetFileMissing(String),
    #[error("SVG contains forbidden script content")]
    SvgContainsScript,

    // Page errors
    #[error("Page index missing")]
    PageIndexMissing,
    #[error("Page directory missing: {0}")]
    PageDirectoryMissing(String),
    #[error("Duplicate node ID: {0}")]
    DuplicateNodeId(String),

    // Plugin errors
    #[error("Plugin index missing")]
    PluginIndexMissing,
    #[error("Plugin directory missing: {0}")]
    PluginDirectoryMissing(String),
    #[error("Plugin checksum mismatch: {0}")]
    PluginChecksumMismatch(String),

    // I/O errors
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("ZIP error: {0}")]
    Zip(#[from] zip::result::ZipError),
}
