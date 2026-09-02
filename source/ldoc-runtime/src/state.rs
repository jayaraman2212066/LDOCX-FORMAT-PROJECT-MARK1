// LDOC Runtime — State Manager
// Session state, warm storage, persistence, and snapshots

use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use crate::error::{RuntimeError, RuntimeResult};

/// State snapshot
#[derive(Debug, Clone)]
pub struct StateSnapshot {
    pub id: String,
    pub timestamp: u64,
    pub state: HashMap<String, String>,
    pub metadata: HashMap<String, String>,
}

impl StateSnapshot {
    /// Create new snapshot
    pub fn new(id: String, state: HashMap<String, String>) -> Self {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Self {
            id,
            timestamp,
            state,
            metadata: HashMap::new(),
        }
    }

    /// Add metadata
    pub fn with_metadata(mut self, key: String, value: String) -> Self {
        self.metadata.insert(key, value);
        self
    }
}

/// State manager
pub struct StateManager {
    session_state: Arc<RwLock<HashMap<String, String>>>,
    warm_storage: Arc<RwLock<HashMap<String, String>>>,
    snapshots: Arc<RwLock<Vec<StateSnapshot>>>,
    max_snapshots: usize,
}

impl StateManager {
    /// Create new state manager
    pub fn new(max_snapshots: usize) -> Self {
        Self {
            session_state: Arc::new(RwLock::new(HashMap::new())),
            warm_storage: Arc::new(RwLock::new(HashMap::new())),
            snapshots: Arc::new(RwLock::new(Vec::new())),
            max_snapshots,
        }
    }

    /// Set session state
    pub fn set_session(&self, key: String, value: String) -> RuntimeResult<()> {
        self.session_state.write().insert(key, value);
        Ok(())
    }

    /// Get session state
    pub fn get_session(&self, key: &str) -> RuntimeResult<Option<String>> {
        Ok(self.session_state.read().get(key).cloned())
    }

    /// Get session state with default
    pub fn get_session_or_default(&self, key: &str, default: String) -> String {
        self.session_state.read()
            .get(key)
            .cloned()
            .unwrap_or(default)
    }

    /// Remove session state
    pub fn remove_session(&self, key: &str) -> RuntimeResult<()> {
        self.session_state.write().remove(key);
        Ok(())
    }

    /// Clear session state
    pub fn clear_session(&self) -> RuntimeResult<()> {
        self.session_state.write().clear();
        Ok(())
    }

    /// Set warm storage (persistent across sessions)
    pub fn set_warm(&self, key: String, value: String) -> RuntimeResult<()> {
        self.warm_storage.write().insert(key, value);
        Ok(())
    }

    /// Get warm storage
    pub fn get_warm(&self, key: &str) -> RuntimeResult<Option<String>> {
        Ok(self.warm_storage.read().get(key).cloned())
    }

    /// Get warm storage with default
    pub fn get_warm_or_default(&self, key: &str, default: String) -> String {
        self.warm_storage.read()
            .get(key)
            .cloned()
            .unwrap_or(default)
    }

    /// Remove warm storage
    pub fn remove_warm(&self, key: &str) -> RuntimeResult<()> {
        self.warm_storage.write().remove(key);
        Ok(())
    }

    /// Clear warm storage
    pub fn clear_warm(&self) -> RuntimeResult<()> {
        self.warm_storage.write().clear();
        Ok(())
    }

    /// Create snapshot
    pub fn create_snapshot(&self, id: String) -> RuntimeResult<StateSnapshot> {
        let state = self.session_state.read().clone();
        let snapshot = StateSnapshot::new(id, state);

        let mut snapshots = self.snapshots.write();
        snapshots.push(snapshot.clone());

        // Keep only max_snapshots
        if snapshots.len() > self.max_snapshots {
            snapshots.remove(0);
        }

        Ok(snapshot)
    }

    /// Restore from snapshot
    pub fn restore_snapshot(&self, id: &str) -> RuntimeResult<()> {
        let snapshots = self.snapshots.read();
        let snapshot = snapshots.iter()
            .find(|s| s.id == id)
            .ok_or_else(|| RuntimeError::StateError(format!("Snapshot not found: {}", id)))?;

        let mut session = self.session_state.write();
        session.clear();
        session.extend(snapshot.state.clone());
        Ok(())
    }

    /// Get snapshot
    pub fn get_snapshot(&self, id: &str) -> RuntimeResult<StateSnapshot> {
        self.snapshots.read()
            .iter()
            .find(|s| s.id == id)
            .cloned()
            .ok_or_else(|| RuntimeError::StateError(format!("Snapshot not found: {}", id)))
    }

    /// List all snapshots
    pub fn list_snapshots(&self) -> Vec<StateSnapshot> {
        self.snapshots.read().clone()
    }

