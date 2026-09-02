// LDOC Runtime — Security Manager (Layer 6)
// Specification: Module 02 (Layered Architecture), Module 12 (Security)
//
// The Security Manager is the runtime enforcement point for all security policies.
// It works with Phase 1 validation and permission checking.

use std::collections::HashSet;
use std::sync::{Arc, RwLock};
use ldoc_core::validation::{Validator, ValidationResult};
use crate::error::{RuntimeError, RuntimeResult};

/// Permission type
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Permission {
    // Document permissions
    ReadAllPages,
    WriteAnnotations,
    ReadAnnotations,

    // Network permissions
    NetworkRead,
    NetworkWrite,

    // File system permissions
    FilesystemRead,
    FilesystemWrite,

    // AI permissions
    ExecuteAi,

    // Clipboard permissions
    ClipboardRead,
    ClipboardWrite,

    // Sensor permissions
    Camera,
    Microphone,
    Geolocation,

    // System permissions
    Notifications,
}

impl Permission {
    pub fn as_str(&self) -> &'static str {
        match self {
            Permission::ReadAllPages => "read_all_pages",
            Permission::WriteAnnotations => "write_annotations",
            Permission::ReadAnnotations => "read_annotations",
            Permission::NetworkRead => "network_read",
            Permission::NetworkWrite => "network_write",
            Permission::FilesystemRead => "filesystem_read",
            Permission::FilesystemWrite => "filesystem_write",
            Permission::ExecuteAi => "execute_ai",
            Permission::ClipboardRead => "clipboard_read",
            Permission::ClipboardWrite => "clipboard_write",
            Permission::Camera => "camera",
            Permission::Microphone => "microphone",
            Permission::Geolocation => "geolocation",
            Permission::Notifications => "notifications",
        }
    }
}

/// Permission set
#[derive(Debug, Clone)]
pub struct PermissionSet {
    permissions: HashSet<Permission>,
}

impl PermissionSet {
    pub fn new() -> Self {
        Self {
            permissions: HashSet::new(),
        }
    }

    pub fn with_permission(mut self, perm: Permission) -> Self {
        self.permissions.insert(perm);
        self
    }

    pub fn add(&mut self, perm: Permission) {
        self.permissions.insert(perm);
    }

    pub fn has(&self, perm: &Permission) -> bool {
        self.permissions.contains(perm)
    }

    pub fn all(&self) -> Vec<Permission> {
        self.permissions.iter().cloned().collect()
    }
}

impl Default for PermissionSet {
    fn default() -> Self {
        Self::new()
    }
}

/// Security event
#[derive(Debug, Clone)]
pub struct SecurityEvent {
    pub timestamp: String,
    pub event_type: String,
    pub severity: String,
    pub component: String,
    pub details: String,
}

/// Security context
#[derive(Debug, Clone)]
pub struct SecurityContext {
    pub trust_level: String,
    pub signed: bool,
    pub signer_id: Option<String>,
    pub hash_algorithm: String,
    pub integrity_verified: bool,
}

/// Security Manager — enforces all security policies
pub struct SecurityManager {
    /// Granted permissions
    granted_permissions: Arc<RwLock<PermissionSet>>,
    /// Security events log
    events: Arc<RwLock<Vec<SecurityEvent>>>,
    /// Security context
    context: Arc<RwLock<SecurityContext>>,
}

impl SecurityManager {
    /// Create a new Security Manager
    pub fn new() -> Self {
        Self {
            granted_permissions: Arc::new(RwLock::new(PermissionSet::new())),
            events: Arc::new(RwLock::new(Vec::new())),
            context: Arc::new(RwLock::new(SecurityContext {
                trust_level: "untrusted".to_string(),
                signed: false,
                signer_id: None,
                hash_algorithm: "sha256".to_string(),
                integrity_verified: false,
            })),
        }
    }

    /// Run Phase 1 validation pipeline
    pub fn validate_document(&self, data: &[u8]) -> RuntimeResult<()> {
        let report = Validator::validate_bytes(data);

        match report.result {
            ValidationResult::Pass | ValidationResult::PassWithWarnings => {
                // Update security context
                let mut ctx = self.context.write().unwrap();
                ctx.integrity_verified = true;

                // Log validation success
                self.log_event(SecurityEvent {
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    event_type: "IntegrityVerified".to_string(),
                    severity: "info".to_string(),
                    component: "SecurityManager".to_string(),
                    details: format!("Document passed validation: {} findings", report.findings.len()),
                });

                Ok(())
            }
            ValidationResult::Fail => {
                // Log validation failure
                self.log_event(SecurityEvent {
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    event_type: "IntegrityViolation".to_string(),
                    severity: "critical".to_string(),
                    component: "SecurityManager".to_string(),
                    details: format!("Validation failed: {} fatal issues", report.fatal_count),
                });

                Err(RuntimeError::ValidationFailed(
                    format!("Document validation failed: {} fatal issues", report.fatal_count),
                ))
            }
        }
    }

