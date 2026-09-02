// LDOC Runtime — Document Context
// Central context object for document state and metadata

use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use crate::error::{RuntimeError, RuntimeResult};
use crate::lifecycle::LifecycleState;

/// Document metadata
#[derive(Debug, Clone)]
pub struct DocumentMetadata {
    pub id: String,
    pub title: String,
    pub author: String,
    pub language: String,
    pub version: String,
    pub created_at: u64,
    pub modified_at: u64,
}

/// Document statistics
#[derive(Debug, Clone)]
pub struct DocumentStats {
    pub page_count: u32,
    pub asset_count: u32,
    pub plugin_count: u32,
    pub total_size_bytes: u64,
    pub memory_used_bytes: u64,
}

/// Document context
pub struct DocumentContext {
    metadata: Arc<RwLock<DocumentMetadata>>,
    stats: Arc<RwLock<DocumentStats>>,
    state: Arc<RwLock<HashMap<String, String>>>,
    properties: Arc<RwLock<HashMap<String, String>>>,
    lifecycle_state: Arc<RwLock<LifecycleState>>,
}

impl DocumentContext {
    /// Create new document context
    pub fn new(metadata: DocumentMetadata) -> Self {
        Self {
            metadata: Arc::new(RwLock::new(metadata)),
            stats: Arc::new(RwLock::new(DocumentStats {
                page_count: 0,
                asset_count: 0,
                plugin_count: 0,
                total_size_bytes: 0,
                memory_used_bytes: 0,
            })),
            state: Arc::new(RwLock::new(HashMap::new())),
            properties: Arc::new(RwLock::new(HashMap::new())),
            lifecycle_state: Arc::new(RwLock::new(LifecycleState::Created)),
        }
    }

    /// Get document metadata
    pub fn metadata(&self) -> DocumentMetadata {
        self.metadata.read().clone()
    }

    /// Update document metadata
    pub fn update_metadata(&self, metadata: DocumentMetadata) -> RuntimeResult<()> {
        *self.metadata.write() = metadata;
        Ok(())
    }

    /// Get document statistics
    pub fn stats(&self) -> DocumentStats {
        self.stats.read().clone()
    }

    /// Update document statistics
    pub fn update_stats(&self, stats: DocumentStats) -> RuntimeResult<()> {
        *self.stats.write() = stats;
        Ok(())
    }

    /// Set state value
    pub fn set_state(&self, key: String, value: String) -> RuntimeResult<()> {
        self.state.write().insert(key, value);
        Ok(())
    }

    /// Get state value
    pub fn get_state(&self, key: &str) -> RuntimeResult<String> {
        self.state.read()
            .get(key)
            .cloned()
            .ok_or_else(|| RuntimeError::ConfigError(format!("State key not found: {}", key)))
    }

    /// Get state value with default
    pub fn get_state_or_default(&self, key: &str, default: String) -> String {
        self.state.read()
            .get(key)
            .cloned()
            .unwrap_or(default)
    }

    /// Remove state value
    pub fn remove_state(&self, key: &str) -> RuntimeResult<()> {
        self.state.write()
            .remove(key)
            .ok_or_else(|| RuntimeError::ConfigError(format!("State key not found: {}", key)))?;
        Ok(())
    }

    /// List all state keys
    pub fn list_state_keys(&self) -> Vec<String> {
        self.state.read().keys().cloned().collect()
    }

    /// Set property
    pub fn set_property(&self, key: String, value: String) -> RuntimeResult<()> {
        self.properties.write().insert(key, value);
        Ok(())
    }

    /// Get property
    pub fn get_property(&self, key: &str) -> RuntimeResult<String> {
        self.properties.read()
            .get(key)
            .cloned()
            .ok_or_else(|| RuntimeError::ConfigError(format!("Property not found: {}", key)))
    }

    /// Get property with default
    pub fn get_property_or_default(&self, key: &str, default: String) -> String {
        self.properties.read()
            .get(key)
            .cloned()
            .unwrap_or(default)
    }

    /// Remove property
    pub fn remove_property(&self, key: &str) -> RuntimeResult<()> {
        self.properties.write()
            .remove(key)
            .ok_or_else(|| RuntimeError::ConfigError(format!("Property not found: {}", key)))?;
        Ok(())
    }

    /// List all properties
    pub fn list_properties(&self) -> Vec<(String, String)> {
        self.properties.read()
            .iter()
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect()
    }

    /// Set lifecycle state
    pub fn set_lifecycle_state(&self, state: LifecycleState) -> RuntimeResult<()> {
        *self.lifecycle_state.write() = state;
        Ok(())
    }

