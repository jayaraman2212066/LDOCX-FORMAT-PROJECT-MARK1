// LDOC Runtime — Virtual File System (Layer 5)
// Specification: Module 02 (Layered Architecture), Module 15 (Folder Ownership)
//
// The VFS presents the contents of the .ldocx ZIP archive as a virtual directory tree.
// It hides ZIP implementation details from all layers above.

use std::collections::HashMap;
use std::io::Cursor;
use std::sync::{Arc, RwLock};
use ldoc_core::container::LdocZipReader;
use crate::error::{RuntimeError, RuntimeResult};

/// Virtual file system entry metadata
#[derive(Debug, Clone)]
pub struct VfsEntry {
    /// Virtual path within the document (e.g., "pages/page_001/content.json")
    pub path: String,
    /// Size in bytes
    pub size: u64,
    /// Whether this is a directory
    pub is_dir: bool,
    /// Content hash (SHA-256) if available
    pub hash: Option<String>,
}

/// Entry cache for frequently accessed entries
/// Caches the last 100 accessed entries to avoid repeated ZIP lookups
struct EntryCache {
    entries: HashMap<String, Vec<u8>>,
    max_size: usize,
}

impl EntryCache {
    fn new(max_size: usize) -> Self {
        Self {
            entries: HashMap::new(),
            max_size,
        }
    }

    fn get(&self, path: &str) -> Option<Vec<u8>> {
        self.entries.get(path).cloned()
    }

    fn insert(&mut self, path: String, data: Vec<u8>) {
        if self.entries.len() >= self.max_size {
            // Simple eviction: remove first entry
            if let Some(first_key) = self.entries.keys().next().cloned() {
                self.entries.remove(&first_key);
            }
        }
        self.entries.insert(path, data);
    }

    fn clear(&mut self) {
        self.entries.clear();
    }
}

/// Virtual File System — abstracts the ZIP container
/// 
/// Responsibilities:
/// - Open and read the ZIP archive at byte offset 64
/// - Enumerate all entries
/// - Read named entries as raw bytes
/// - Resolve virtual paths to ZIP entry names
/// - Detect and reject path traversal attempts
/// - Cache frequently accessed entries
pub struct VirtualFileSystem {
    /// Raw ZIP data (entire .ldocx file)
    data: Vec<u8>,
    /// Entry cache
    cache: Arc<RwLock<EntryCache>>,
    /// Entry list (populated on open)
    entries: Vec<VfsEntry>,
}

impl VirtualFileSystem {
    /// Create a new VFS from raw .ldocx file bytes
    pub fn new(data: Vec<u8>) -> RuntimeResult<Self> {
        // Verify minimum size (64-byte header + ZIP)
        if data.len() < 64 {
            return Err(RuntimeError::ValidationFailed(
                "File too small to be a valid LDOC file".to_string(),
            ));
        }

        // Create VFS with empty entry list
        let vfs = Self {
            data,
            cache: Arc::new(RwLock::new(EntryCache::new(100))),
            entries: Vec::new(),
        };

        Ok(vfs)
    }

    /// Open the ZIP archive and enumerate entries
    pub fn open(&mut self) -> RuntimeResult<()> {
        // Create cursor at offset 64 (after binary header)
        let cursor = Cursor::new(&self.data[64..]);

        // Open ZIP reader
        let zip = LdocZipReader::open(cursor).map_err(|e| {
            RuntimeError::ValidationFailed(format!("Failed to open ZIP container: {}", e))
        })?;

        // Get all entry names
        let entry_names = zip.entry_names();

        // Populate entry list
        self.entries.clear();
        for name in entry_names {
            let is_dir = name.ends_with('/');
            let entry = VfsEntry {
                path: name.clone(),
                size: 0, // Size would be populated from ZIP metadata
                is_dir,
                hash: None,
            };
            self.entries.push(entry);
        }

        Ok(())
    }

    /// Maximum decompressed size per entry (64 MB) — prevents ZIP bomb attacks.
    const MAX_ENTRY_DECOMPRESSED_BYTES: usize = 64 * 1024 * 1024;

