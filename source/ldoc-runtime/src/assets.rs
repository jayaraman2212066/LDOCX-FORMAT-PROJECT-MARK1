// LDOC Runtime — Asset Pipeline
// Asset loading, decompression, decoding, and format validation

use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use crate::error::{RuntimeError, RuntimeResult};

/// Asset format
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum AssetFormat {
    Image,
    Audio,
    Video,
    Font,
    Data,
    Unknown,
}

impl std::fmt::Display for AssetFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

/// Compression type
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CompressionType {
    None,
    Gzip,
    Deflate,
    Brotli,
}

/// Asset metadata
#[derive(Debug, Clone)]
pub struct AssetMetadata {
    pub id: String,
    pub name: String,
    pub format: AssetFormat,
    pub mime_type: String,
    pub size_bytes: u64,
    pub compressed_size: u64,
    pub compression: CompressionType,
    pub created_at: u64,
}

/// Asset data
#[derive(Debug, Clone)]
pub struct Asset {
    pub metadata: AssetMetadata,
    pub data: Vec<u8>,
    pub decoded: bool,
}

impl Asset {
    /// Create new asset
    pub fn new(metadata: AssetMetadata, data: Vec<u8>) -> Self {
        Self {
            metadata,
            data,
            decoded: false,
        }
    }

    /// Get asset size
    pub fn size(&self) -> u64 {
        self.data.len() as u64
    }
}

/// Asset pipeline
pub struct AssetPipeline {
    assets: Arc<RwLock<HashMap<String, Asset>>>,
    format_validators: Arc<RwLock<HashMap<AssetFormat, Arc<dyn Fn(&[u8]) -> bool + Send + Sync>>>>,
}

