// LDOC Runtime — Public API Layer
// RuntimeHandle, sub-interfaces, error translation, and input validation

use std::sync::Arc;
use crate::error::RuntimeError;
use crate::kernel::RuntimeKernel;
use crate::context::{DocumentContext, DocumentMetadata};
use crate::dispatcher::EventDispatcher;
use crate::cache::CacheSystem;
use crate::plugins::PluginRegistry;

/// API error (translated from RuntimeError)
#[derive(Debug, Clone)]
pub struct ApiError {
    pub code: String,
    pub message: String,
    pub details: Option<String>,
}

impl ApiError {
    pub fn new(code: String, message: String) -> Self {
        Self { code, message, details: None }
    }

    pub fn with_details(mut self, details: String) -> Self {
        self.details = Some(details);
        self
    }
}

impl From<RuntimeError> for ApiError {
    fn from(err: RuntimeError) -> Self {
        match err {
            RuntimeError::BootError(msg) => ApiError::new("BOOT_ERROR".into(), msg),
            RuntimeError::BootFailed { phase, message } => {
                ApiError::new("BOOT_ERROR".into(), format!("Phase {}: {}", phase, message))
            }
            RuntimeError::LifecycleError(msg) => ApiError::new("LIFECYCLE_ERROR".into(), msg),
            RuntimeError::InvalidTransition { from, to } => {
                ApiError::new("LIFECYCLE_ERROR".into(), format!("{} -> {}", from, to))
            }
            RuntimeError::ResourceError(msg) => ApiError::new("RESOURCE_ERROR".into(), msg),
            RuntimeError::ResourceNotFound(msg) => ApiError::new("RESOURCE_ERROR".into(), msg),
            RuntimeError::SecurityError(msg) => ApiError::new("SECURITY_ERROR".into(), msg),
            RuntimeError::SecurityViolation(msg) => ApiError::new("SECURITY_ERROR".into(), msg),
            RuntimeError::PluginError(msg) => ApiError::new("PLUGIN_ERROR".into(), msg),
            RuntimeError::PluginFailed(msg) => ApiError::new("PLUGIN_ERROR".into(), msg),
            RuntimeError::ConfigError(msg) => ApiError::new("CONFIG_ERROR".into(), msg),
            RuntimeError::CacheError(msg) => ApiError::new("CACHE_ERROR".into(), msg),
            RuntimeError::StateError(msg) => ApiError::new("STATE_ERROR".into(), msg),
            RuntimeError::ThemeError(msg) => ApiError::new("THEME_ERROR".into(), msg),
            RuntimeError::LanguageError(msg) => ApiError::new("LANGUAGE_ERROR".into(), msg),
            RuntimeError::AssetError(msg) => ApiError::new("ASSET_ERROR".into(), msg),
            RuntimeError::Other(msg) => ApiError::new("RUNTIME_ERROR".into(), msg),
            e => ApiError::new("UNKNOWN_ERROR".into(), e.to_string()),
        }
    }
}

/// API result type
pub type ApiResult<T> = Result<T, ApiError>;

/// Document interface
pub struct DocumentApi {
    context: Arc<DocumentContext>,
}

impl DocumentApi {
    pub fn new(context: Arc<DocumentContext>) -> Self {
        Self { context }
    }

    pub fn title(&self) -> String {
        self.context.metadata().title
    }

    pub fn author(&self) -> String {
        self.context.metadata().author
    }

    pub fn page_count(&self) -> u32 {
        self.context.stats().page_count
    }

    pub fn asset_count(&self) -> u32 {
        self.context.stats().asset_count
    }

    pub fn memory_usage(&self) -> u64 {
        self.context.stats().memory_used_bytes
    }
}

/// Events interface
pub struct EventsApi {
    dispatcher: Arc<EventDispatcher>,
}

impl EventsApi {
    pub fn new(dispatcher: Arc<EventDispatcher>) -> Self {
        Self { dispatcher }
    }

    pub fn listener_count(&self) -> usize {
        self.dispatcher.listener_count()
    }

    pub fn history(&self) -> usize {
        self.dispatcher.history().len()
    }

    pub fn hit_rate(&self) -> f64 {
        let stats = self.dispatcher.statistics();
        if stats.0 == 0 { 0.0 } else { stats.1 as f64 / stats.0 as f64 }
    }
}

/// Cache interface
pub struct CacheApi {
    cache: Arc<CacheSystem>,
}

impl CacheApi {
    pub fn new(cache: Arc<CacheSystem>) -> Self {
        Self { cache }
    }

    pub fn hit_rate(&self) -> f64 {
        self.cache.hit_rate()
    }

    pub fn total_size(&self) -> u64 {
        self.cache.total_size()
    }

    pub fn entry_count(&self) -> u32 {
        self.cache.entry_count()
    }

    pub fn compression_ratio(&self) -> f64 {
        0.0 // CacheSystem does not track compression; placeholder
    }
}

/// Plugins interface
pub struct PluginsApi {
    registry: Arc<PluginRegistry>,
}

impl PluginsApi {
    pub fn new(registry: Arc<PluginRegistry>) -> Self {
        Self { registry }
    }

    pub fn count(&self) -> usize {
        self.registry.count()
    }

    pub fn list(&self) -> Vec<String> {
        self.registry.list().iter().map(|p| p.id.clone()).collect()
    }
}

/// Runtime handle (main public API)
pub struct RuntimeHandle {
    kernel: Arc<RuntimeKernel>,
    document: DocumentApi,
    events: EventsApi,
    cache: CacheApi,
    plugins: PluginsApi,
}