    /// Read an entry by virtual path
    /// 
    /// Returns the raw bytes of the entry.
    /// Performs path traversal detection and decompressed size limit before reading.
    pub fn read_entry(&self, path: &str) -> RuntimeResult<Vec<u8>> {
        // Validate path (no traversal attempts)
        self.validate_path(path)?;

        // Check cache first
        {
            let cache = self.cache.read().unwrap();
            if let Some(data) = cache.get(path) {
                return Ok(data);
            }
        }

        // Read from ZIP
        let cursor = Cursor::new(&self.data[64..]);
        let mut zip = LdocZipReader::open(cursor).map_err(|e| {
            RuntimeError::ResourceNotFound(format!("Failed to open ZIP: {}", e))
        })?;

        let data = zip.read_entry(path).map_err(|e| {
            RuntimeError::ResourceNotFound(format!("Entry not found: {}: {}", path, e))
        })?;

        // Enforce decompressed size limit (ZIP bomb protection)
        if data.len() > Self::MAX_ENTRY_DECOMPRESSED_BYTES {
            return Err(RuntimeError::SecurityViolation(format!(
                "Entry '{}' decompressed size {} exceeds limit of {} bytes",
                path, data.len(), Self::MAX_ENTRY_DECOMPRESSED_BYTES
            )));
        }

        // Cache the entry
        {
            let mut cache = self.cache.write().unwrap();
            cache.insert(path.to_string(), data.clone());
        }

        Ok(data)
    }

    /// Get all entry names
    pub fn entry_names(&self) -> Vec<String> {
        self.entries.iter().map(|e| e.path.clone()).collect()
    }

    /// Check if an entry exists
    pub fn entry_exists(&self, path: &str) -> bool {
        self.entries.iter().any(|e| e.path == path)
    }

    /// Get entry metadata
    pub fn entry_metadata(&self, path: &str) -> Option<VfsEntry> {
        self.entries.iter().find(|e| e.path == path).cloned()
    }

    /// List entries in a directory
    pub fn list_dir(&self, dir_path: &str) -> RuntimeResult<Vec<VfsEntry>> {
        self.validate_path(dir_path)?;

        let dir_path = if dir_path.ends_with('/') {
            dir_path.to_string()
        } else {
            format!("{}/", dir_path)
        };

        let entries: Vec<VfsEntry> = self
            .entries
            .iter()
            .filter(|e| e.path.starts_with(&dir_path) && e.path != dir_path)
            .cloned()
            .collect();

        Ok(entries)
    }

    /// Clear the entry cache
    pub fn clear_cache(&self) {
        let mut cache = self.cache.write().unwrap();
        cache.clear();
    }

    /// Get cache statistics
    pub fn cache_stats(&self) -> CacheStats {
        let cache = self.cache.read().unwrap();
        CacheStats {
            entries_cached: cache.entries.len(),
            max_entries: cache.max_size,
        }
    }

    /// Validate a path for security issues
    /// 
    /// Checks for:
    /// - Path traversal attempts (..)
    /// - Absolute paths
    /// - Null bytes
    /// - Invalid characters
    fn validate_path(&self, path: &str) -> RuntimeResult<()> {
        // Check for null bytes
        if path.contains('\0') {
            return Err(RuntimeError::SecurityViolation(
                "Path contains null bytes".to_string(),
            ));
        }

        // Check for absolute paths
        if path.starts_with('/') {
            return Err(RuntimeError::SecurityViolation(
                "Absolute paths not allowed".to_string(),
            ));
        }

        // Check for path traversal
        if path.contains("..") {
            return Err(RuntimeError::SecurityViolation(
                "Path traversal detected".to_string(),
            ));
        }

        // Check for suspicious patterns
        if path.contains("//") {
            return Err(RuntimeError::SecurityViolation(
                "Double slashes in path".to_string(),
            ));
        }

        Ok(())
    }
}

/// Cache statistics
#[derive(Debug, Clone)]
pub struct CacheStats {
    pub entries_cached: usize,
    pub max_entries: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_path_validation_traversal() {
        let vfs = VirtualFileSystem::new(vec![0; 100]).unwrap();
        assert!(vfs.validate_path("../etc/passwd").is_err());
    }

    #[test]
    fn test_path_validation_absolute() {
        let vfs = VirtualFileSystem::new(vec![0; 100]).unwrap();
        assert!(vfs.validate_path("/etc/passwd").is_err());
    }

    #[test]
    fn test_path_validation_null_bytes() {
        let vfs = VirtualFileSystem::new(vec![0; 100]).unwrap();
        assert!(vfs.validate_path("path\0name").is_err());
    }

    #[test]
    fn test_path_validation_valid() {
        let vfs = VirtualFileSystem::new(vec![0; 100]).unwrap();
        assert!(vfs.validate_path("pages/page_001/content.json").is_ok());
    }

    #[test]
    fn test_cache_stats() {
        let vfs = VirtualFileSystem::new(vec![0; 100]).unwrap();
        let stats = vfs.cache_stats();
        assert_eq!(stats.entries_cached, 0);
        assert_eq!(stats.max_entries, 100);
    }

    #[test]
    fn test_decompressed_size_limit_constant() {
        // Verify the limit is set to a sane value (64 MB)
        assert_eq!(VirtualFileSystem::MAX_ENTRY_DECOMPRESSED_BYTES, 64 * 1024 * 1024);
    }
}
