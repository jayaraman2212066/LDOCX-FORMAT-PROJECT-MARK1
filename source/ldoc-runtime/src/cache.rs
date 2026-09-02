// LDOC Runtime — Cache System
// Three-tier cache with LRU eviction and statistics

use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use crate::error::{RuntimeError, RuntimeResult};

/// Cache tier
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CacheTier {
    L1,
    L2,
    L3,
}

/// Cache entry
#[derive(Debug, Clone)]
pub struct CacheEntry {
    pub key: String,
    pub value: Vec<u8>,
    pub tier: CacheTier,
    pub created_at: u64,
    pub accessed_at: u64,
    pub access_count: u32,
}

/// Cache statistics
#[derive(Debug, Clone)]
pub struct CacheStats {
    pub hits: u64,
    pub misses: u64,
    pub evictions: u64,
    pub total_size_bytes: u64,
    pub entry_count: u32,
}

/// Single cache tier
struct CacheTierImpl {
    entries: HashMap<String, CacheEntry>,
    max_size: u64,
    current_size: u64,
}

impl CacheTierImpl {
    fn new(max_size: u64) -> Self {
        Self {
            entries: HashMap::new(),
            max_size,
            current_size: 0,
        }
    }

    fn get(&mut self, key: &str) -> Option<Vec<u8>> {
        if let Some(entry) = self.entries.get_mut(key) {
            entry.accessed_at = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            entry.access_count = entry.access_count.saturating_add(1);
            Some(entry.value.clone())
        } else {
            None
        }
    }

    fn put(&mut self, key: String, value: Vec<u8>, tier: CacheTier) -> RuntimeResult<()> {
        let value_size = value.len() as u64;

        if value_size > self.max_size {
            return Err(RuntimeError::CacheError(
                format!("Value size {} exceeds tier max {}", value_size, self.max_size)
            ));
        }

        // Remove old entry if exists
        if let Some(old_entry) = self.entries.remove(&key) {
            self.current_size = self.current_size.saturating_sub(old_entry.value.len() as u64);
        }

        // Make space if needed
        while self.current_size + value_size > self.max_size && !self.entries.is_empty() {
            self.evict_lru();
        }

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        self.entries.insert(
            key.clone(),
            CacheEntry {
                key: key.clone(),
                value: value.clone(),
                tier,
                created_at: now,
                accessed_at: now,
                access_count: 1,
            },
        );

        self.current_size += value_size;
        Ok(())
    }

    fn evict_lru(&mut self) {
        if let Some((key, _)) = self.entries
            .iter()
            .min_by_key(|(_, entry)| entry.accessed_at)
        {
            let key = key.clone();
            if let Some(entry) = self.entries.remove(&key) {
                self.current_size = self.current_size.saturating_sub(entry.value.len() as u64);
            }
        }
    }

    fn remove(&mut self, key: &str) -> Option<Vec<u8>> {
        if let Some(entry) = self.entries.remove(key) {
            self.current_size = self.current_size.saturating_sub(entry.value.len() as u64);
            Some(entry.value)
        } else {
            None
        }
    }

    fn clear(&mut self) {
        self.entries.clear();
        self.current_size = 0;
    }

    fn size(&self) -> u64 {
        self.current_size
    }

    fn count(&self) -> u32 {
        self.entries.len() as u32
    }
}

/// Three-tier cache system
pub struct CacheSystem {
    l1: Arc<RwLock<CacheTierImpl>>,
    l2: Arc<RwLock<CacheTierImpl>>,
    l3: Arc<RwLock<CacheTierImpl>>,
    stats: Arc<RwLock<CacheStats>>,
}

impl CacheSystem {
    /// Create new cache system
    pub fn new(l1_size: u64, l2_size: u64, l3_size: u64) -> Self {
        Self {
            l1: Arc::new(RwLock::new(CacheTierImpl::new(l1_size))),
            l2: Arc::new(RwLock::new(CacheTierImpl::new(l2_size))),
            l3: Arc::new(RwLock::new(CacheTierImpl::new(l3_size))),
            stats: Arc::new(RwLock::new(CacheStats {
                hits: 0,
                misses: 0,
                evictions: 0,
                total_size_bytes: 0,
                entry_count: 0,
            })),
        }
    }

    /// Get value from cache
    pub fn get(&self, key: &str) -> RuntimeResult<Option<Vec<u8>>> {
        // Try L1
        if let Some(value) = self.l1.write().get(key) {
            self.stats.write().hits += 1;
            return Ok(Some(value));
        }

        // Try L2
        if let Some(value) = self.l2.write().get(key) {
            self.stats.write().hits += 1;
            return Ok(Some(value));
        }

        // Try L3
        if let Some(value) = self.l3.write().get(key) {
            self.stats.write().hits += 1;
            return Ok(Some(value));
        }

        self.stats.write().misses += 1;
        Ok(None)
    }

    /// Put value in cache (L1 by default)
    pub fn put(&self, key: String, value: Vec<u8>) -> RuntimeResult<()> {
        self.put_tier(key, value, CacheTier::L1)
    }

    /// Put value in specific tier
    pub fn put_tier(&self, key: String, value: Vec<u8>, tier: CacheTier) -> RuntimeResult<()> {
        match tier {
            CacheTier::L1 => self.l1.write().put(key, value, tier)?,
            CacheTier::L2 => self.l2.write().put(key, value, tier)?,
            CacheTier::L3 => self.l3.write().put(key, value, tier)?,
        }

        self.update_stats();
        Ok(())
    }

