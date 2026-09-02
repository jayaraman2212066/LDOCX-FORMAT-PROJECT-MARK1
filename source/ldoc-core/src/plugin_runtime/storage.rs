use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::plugin_runtime::{
    error::PluginRuntimeError,
    types::PluginId,
};

// ── StorageEntry ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StorageEntry {
    value:      serde_json::Value,
    /// Absolute expiry timestamp in milliseconds (None = no expiry).
    expires_ms: Option<u64>,
    created_ms: u64,
    updated_ms: u64,
}

impl StorageEntry {
    fn new(value: serde_json::Value, ttl_ms: Option<u64>) -> Self {
        let now = now_ms();
        Self {
            value,
            expires_ms: ttl_ms.map(|t| now + t),
            created_ms: now,
            updated_ms: now,
        }
    }

    fn is_expired(&self) -> bool {
        self.expires_ms.map_or(false, |exp| now_ms() >= exp)
    }

    fn update(&mut self, value: serde_json::Value, ttl_ms: Option<u64>) {
        let now = now_ms();
        self.value      = value;
        self.updated_ms = now;
        self.expires_ms = ttl_ms.map(|t| now + t);
    }

    /// Exact byte size of the stored value (JSON-serialised).
    fn byte_size(&self) -> usize {
        serde_json::to_vec(&self.value).map(|v| v.len()).unwrap_or(0)
    }
}

// ── PluginStore ───────────────────────────────────────────────────────────────

/// Isolated key-value store for a single plugin.
struct PluginStore {
    plugin_id:    PluginId,
    entries:      HashMap<String, StorageEntry>,
    quota_bytes:  usize,
    used_bytes:   usize,
}

impl PluginStore {
    fn new(plugin_id: PluginId, quota_bytes: usize) -> Self {
        Self {
            plugin_id,
            entries:     HashMap::new(),
            quota_bytes,
            used_bytes:  0,
        }
    }

    fn get(&mut self, key: &str) -> Option<&serde_json::Value> {
        // Lazy expiry: remove on access.
        if let Some(entry) = self.entries.get(key) {
            if entry.is_expired() {
                let size = entry.byte_size();
                self.entries.remove(key);
                self.used_bytes = self.used_bytes.saturating_sub(size);
                return None;
            }
        }
        self.entries.get(key).map(|e| &e.value)
    }

    fn set(
        &mut self,
        key: String,
        value: serde_json::Value,
        ttl_ms: Option<u64>,
    ) -> Result<(), PluginRuntimeError> {
        let new_size = value.to_string().len();

        // Subtract old entry size if replacing.
        let old_size = self.entries.get(&key).map_or(0, |e| e.byte_size());
        let delta = new_size.saturating_sub(old_size);

        if self.used_bytes + delta > self.quota_bytes {
            return Err(PluginRuntimeError::StorageQuotaExceeded {
                plugin_id: self.plugin_id.clone(),
            });
        }

        self.used_bytes = self.used_bytes.saturating_sub(old_size) + new_size;

        self.entries
            .entry(key)
            .and_modify(|e| e.update(value.clone(), ttl_ms))
            .or_insert_with(|| StorageEntry::new(value, ttl_ms));

        Ok(())
    }

    fn delete(&mut self, key: &str) -> bool {
        if let Some(entry) = self.entries.remove(key) {
            self.used_bytes = self.used_bytes.saturating_sub(entry.byte_size());
            true
        } else {
            false
        }
    }

    fn contains(&mut self, key: &str) -> bool {
        self.get(key).is_some()
    }

    fn keys(&mut self) -> Vec<String> {
        // Purge expired entries first.
        let expired: Vec<String> = self.entries
            .iter()
            .filter(|(_, e)| e.is_expired())
            .map(|(k, _)| k.clone())
            .collect();
        for k in &expired {
            if let Some(e) = self.entries.remove(k) {
                self.used_bytes = self.used_bytes.saturating_sub(e.byte_size());
            }
        }
        self.entries.keys().cloned().collect()
    }

    fn clear(&mut self) {
        self.entries.clear();
        self.used_bytes = 0;
    }

