// LDOC Runtime — Resource Manager (Layer 4)
// Manages document resources, memory pools, and asset lifecycle

use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use crate::error::{RuntimeError, RuntimeResult};

/// Resource type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ResourceType {
    Asset,
    Page,
    Plugin,
    Cache,
    Memory,
    File,
    Stream,
}

/// Resource metadata
#[derive(Debug, Clone)]
pub struct ResourceMetadata {
    pub id: String,
    pub resource_type: ResourceType,
    pub size_bytes: u64,
    pub created_at: u64,
    pub accessed_at: u64,
    pub ref_count: u32,
}

/// Resource pool for managing lifecycle
pub struct ResourcePool {
    resources: Arc<RwLock<HashMap<String, ResourceMetadata>>>,
    max_memory: u64,
    current_memory: Arc<RwLock<u64>>,
}

impl ResourcePool {
    /// Create new resource pool with memory limit
    pub fn new(max_memory: u64) -> Self {
        Self {
            resources: Arc::new(RwLock::new(HashMap::new())),
            max_memory,
            current_memory: Arc::new(RwLock::new(0)),
        }
    }

    /// Register resource
    pub fn register(&self, id: String, resource_type: ResourceType, size_bytes: u64) -> RuntimeResult<()> {
        let mut current = self.current_memory.write();
        if *current + size_bytes > self.max_memory {
            return Err(RuntimeError::ResourceExhausted(
                format!("Memory limit exceeded: {} + {} > {}", current, size_bytes, self.max_memory)
            ));
        }

        let mut resources = self.resources.write();
        resources.insert(id.clone(), ResourceMetadata {
            id,
            resource_type,
            size_bytes,
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            accessed_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            ref_count: 1,
        });

        *current += size_bytes;
        Ok(())
    }

    /// Unregister resource
    pub fn unregister(&self, id: &str) -> RuntimeResult<()> {
        let mut resources = self.resources.write();
        if let Some(metadata) = resources.remove(id) {
            let mut current = self.current_memory.write();
            *current = current.saturating_sub(metadata.size_bytes);
            Ok(())
        } else {
            Err(RuntimeError::ResourceNotFound(id.to_string()))
        }
    }

    /// Increment reference count
    pub fn acquire(&self, id: &str) -> RuntimeResult<()> {
        let mut resources = self.resources.write();
        if let Some(metadata) = resources.get_mut(id) {
            metadata.ref_count = metadata.ref_count.saturating_add(1);
            Ok(())
        } else {
            Err(RuntimeError::ResourceNotFound(id.to_string()))
        }
    }

    /// Decrement reference count
    pub fn release(&self, id: &str) -> RuntimeResult<()> {
        let mut resources = self.resources.write();
        if let Some(metadata) = resources.get_mut(id) {
            metadata.ref_count = metadata.ref_count.saturating_sub(1);
            Ok(())
        } else {
            Err(RuntimeError::ResourceNotFound(id.to_string()))
        }
    }

    /// Get resource metadata
    pub fn get_metadata(&self, id: &str) -> RuntimeResult<ResourceMetadata> {
        let resources = self.resources.read();
        resources.get(id)
            .cloned()
            .ok_or_else(|| RuntimeError::ResourceNotFound(id.to_string()))
    }

    /// Get memory usage
    pub fn memory_usage(&self) -> (u64, u64) {
        let current = *self.current_memory.read();
        (current, self.max_memory)
    }

    /// List all resources
    pub fn list_resources(&self) -> Vec<ResourceMetadata> {
        let resources = self.resources.read();
        resources.values().cloned().collect()
    }

    /// Cleanup unused resources (ref_count == 0)
    pub fn cleanup_unused(&self) -> RuntimeResult<u64> {
        let mut resources = self.resources.write();
        let mut freed = 0u64;
        resources.retain(|_, metadata| {
            if metadata.ref_count == 0 {
                freed += metadata.size_bytes;
                false
            } else {
                true
            }
        });
        let mut current = self.current_memory.write();
        *current = current.saturating_sub(freed);
        Ok(freed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resource_pool_creation() {
        let pool = ResourcePool::new(1024 * 1024);
        let (current, max) = pool.memory_usage();
        assert_eq!(current, 0);
        assert_eq!(max, 1024 * 1024);
    }

    #[test]
    fn test_register_resource() {
        let pool = ResourcePool::new(1024 * 1024);
        assert!(pool.register("asset1".to_string(), ResourceType::Asset, 1024).is_ok());
        let (current, _) = pool.memory_usage();
        assert_eq!(current, 1024);
    }

    #[test]
    fn test_memory_limit() {
        let pool = ResourcePool::new(1024);
        assert!(pool.register("asset1".to_string(), ResourceType::Asset, 512).is_ok());
        assert!(pool.register("asset2".to_string(), ResourceType::Asset, 512).is_ok());
        assert!(pool.register("asset3".to_string(), ResourceType::Asset, 1).is_err());
    }

    #[test]
    fn test_reference_counting() {
        let pool = ResourcePool::new(1024 * 1024);
        pool.register("asset1".to_string(), ResourceType::Asset, 1024).unwrap();
        pool.acquire("asset1").unwrap();
        let metadata = pool.get_metadata("asset1").unwrap();
        assert_eq!(metadata.ref_count, 2);
    }

    #[test]
    fn test_cleanup_unused() {
        let pool = ResourcePool::new(1024 * 1024);
        pool.register("asset1".to_string(), ResourceType::Asset, 1024).unwrap();
        pool.register("asset2".to_string(), ResourceType::Asset, 512).unwrap();
        pool.release("asset1").unwrap();
        let freed = pool.cleanup_unused().unwrap();
        assert_eq!(freed, 1024);
    }
}