impl RuntimeHandle {
    pub fn new(kernel: Arc<RuntimeKernel>) -> Self {
        let document = DocumentApi::new(Arc::new(
            DocumentContext::new(DocumentMetadata {
                id: "default".to_string(),
                title: "Document".to_string(),
                author: "Author".to_string(),
                language: "en".to_string(),
                version: "1.0.0".to_string(),
                created_at: 0,
                modified_at: 0,
            })
        ));

        let events = EventsApi::new(Arc::new(EventDispatcher::new(1000)));
        let cache = CacheApi::new(Arc::new(CacheSystem::new(1024 * 1024, 4 * 1024 * 1024, 16 * 1024 * 1024)));
        let plugins = PluginsApi::new(Arc::new(PluginRegistry::new()));

        Self { kernel, document, events, cache, plugins }
    }

    pub fn kernel(&self) -> Arc<RuntimeKernel> {
        Arc::clone(&self.kernel)
    }

    pub fn document(&self) -> &DocumentApi { &self.document }
    pub fn events(&self) -> &EventsApi { &self.events }
    pub fn cache(&self) -> &CacheApi { &self.cache }
    pub fn plugins(&self) -> &PluginsApi { &self.plugins }

    pub fn initialize(&self) -> ApiResult<()> {
        self.kernel.initialize().map_err(ApiError::from)
    }

    pub fn start(&self) -> ApiResult<()> {
        self.kernel.start().map_err(ApiError::from)
    }

    pub fn pause(&self) -> ApiResult<()> {
        self.kernel.pause().map_err(ApiError::from)
    }

    pub fn resume(&self) -> ApiResult<()> {
        self.kernel.resume().map_err(ApiError::from)
    }

    pub fn shutdown(&self) -> ApiResult<()> {
        self.kernel.shutdown().map_err(ApiError::from)
    }

    pub fn status(&self) -> String {
        format!("{:?}", self.kernel.state())
    }

    pub fn is_running(&self) -> bool {
        self.kernel.is_running()
    }

    pub fn version(&self) -> String {
        crate::RUNTIME_VERSION.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_api_error_creation() {
        let error = ApiError::new("TEST_ERROR".to_string(), "Test message".to_string());
        assert_eq!(error.code, "TEST_ERROR");
        assert_eq!(error.message, "Test message");
    }

    #[test]
    fn test_api_error_with_details() {
        let error = ApiError::new("TEST_ERROR".to_string(), "Test message".to_string())
            .with_details("Additional details".to_string());
        assert_eq!(error.details, Some("Additional details".to_string()));
    }

    #[test]
    fn test_error_translation() {
        let runtime_error = RuntimeError::BootError("Boot failed".to_string());
        let api_error = ApiError::from(runtime_error);
        assert_eq!(api_error.code, "BOOT_ERROR");
    }

    #[test]
    fn test_document_api() {
        let context = Arc::new(DocumentContext::new(DocumentMetadata {
            id: "doc1".to_string(),
            title: "Test Doc".to_string(),
            author: "Test Author".to_string(),
            language: "en".to_string(),
            version: "1.0.0".to_string(),
            created_at: 0,
            modified_at: 0,
        }));
        let api = DocumentApi::new(context);
        assert_eq!(api.title(), "Test Doc");
        assert_eq!(api.author(), "Test Author");
    }

    #[test]
    fn test_events_api() {
        let dispatcher = Arc::new(EventDispatcher::new(1000));
        let api = EventsApi::new(dispatcher);
        assert_eq!(api.listener_count(), 0);
    }

    #[test]
    fn test_cache_api() {
        let cache = Arc::new(CacheSystem::new(1024, 2048, 4096));
        let api = CacheApi::new(cache);
        assert_eq!(api.entry_count(), 0);
    }

    #[test]
    fn test_plugins_api() {
        let registry = Arc::new(PluginRegistry::new());
        let api = PluginsApi::new(registry);
        assert_eq!(api.count(), 0);
    }

    #[test]
    fn test_runtime_handle_creation() {
        let kernel = Arc::new(RuntimeKernel::new(64 * 1024 * 1024).unwrap());
        let handle = RuntimeHandle::new(kernel);
        assert_eq!(handle.version(), crate::RUNTIME_VERSION);
    }

    #[test]
    fn test_runtime_handle_status() {
        let kernel = Arc::new(RuntimeKernel::new(64 * 1024 * 1024).unwrap());
        let handle = RuntimeHandle::new(kernel);
        let status = handle.status();
        assert!(status.contains("Uninitialized"));
    }

    #[test]
    fn test_runtime_handle_lifecycle() {
        let kernel = Arc::new(RuntimeKernel::new(64 * 1024 * 1024).unwrap());
        let handle = RuntimeHandle::new(kernel);
        assert!(handle.initialize().is_ok());
        assert!(handle.start().is_ok());
        assert!(handle.is_running());
        assert!(handle.pause().is_ok());
        assert!(handle.resume().is_ok());
        assert!(handle.shutdown().is_ok());
    }

    #[test]
    fn test_runtime_handle_sub_apis() {
        let kernel = Arc::new(RuntimeKernel::new(64 * 1024 * 1024).unwrap());
        let handle = RuntimeHandle::new(kernel);
        let _doc = handle.document();
        let _events = handle.events();
        let _cache = handle.cache();
        let _plugins = handle.plugins();
    }
}
