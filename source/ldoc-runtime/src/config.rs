// LDOC Runtime — Configuration Manager
// Specification: Module 07 (Runtime Configuration)
//
// 6-layer hierarchy: SystemDefaults(1) → ViewerDefaults(2) → DocumentDefaults(3)
//                    → UserPreferences(4) → SessionOverrides(5) → RuntimeOverrides(6)

use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use crate::error::{RuntimeError, RuntimeResult};

/// Configuration value type
#[derive(Debug, Clone, PartialEq)]
pub enum ConfigValue {
    String(String),
    Integer(i64),
    Float(f64),
    Boolean(bool),
    List(Vec<ConfigValue>),
    Map(HashMap<String, ConfigValue>),
}

impl ConfigValue {
    pub fn as_string(&self) -> RuntimeResult<String> {
        match self {
            ConfigValue::String(s) => Ok(s.clone()),
            _ => Err(RuntimeError::ConfigError("Expected string value".into())),
        }
    }

    pub fn as_integer(&self) -> RuntimeResult<i64> {
        match self {
            ConfigValue::Integer(i) => Ok(*i),
            _ => Err(RuntimeError::ConfigError("Expected integer value".into())),
        }
    }

    pub fn as_float(&self) -> RuntimeResult<f64> {
        match self {
            ConfigValue::Float(f) => Ok(*f),
            _ => Err(RuntimeError::ConfigError("Expected float value".into())),
        }
    }

    pub fn as_boolean(&self) -> RuntimeResult<bool> {
        match self {
            ConfigValue::Boolean(b) => Ok(*b),
            _ => Err(RuntimeError::ConfigError("Expected boolean value".into())),
        }
    }
}

/// Configuration layer — spec Module 07 §7.2
/// Higher numeric value = higher priority (overrides lower).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum ConfigLayer {
    SystemDefaults = 1,
    ViewerDefaults = 2,
    DocumentDefaults = 3,
    UserPreferences = 4,
    SessionOverrides = 5,
    RuntimeOverrides = 6,
}

impl std::fmt::Display for ConfigLayer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

/// Single config entry with source layer tracking
#[derive(Debug, Clone)]
struct ConfigEntry {
    value: ConfigValue,
    layer: ConfigLayer,
}

/// Resolved runtime configuration — spec Module 07 §7.9
#[derive(Debug, Clone)]
pub struct RuntimeConfig {
    pub idle_timeout_ms: u64,
    pub cache_size_mb: u32,
    pub thread_pool_size: u8,
    pub boot_timeout_ms: u64,
}

impl Default for RuntimeConfig {
    fn default() -> Self {
        Self {
            idle_timeout_ms: 60_000,
            cache_size_mb: 256,
            thread_pool_size: 4,
            boot_timeout_ms: 500,
        }
    }
}

#[derive(Debug, Clone)]
pub struct DisplayConfig {
    pub theme: String,
    pub language: String,
    pub font_size_scale: f32,
    pub enable_animations: bool,
    pub accessibility_mode: bool,
}

impl Default for DisplayConfig {
    fn default() -> Self {
        Self {
            theme: "system".into(),
            language: "en".into(),
            font_size_scale: 1.0,
            enable_animations: true,
            accessibility_mode: false,
        }
    }
}

#[derive(Debug, Clone)]
pub struct FeatureConfig {
    pub plugins_enabled: bool,
    pub scripts_enabled: bool,
    pub ai_enabled: bool,
    pub network_enabled: bool,
    pub annotations_enabled: bool,
    pub cloud_sync_enabled: bool,
}

impl Default for FeatureConfig {
    fn default() -> Self {
        Self {
            plugins_enabled: true,
            scripts_enabled: true,
            ai_enabled: false,
            network_enabled: false,
            annotations_enabled: true,
            cloud_sync_enabled: false,
        }
    }
}

