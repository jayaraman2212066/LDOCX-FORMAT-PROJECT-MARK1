use thiserror::Error;
use crate::plugin_runtime::types::{PluginId, PluginState};

#[derive(Debug, Error)]
pub enum PluginRuntimeError {
    // ── Manifest errors ───────────────────────────────────────────────────────
    #[error("manifest parse error for plugin '{plugin_id}': {reason}")]
    ManifestParseError { plugin_id: PluginId, reason: String },

    #[error("manifest field '{field}' is missing or invalid in plugin '{plugin_id}'")]
    ManifestFieldInvalid { plugin_id: PluginId, field: String },

    #[error("manifest schema version '{found}' is not supported (supported: '{supported}')")]
    SchemaVersionMismatch { found: String, supported: String },

    #[error("invalid semver version '{version}' in plugin '{plugin_id}'")]
    InvalidVersion { plugin_id: PluginId, version: String },

    #[error("unknown permission '{permission}' declared by plugin '{plugin_id}'")]
    UnknownPermission { plugin_id: PluginId, permission: String },

    // ── Validation errors ─────────────────────────────────────────────────────
    #[error("signature verification failed for plugin '{plugin_id}': {reason}")]
    SignatureInvalid { plugin_id: PluginId, reason: String },

    #[error("certificate expired for plugin '{plugin_id}'")]
    CertificateExpired { plugin_id: PluginId },

    #[error("certificate revoked for plugin '{plugin_id}'")]
    CertificateRevoked { plugin_id: PluginId },

    #[error("untrusted certificate issuer for plugin '{plugin_id}'")]
    UntrustedIssuer { plugin_id: PluginId },

    #[error("integrity check failed for plugin '{plugin_id}': file '{path}' hash mismatch")]
    IntegrityFailed { plugin_id: PluginId, path: String },

    // ── Dependency errors ─────────────────────────────────────────────────────
    #[error("dependency cycle detected: {path:?}")]
    DependencyCycle { path: Vec<PluginId> },

    #[error("version conflict for dependency '{dep_id}': {reason}")]
    VersionConflict { dep_id: PluginId, reason: String },

    #[error("required dependency '{dep_id}' not found for plugin '{plugin_id}'")]
    DependencyNotFound { plugin_id: PluginId, dep_id: PluginId },

    #[error("platform incompatible for plugin '{plugin_id}': requires '{required}'")]
    PlatformIncompatible { plugin_id: PluginId, required: String },

    // ── Lifecycle errors ──────────────────────────────────────────────────────
    #[error("invalid state transition for plugin '{plugin_id}': {from} → {to}")]
    InvalidTransition { plugin_id: PluginId, from: PluginState, to: PluginState },

    #[error("plugin '{plugin_id}' hook '{hook}' failed: {reason}")]
    HookFailed { plugin_id: PluginId, hook: String, reason: String },

    // ── Loader errors ─────────────────────────────────────────────────────────
    #[error("plugin '{plugin_id}' failed to load: {reason}")]
    LoadFailed { plugin_id: PluginId, reason: String },

    #[error("plugin '{plugin_id}' WASM compilation timed out after {timeout_ms}ms")]
    CompileTimeout { plugin_id: PluginId, timeout_ms: u64 },

    #[error("plugin bundle not found at path '{path}'")]
    BundleNotFound { path: String },

    #[error("plugin bundle is not a valid ZIP archive: {reason}")]
    InvalidBundle { reason: String },

    #[error("plugin '{plugin_id}' is already installed at version '{version}'")]
    AlreadyInstalled { plugin_id: PluginId, version: String },

    #[error("plugin '{plugin_id}' is not installed")]
    NotInstalled { plugin_id: PluginId },

    // ── Sandbox errors ────────────────────────────────────────────────────────
    #[error("sandbox creation failed for plugin '{plugin_id}': {reason}")]
    SandboxCreationFailed { plugin_id: PluginId, reason: String },

    #[error("sandbox is unavailable (plugin-wasm feature not enabled)")]
    SandboxUnavailable,

    #[error("plugin '{plugin_id}' exceeded memory budget: {used_bytes} > {budget_bytes}")]
    MemoryBudgetExceeded { plugin_id: PluginId, used_bytes: u64, budget_bytes: u64 },

