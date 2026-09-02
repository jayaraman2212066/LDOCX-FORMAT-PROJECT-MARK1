// Module 03 — LDOC Container Architecture
// ZIP archive starting at byte offset 64 (after the 64-byte binary header).

use std::io::{Read, Seek, SeekFrom, Write, Cursor};
use zip::{ZipArchive, ZipWriter, write::SimpleFileOptions, CompressionMethod};
use crate::{LdocError, header::ZIP_OFFSET};

/// Required entries that must exist in every LDOC container.
pub const REQUIRED_ENTRIES: &[&str] = &[
    "manifest.json",
    "metadata/",
    "pages/",
    "security/",
];

/// System folders — never included in hashes, never synced.
pub const SYSTEM_FOLDERS: &[&str] = &["cache/", "logs/"];

/// Reserved folder names for future use.
pub const RESERVED_FOLDERS: &[&str] = &[
    "collab/", "history/", "index/", "extensions/", "runtime/",
];

/// Compression method for each entry type, per Module 03 §8.1.
pub fn compression_for_entry(path: &str) -> CompressionMethod {
    // Already-compressed formats → Store
    if path.starts_with("assets/images/")
        || path.starts_with("assets/audio/")
        || path.starts_with("assets/video/")
        || path.starts_with("security/")
        || path.starts_with("thumbnails/")
    {
        return CompressionMethod::Stored;
    }
    // manifest.json must be stored for instant access
    if path == "manifest.json" {
        return CompressionMethod::Stored;
    }
    // Everything else → Deflate
    CompressionMethod::Deflated
}

/// Wraps a reader that skips the first 64 bytes (the LDOC binary header).
pub struct LdocZipReader<R: Read + Seek> {
    archive: ZipArchive<OffsetReader<R>>,
}

impl<R: Read + Seek> LdocZipReader<R> {
    /// Open a ZIP archive from an LDOC file, skipping the 64-byte header.
    pub fn open(mut inner: R) -> Result<Self, LdocError> {
        inner.seek(SeekFrom::Start(ZIP_OFFSET))?;
        let offset_reader = OffsetReader::new(inner, ZIP_OFFSET);
        let archive = ZipArchive::new(offset_reader)
            .map_err(|e| LdocError::InvalidZip(e.to_string()))?;
        Ok(Self { archive })
    }

    /// Maximum decompressed size for any single ZIP entry (64 MiB).
    pub const MAX_ENTRY_DECOMPRESSED_BYTES: u64 = 64 * 1024 * 1024;

    /// Read a named entry as bytes, enforcing decompressed size limit.
    pub fn read_entry(&mut self, name: &str) -> Result<Vec<u8>, LdocError> {
        let mut entry = self.archive.by_name(name)
            .map_err(|_| LdocError::MissingRequiredEntry(name.to_string()))?;
        if entry.encrypted() {
            return Err(LdocError::ZipEncryptionProhibited);
        }
        // Reject entries that claim to decompress beyond the limit
        if entry.size() > Self::MAX_ENTRY_DECOMPRESSED_BYTES {
            return Err(LdocError::ZipBombDetected(name.to_string()));
        }
        let mut buf = Vec::new();
        // Use take() to hard-cap actual bytes read even if size() was wrong
        entry.by_ref().take(Self::MAX_ENTRY_DECOMPRESSED_BYTES + 1).read_to_end(&mut buf)?;
        if buf.len() as u64 > Self::MAX_ENTRY_DECOMPRESSED_BYTES {
            return Err(LdocError::ZipBombDetected(name.to_string()));
        }
        Ok(buf)
    }

    /// Check if a named entry exists.
    pub fn has_entry(&self, name: &str) -> bool {
        self.archive.index_for_name(name).is_some()
    }

    /// List all entry names.
    pub fn entry_names(&self) -> Vec<String> {
        (0..self.archive.len())
            .filter_map(|i| self.archive.name_for_index(i).map(|s| s.to_string()))
            .collect()
    }

