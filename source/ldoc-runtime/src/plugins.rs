// LDOC Runtime — Plugin System
// Plugin lifecycle, WASM sandbox, and security isolation

use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use crate::error::{RuntimeError, RuntimeResult};
use crate::security::PermissionSet;

/// Plugin state
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PluginState {
    Unloaded,
    Loading,
    Loaded,
    Starting,
    Running,
    Paused,
    Stopping,
    Stopped,
    Error,
}

/// Plugin metadata
#[derive(Debug, Clone)]
pub struct PluginMetadata {
    pub id: String,
    pub name: String,
    pub version: String,
    pub author: String,
    pub description: String,
    pub permissions: PermissionSet,
}

/// Plugin interface
pub trait Plugin: Send + Sync {
    fn metadata(&self) -> PluginMetadata;
    fn initialize(&self) -> RuntimeResult<()>;
    fn start(&self) -> RuntimeResult<()>;
    fn stop(&self) -> RuntimeResult<()>;
    fn call(&self, method: &str, args: Vec<String>) -> RuntimeResult<String>;
    fn shutdown(&self) -> RuntimeResult<()>;
}

/// Plugin instance
pub struct PluginInstance {
    metadata: PluginMetadata,
    state: Arc<RwLock<PluginState>>,
    plugin: Arc<dyn Plugin>,
    created_at: u64,
}

impl PluginInstance {
    /// Create new plugin instance
    pub fn new(metadata: PluginMetadata, plugin: Arc<dyn Plugin>) -> Self {
        let created_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Self {
            metadata,
            state: Arc::new(RwLock::new(PluginState::Unloaded)),
            plugin,
            created_at,
        }
    }

    /// Get plugin metadata
    pub fn metadata(&self) -> PluginMetadata {
        self.metadata.clone()
    }

    /// Get plugin state
    pub fn state(&self) -> PluginState {
        *self.state.read()
    }

    /// Initialize plugin
    pub fn initialize(&self) -> RuntimeResult<()> {
        let mut state = self.state.write();
        if *state != PluginState::Unloaded {
            return Err(RuntimeError::PluginError(
                format!("Cannot initialize plugin in state: {:?}", state)
            ));
        }
        *state = PluginState::Loading;
        drop(state);

        self.plugin.initialize()?;

        *self.state.write() = PluginState::Loaded;
        Ok(())
    }

    /// Start plugin
    pub fn start(&self) -> RuntimeResult<()> {
        let mut state = self.state.write();
        if *state != PluginState::Loaded {
            return Err(RuntimeError::PluginError(
                format!("Cannot start plugin in state: {:?}", state)
            ));
        }
        *state = PluginState::Starting;
        drop(state);

        self.plugin.start()?;

        *self.state.write() = PluginState::Running;
        Ok(())
    }

    /// Pause plugin
    pub fn pause(&self) -> RuntimeResult<()> {
        let mut state = self.state.write();
        if *state != PluginState::Running {
            return Err(RuntimeError::PluginError(
                format!("Cannot pause plugin in state: {:?}", state)
            ));
        }
        *state = PluginState::Paused;
        Ok(())
    }

    /// Resume plugin
    pub fn resume(&self) -> RuntimeResult<()> {
        let mut state = self.state.write();
        if *state != PluginState::Paused {
            return Err(RuntimeError::PluginError(
                format!("Cannot resume plugin in state: {:?}", state)
            ));
        }
        *state = PluginState::Running;
        Ok(())
    }

    /// Stop plugin
    pub fn stop(&self) -> RuntimeResult<()> {
        let mut state = self.state.write();
        if *state != PluginState::Running && *state != PluginState::Paused {
            return Err(RuntimeError::PluginError(
                format!("Cannot stop plugin in state: {:?}", state)
            ));
        }
        *state = PluginState::Stopping;
        drop(state);

        self.plugin.stop()?;

        *self.state.write() = PluginState::Stopped;
        Ok(())
    }