    /// Verify hash of an entry
    pub fn verify_hash(&self, path: &str, data: &[u8], expected_hash: &str) -> RuntimeResult<()> {
        use sha2::{Sha256, Digest};

        let mut hasher = Sha256::new();
        hasher.update(data);
        let result = hasher.finalize();
        let computed_hash = format!("sha256:{}", hex::encode(result));

        if computed_hash == expected_hash {
            self.log_event(SecurityEvent {
                timestamp: chrono::Utc::now().to_rfc3339(),
                event_type: "HashVerified".to_string(),
                severity: "info".to_string(),
                component: "SecurityManager".to_string(),
                details: format!("Hash verified for {}", path),
            });
            Ok(())
        } else {
            self.log_event(SecurityEvent {
                timestamp: chrono::Utc::now().to_rfc3339(),
                event_type: "IntegrityViolation".to_string(),
                severity: "critical".to_string(),
                component: "SecurityManager".to_string(),
                details: format!("Hash mismatch for {}: expected {}, got {}", path, expected_hash, computed_hash),
            });
            Err(RuntimeError::IntegrityViolation(format!(
                "Hash mismatch for {}", path
            )))
        }
    }

    /// Check if a permission is granted
    pub fn check_permission(&self, perm: &Permission) -> RuntimeResult<()> {
        let perms = self.granted_permissions.read().unwrap();
        if perms.has(perm) {
            self.log_event(SecurityEvent {
                timestamp: chrono::Utc::now().to_rfc3339(),
                event_type: "PermissionGranted".to_string(),
                severity: "info".to_string(),
                component: "SecurityManager".to_string(),
                details: format!("Permission granted: {}", perm.as_str()),
            });
            Ok(())
        } else {
            self.log_event(SecurityEvent {
                timestamp: chrono::Utc::now().to_rfc3339(),
                event_type: "PermissionDenied".to_string(),
                severity: "warning".to_string(),
                component: "SecurityManager".to_string(),
                details: format!("Permission denied: {}", perm.as_str()),
            });
            Err(RuntimeError::PermissionDenied {
                permission: perm.as_str().to_string(),
            })
        }
    }

    /// Grant a permission
    pub fn grant_permission(&self, perm: Permission) {
        let mut perms = self.granted_permissions.write().unwrap();
        perms.add(perm.clone());

        self.log_event(SecurityEvent {
            timestamp: chrono::Utc::now().to_rfc3339(),
            event_type: "PermissionGrant".to_string(),
            severity: "info".to_string(),
            component: "SecurityManager".to_string(),
            details: format!("Permission granted: {}", perm.as_str()),
        });
    }

    /// Get all granted permissions
    pub fn granted_permissions(&self) -> Vec<Permission> {
        let perms = self.granted_permissions.read().unwrap();
        perms.all()
    }

    /// Get security context
    pub fn context(&self) -> SecurityContext {
        self.context.read().unwrap().clone()
    }

    /// Get security events
    pub fn events(&self) -> Vec<SecurityEvent> {
        self.events.read().unwrap().clone()
    }

    /// Log a security event
    fn log_event(&self, event: SecurityEvent) {
        let mut events = self.events.write().unwrap();
        events.push(event);
    }

    /// Clear security events
    pub fn clear_events(&self) {
        let mut events = self.events.write().unwrap();
        events.clear();
    }
}

impl Default for SecurityManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permission_set() {
        let mut perms = PermissionSet::new();
        assert!(!perms.has(&Permission::NetworkRead));

        perms.add(Permission::NetworkRead);
        assert!(perms.has(&Permission::NetworkRead));
    }

    #[test]
    fn test_security_manager_creation() {
        let mgr = SecurityManager::new();
        assert_eq!(mgr.granted_permissions().len(), 0);
    }

    #[test]
    fn test_permission_check() {
        let mgr = SecurityManager::new();
        assert!(mgr.check_permission(&Permission::NetworkRead).is_err());

        mgr.grant_permission(Permission::NetworkRead);
        assert!(mgr.check_permission(&Permission::NetworkRead).is_ok());
    }

    #[test]
    fn test_security_events() {
        let mgr = SecurityManager::new();
        mgr.grant_permission(Permission::NetworkRead);

        let events = mgr.events();
        assert!(!events.is_empty());
    }
}