    /// Get lifecycle state
    pub fn lifecycle_state(&self) -> LifecycleState {
        *self.lifecycle_state.read()
    }

    /// Clear all state and properties
    pub fn clear(&self) -> RuntimeResult<()> {
        self.state.write().clear();
        self.properties.write().clear();
        Ok(())
    }

    /// Get context summary
    pub fn summary(&self) -> String {
        let metadata = self.metadata.read();
        let stats = self.stats.read();
        let lifecycle = self.lifecycle_state.read();
        
        format!(
            "Document: {} ({})\nAuthor: {}\nPages: {}, Assets: {}, Plugins: {}\nMemory: {} bytes\nState: {:?}",
            metadata.title,
            metadata.id,
            metadata.author,
            stats.page_count,
            stats.asset_count,
            stats.plugin_count,
            stats.memory_used_bytes,
            lifecycle
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_metadata() -> DocumentMetadata {
        DocumentMetadata {
            id: "doc1".to_string(),
            title: "Test Document".to_string(),
            author: "Test Author".to_string(),
            language: "en".to_string(),
            version: "1.0.0".to_string(),
            created_at: 1000,
            modified_at: 2000,
        }
    }

    #[test]
    fn test_context_creation() {
        let metadata = create_test_metadata();
        let context = DocumentContext::new(metadata.clone());
        assert_eq!(context.metadata().id, "doc1");
    }

    #[test]
    fn test_metadata_update() {
        let metadata = create_test_metadata();
        let context = DocumentContext::new(metadata);
        
        let mut new_metadata = create_test_metadata();
        new_metadata.title = "Updated Title".to_string();
        context.update_metadata(new_metadata).unwrap();
        
        assert_eq!(context.metadata().title, "Updated Title");
    }

    #[test]
    fn test_stats_update() {
        let metadata = create_test_metadata();
        let context = DocumentContext::new(metadata);
        
        let stats = DocumentStats {
            page_count: 10,
            asset_count: 5,
            plugin_count: 2,
            total_size_bytes: 1024,
            memory_used_bytes: 512,
        };
        context.update_stats(stats).unwrap();
        
        let retrieved = context.stats();
        assert_eq!(retrieved.page_count, 10);
        assert_eq!(retrieved.asset_count, 5);
    }

    #[test]
    fn test_state_management() {
        let metadata = create_test_metadata();
        let context = DocumentContext::new(metadata);
        
        context.set_state("key1".to_string(), "value1".to_string()).unwrap();
        assert_eq!(context.get_state("key1").unwrap(), "value1");
    }

    #[test]
    fn test_state_default() {
        let metadata = create_test_metadata();
        let context = DocumentContext::new(metadata);
        
        let value = context.get_state_or_default("missing", "default".to_string());
        assert_eq!(value, "default");
    }

    #[test]
    fn test_state_removal() {
        let metadata = create_test_metadata();
        let context = DocumentContext::new(metadata);
        
        context.set_state("key1".to_string(), "value1".to_string()).unwrap();
        context.remove_state("key1").unwrap();
        assert!(context.get_state("key1").is_err());
    }

    #[test]
    fn test_property_management() {
        let metadata = create_test_metadata();
        let context = DocumentContext::new(metadata);
        
        context.set_property("prop1".to_string(), "propval1".to_string()).unwrap();
        assert_eq!(context.get_property("prop1").unwrap(), "propval1");
    }

    #[test]
    fn test_lifecycle_state() {
        let metadata = create_test_metadata();
        let context = DocumentContext::new(metadata);
        
        assert_eq!(context.lifecycle_state(), LifecycleState::Created);
        context.set_lifecycle_state(LifecycleState::Running).unwrap();
        assert_eq!(context.lifecycle_state(), LifecycleState::Running);
    }

    #[test]
    fn test_context_clear() {
        let metadata = create_test_metadata();
        let context = DocumentContext::new(metadata);
        
        context.set_state("key1".to_string(), "value1".to_string()).unwrap();
        context.set_property("prop1".to_string(), "propval1".to_string()).unwrap();
        
        context.clear().unwrap();
        assert_eq!(context.list_state_keys().len(), 0);
        assert_eq!(context.list_properties().len(), 0);
    }

    #[test]
    fn test_context_summary() {
        let metadata = create_test_metadata();
        let context = DocumentContext::new(metadata);
        let summary = context.summary();
        assert!(summary.contains("Test Document"));
        assert!(summary.contains("Test Author"));
    }
}