    fn used_bytes(&self) -> usize { self.used_bytes }
    fn quota_bytes(&self) -> usize { self.quota_bytes }
}

// ── StorageManager ────────────────────────────────────────────────────────────

/// Default per-plugin storage quota: 1 MiB.
const DEFAULT_QUOTA_BYTES: usize = 1 * 1024 * 1024;

/// Manages isolated storage namespaces for all plugins.
pub struct StorageManager {
    stores: HashMap<PluginId, PluginStore>,
    default_quota: usize,
}

impl StorageManager {
    pub fn new() -> Self {
        Self { stores: HashMap::new(), default_quota: DEFAULT_QUOTA_BYTES }
    }

    pub fn with_quota(quota_bytes: usize) -> Self {
        Self { stores: HashMap::new(), default_quota: quota_bytes }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    pub fn register_plugin(&mut self, plugin_id: PluginId) {
        self.stores
            .entry(plugin_id.clone())
            .or_insert_with(|| PluginStore::new(plugin_id, self.default_quota));
    }

    /// Remove a plugin's store entirely (called on uninstall, not just unload).
    pub fn remove_plugin(&mut self, plugin_id: &PluginId) {
        self.stores.remove(plugin_id);
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    pub fn get(
        &mut self,
        plugin_id: &PluginId,
        key: &str,
    ) -> Result<Option<serde_json::Value>, PluginRuntimeError> {
        let store = self.store_mut(plugin_id)?;
        Ok(store.get(key).cloned())
    }

    pub fn get_required(
        &mut self,
        plugin_id: &PluginId,
        key: &str,
    ) -> Result<serde_json::Value, PluginRuntimeError> {
        self.get(plugin_id, key)?.ok_or_else(|| PluginRuntimeError::StorageKeyNotFound {
            plugin_id: plugin_id.clone(),
            key: key.into(),
        })
    }

    /// Deserialise a stored value into `T`.
    pub fn get_as<T: for<'de> Deserialize<'de>>(
        &mut self,
        plugin_id: &PluginId,
        key: &str,
    ) -> Result<Option<T>, PluginRuntimeError> {
        match self.get(plugin_id, key)? {
            None => Ok(None),
            Some(v) => Ok(Some(serde_json::from_value(v)?)),
        }
    }

    pub fn set(
        &mut self,
        plugin_id: &PluginId,
        key: impl Into<String>,
        value: serde_json::Value,
    ) -> Result<(), PluginRuntimeError> {
        let store = self.store_mut(plugin_id)?;
        store.set(key.into(), value, None)
    }

    /// Set with a time-to-live in milliseconds.
    pub fn set_with_ttl(
        &mut self,
        plugin_id: &PluginId,
        key: impl Into<String>,
        value: serde_json::Value,
        ttl_ms: u64,
    ) -> Result<(), PluginRuntimeError> {
        let store = self.store_mut(plugin_id)?;
        store.set(key.into(), value, Some(ttl_ms))
    }

    /// Serialise `T` and store it.
    pub fn set_as<T: Serialize>(
        &mut self,
        plugin_id: &PluginId,
        key: impl Into<String>,
        value: &T,
    ) -> Result<(), PluginRuntimeError> {
        let json = serde_json::to_value(value)?;
        self.set(plugin_id, key, json)
    }

    pub fn delete(
        &mut self,
        plugin_id: &PluginId,
        key: &str,
    ) -> Result<bool, PluginRuntimeError> {
        let store = self.store_mut(plugin_id)?;
        Ok(store.delete(key))
    }

    pub fn contains(
        &mut self,
        plugin_id: &PluginId,
        key: &str,
    ) -> Result<bool, PluginRuntimeError> {
        let store = self.store_mut(plugin_id)?;
        Ok(store.contains(key))
    }

    pub fn keys(&mut self, plugin_id: &PluginId) -> Result<Vec<String>, PluginRuntimeError> {
        let store = self.store_mut(plugin_id)?;
        Ok(store.keys())
    }

    pub fn clear(&mut self, plugin_id: &PluginId) -> Result<(), PluginRuntimeError> {
        let store = self.store_mut(plugin_id)?;
        store.clear();
        Ok(())
    }

    // ── Diagnostics ───────────────────────────────────────────────────────────

    pub fn used_bytes(&self, plugin_id: &PluginId) -> usize {
        self.stores.get(plugin_id).map_or(0, |s| s.used_bytes())
    }

    pub fn quota_bytes(&self, plugin_id: &PluginId) -> usize {
        self.stores.get(plugin_id).map_or(0, |s| s.quota_bytes())
    }

    // ── Private ───────────────────────────────────────────────────────────────

    fn store_mut(&mut self, plugin_id: &PluginId) -> Result<&mut PluginStore, PluginRuntimeError> {
        self.stores.get_mut(plugin_id).ok_or_else(|| {
            PluginRuntimeError::PluginNotFound { plugin_id: plugin_id.clone() }
        })
    }
}

impl Default for StorageManager {
    fn default() -> Self { Self::new() }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn now_ms() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn pid(s: &str) -> PluginId { PluginId::from(s) }

    fn mgr() -> StorageManager {
        let mut m = StorageManager::new();
        m.register_plugin(pid("com.example.plugin"));
        m
    }

    #[test]
    fn set_and_get() {
        let mut m = mgr();
        m.set(&pid("com.example.plugin"), "key", serde_json::json!("hello")).unwrap();
        let v = m.get(&pid("com.example.plugin"), "key").unwrap().unwrap();
        assert_eq!(v, serde_json::json!("hello"));
    }

    #[test]
    fn missing_key_returns_none() {
        let mut m = mgr();
        let v = m.get(&pid("com.example.plugin"), "missing").unwrap();
        assert!(v.is_none());
    }

    #[test]
    fn get_required_errors_on_missing() {
        let mut m = mgr();
        let err = m.get_required(&pid("com.example.plugin"), "nope");
        assert!(matches!(err, Err(PluginRuntimeError::StorageKeyNotFound { .. })));
    }

    #[test]
    fn delete_removes_key() {
        let mut m = mgr();
        m.set(&pid("com.example.plugin"), "k", serde_json::json!(1)).unwrap();
        assert!(m.delete(&pid("com.example.plugin"), "k").unwrap());
        assert!(!m.contains(&pid("com.example.plugin"), "k").unwrap());
    }

    #[test]
    fn quota_exceeded_error() {
        let mut m = StorageManager::with_quota(10); // 10 bytes
        m.register_plugin(pid("com.example.plugin"));
        let err = m.set(
            &pid("com.example.plugin"),
            "k",
            serde_json::json!("this string is definitely longer than ten bytes"),
        );
        assert!(matches!(err, Err(PluginRuntimeError::StorageQuotaExceeded { .. })));
    }

    #[test]
    fn ttl_expiry() {
        let mut m = mgr();
        // TTL of 1ms — will expire immediately.
        m.set_with_ttl(&pid("com.example.plugin"), "temp", serde_json::json!(99), 1).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(5));
        let v = m.get(&pid("com.example.plugin"), "temp").unwrap();
        assert!(v.is_none(), "entry should have expired");
    }

    #[test]
    fn set_as_and_get_as() {
        #[derive(Serialize, Deserialize, PartialEq, Debug)]
        struct Config { threshold: u32 }

        let mut m = mgr();
        m.set_as(&pid("com.example.plugin"), "cfg", &Config { threshold: 42 }).unwrap();
        let cfg: Config = m.get_as(&pid("com.example.plugin"), "cfg").unwrap().unwrap();
        assert_eq!(cfg.threshold, 42);
    }

    #[test]
    fn clear_empties_store() {
        let mut m = mgr();
        m.set(&pid("com.example.plugin"), "a", serde_json::json!(1)).unwrap();
        m.set(&pid("com.example.plugin"), "b", serde_json::json!(2)).unwrap();
        m.clear(&pid("com.example.plugin")).unwrap();
        assert_eq!(m.keys(&pid("com.example.plugin")).unwrap().len(), 0);
        assert_eq!(m.used_bytes(&pid("com.example.plugin")), 0);
    }
}

