// LDOC SDK v1.0.0
// Clean public API wrapping ldoc-core and ldoc-runtime.

pub mod document;
pub mod session;
pub mod api;
pub mod error;
pub mod plugins;
pub mod ai;
pub mod server;
pub mod unified;

pub use document::{LdocDocument, LdocPage, LdocManifest, LdocMetadata, LdocValidation};
pub use session::LdocSession;
pub use error::SdkError;
pub use api::LdocApi;
pub use plugins::{LdocPluginManager, minimal_manifest};
pub use ai::LdocAiRuntime;
pub use unified::{
    DocumentFormatAdapter, DocumentFormatRegistry, FileFormat, FormatField,
    FormatProperties, MetadataSchema, ShellAction, ShellState, SvgAdapter,
    ObjAdapter, StlAdapter, PdfAdapter, DocxAdapter,
};

pub const SDK_VERSION: &str = "1.0.0";