#[derive(Debug, Clone)]
pub struct DeveloperConfig {
    pub dev_mode: bool,
    pub verbose_logging: bool,
    pub hot_reload: bool,
    pub profiling: bool,
    pub inspector: bool,
}

impl Default for DeveloperConfig {
    fn default() -> Self {
        Self {
            dev_mode: false,
            verbose_logging: false,
            hot_reload: false,
            profiling: false,
            inspector: false,
        }
    }
}

/// Fully resolved configuration — spec Module 07 §7.9
#[derive(Debug, Clone, Default)]
pub struct ResolvedConfig {
    pub runtime: RuntimeConfig,
    pub display: DisplayConfig,
    pub features: FeatureConfig,
    pub developer: DeveloperConfig,
}

/// Configuration Manager — resolves 6-layer hierarchy into ResolvedConfig
/// Spec: Module 07 §7.4
pub struct ConfigManager {
    entries: Arc<RwLock<HashMap<String, ConfigEntry>>>,
    resolved: Arc<RwLock<ResolvedConfig>>,
}

impl ConfigManager {
    pub fn new() -> Self {
        Self {
            entries: Arc::new(RwLock::new(HashMap::new())),
            resolved: Arc::new(RwLock::new(ResolvedConfig::default())),
        }
    }

    /// Set a config value at a specific layer.
    /// Higher-layer values override lower-layer values — spec §7.4.
    pub fn set(&self, key: String, value: ConfigValue, layer: ConfigLayer) -> RuntimeResult<()> {
        let mut entries = self.entries.write();
        if let Some(existing) = entries.get(&key) {
            if existing.layer > layer {
                // Higher-priority layer already set — do not override
                return Ok(());
            }
        }
        entries.insert(key, ConfigEntry { value, layer });
        Ok(())
    }

    /// Get a config value by key.
    pub fn get(&self, key: &str) -> RuntimeResult<ConfigValue> {
        self.entries
            .read()
            .get(key)
            .map(|e| e.value.clone())
            .ok_or_else(|| RuntimeError::ConfigError(format!("Config key not found: {}", key)))
    }

    pub fn get_or_default(&self, key: &str, default: ConfigValue) -> ConfigValue {
        self.entries
            .read()
            .get(key)
            .map(|e| e.value.clone())
            .unwrap_or(default)
    }

    pub fn get_layer(&self, key: &str) -> RuntimeResult<ConfigLayer> {
        self.entries
            .read()
            .get(key)
            .map(|e| e.layer)
            .ok_or_else(|| RuntimeError::ConfigError(format!("Config key not found: {}", key)))
    }

    pub fn remove(&self, key: &str) -> RuntimeResult<()> {
        self.entries
            .write()
            .remove(key)
            .map(|_| ())
            .ok_or_else(|| RuntimeError::ConfigError(format!("Config key not found: {}", key)))
    }

    pub fn list_keys(&self) -> Vec<String> {
        self.entries.read().keys().cloned().collect()
    }

    pub fn get_layer_configs(&self, layer: ConfigLayer) -> HashMap<String, ConfigValue> {
        self.entries
            .read()
            .iter()
            .filter(|(_, e)| e.layer == layer)
            .map(|(k, e)| (k.clone(), e.value.clone()))
            .collect()
    }

    /// Merge another manager's entries (respects layer priority).
    pub fn merge(&self, other: &ConfigManager) -> RuntimeResult<()> {
        let other_entries = other.entries.read();
        let mut self_entries = self.entries.write();
        for (key, other_entry) in other_entries.iter() {
            if let Some(self_entry) = self_entries.get(key) {
                if self_entry.layer >= other_entry.layer {
                    continue;
                }
            }
            self_entries.insert(key.clone(), other_entry.clone());
        }
        Ok(())
    }

    /// Get the resolved configuration snapshot.
    pub fn resolved(&self) -> ResolvedConfig {
        self.resolved.read().clone()
    }

