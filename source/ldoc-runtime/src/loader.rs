// LDOC Runtime — Document Loader
// Opens real .ldocx files using ldoc-core, validates, and builds DocumentContext.

use std::sync::Arc;
use crate::error::{RuntimeError, RuntimeResult};
use crate::context::{DocumentContext, DocumentMetadata, DocumentStats};
use crate::page_manager::{PageManager, LoadedPage};

use ldoc_core::{
    Validator,
    container::LdocZipReader,
    manifest::Manifest,
    metadata::Metadata,
    pages::{PageIndex, PageContent, PageLayout},
};

/// A fully loaded LDOC document ready for the runtime.
pub struct LoadedDocument {
    pub context: Arc<DocumentContext>,
    pub page_manager: Arc<PageManager>,
    pub raw_size_bytes: u64,
}

/// Document loader — bridges ldoc-core into the runtime.
pub struct DocumentLoader;

impl DocumentLoader {
    /// Load a `.ldocx` document from a byte slice.
    ///
    /// Steps:
    ///   1. Validate header + ZIP + manifest + hashes (via ldoc-core Validator)
    ///   2. Parse manifest and metadata
    ///   3. Parse page index
    ///   4. Load each page's content (and layout where present)
    ///   5. Build DocumentContext and PageManager
    pub fn load_from_bytes(data: &[u8]) -> RuntimeResult<LoadedDocument> {
        let raw_size_bytes = data.len() as u64;

        // ── Step 1: Validate ──────────────────────────────────────────────────
        let report = Validator::validate_bytes(data);
        if !report.is_valid() {
            let fatal = report.findings.iter()
                .filter(|f| f.severity == ldoc_core::Severity::Fatal)
                .map(|f| format!("[{}] {}", f.code, f.message))
                .collect::<Vec<_>>()
                .join("; ");
            return Err(RuntimeError::LoadError(format!("Validation failed: {}", fatal)));
        }

        // ── Step 2: Open ZIP and parse manifest + metadata ────────────────────
        use std::io::Cursor;
        let cursor = Cursor::new(data);
        let mut zip = LdocZipReader::open(cursor)
            .map_err(|e| RuntimeError::LoadError(format!("ZIP open failed: {}", e)))?;

        let manifest_bytes = zip.read_entry("manifest.json")
            .map_err(|e| RuntimeError::LoadError(format!("manifest.json: {}", e)))?;
        let manifest = Manifest::from_bytes(&manifest_bytes)
            .map_err(|e| RuntimeError::LoadError(format!("Manifest parse: {}", e)))?;

        let meta_bytes = zip.read_entry("metadata/metadata.json")
            .map_err(|e| RuntimeError::LoadError(format!("metadata.json: {}", e)))?;
        let metadata = Metadata::from_bytes(&meta_bytes)
            .map_err(|e| RuntimeError::LoadError(format!("Metadata parse: {}", e)))?;

        // ── Step 3: Parse page index ──────────────────────────────────────────
        let index_bytes = zip.read_entry("pages/index.json")
            .map_err(|e| RuntimeError::LoadError(format!("pages/index.json: {}", e)))?;
        let page_index = PageIndex::from_bytes(&index_bytes)
            .map_err(|e| RuntimeError::LoadError(format!("PageIndex parse: {}", e)))?;

        // ── Step 4: Load each page ────────────────────────────────────────────
        let mut loaded_pages: Vec<LoadedPage> = Vec::with_capacity(page_index.pages.len());

        for entry in &page_index.pages {
            let content_path = format!("{}/content.json", entry.path);
            let content_bytes = zip.read_entry(&content_path)
                .map_err(|e| RuntimeError::LoadError(
                    format!("Page content '{}': {}", content_path, e)
                ))?;
            let content = PageContent::from_bytes(&content_bytes)
                .map_err(|e| RuntimeError::LoadError(
                    format!("PageContent parse '{}': {}", content_path, e)
                ))?;

            let layout_path = format!("{}/layout.json", entry.path);
            let layout = zip.read_entry(&layout_path)
                .ok()
                .and_then(|b| PageLayout::from_bytes(&b).ok());

            loaded_pages.push(LoadedPage {
                id: entry.id.clone(),
                title: entry.title.clone().unwrap_or_else(|| format!("Page {}", entry.number)),
                number: entry.number,
                visible: entry.visible,
                page_type: entry.page_type.clone(),
                parent_id: entry.parent_id.clone(),
                children: entry.children.clone(),
                content,
                layout,
            });
        }

        // ── Step 5: Build context ─────────────────────────────────────────────
        let first_author = metadata.authors.first()
            .map(|a| a.name.clone())
            .unwrap_or_default();

        let doc_meta = DocumentMetadata {
            id: metadata.document.id.clone(),
            title: metadata.document.title.clone(),
            author: first_author,
            language: metadata.document.language.clone(),
            version: manifest.document.spec_version.clone(),
            created_at: 0,
            modified_at: 0,
        };

        let context = Arc::new(DocumentContext::new(doc_meta));
        context.update_stats(DocumentStats {
            page_count: page_index.page_count,
            asset_count: 0,
            plugin_count: 0,
            total_size_bytes: raw_size_bytes,
            memory_used_bytes: raw_size_bytes,
        })?;

        let entry_page_id = manifest.document.entry_page.clone();
        let page_manager = Arc::new(PageManager::new(loaded_pages, entry_page_id));

        Ok(LoadedDocument { context, page_manager, raw_size_bytes })
    }

    /// Load a `.ldocx` document from a file path.
    pub fn load_from_file(path: &str) -> RuntimeResult<LoadedDocument> {
        let data = std::fs::read(path)
            .map_err(|e| RuntimeError::LoadError(format!("Cannot read '{}': {}", path, e)))?;
        Self::load_from_bytes(&data)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ldoc_core::DocumentBuilder;

    fn build_test_doc() -> Vec<u8> {
        DocumentBuilder::new("Loader Test", "en", "Test Author")
            .build()
            .expect("build must succeed")
    }

    #[test]
    fn test_load_from_bytes_succeeds() {
        let bytes = build_test_doc();
        let doc = DocumentLoader::load_from_bytes(&bytes).expect("load must succeed");
        assert_eq!(doc.context.metadata().title, "Loader Test");
    }

    #[test]
    fn test_load_sets_author() {
        let bytes = build_test_doc();
        let doc = DocumentLoader::load_from_bytes(&bytes).unwrap();
        assert_eq!(doc.context.metadata().author, "Test Author");
    }

    #[test]
    fn test_load_sets_page_count() {
        let bytes = build_test_doc();
        let doc = DocumentLoader::load_from_bytes(&bytes).unwrap();
        assert!(doc.context.stats().page_count >= 1);
    }

    #[test]
    fn test_load_page_manager_has_pages() {
        let bytes = build_test_doc();
        let doc = DocumentLoader::load_from_bytes(&bytes).unwrap();
        assert!(doc.page_manager.page_count() >= 1);
    }

    #[test]
    fn test_load_rejects_empty_bytes() {
        let result = DocumentLoader::load_from_bytes(&[]);
        assert!(result.is_err());
    }

    #[test]
    fn test_load_rejects_bad_magic() {
        let mut bytes = build_test_doc();
        bytes[0] = 0xFF;
        let result = DocumentLoader::load_from_bytes(&bytes);
        assert!(result.is_err());
    }

    #[test]
    fn test_load_raw_size() {
        let bytes = build_test_doc();
        let len = bytes.len() as u64;
        let doc = DocumentLoader::load_from_bytes(&bytes).unwrap();
        assert_eq!(doc.raw_size_bytes, len);
    }
}