    /// Validate container structure — returns fatal errors and warnings.
    pub fn validate(&self) -> Result<Vec<String>, LdocError> {
        let mut warnings = Vec::new();
        let names = self.entry_names();

        // Check for path traversal and absolute paths
        for name in &names {
            if name.contains("..") {
                return Err(LdocError::PathTraversal(name.clone()));
            }
            if name.starts_with('/') {
                return Err(LdocError::PathTraversal(name.clone()));
            }
        }

        // Required entries
        if !self.has_entry("manifest.json") {
            return Err(LdocError::MissingRequiredEntry("manifest.json".into()));
        }
        let has_metadata = names.iter().any(|n| n.starts_with("metadata/"));
        if !has_metadata {
            return Err(LdocError::MissingRequiredEntry("metadata/".into()));
        }
        let has_pages = names.iter().any(|n| n.starts_with("pages/"));
        if !has_pages {
            return Err(LdocError::MissingRequiredEntry("pages/".into()));
        }
        let has_security = names.iter().any(|n| n.starts_with("security/"));
        if !has_security {
            return Err(LdocError::MissingRequiredEntry("security/".into()));
        }

        // Warn if system folders appear in author-created document
        for sf in SYSTEM_FOLDERS {
            if names.iter().any(|n| n.starts_with(sf)) {
                warnings.push(format!("System folder '{sf}' should not be in distributed document"));
            }
        }

        // Info: unknown root folders
        let known_roots = [
            "manifest.json", "metadata/", "pages/", "assets/", "scripts/",
            "annotations/", "security/", "cache/", "thumbnails/", "plugins/",
            "ai/", "logs/",
        ];
        let root_folders: std::collections::HashSet<String> = names.iter()
            .filter_map(|n| n.split('/').next().map(|s| s.to_string()))
            .collect();
        for rf in &root_folders {
            let known = known_roots.iter().any(|k| k.trim_end_matches('/') == rf);
            if !known {
                warnings.push(format!("Unknown root folder: '{rf}'"));
            }
        }

        Ok(warnings)
    }
}

/// A writer that builds an LDOC file: writes the 64-byte header first, then a ZIP archive.
pub struct LdocZipWriter {
    zip_writer: ZipWriter<Cursor<Vec<u8>>>,
}

impl LdocZipWriter {
    pub fn new() -> Self {
        let cursor = Cursor::new(Vec::new());
        Self {
            zip_writer: ZipWriter::new(cursor),
        }
    }

    /// Add an entry to the ZIP archive.
    pub fn add_entry(&mut self, path: &str, data: &[u8]) -> Result<(), LdocError> {
        let method = compression_for_entry(path);
        let options = SimpleFileOptions::default()
            .compression_method(method)
            .unix_permissions(0o644);
        self.zip_writer.start_file(path, options)?;
        self.zip_writer.write_all(data)?;
        Ok(())
    }

    /// Finalize the ZIP and prepend the LDOC binary header.
    /// Returns the complete LDOC file bytes.
    pub fn finish(self, header_bytes: &[u8; 64]) -> Result<Vec<u8>, LdocError> {
        let zip_cursor = self.zip_writer.finish()?;
        let zip_bytes = zip_cursor.into_inner();
        let mut out = Vec::with_capacity(64 + zip_bytes.len());
        out.extend_from_slice(header_bytes);
        out.extend_from_slice(&zip_bytes);
        Ok(out)
    }
}

impl Default for LdocZipWriter {
    fn default() -> Self {
        Self::new()
    }
}

/// A reader adapter that presents a sub-range of the underlying reader as if it starts at offset 0.
/// Used to make the ZIP library see the archive starting at byte 64.
struct OffsetReader<R: Read + Seek> {
    inner: R,
    offset: u64,
}

impl<R: Read + Seek> OffsetReader<R> {
    fn new(inner: R, offset: u64) -> Self {
        Self { inner, offset }
    }
}

impl<R: Read + Seek> Read for OffsetReader<R> {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        self.inner.read(buf)
    }
}

impl<R: Read + Seek> Seek for OffsetReader<R> {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
        let adjusted = match pos {
            SeekFrom::Start(n) => SeekFrom::Start(n + self.offset),
            // SeekFrom::End is intentionally NOT adjusted: the ZIP end-of-central-directory
            // record sits at the real file end, so the ZIP library must seek from the true
            // end of the underlying stream. The returned position is still corrected by
            // saturating_sub(self.offset) below so virtual positions remain consistent.
            SeekFrom::End(n) => SeekFrom::End(n),
            SeekFrom::Current(n) => SeekFrom::Current(n),
        };
        let result = self.inner.seek(adjusted)?;
        Ok(result.saturating_sub(self.offset))
    }
}