    /// Update the resolved config (called after all layers are applied).
    pub fn set_resolved(&self, config: ResolvedConfig) {
        *self.resolved.write() = config;
    }

    pub fn clear(&self) {
        self.entries.write().clear();
    }
}

impl Default for ConfigManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_layer_priority_order() {
        assert!(ConfigLayer::RuntimeOverrides > ConfigLayer::SessionOverrides);
        assert!(ConfigLayer::SessionOverrides > ConfigLayer::UserPreferences);
        assert!(ConfigLayer::UserPreferences > ConfigLayer::DocumentDefaults);
        assert!(ConfigLayer::DocumentDefaults > ConfigLayer::ViewerDefaults);
        assert!(ConfigLayer::ViewerDefaults > ConfigLayer::SystemDefaults);
    }

    #[test]
    fn test_set_and_get() {
        let cm = ConfigManager::new();
        cm.set("key".into(), ConfigValue::String("val".into()), ConfigLayer::SystemDefaults).unwrap();
        assert_eq!(cm.get("key").unwrap(), ConfigValue::String("val".into()));
    }

    #[test]
    fn test_higher_layer_overrides() {
        let cm = ConfigManager::new();
        cm.set("theme".into(), ConfigValue::String("light".into()), ConfigLayer::SystemDefaults).unwrap();
        cm.set("theme".into(), ConfigValue::String("dark".into()), ConfigLayer::UserPreferences).unwrap();
        assert_eq!(cm.get("theme").unwrap(), ConfigValue::String("dark".into()));
    }

    #[test]
    fn test_lower_layer_does_not_override() {
        let cm = ConfigManager::new();
        cm.set("theme".into(), ConfigValue::String("dark".into()), ConfigLayer::UserPreferences).unwrap();
        // Attempt to override with lower layer — should be silently ignored
        cm.set("theme".into(), ConfigValue::String("light".into()), ConfigLayer::SystemDefaults).unwrap();
        assert_eq!(cm.get("theme").unwrap(), ConfigValue::String("dark".into()));
    }

    #[test]
    fn test_runtime_override_is_highest() {
        let cm = ConfigManager::new();
        cm.set("lang".into(), ConfigValue::String("en".into()), ConfigLayer::UserPreferences).unwrap();
        cm.set("lang".into(), ConfigValue::String("fr".into()), ConfigLayer::RuntimeOverrides).unwrap();
        assert_eq!(cm.get("lang").unwrap(), ConfigValue::String("fr".into()));
    }

    #[test]
    fn test_get_or_default() {
        let cm = ConfigManager::new();
        let v = cm.get_or_default("missing", ConfigValue::Boolean(true));
        assert_eq!(v, ConfigValue::Boolean(true));
    }

    #[test]
    fn test_resolved_config_defaults() {
        let cm = ConfigManager::new();
        let r = cm.resolved();
        assert_eq!(r.runtime.idle_timeout_ms, 60_000);
        assert_eq!(r.display.font_size_scale, 1.0);
        assert!(!r.developer.dev_mode);
    }

    #[test]
    fn test_merge() {
        let cm1 = ConfigManager::new();
        let cm2 = ConfigManager::new();
        cm1.set("a".into(), ConfigValue::Integer(1), ConfigLayer::SystemDefaults).unwrap();
        cm2.set("b".into(), ConfigValue::Integer(2), ConfigLayer::SystemDefaults).unwrap();
        cm1.merge(&cm2).unwrap();
        assert!(cm1.get("b").is_ok());
    }

    #[test]
    fn test_config_value_types() {
        let s = ConfigValue::String("x".into());
        assert!(s.as_string().is_ok());
        assert!(s.as_integer().is_err());

        let i = ConfigValue::Integer(5);
        assert_eq!(i.as_integer().unwrap(), 5);

        let b = ConfigValue::Boolean(true);
        assert!(b.as_boolean().unwrap());
    }
}
