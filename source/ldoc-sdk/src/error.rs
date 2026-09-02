use thiserror::Error;

#[derive(Debug, Error)]
pub enum SdkError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("LDOC core error: {0}")]
    Core(#[from] ldoc_core::LdocError),

    #[error("Runtime error: {0}")]
    Runtime(#[from] ldoc_runtime::RuntimeError),

    #[error("Validation failed: {0}")]
    ValidationFailed(String),

    #[error("Document not found: {0}")]
    NotFound(String),

    #[error("Invalid argument: {0}")]
    InvalidArgument(String),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}
