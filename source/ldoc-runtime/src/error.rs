// LDOC Runtime — Error Types
// Specification: Module 02 (Layered Architecture), Module 14 (Interfaces)

use std::io;
use thiserror::Error;

/// Primary runtime error type exposed to the Application Layer
#[derive(Error, Debug)]
pub enum RuntimeError {
    // Boot errors
    #[error("Boot failed at phase {phase}: {message}")]
    BootFailed { phase: u8, message: String },

    #[error("Boot timeout at phase {phase}")]
    BootTimeout { phase: u8 },

    #[error("Boot error: {0}")]
    BootError(String),

    #[error("Version mismatch: expected {expected}, found {found}")]
    VersionMismatch { expected: String, found: String },

    #[error("Document validation failed: {0}")]
    ValidationFailed(String),

    // Lifecycle errors
    #[error("Invalid lifecycle transition from {from} to {to}")]
    InvalidTransition { from: String, to: String },

    #[error("Lifecycle transition timeout")]
    TransitionTimeout,

    #[error("Lifecycle error: {0}")]
    LifecycleError(String),

    // Resource errors
    #[error("Resource not found: {0}")]
    ResourceNotFound(String),

    #[error("Resource integrity violation: {0}")]
    IntegrityViolation(String),

    #[error("Resource too large: {0}")]
    ResourceTooLarge(String),

    #[error("Resource exhausted: {0}")]
    ResourceExhausted(String),

    #[error("Resource error: {0}")]
    ResourceError(String),

    #[error("Cache full, eviction failed")]
    CacheFull,

    #[error("Cache error: {0}")]
    CacheError(String),

    // Security errors
    #[error("Permission denied: {permission}")]
    PermissionDenied { permission: String },

    #[error("Security violation: {0}")]
    SecurityViolation(String),

    #[error("Security error: {0}")]
    SecurityError(String),

    #[error("Sandbox violation: {0}")]
    SandboxViolation(String),

    #[error("Invalid signature")]
    InvalidSignature,

    // Plugin errors
    #[error("Plugin not found: {0}")]
    PluginNotFound(String),

    #[error("Plugin failed: {0}")]
    PluginFailed(String),

    #[error("Plugin crashed: {0}")]
    PluginCrashed(String),

    #[error("Plugin memory limit exceeded")]
    PluginMemoryLimit,

    #[error("Plugin CPU limit exceeded")]
    PluginCpuLimit,

    #[error("Plugin error: {0}")]
    PluginError(String),

    // Configuration errors
    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Invalid configuration value: {key} = {value}")]
    InvalidConfigValue { key: String, value: String },

    // State errors
    #[error("State error: {0}")]
    StateError(String),

    #[error("State persistence failed: {0}")]
    StatePersistenceFailed(String),

    // Storage errors
    #[error("Storage error: {0}")]
    StorageError(String),

    #[error("Storage quota exceeded")]
    StorageQuotaExceeded,

    // Theme / Language / Asset errors
    #[error("Theme error: {0}")]
    ThemeError(String),

    #[error("Language error: {0}")]
    LanguageError(String),

    #[error("Asset error: {0}")]
    AssetError(String),

    // Document load / page errors
    #[error("Document load error: {0}")]
    LoadError(String),

    #[error("Page error: {0}")]
    PageError(String),

    // I/O errors
    #[error("I/O error: {0}")]
    IoError(#[from] io::Error),

    // Serialization errors
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    // Generic errors
    #[error("Runtime error: {0}")]
    Other(String),

    #[error("Out of memory")]
    OutOfMemory,

    #[error("Operation not supported")]
    NotSupported,

    #[error("Operation timed out")]
    Timeout,
}

/// Result type for runtime operations
pub type RuntimeResult<T> = Result<T, RuntimeError>;

/// Boot-specific error type
#[derive(Error, Debug)]
pub enum BootError {
    #[error("Phase {phase} failed: {reason}")]
    PhaseFailed { phase: u8, reason: String },

    #[error("Phase {phase} timeout")]
    PhaseTimeout { phase: u8 },

    #[error("Validation failed: {0}")]
    ValidationFailed(String),

    #[error("Missing required entry: {0}")]
    MissingEntry(String),

    #[error("Version mismatch: {0}")]
    VersionMismatch(String),

    #[error("Boot error: {0}")]
    Other(String),
}

impl From<BootError> for RuntimeError {
    fn from(err: BootError) -> Self {
        match err {
            BootError::PhaseFailed { phase, reason } => {
                RuntimeError::BootFailed { phase, message: reason }
            }
            BootError::PhaseTimeout { phase } => RuntimeError::BootTimeout { phase },
            BootError::ValidationFailed(msg) => RuntimeError::ValidationFailed(msg),
            BootError::MissingEntry(path) => RuntimeError::ResourceNotFound(path),
            BootError::VersionMismatch(msg) => {
                RuntimeError::VersionMismatch {
                    expected: "unknown".to_string(),
                    found: msg,
                }
            }
            BootError::Other(msg) => RuntimeError::Other(msg),
        }
    }
}

/// Lifecycle-specific error type
#[derive(Error, Debug)]
pub enum LifecycleError {
    #[error("Invalid transition from {from} to {to}")]
    InvalidTransition { from: String, to: String },

    #[error("Transition timeout")]
    TransitionTimeout,

    #[error("Component failure: {0}")]
    ComponentFailure(String),