    /// Delete snapshot
    pub fn delete_snapshot(&self, id: &str) -> RuntimeResult<()> {
        let mut snapshots = self.snapshots.write();
        let initial_len = snapshots.len();
        snapshots.retain(|s| s.id != id);
        
        if snapshots.len() == initial_len {
            return Err(RuntimeError::StateError(format!("Snapshot not found: {}", id)));
        }
        Ok(())
    }

    /// Get session state keys
    pub fn session_keys(&self) -> Vec<String> {
        self.session_state.read().keys().cloned().collect()
    }

    /// Get warm storage keys
    pub fn warm_keys(&self) -> Vec<String> {
        self.warm_storage.read().keys().cloned().collect()
    }

    /// Get session state size
    pub fn session_size(&self) -> usize {
        self.session_state.read().len()
    }

    /// Get warm storage size
    pub fn warm_size(&self) -> usize {
        self.warm_storage.read().len()
    }

    /// Get snapshot count
    pub fn snapshot_count(&self) -> usize {
        self.snapshots.read().len()
    }
}

impl Default for StateManager {
    fn default() -> Self {
        Self::new(10)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_state_manager_creation() {
        let manager = StateManager::new(10);
        assert_eq!(manager.session_size(), 0);
        assert_eq!(manager.warm_size(), 0);
    }

    #[test]
    fn test_session_state() {
        let manager = StateManager::new(10);
        manager.set_session("key1".to_string(), "value1".to_string()).unwrap();
        let value = manager.get_session("key1").unwrap();
        assert_eq!(value, Some("value1".to_string()));
    }

    #[test]
    fn test_session_default() {
        let manager = StateManager::new(10);
        let value = manager.get_session_or_default("missing", "default".to_string());
        assert_eq!(value, "default");
    }

    #[test]
    fn test_session_remove() {
        let manager = StateManager::new(10);
        manager.set_session("key1".to_string(), "value1".to_string()).unwrap();
        manager.remove_session("key1").unwrap();
        let value = manager.get_session("key1").unwrap();
        assert_eq!(value, None);
    }

    #[test]
    fn test_session_clear() {
        let manager = StateManager::new(10);
        manager.set_session("key1".to_string(), "value1".to_string()).unwrap();
        manager.set_session("key2".to_string(), "value2".to_string()).unwrap();
        manager.clear_session().unwrap();
        assert_eq!(manager.session_size(), 0);
    }

    #[test]
    fn test_warm_storage() {
        let manager = StateManager::new(10);
        manager.set_warm("key1".to_string(), "value1".to_string()).unwrap();
        let value = manager.get_warm("key1").unwrap();
        assert_eq!(value, Some("value1".to_string()));
    }

    #[test]
    fn test_warm_default() {
        let manager = StateManager::new(10);
        let value = manager.get_warm_or_default("missing", "default".to_string());
        assert_eq!(value, "default");
    }

    #[test]
    fn test_snapshot_creation() {
        let manager = StateManager::new(10);
        manager.set_session("key1".to_string(), "value1".to_string()).unwrap();
        let snapshot = manager.create_snapshot("snap1".to_string()).unwrap();
        assert_eq!(snapshot.id, "snap1");
        assert_eq!(snapshot.state.get("key1"), Some(&"value1".to_string()));
    }

    #[test]
    fn test_snapshot_restore() {
        let manager = StateManager::new(10);
        manager.set_session("key1".to_string(), "value1".to_string()).unwrap();
        manager.create_snapshot("snap1".to_string()).unwrap();
        
        manager.clear_session().unwrap();
        assert_eq!(manager.session_size(), 0);
        
        manager.restore_snapshot("snap1").unwrap();
        let value = manager.get_session("key1").unwrap();
        assert_eq!(value, Some("value1".to_string()));
    }

    #[test]
    fn test_snapshot_list() {
        let manager = StateManager::new(10);
        manager.create_snapshot("snap1".to_string()).unwrap();
        manager.create_snapshot("snap2".to_string()).unwrap();
        let snapshots = manager.list_snapshots();
        assert_eq!(snapshots.len(), 2);
    }

    #[test]
    fn test_snapshot_delete() {
        let manager = StateManager::new(10);
        manager.create_snapshot("snap1".to_string()).unwrap();
        manager.delete_snapshot("snap1").unwrap();
        assert_eq!(manager.snapshot_count(), 0);
    }

    #[test]
    fn test_snapshot_limit() {
        let manager = StateManager::new(3);
        for i in 0..5 {
            manager.create_snapshot(format!("snap{}", i)).unwrap();
        }
        assert_eq!(manager.snapshot_count(), 3);
    }

    #[test]
    fn test_state_keys() {
        let manager = StateManager::new(10);
        manager.set_session("key1".to_string(), "value1".to_string()).unwrap();
        manager.set_session("key2".to_string(), "value2".to_string()).unwrap();
        let keys = manager.session_keys();
        assert_eq!(keys.len(), 2);
    }
}