    // ── Permission errors ─────────────────────────────────────────────────────
    #[error("permission denied for plugin '{plugin_id}': capability '{capability}' not granted")]
    PermissionDenied { plugin_id: PluginId, capability: String },

    // ── Event errors ──────────────────────────────────────────────────────────
    #[error("event queue full for plugin '{plugin_id}': event dropped")]
    EventQueueFull { plugin_id: PluginId },

    #[error("event type '{event_type}' is not a valid LDOC event type")]
    InvalidEventType { event_type: String },

    // ── IPC errors ────────────────────────────────────────────────────────────
    #[error("IPC channel '{channel}' not found")]
    IpcChannelNotFound { channel: String },

    #[error("IPC channel '{channel}' already exists")]
    IpcChannelAlreadyExists { channel: String },

    #[error("IPC message to plugin '{target}' dropped: {reason}")]
    IpcMessageDropped { target: PluginId, reason: String },

    // ── Storage errors ────────────────────────────────────────────────────────
    #[error("storage key '{key}' not found for plugin '{plugin_id}'")]
    StorageKeyNotFound { plugin_id: PluginId, key: String },

    #[error("storage quota exceeded for plugin '{plugin_id}'")]
    StorageQuotaExceeded { plugin_id: PluginId },

    // ── API errors ────────────────────────────────────────────────────────────
    #[error("plugin '{plugin_id}' is in state '{state}' and cannot perform this operation")]
    InvalidPluginState { plugin_id: PluginId, state: PluginState },

    #[error("plugin '{plugin_id}' not found in registry")]
    PluginNotFound { plugin_id: PluginId },

    // ── I/O errors ────────────────────────────────────────────────────────────
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("ZIP error: {0}")]
    Zip(#[from] zip::result::ZipError),
}

impl PluginRuntimeError {
    /// Returns the plugin ID associated with this error, if any.
    pub fn plugin_id(&self) -> Option<&PluginId> {
        match self {
            Self::ManifestParseError { plugin_id, .. }   => Some(plugin_id),
            Self::ManifestFieldInvalid { plugin_id, .. } => Some(plugin_id),
            Self::InvalidVersion { plugin_id, .. }       => Some(plugin_id),
            Self::UnknownPermission { plugin_id, .. }    => Some(plugin_id),
            Self::SignatureInvalid { plugin_id, .. }     => Some(plugin_id),
            Self::CertificateExpired { plugin_id }       => Some(plugin_id),
            Self::CertificateRevoked { plugin_id }       => Some(plugin_id),
            Self::UntrustedIssuer { plugin_id }          => Some(plugin_id),
            Self::IntegrityFailed { plugin_id, .. }      => Some(plugin_id),
            Self::DependencyNotFound { plugin_id, .. }   => Some(plugin_id),
            Self::PlatformIncompatible { plugin_id, .. } => Some(plugin_id),
            Self::InvalidTransition { plugin_id, .. }    => Some(plugin_id),
            Self::HookFailed { plugin_id, .. }           => Some(plugin_id),
            Self::LoadFailed { plugin_id, .. }           => Some(plugin_id),
            Self::CompileTimeout { plugin_id, .. }       => Some(plugin_id),
            Self::AlreadyInstalled { plugin_id, .. }     => Some(plugin_id),
            Self::NotInstalled { plugin_id }             => Some(plugin_id),
            Self::SandboxCreationFailed { plugin_id, .. }=> Some(plugin_id),
            Self::MemoryBudgetExceeded { plugin_id, .. } => Some(plugin_id),
            Self::PermissionDenied { plugin_id, .. }     => Some(plugin_id),
            Self::EventQueueFull { plugin_id }           => Some(plugin_id),
            Self::StorageKeyNotFound { plugin_id, .. }   => Some(plugin_id),
            Self::StorageQuotaExceeded { plugin_id }     => Some(plugin_id),
            Self::InvalidPluginState { plugin_id, .. }   => Some(plugin_id),
            Self::PluginNotFound { plugin_id }           => Some(plugin_id),
            _ => None,
        }
    }

    /// Returns true if this error is recoverable (plugin can be retried).
    pub fn is_recoverable(&self) -> bool {
        matches!(
            self,
            Self::LoadFailed { .. }
                | Self::CompileTimeout { .. }
                | Self::HookFailed { .. }
                | Self::EventQueueFull { .. }
                | Self::IpcMessageDropped { .. }
                | Self::Io(_)
        )
    }
}

