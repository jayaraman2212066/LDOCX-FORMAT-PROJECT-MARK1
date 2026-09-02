// LDOC SDK — Plugin API
// Clean public interface over the runtime PluginHost.

use std::sync::Arc;
use ldoc_runtime::{PluginHost, EventDispatcher, build_test_manifest};
use ldoc_core::plugins::PluginManifest;
use crate::error::SdkError;

/// SDK-level plugin manager.
pub struct LdocPluginManager {
    host: PluginHost,
}

impl LdocPluginManager {
    pub fn new() -> Self {
        let dispatcher = Arc::new(EventDispatcher::new(500));
        Self { host: PluginHost::new(dispatcher) }
    }

    /// Load and start a plugin from its manifest.
    pub fn load(&self, manifest: PluginManifest) -> Result<(), SdkError> {
        self.host.load_from_manifest(manifest)
            .map_err(|e| SdkError::InvalidArgument(e.to_string()))
    }

    /// Call a method on a running plugin.
    pub fn call(&self, plugin_id: &str, method: &str, args: Vec<String>) -> Result<String, SdkError> {
        self.host.call(plugin_id, method, args)
            .map_err(|e| SdkError::InvalidArgument(e.to_string()))
    }

    /// Unload a plugin by id.
    pub fn unload(&self, plugin_id: &str) -> Result<(), SdkError> {
        self.host.unload(plugin_id)
            .map_err(|e| SdkError::NotFound(e.to_string()))
    }

    /// Unload all plugins.
    pub fn unload_all(&self) {
        self.host.unload_all();
    }

    /// Number of loaded plugins.
    pub fn count(&self) -> usize {
        self.host.registry().count()
    }

    /// List loaded plugin ids.
    pub fn list_ids(&self) -> Vec<String> {
        self.host.registry().list().iter().map(|m| m.id.clone()).collect()
    }
}

impl Default for LdocPluginManager {
    fn default() -> Self { Self::new() }
}

/// Build a minimal plugin manifest for testing/demo purposes.
pub fn minimal_manifest(id: &str, permissions: Vec<&str>) -> PluginManifest {
    build_test_manifest(id, permissions)
}
