// LDOC Runtime — Phase 2 Foundation
// Specification Version: 2.0.0
// Status: Phase 2.1 — Foundation Implementation

pub mod error;
pub mod platform;
pub mod vfs;
pub mod security;
pub mod resources;
pub mod config;
pub mod kernel;
pub mod lifecycle;
pub mod boot;
pub mod context;
pub mod events;
pub mod dispatcher;
pub mod logger;
pub mod plugins;
pub mod cache;
pub mod state;
pub mod theme;
pub mod language;
pub mod assets;
pub mod api;
pub mod health;
pub mod performance;
pub mod crash;
pub mod inspector;
pub mod page_manager;
pub mod loader;
pub mod interactive;
pub mod plugin_host;
pub mod ai;

pub use error::{RuntimeError, RuntimeResult};
pub use platform::{PlatformAdapter, Platform, default_platform_adapter};
pub use vfs::{VirtualFileSystem, VfsEntry, CacheStats};
pub use security::{SecurityManager, Permission, PermissionSet, SecurityContext, SecurityEvent};
pub use resources::{ResourcePool, ResourceType, ResourceMetadata};
pub use config::{ConfigManager, ConfigValue, ConfigLayer, ResolvedConfig, RuntimeConfig, DisplayConfig, FeatureConfig, DeveloperConfig};
pub use kernel::{RuntimeKernel, KernelState};
pub use lifecycle::{LifecycleManager, LifecycleState, LifecycleTransition, LifecycleEvent};
pub use boot::{BootManager, BootPhase, BootPhaseResult};
pub use context::{DocumentContext, DocumentMetadata, DocumentStats};
pub use events::{Event, EventType, EventPriority};
pub use dispatcher::{EventDispatcher, EventListener};
pub use logger::{Logger, LogLevel, LogEntry, LogSink, ConsoleSink, RingBufferSink, FileSink};
pub use plugins::{Plugin, PluginInstance, PluginRegistry, PluginState, PluginMetadata};
pub use cache::{CacheSystem, CacheTier, CacheEntry, CacheStats as CacheSystemStats};
pub use state::{StateManager, StateSnapshot};
pub use theme::{ThemeService, Theme, ThemeMode, ThemeToken};
pub use language::{LanguageService, Language, LanguageMetadata, TextDirection};
pub use assets::{AssetPipeline, Asset, AssetMetadata, AssetFormat, CompressionType};
pub use api::{RuntimeHandle, ApiError, ApiResult, DocumentApi, EventsApi, CacheApi, PluginsApi};
pub use health::{HealthMonitor, HealthStatus, ComponentHealth, HealthMetrics};
pub use performance::{PerformanceMonitor, PerformanceMetric, BootTiming, MemorySnapshot};
pub use crash::{CrashReporter, CrashReport, CrashSeverity};
pub use inspector::{DeveloperInspector, InspectionMode, ProfileData, InspectionSnapshot};
pub use page_manager::{PageManager, LoadedPage, PageSummary};
pub use loader::{DocumentLoader, LoadedDocument};
pub use interactive::{InteractiveSession, NavigationAction};
pub use plugin_host::{PluginHost, SandboxedPlugin, build_test_manifest};
pub use ai::{AiRuntime, AiRequest, AiResponse, AiError, AiBlock, AiBlockResult,
             AiLimits, AiPricing, AiCostRecord, AiCacheEntry, AiProvider, MockAiProvider};

pub const RUNTIME_VERSION: &str = "2.0.0";
pub const RUNTIME_MAJOR: u8 = 2;
pub const RUNTIME_MINOR: u8 = 0;
pub const RUNTIME_PATCH: u8 = 0;

/// Runtime specification version (from Phase 1)
pub const SPEC_VERSION: &str = "1.0.0";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        assert_eq!(RUNTIME_MAJOR, 2);
        assert_eq!(RUNTIME_MINOR, 0);
        assert_eq!(RUNTIME_PATCH, 0);
    }

    #[test]
    fn test_platform_adapter_creation() {
        let _adapter = default_platform_adapter();
    }
}
