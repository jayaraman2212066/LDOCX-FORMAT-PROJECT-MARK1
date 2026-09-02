// Module 02 — LDOC Binary Header Specification
// 64-byte fixed header prepended to every LDOC file at offset 0.

use crc32fast::Hasher;
use crate::LdocError;

/// Magic bytes: "LDOC" = 0x4C 0x44 0x4F 0x43
pub const MAGIC: [u8; 4] = [0x4C, 0x44, 0x4F, 0x43];
/// Format guard bytes: 0x1A 0x0A
pub const GUARD: [u8; 2] = [0x1A, 0x0A];
/// Container type: ZIP
pub const CONTAINER_ZIP: u8 = 0x01;
/// Total header size in bytes
pub const HEADER_SIZE: usize = 64;
/// ZIP archive starts at this byte offset
pub const ZIP_OFFSET: u64 = 64;

// Feature flag bitmasks (u16 LE, bytes 10–11)
pub const FLAG_HAS_SCRIPTS: u16         = 0x0001;
pub const FLAG_HAS_AI: u16              = 0x0002;
pub const FLAG_HAS_PLUGINS: u16         = 0x0004;
pub const FLAG_HAS_ENCRYPTION: u16      = 0x0008;
pub const FLAG_HAS_DIGITAL_SIG: u16     = 0x0010;
pub const FLAG_HAS_ANNOTATIONS: u16     = 0x0020;
pub const FLAG_HAS_COLLABORATION: u16   = 0x0040;
pub const FLAG_HAS_CLOUD_SYNC: u16      = 0x0080;
pub const FLAG_HAS_3D: u16              = 0x0100;
pub const FLAG_HAS_VIDEO: u16           = 0x0200;
pub const FLAG_HAS_AUDIO: u16           = 0x0400;
pub const FLAG_HAS_FORMS: u16           = 0x0800;
pub const FLAG_HAS_VERSION_HISTORY: u16 = 0x1000;
pub const FLAG_READONLY: u16            = 0x2000;

// Header flag bitmasks (u16 LE, bytes 12–13)
pub const HFLAG_ZIP64: u16              = 0x0001;
pub const HFLAG_COMPRESSED_MANIFEST: u16 = 0x0002;
pub const HFLAG_SIGNED_HEADER: u16      = 0x0004;
pub const HFLAG_DRAFT: u16              = 0x0008;
pub const HFLAG_TEMPLATE: u16           = 0x0010;

/// Parsed representation of the 64-byte LDOC binary header.
#[derive(Debug, Clone, PartialEq)]
pub struct LdocHeader {
    pub major_version: u8,
    pub minor_version: u8,
    pub patch_version: u8,
    pub container_type: u8,
    pub feature_flags: u16,
    pub header_flags: u16,
    pub document_epoch: u32,
    pub instance_uuid_prefix: [u8; 16],
}

impl LdocHeader {
    /// Create a new header for a document being written.
    pub fn new(
        major: u8,
        minor: u8,
        patch: u8,
        feature_flags: u16,
        header_flags: u16,
        epoch: u32,
        uuid_prefix: [u8; 16],
    ) -> Self {
        Self {
            major_version: major,
            minor_version: minor,
            patch_version: patch,
            container_type: CONTAINER_ZIP,
            feature_flags,
            header_flags,
            document_epoch: epoch,
            instance_uuid_prefix: uuid_prefix,
        }
    }

    /// Serialize the header to exactly 64 bytes.
    /// CRC32 is computed over bytes 0–19 and written at bytes 20–23.
    pub fn to_bytes(&self) -> [u8; HEADER_SIZE] {
        let mut buf = [0u8; HEADER_SIZE];

        // Bytes 0–3: magic
        buf[0..4].copy_from_slice(&MAGIC);
        // Bytes 4–5: guard
        buf[4..6].copy_from_slice(&GUARD);
        // Bytes 6–8: version
        buf[6] = self.major_version;
        buf[7] = self.minor_version;
        buf[8] = self.patch_version;
        // Byte 9: container type
        buf[9] = self.container_type;
        // Bytes 10–11: feature flags (LE)
        buf[10..12].copy_from_slice(&self.feature_flags.to_le_bytes());
        // Bytes 12–13: header flags (LE)
        buf[12..14].copy_from_slice(&self.header_flags.to_le_bytes());
        // Bytes 14–15: reserved A — 0x00 0x00 (already zero)
        // Bytes 16–19: document epoch (LE)
        buf[16..20].copy_from_slice(&self.document_epoch.to_le_bytes());
        // Bytes 20–23: CRC32 of bytes 0–19
        let crc = compute_crc32(&buf[0..20]);
        buf[20..24].copy_from_slice(&crc.to_le_bytes());
        // Bytes 24–31: reserved B — all 0x00 (already zero)
        // Bytes 32–47: instance UUID prefix
        buf[32..48].copy_from_slice(&self.instance_uuid_prefix);
        // Bytes 48–63: reserved C — all 0x00 (already zero)

        buf
    }