    /// Remove value from cache
    pub fn remove(&self, key: &str) -> RuntimeResult<()> {
        self.l1.write().remove(key);
        self.l2.write().remove(key);
        self.l3.write().remove(key);
        self.update_stats();
        Ok(())
    }

    /// Clear all caches
    pub fn clear(&self) -> RuntimeResult<()> {
        self.l1.write().clear();
        self.l2.write().clear();
        self.l3.write().clear();
        self.stats.write().hits = 0;
        self.stats.write().misses = 0;
        self.stats.write().evictions = 0;
        self.update_stats();
        Ok(())
    }

    /// Get cache statistics
    pub fn stats(&self) -> CacheStats {
        self.stats.read().clone()
    }

    /// Get hit rate
    pub fn hit_rate(&self) -> f64 {
        let stats = self.stats.read();
        let total = stats.hits + stats.misses;
        if total == 0 {
            0.0
        } else {
            stats.hits as f64 / total as f64
        }
    }

    /// Get total cache size
    pub fn total_size(&self) -> u64 {
        self.l1.read().size() + self.l2.read().size() + self.l3.read().size()
    }

    /// Get tier size
    pub fn tier_size(&self, tier: CacheTier) -> u64 {
        match tier {
            CacheTier::L1 => self.l1.read().size(),
            CacheTier::L2 => self.l2.read().size(),
            CacheTier::L3 => self.l3.read().size(),
        }
    }

    /// Get total entry count
    pub fn entry_count(&self) -> u32 {
        self.l1.read().count() + self.l2.read().count() + self.l3.read().count()
    }

    /// Update statistics
    fn update_stats(&self) {
        let mut stats = self.stats.write();
        stats.total_size_bytes = self.total_size();
        stats.entry_count = self.entry_count();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_creation() {
        let cache = CacheSystem::new(1024, 2048, 4096);
        assert_eq!(cache.total_size(), 0);
        assert_eq!(cache.entry_count(), 0);
    }

    #[test]
    fn test_cache_put_get() {
        let cache = CacheSystem::new(1024, 2048, 4096);
        let value = vec![1, 2, 3, 4, 5];
        cache.put("key1".to_string(), value.clone()).unwrap();
        let retrieved = cache.get("key1").unwrap();
        assert_eq!(retrieved, Some(value));
    }

    #[test]
    fn test_cache_miss() {
        let cache = CacheSystem::new(1024, 2048, 4096);
        let result = cache.get("missing").unwrap();
        assert_eq!(result, None);
    }

    #[test]
    fn test_cache_hit_rate() {
        let cache = CacheSystem::new(1024, 2048, 4096);
        cache.put("key1".to_string(), vec![1, 2, 3]).unwrap();
        cache.get("key1").unwrap(); // Hit
        cache.get("missing").unwrap(); // Miss
        let rate = cache.hit_rate();
        assert!(rate > 0.0 && rate < 1.0);
    }

    #[test]
    fn test_cache_remove() {
        let cache = CacheSystem::new(1024, 2048, 4096);
        cache.put("key1".to_string(), vec![1, 2, 3]).unwrap();
        cache.remove("key1").unwrap();
        let result = cache.get("key1").unwrap();
        assert_eq!(result, None);
    }

    #[test]
    fn test_cache_clear() {
        let cache = CacheSystem::new(1024, 2048, 4096);
        cache.put("key1".to_string(), vec![1, 2, 3]).unwrap();
        cache.put("key2".to_string(), vec![4, 5, 6]).unwrap();
        cache.clear().unwrap();
        assert_eq!(cache.entry_count(), 0);
    }

    #[test]
    fn test_cache_tier_placement() {
        let cache = CacheSystem::new(100, 200, 300);
        cache.put_tier("l1".to_string(), vec![1; 50], CacheTier::L1).unwrap();
        cache.put_tier("l2".to_string(), vec![2; 50], CacheTier::L2).unwrap();
        cache.put_tier("l3".to_string(), vec![3; 50], CacheTier::L3).unwrap();

        assert_eq!(cache.tier_size(CacheTier::L1), 50);
        assert_eq!(cache.tier_size(CacheTier::L2), 50);
        assert_eq!(cache.tier_size(CacheTier::L3), 50);
    }

    #[test]
    fn test_cache_lru_eviction() {
        let cache = CacheSystem::new(100, 2048, 4096);
        cache.put("key1".to_string(), vec![1; 60]).unwrap();
        cache.put("key2".to_string(), vec![2; 60]).unwrap();
        // key1 should be evicted due to LRU
        let result = cache.get("key1").unwrap();
        assert_eq!(result, None);
    }

    #[test]
    fn test_cache_statistics() {
        let cache = CacheSystem::new(1024, 2048, 4096);
        cache.put("key1".to_string(), vec![1, 2, 3]).unwrap();
        cache.get("key1").unwrap();
        cache.get("missing").unwrap();

        let stats = cache.stats();
        assert_eq!(stats.hits, 1);
        assert_eq!(stats.misses, 1);
        assert!(stats.total_size_bytes > 0);
    }

    #[test]
    fn test_cache_size_limit() {
        let cache = CacheSystem::new(10, 2048, 4096);
        let result = cache.put("key1".to_string(), vec![1; 20]);
        assert!(result.is_err());
    }
}
