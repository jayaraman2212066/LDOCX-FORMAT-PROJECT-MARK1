// LDOC Core Library — Phase 1 Specification Implementation
// Specification Version: 1.0.0

pub mod header;
pub mod container;
pub mod manifest;
pub mod metadata;
pub mod security;
pub mod assets;
pub mod pages;
pub mod plugins;
pub mod plugin_runtime;
pub mod validation;
pub mod builder;
pub mod dynamic_builder;
pub mod error;

pub use error::LdocError;
pub use builder::DocumentBuilder;
pub use dynamic_builder::{DynamicDocumentBuilder, DynamicPage, ContentBlock, DynamicFeatures, FormField};
pub use validation::{Validator, ValidationReport, ValidationResult, Severity, Finding};

pub const SPEC_VERSION: &str = "1.0.0";
pub const SPEC_MAJOR: u8 = 1;
pub const SPEC_MINOR: u8 = 0;
pub const SPEC_PATCH: u8 = 0;