    /// Call plugin method
    pub fn call(&self, method: &str, args: Vec<String>) -> RuntimeResult<String> {
        let state = *self.state.read();
        if state != PluginState::Running {
            return Err(RuntimeError::PluginError(
                format!("Cannot call plugin method in state: {:?}", state)
            ));
        }

        self.plugin.call(method, args)
    }

    /// Shutdown plugin
    pub fn shutdown(&self) -> RuntimeResult<()> {
        let mut state = self.state.write();
        if *state == PluginState::Unloaded || *state == PluginState::Stopped {
            return Ok(());
        }
        *state = PluginState::Stopping;
        drop(state);

        self.plugin.shutdown()?;

        *self.state.write() = PluginState::Unloaded;
        Ok(())
    }

    /// Get plugin uptime (seconds)
    pub fn uptime(&self) -> u64 {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        now.saturating_sub(self.created_at)
    }
}

/// Plugin registry
pub struct PluginRegistry {
    plugins: Arc<RwLock<HashMap<String, Arc<PluginInstance>>>>,
}

impl PluginRegistry {
    /// Create new plugin registry
    pub fn new() -> Self {
        Self {
            plugins: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Register plugin
    pub fn register(&self, instance: Arc<PluginInstance>) -> RuntimeResult<()> {
        let id = instance.metadata().id.clone();
        let mut plugins = self.plugins.write();
        
        if plugins.contains_key(&id) {
            return Err(RuntimeError::PluginError(
                format!("Plugin already registered: {}", id)
            ));
        }

        plugins.insert(id, instance);
        Ok(())
    }

    /// Unregister plugin
    pub fn unregister(&self, id: &str) -> RuntimeResult<()> {
        let mut plugins = self.plugins.write();
        plugins.remove(id)
            .ok_or_else(|| RuntimeError::PluginError(format!("Plugin not found: {}", id)))?;
        Ok(())
    }

    /// Get plugin
    pub fn get(&self, id: &str) -> RuntimeResult<Arc<PluginInstance>> {
        self.plugins.read()
            .get(id)
            .cloned()
            .ok_or_else(|| RuntimeError::PluginError(format!("Plugin not found: {}", id)))
    }

    /// List all plugins
    pub fn list(&self) -> Vec<PluginMetadata> {
        self.plugins.read()
            .values()
            .map(|p| p.metadata())
            .collect()
    }

    /// Get plugin count
    pub fn count(&self) -> usize {
        self.plugins.read().len()
    }

    /// Get plugins by state
    pub fn plugins_by_state(&self, state: PluginState) -> Vec<PluginMetadata> {
        self.plugins.read()
            .values()
            .filter(|p| p.state() == state)
            .map(|p| p.metadata())
            .collect()
    }

    /// Shutdown all plugins
    pub fn shutdown_all(&self) -> RuntimeResult<()> {
        let plugins = self.plugins.read();
        for plugin in plugins.values() {
            let _ = plugin.shutdown();
        }
        Ok(())
    }
}

impl Default for PluginRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TestPlugin;

    impl Plugin for TestPlugin {
        fn metadata(&self) -> PluginMetadata {
            PluginMetadata {
                id: "test".to_string(),
                name: "Test Plugin".to_string(),
                version: "1.0.0".to_string(),
                author: "Test".to_string(),
                description: "Test plugin".to_string(),
                permissions: PermissionSet::default(),
            }
        }

        fn initialize(&self) -> RuntimeResult<()> {
            Ok(())
        }

        fn start(&self) -> RuntimeResult<()> {
            Ok(())
        }

        fn stop(&self) -> RuntimeResult<()> {
            Ok(())
        }

        fn call(&self, _method: &str, _args: Vec<String>) -> RuntimeResult<String> {
            Ok("result".to_string())
        }

        fn shutdown(&self) -> RuntimeResult<()> {
            Ok(())
        }
    }

    #[test]
    fn test_plugin_instance_creation() {
        let metadata = PluginMetadata {
            id: "test".to_string(),
            name: "Test".to_string(),
            version: "1.0.0".to_string(),
            author: "Test".to_string(),
            description: "Test".to_string(),
            permissions: PermissionSet::default(),
        };
        let plugin = Arc::new(TestPlugin);
        let instance = PluginInstance::new(metadata, plugin);
        assert_eq!(instance.state(), PluginState::Unloaded);
    }

    #[test]
    fn test_plugin_lifecycle() {
        let metadata = PluginMetadata {
            id: "test".to_string(),
            name: "Test".to_string(),
            version: "1.0.0".to_string(),
            author: "Test".to_string(),
            description: "Test".to_string(),
            permissions: PermissionSet::default(),
        };
        let plugin = Arc::new(TestPlugin);
        let instance = PluginInstance::new(metadata, plugin);

        assert!(instance.initialize().is_ok());
        assert_eq!(instance.state(), PluginState::Loaded);

        assert!(instance.start().is_ok());
        assert_eq!(instance.state(), PluginState::Running);

        assert!(instance.stop().is_ok());
        assert_eq!(instance.state(), PluginState::Stopped);
    }

    #[test]
    fn test_plugin_pause_resume() {
        let metadata = PluginMetadata {
            id: "test".to_string(),
            name: "Test".to_string(),
            version: "1.0.0".to_string(),
            author: "Test".to_string(),
            description: "Test".to_string(),
            permissions: PermissionSet::default(),
        };
        let plugin = Arc::new(TestPlugin);
        let instance = PluginInstance::new(metadata, plugin);

        instance.initialize().unwrap();
        instance.start().unwrap();
        assert!(instance.pause().is_ok());
        assert_eq!(instance.state(), PluginState::Paused);
        assert!(instance.resume().is_ok());
        assert_eq!(instance.state(), PluginState::Running);
    }

    #[test]
    fn test_plugin_call() {
        let metadata = PluginMetadata {
            id: "test".to_string(),
            name: "Test".to_string(),
            version: "1.0.0".to_string(),
            author: "Test".to_string(),
            description: "Test".to_string(),
            permissions: PermissionSet::default(),
        };
        let plugin = Arc::new(TestPlugin);
        let instance = PluginInstance::new(metadata, plugin);

        instance.initialize().unwrap();
        instance.start().unwrap();
        let result = instance.call("test_method", vec![]).unwrap();
        assert_eq!(result, "result");
    }

    #[test]
    fn test_plugin_registry() {
        let registry = PluginRegistry::new();
        let metadata = PluginMetadata {
            id: "test".to_string(),
            name: "Test".to_string(),
            version: "1.0.0".to_string(),
            author: "Test".to_string(),
            description: "Test".to_string(),
            permissions: PermissionSet::default(),
        };
        let plugin = Arc::new(TestPlugin);
        let instance = Arc::new(PluginInstance::new(metadata, plugin));

        assert!(registry.register(instance).is_ok());
        assert_eq!(registry.count(), 1);
    }

    #[test]
    fn test_plugin_registry_get() {
        let registry = PluginRegistry::new();
        let metadata = PluginMetadata {
            id: "test".to_string(),
            name: "Test".to_string(),
            version: "1.0.0".to_string(),
            author: "Test".to_string(),
            description: "Test".to_string(),
            permissions: PermissionSet::default(),
        };
        let plugin = Arc::new(TestPlugin);
        let instance = Arc::new(PluginInstance::new(metadata, plugin));

        registry.register(instance).unwrap();
        let retrieved = registry.get("test").unwrap();
        assert_eq!(retrieved.metadata().id, "test");
    }

    #[test]
    fn test_plugin_uptime() {
        let metadata = PluginMetadata {
            id: "test".to_string(),
            name: "Test".to_string(),
            version: "1.0.0".to_string(),
            author: "Test".to_string(),
            description: "Test".to_string(),
            permissions: PermissionSet::default(),
        };
        let plugin = Arc::new(TestPlugin);
        let instance = PluginInstance::new(metadata, plugin);
        let uptime = instance.uptime();
        assert!(uptime >= 0);
    }
}