impl AssetPipeline {
    /// Create new asset pipeline
    pub fn new() -> Self {
        Self {
            assets: Arc::new(RwLock::new(HashMap::new())),
            format_validators: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Register format validator
    pub fn register_validator(
        &self,
        format: AssetFormat,
        validator: Arc<dyn Fn(&[u8]) -> bool + Send + Sync>,
    ) -> RuntimeResult<()> {
        self.format_validators.write().insert(format, validator);
        Ok(())
    }

    /// Validate asset format
    pub fn validate_format(&self, format: AssetFormat, data: &[u8]) -> RuntimeResult<bool> {
        let validators = self.format_validators.read();
        if let Some(validator) = validators.get(&format) {
            Ok(validator(data))
        } else {
            Ok(true) // No validator = assume valid
        }
    }

    /// Decompress asset
    pub fn decompress(&self, asset: &Asset) -> RuntimeResult<Vec<u8>> {
        match asset.metadata.compression {
            CompressionType::None => Ok(asset.data.clone()),
            CompressionType::Gzip => {
                // Placeholder for gzip decompression
                Ok(asset.data.clone())
            }
            CompressionType::Deflate => {
                // Placeholder for deflate decompression
                Ok(asset.data.clone())
            }
            CompressionType::Brotli => {
                // Placeholder for brotli decompression
                Ok(asset.data.clone())
            }
        }
    }

    /// Load asset
    pub fn load_asset(&self, metadata: AssetMetadata, data: Vec<u8>) -> RuntimeResult<()> {
        // Validate format
        if !self.validate_format(metadata.format, &data)? {
            return Err(RuntimeError::AssetError(
                format!("Invalid asset format: {:?}", metadata.format)
            ));
        }

        // Decompress
        let decompressed = self.decompress(&Asset::new(metadata.clone(), data))?;

        let asset = Asset {
            metadata: metadata.clone(),
            data: decompressed,
            decoded: true,
        };

        let mut assets = self.assets.write();
        assets.insert(metadata.id.clone(), asset);
        Ok(())
    }

    /// Get asset
    pub fn get_asset(&self, id: &str) -> RuntimeResult<Asset> {
        self.assets.read()
            .get(id)
            .cloned()
            .ok_or_else(|| RuntimeError::AssetError(format!("Asset not found: {}", id)))
    }

    /// Remove asset
    pub fn remove_asset(&self, id: &str) -> RuntimeResult<()> {
        let mut assets = self.assets.write();
        assets.remove(id)
            .ok_or_else(|| RuntimeError::AssetError(format!("Asset not found: {}", id)))?;
        Ok(())
    }

    /// List all assets
    pub fn list_assets(&self) -> Vec<AssetMetadata> {
        self.assets.read()
            .values()
            .map(|a| a.metadata.clone())
            .collect()
    }

    /// Get asset count
    pub fn asset_count(&self) -> usize {
        self.assets.read().len()
    }

    /// Get assets by format
    pub fn assets_by_format(&self, format: AssetFormat) -> Vec<AssetMetadata> {
        self.assets.read()
            .values()
            .filter(|a| a.metadata.format == format)
            .map(|a| a.metadata.clone())
            .collect()
    }

    /// Get total asset size
    pub fn total_size(&self) -> u64 {
        self.assets.read()
            .values()
            .map(|a| a.size())
            .sum()
    }

    /// Get total compressed size
    pub fn total_compressed_size(&self) -> u64 {
        self.assets.read()
            .values()
            .map(|a| a.metadata.compressed_size)
            .sum()
    }

    /// Get compression ratio
    pub fn compression_ratio(&self) -> f64 {
        let total_compressed = self.total_compressed_size();
        let total_size = self.total_size();
        
        if total_size == 0 {
            0.0
        } else {
            total_compressed as f64 / total_size as f64
        }
    }

    /// Clear all assets
    pub fn clear(&self) -> RuntimeResult<()> {
        self.assets.write().clear();
        Ok(())
    }
}

impl Default for AssetPipeline {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_asset() -> (AssetMetadata, Vec<u8>) {
        let metadata = AssetMetadata {
            id: "asset1".to_string(),
            name: "Test Asset".to_string(),
            format: AssetFormat::Image,
            mime_type: "image/png".to_string(),
            size_bytes: 1024,
            compressed_size: 512,
            compression: CompressionType::None,
            created_at: 1000,
        };
        let data = vec![1, 2, 3, 4, 5];
        (metadata, data)
    }

    #[test]
    fn test_asset_pipeline_creation() {
        let pipeline = AssetPipeline::new();
        assert_eq!(pipeline.asset_count(), 0);
    }

    #[test]
    fn test_load_asset() {
        let pipeline = AssetPipeline::new();
        let (metadata, data) = create_test_asset();
        assert!(pipeline.load_asset(metadata, data).is_ok());
        assert_eq!(pipeline.asset_count(), 1);
    }

    #[test]
    fn test_get_asset() {
        let pipeline = AssetPipeline::new();
        let (metadata, data) = create_test_asset();
        pipeline.load_asset(metadata, data).unwrap();
        let asset = pipeline.get_asset("asset1").unwrap();
        assert_eq!(asset.metadata.id, "asset1");
    }

    #[test]
    fn test_remove_asset() {
        let pipeline = AssetPipeline::new();
        let (metadata, data) = create_test_asset();
        pipeline.load_asset(metadata, data).unwrap();
        assert!(pipeline.remove_asset("asset1").is_ok());
        assert_eq!(pipeline.asset_count(), 0);
    }

    #[test]
    fn test_list_assets() {
        let pipeline = AssetPipeline::new();
        let (metadata1, data1) = create_test_asset();
        let mut metadata2 = create_test_asset().0;
        metadata2.id = "asset2".to_string();
        
        pipeline.load_asset(metadata1, data1).unwrap();
        pipeline.load_asset(metadata2, vec![6, 7, 8]).unwrap();
        
        assert_eq!(pipeline.list_assets().len(), 2);
    }

    #[test]
    fn test_assets_by_format() {
        let pipeline = AssetPipeline::new();
        let (metadata, data) = create_test_asset();
        pipeline.load_asset(metadata, data).unwrap();
        
        let images = pipeline.assets_by_format(AssetFormat::Image);
        assert_eq!(images.len(), 1);
    }

    #[test]
    fn test_total_size() {
        let pipeline = AssetPipeline::new();
        let (metadata, data) = create_test_asset();
        pipeline.load_asset(metadata, data.clone()).unwrap();
        
        let total = pipeline.total_size();
        assert_eq!(total, data.len() as u64);
    }

    #[test]
    fn test_compression_ratio() {
        let pipeline = AssetPipeline::new();
        let (metadata, data) = create_test_asset();
        pipeline.load_asset(metadata, data).unwrap();
        
        let ratio = pipeline.compression_ratio();
        assert!(ratio > 0.0);
    }

    #[test]
    fn test_validate_format() {
        let pipeline = AssetPipeline::new();
        let validator = Arc::new(|data: &[u8]| data.len() > 0);
        pipeline.register_validator(AssetFormat::Image, validator).unwrap();
        
        assert!(pipeline.validate_format(AssetFormat::Image, &[1, 2, 3]).unwrap());
        assert!(!pipeline.validate_format(AssetFormat::Image, &[]).unwrap());
    }

    #[test]
    fn test_decompress() {
        let pipeline = AssetPipeline::new();
        let (metadata, data) = create_test_asset();
        let asset = Asset::new(metadata, data.clone());
        
        let decompressed = pipeline.decompress(&asset).unwrap();
        assert_eq!(decompressed, data);
    }

    #[test]
    fn test_clear() {
        let pipeline = AssetPipeline::new();
        let (metadata, data) = create_test_asset();
        pipeline.load_asset(metadata, data).unwrap();
        assert_eq!(pipeline.asset_count(), 1);
        
        pipeline.clear().unwrap();
        assert_eq!(pipeline.asset_count(), 0);
    }
}