    /// Parse and validate a 64-byte header buffer.
    /// Returns fatal errors immediately; warnings are collected separately via `validate_warnings`.
    pub fn from_bytes(buf: &[u8]) -> Result<Self, LdocError> {
        if buf.len() < HEADER_SIZE {
            return Err(LdocError::FileTooSmall(buf.len()));
        }

        // Stage 1 checks — fatal
        if buf[0..4] != MAGIC {
            return Err(LdocError::MagicBytesMismatch);
        }
        if buf[4..6] != GUARD {
            return Err(LdocError::GuardBytesMismatch);
        }

        let container_type = buf[9];
        if container_type != CONTAINER_ZIP {
            return Err(LdocError::UnsupportedContainerType(container_type));
        }

        // CRC32 check: covers bytes 0–19
        let stored_crc = u32::from_le_bytes(buf[20..24].try_into().unwrap());
        let computed_crc = compute_crc32(&buf[0..20]);
        if stored_crc != computed_crc {
            return Err(LdocError::HeaderCrc32Mismatch);
        }

        let major = buf[6];
        if major != crate::SPEC_MAJOR {
            return Err(LdocError::UnsupportedMajorVersion(major, crate::SPEC_MAJOR));
        }

        let feature_flags = u16::from_le_bytes(buf[10..12].try_into().unwrap());
        let header_flags  = u16::from_le_bytes(buf[12..14].try_into().unwrap());
        let epoch         = u32::from_le_bytes(buf[16..20].try_into().unwrap());

        let mut uuid_prefix = [0u8; 16];
        uuid_prefix.copy_from_slice(&buf[32..48]);

        Ok(Self {
            major_version: major,
            minor_version: buf[7],
            patch_version: buf[8],
            container_type,
            feature_flags,
            header_flags,
            document_epoch: epoch,
            instance_uuid_prefix: uuid_prefix,
        })
    }

    /// Collect non-fatal warnings from the header bytes.
    pub fn validate_warnings(buf: &[u8]) -> Vec<String> {
        let mut warnings = Vec::new();
        if buf.len() < HEADER_SIZE {
            return warnings;
        }
        if buf[14] != 0x00 || buf[15] != 0x00 {
            warnings.push("Reserved A (bytes 14–15) are non-zero".into());
        }
        if buf[24..32].iter().any(|&b| b != 0x00) {
            warnings.push("Reserved B (bytes 24–31) are non-zero".into());
        }
        if buf[48..64].iter().any(|&b| b != 0x00) {
            warnings.push("Reserved C (bytes 48–63) are non-zero".into());
        }
        let feature_flags = u16::from_le_bytes(buf[10..12].try_into().unwrap());
        if feature_flags & 0xC000 != 0 {
            warnings.push("Unknown feature flag bits 14–15 are set".into());
        }
        let header_flags = u16::from_le_bytes(buf[12..14].try_into().unwrap());
        if header_flags & 0xFFE0 != 0 {
            warnings.push("Unknown header flag bits 5–15 are set".into());
        }
        let minor = buf[7];
        if minor > crate::SPEC_MINOR {
            warnings.push(format!(
                "Document minor version {minor} > runtime minor version {}",
                crate::SPEC_MINOR
            ));
        }
        warnings
    }

    pub fn has_feature(&self, flag: u16) -> bool {
        self.feature_flags & flag != 0
    }

    pub fn has_header_flag(&self, flag: u16) -> bool {
        self.header_flags & flag != 0
    }

    pub fn spec_version_string(&self) -> String {
        format!("{}.{}.{}", self.major_version, self.minor_version, self.patch_version)
    }
}

fn compute_crc32(data: &[u8]) -> u32 {
    let mut h = Hasher::new();
    h.update(data);
    h.finalize()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_header() {
        let uuid = [1u8; 16];
        let h = LdocHeader::new(1, 0, 0, FLAG_HAS_SCRIPTS, 0, 1700000000, uuid);
        let bytes = h.to_bytes();
        let parsed = LdocHeader::from_bytes(&bytes).unwrap();
        assert_eq!(h, parsed);
    }

    #[test]
    fn rejects_bad_magic() {
        let mut bytes = [0u8; 64];
        bytes[0] = 0xFF;
        assert!(matches!(LdocHeader::from_bytes(&bytes), Err(LdocError::MagicBytesMismatch)));
    }

    #[test]
    fn rejects_bad_crc() {
        let uuid = [0u8; 16];
        let h = LdocHeader::new(1, 0, 0, 0, 0, 0, uuid);
        let mut bytes = h.to_bytes();
        bytes[20] ^= 0xFF; // corrupt CRC
        assert!(matches!(LdocHeader::from_bytes(&bytes), Err(LdocError::HeaderCrc32Mismatch)));
    }
}