    #[error("Lifecycle error: {0}")]
    Other(String),
}

impl From<LifecycleError> for RuntimeError {
    fn from(err: LifecycleError) -> Self {
        match err {
            LifecycleError::InvalidTransition { from, to } => {
                RuntimeError::InvalidTransition { from, to }
            }
            LifecycleError::TransitionTimeout => RuntimeError::TransitionTimeout,
            LifecycleError::ComponentFailure(msg) => RuntimeError::Other(msg),
            LifecycleError::Other(msg) => RuntimeError::Other(msg),
        }
    }
}

/// Resource-specific error type
#[derive(Error, Debug)]
pub enum ResourceError {
    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Integrity failure: {0}")]
    IntegrityFailure(String),

    #[error("Parse failure: {path}: {reason}")]
    ParseFailure { path: String, reason: String },

    #[error("Resource too large: {0}")]
    TooLarge(String),

    #[error("Resource error: {0}")]
    Other(String),
}

impl From<ResourceError> for RuntimeError {
    fn from(err: ResourceError) -> Self {
        match err {
            ResourceError::NotFound(path) => RuntimeError::ResourceNotFound(path),
            ResourceError::IntegrityFailure(msg) => RuntimeError::IntegrityViolation(msg),
            ResourceError::ParseFailure { path, reason } => {
                RuntimeError::Other(format!("Parse error in {}: {}", path, reason))
            }
            ResourceError::TooLarge(msg) => RuntimeError::ResourceTooLarge(msg),
            ResourceError::Other(msg) => RuntimeError::Other(msg),
        }
    }
}

/// Security-specific error type
#[derive(Error, Debug)]
pub enum SecurityError {
    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Integrity violation: {0}")]
    IntegrityViolation(String),

    #[error("Invalid signature")]
    InvalidSignature,

    #[error("Sandbox violation: {0}")]
    SandboxViolation(String),

    #[error("Security error: {0}")]
    Other(String),
}

impl From<SecurityError> for RuntimeError {
    fn from(err: SecurityError) -> Self {
        match err {
            SecurityError::PermissionDenied(perm) => {
                RuntimeError::PermissionDenied { permission: perm }
            }
            SecurityError::IntegrityViolation(msg) => RuntimeError::IntegrityViolation(msg),
            SecurityError::InvalidSignature => RuntimeError::InvalidSignature,
            SecurityError::SandboxViolation(msg) => RuntimeError::SandboxViolation(msg),
            SecurityError::Other(msg) => RuntimeError::SecurityViolation(msg),
        }
    }
}

/// Plugin-specific error type
#[derive(Error, Debug)]
pub enum PluginError {
    #[error("Plugin not found: {0}")]
    NotFound(String),

    #[error("Plugin failed: {0}")]
    Failed(String),

    #[error("Plugin crashed: {0}")]
    Crashed(String),

    #[error("Plugin memory limit exceeded")]
    MemoryLimit,

    #[error("Plugin CPU limit exceeded")]
    CpuLimit,

    #[error("Plugin error: {0}")]
    Other(String),
}

impl From<PluginError> for RuntimeError {
    fn from(err: PluginError) -> Self {
        match err {
            PluginError::NotFound(id) => RuntimeError::PluginNotFound(id),
            PluginError::Failed(msg) => RuntimeError::PluginFailed(msg),
            PluginError::Crashed(msg) => RuntimeError::PluginCrashed(msg),
            PluginError::MemoryLimit => RuntimeError::PluginMemoryLimit,
            PluginError::CpuLimit => RuntimeError::PluginCpuLimit,
            PluginError::Other(msg) => RuntimeError::Other(msg),
        }
    }
}

/// Configuration-specific error type
#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("Configuration error: {0}")]
    Error(String),

    #[error("Invalid value: {key} = {value}")]
    InvalidValue { key: String, value: String },

    #[error("Rollback occurred: {key}: {reason}")]
    RollbackOccurred { key: String, reason: String },

    #[error("Config error: {0}")]
    Other(String),
}

impl From<ConfigError> for RuntimeError {
    fn from(err: ConfigError) -> Self {
        match err {
            ConfigError::Error(msg) => RuntimeError::ConfigError(msg),
            ConfigError::InvalidValue { key, value } => {
                RuntimeError::InvalidConfigValue { key, value }
            }
            ConfigError::RollbackOccurred { key, reason } => {
                RuntimeError::ConfigError(format!("Rollback on {}: {}", key, reason))
            }
            ConfigError::Other(msg) => RuntimeError::ConfigError(msg),
        }
    }
}

/// Storage-specific error type
#[derive(Error, Debug)]
pub enum StorageError {
    #[error("Storage error: {0}")]
    Error(String),

    #[error("Write failed: {0}")]
    WriteFailed(String),

    #[error("Quota exceeded")]
    QuotaExceeded,

    #[error("Corrupted: {0}")]
    Corrupted(String),

    #[error("Storage error: {0}")]
    Other(String),
}

impl From<StorageError> for RuntimeError {
    fn from(err: StorageError) -> Self {
        match err {
            StorageError::Error(msg) => RuntimeError::StorageError(msg),
            StorageError::WriteFailed(msg) => RuntimeError::StorageError(msg),
            StorageError::QuotaExceeded => RuntimeError::StorageQuotaExceeded,
            StorageError::Corrupted(msg) => RuntimeError::StorageError(msg),
            StorageError::Other(msg) => RuntimeError::StorageError(msg),
        }
    }
}
