use std::collections::{HashMap, HashSet};
use crate::plugin_runtime::types::{PluginId, TrustLevel};
use crate::plugin_runtime::error::PluginRuntimeError;

// ── Capability Taxonomy ───────────────────────────────────────────────────────

/// All known capability strings in the LDOC permission taxonomy.
/// A plugin declaring a permission not in this list is rejected at validation time.
pub mod capabilities {
    // VFS capabilities
    pub const VFS_READ_ALL:       &str = "vfs:read:**";
    pub const VFS_WRITE_ALL:      &str = "vfs:write:**";
    pub const VFS_READ_ASSETS:    &str = "vfs:read:assets/**";
    pub const VFS_READ_PAGES:     &str = "vfs:read:pages/**";
    pub const VFS_READ_PLUGINS:   &str = "vfs:read:plugins/**";
    pub const VFS_WRITE_DOCS:     &str = "vfs:write:documents/**";
    pub const VFS_WRITE_TEMP:     &str = "vfs:write:temp/**";

    // Event capabilities
    pub const EVENTS_SUBSCRIBE_ALL:      &str = "events:subscribe:**";
    pub const EVENTS_EMIT_ALL:           &str = "events:emit:**";
    pub const EVENTS_SUBSCRIBE_DOCUMENT: &str = "events:subscribe:document.*";
    pub const EVENTS_SUBSCRIBE_PLUGIN:   &str = "events:subscribe:plugin.*";
    pub const EVENTS_SUBSCRIBE_RUNTIME:  &str = "events:subscribe:runtime.*";
    pub const EVENTS_EMIT_CUSTOM:        &str = "events:emit:custom.*";

    // IPC capabilities
    pub const IPC_SEND_ALL:   &str = "ipc:send:**";
    pub const IPC_RECV_ALL:   &str = "ipc:recv:**";

    // Storage capabilities
    pub const STORAGE_READ:   &str = "storage:read";
    pub const STORAGE_WRITE:  &str = "storage:write";
    pub const STORAGE_DELETE: &str = "storage:delete";
    pub const STORAGE_CLEAR:  &str = "storage:clear";

    // Resource capabilities
    pub const RESOURCES_LOAD_ALL:    &str = "resources:load:**";
    pub const RESOURCES_LOAD_IMAGES: &str = "resources:load:images/*";
    pub const RESOURCES_LOAD_FONTS:  &str = "resources:load:fonts/*";
    pub const RESOURCES_LOAD_DATA:   &str = "resources:load:data/*";

    // Network capabilities (future)
    pub const NETWORK_FETCH:    &str = "network:fetch";
    pub const NETWORK_WEBSOCKET:&str = "network:websocket";

    // System capabilities (high trust only)
    pub const SYSTEM_CLIPBOARD: &str = "system:clipboard";
    pub const SYSTEM_NOTIFY:    &str = "system:notify";
    pub const SYSTEM_OPEN_URL:  &str = "system:open_url";

    /// Minimum trust level required for each capability.
    /// Capabilities not in this map require TrustLevel::Untrusted (i.e. any level).
    pub fn min_trust_level(capability: &str) -> crate::plugin_runtime::types::TrustLevel {
        use crate::plugin_runtime::types::TrustLevel;
        match capability {
            VFS_WRITE_ALL
            | EVENTS_SUBSCRIBE_ALL
            | EVENTS_EMIT_ALL
            | IPC_SEND_ALL
            | IPC_RECV_ALL
            | NETWORK_FETCH
            | NETWORK_WEBSOCKET => TrustLevel::Verified,

            SYSTEM_CLIPBOARD
            | SYSTEM_NOTIFY
            | SYSTEM_OPEN_URL => TrustLevel::Trusted,

            _ => TrustLevel::Untrusted,
        }
    }

    /// Returns true if the given string is a known capability or matches a known prefix pattern.
    pub fn is_known(capability: &str) -> bool {
        let known_prefixes = [
            "vfs:read:", "vfs:write:",
            "events:subscribe:", "events:emit:",
            "ipc:send:", "ipc:recv:",
            "storage:",
            "resources:load:",
            "network:",
            "system:",
        ];
        known_prefixes.iter().any(|p| capability.starts_with(p))
    }
}

// ── PermissionGrant ───────────────────────────────────────────────────────────

/// A single permission grant record — either from manifest or runtime override.
#[derive(Debug, Clone)]
pub struct PermissionGrant {
    pub capability:  String,
    pub source:      GrantSource,
    pub revoked:     bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GrantSource {
    /// Declared in the plugin manifest.
    Manifest,
    /// Granted at runtime by user approval.
    RuntimeOverride,
}

// ── PermissionChecker ─────────────────────────────────────────────────────────

/// Per-plugin permission state. Holds all grants and revocations for one plugin.
#[derive(Debug)]
pub struct PluginPermissionState {
    plugin_id:   PluginId,
    trust_level: TrustLevel,
    grants:      HashMap<String, PermissionGrant>,
}

impl PluginPermissionState {
    pub fn new(plugin_id: PluginId, trust_level: TrustLevel) -> Self {
        Self {
            plugin_id,
            trust_level,
            grants: HashMap::new(),
        }
    }

    /// Load grants from the plugin's manifest permission declarations.
    pub fn load_from_manifest(&mut self, permissions: &[&str]) {
        for cap in permissions {
            self.grants.insert(cap.to_string(), PermissionGrant {
                capability: cap.to_string(),
                source:     GrantSource::Manifest,
                revoked:    false,
            });
        }
    }

    /// Grant a capability at runtime (user approval override).
    pub fn grant_runtime(&mut self, capability: impl Into<String>) {
        let cap = capability.into();
        self.grants.insert(cap.clone(), PermissionGrant {
            capability: cap,
            source:     GrantSource::RuntimeOverride,
            revoked:    false,
        });
    }

    /// Revoke a capability. Revoked capabilities fail checks even if declared in manifest.
    pub fn revoke(&mut self, capability: &str) {
        if let Some(grant) = self.grants.get_mut(capability) {
            grant.revoked = true;
        }
    }

    /// Check if the plugin has the given capability.
    /// Returns Ok(()) if granted, Err(PermissionDenied) otherwise.
    pub fn check(&self, capability: &str) -> Result<(), PluginRuntimeError> {
        // Check trust level minimum for this capability.
        let required_trust = capabilities::min_trust_level(capability);
        if self.trust_level < required_trust {
            return Err(PluginRuntimeError::PermissionDenied {
                plugin_id:  self.plugin_id.clone(),
                capability: capability.to_owned(),
            });
        }

        // Check if capability is granted and not revoked.
        // Also check wildcard grants (e.g. "vfs:read:**" covers "vfs:read:assets/icon.png").
        if self.is_granted(capability) {
            return Ok(());
        }

        Err(PluginRuntimeError::PermissionDenied {
            plugin_id:  self.plugin_id.clone(),
            capability: capability.to_owned(),
        })
    }

    /// Returns all current grants (including revoked ones).
    pub fn grants(&self) -> impl Iterator<Item = &PermissionGrant> {
        self.grants.values()
    }

    /// Returns all active (non-revoked) capability strings.
    pub fn active_capabilities(&self) -> HashSet<&str> {
        self.grants.values()
            .filter(|g| !g.revoked)
            .map(|g| g.capability.as_str())
            .collect()
    }

    fn is_granted(&self, capability: &str) -> bool {
        // Exact match.
        if let Some(grant) = self.grants.get(capability) {
            if !grant.revoked {
                return true;
            }
        }

        // Wildcard match: check if any non-revoked grant is a prefix wildcard
        // that covers the requested capability.
        for grant in self.grants.values() {
            if grant.revoked {
                continue;
            }
            if wildcard_matches(&grant.capability, capability) {
                return true;
            }
        }

        false
    }
}

// ── PermissionChecker ─────────────────────────────────────────────────────────

/// Runtime-wide permission checker. Holds permission state for all loaded plugins.
#[derive(Debug, Default)]
pub struct PermissionChecker {
    plugins: HashMap<PluginId, PluginPermissionState>,
}

impl PermissionChecker {
    pub fn new() -> Self {
        Self::default()
    }

    /// Register a plugin with its trust level and manifest permissions.
    pub fn register(
        &mut self,
        plugin_id: PluginId,
        trust_level: TrustLevel,
        manifest_permissions: &[&str],
    ) {
        let mut state = PluginPermissionState::new(plugin_id.clone(), trust_level);
        state.load_from_manifest(manifest_permissions);
        self.plugins.insert(plugin_id, state);
    }

    /// Remove a plugin's permission state (called on unload).
    pub fn unregister(&mut self, plugin_id: &PluginId) {
        self.plugins.remove(plugin_id);
    }

    /// Check if a plugin has a capability. Returns Ok(()) or Err(PermissionDenied).
    pub fn check(
        &self,
        plugin_id: &PluginId,
        capability: &str,
    ) -> Result<(), PluginRuntimeError> {
        match self.plugins.get(plugin_id) {
            Some(state) => state.check(capability),
            None => Err(PluginRuntimeError::PluginNotFound {
                plugin_id: plugin_id.clone(),
            }),
        }
    }

    /// Grant a runtime override capability to a plugin.
    pub fn grant_runtime(
        &mut self,
        plugin_id: &PluginId,
        capability: impl Into<String>,
    ) -> Result<(), PluginRuntimeError> {
        match self.plugins.get_mut(plugin_id) {
            Some(state) => { state.grant_runtime(capability); Ok(()) }
            None => Err(PluginRuntimeError::PluginNotFound { plugin_id: plugin_id.clone() }),
        }
    }

    /// Revoke a capability from a plugin.
    pub fn revoke(
        &mut self,
        plugin_id: &PluginId,
        capability: &str,
    ) -> Result<(), PluginRuntimeError> {
        match self.plugins.get_mut(plugin_id) {
            Some(state) => { state.revoke(capability); Ok(()) }
            None => Err(PluginRuntimeError::PluginNotFound { plugin_id: plugin_id.clone() }),
        }
    }

    /// Get all grants for a plugin.
    pub fn grants_for(
        &self,
        plugin_id: &PluginId,
    ) -> Result<Vec<&PermissionGrant>, PluginRuntimeError> {
        match self.plugins.get(plugin_id) {
            Some(state) => Ok(state.grants().collect()),
            None => Err(PluginRuntimeError::PluginNotFound { plugin_id: plugin_id.clone() }),
        }
    }
}

// ── Wildcard matching ─────────────────────────────────────────────────────────

/// Match a capability pattern (which may end in `**` or `*`) against a concrete capability.
///
/// Rules:
/// - `**` matches any suffix including path separators
/// - `*`  matches any single path segment (no `:` or `/`)
/// - Exact strings match exactly
fn wildcard_matches(pattern: &str, capability: &str) -> bool {
    if pattern == capability {
        return true;
    }
    // Handle `:**` suffix — matches any suffix after the prefix (colon-separated)
    if let Some(prefix) = pattern.strip_suffix(":**") {
        if capability.starts_with(prefix) {
            return true;
        }
    }
    // Handle `/**` suffix — matches any path suffix after the prefix (slash-separated)
    if let Some(prefix) = pattern.strip_suffix("/**") {
        if capability.starts_with(prefix) {
            let rest = &capability[prefix.len()..];
            if rest.is_empty() || rest.starts_with('/') {
                return true;
            }
        }
    }
    // Handle `:*` suffix — single colon-segment wildcard
    if let Some(prefix) = pattern.strip_suffix(":*") {
        if let Some(rest) = capability.strip_prefix(prefix) {
            let rest = rest.strip_prefix(':').unwrap_or(rest);
            return !rest.is_empty() && !rest.contains(':') && !rest.contains('/');
        }
    }
    // Handle `/*` suffix — single path-segment wildcard
    if let Some(prefix) = pattern.strip_suffix("/*") {
        if let Some(rest) = capability.strip_prefix(prefix) {
            let rest = rest.strip_prefix('/').unwrap_or(rest);
            return !rest.is_empty() && !rest.contains('/') && !rest.contains(':');
        }
    }
    false
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_capability_granted() {
        let mut checker = PermissionChecker::new();
        checker.register(
            PluginId::new("com.example.plugin"),
            TrustLevel::Verified,
            &["vfs:read:assets/**"],
        );
        assert!(checker.check(&PluginId::new("com.example.plugin"), "vfs:read:assets/**").is_ok());
    }

    #[test]
    fn wildcard_covers_specific_path() {
        let mut checker = PermissionChecker::new();
        checker.register(
            PluginId::new("com.example.plugin"),
            TrustLevel::Verified,
            &["vfs:read:assets/**"],
        );
        assert!(checker.check(&PluginId::new("com.example.plugin"), "vfs:read:assets/icon.png").is_ok());
    }

    #[test]
    fn undeclared_capability_denied() {
        let mut checker = PermissionChecker::new();
        checker.register(
            PluginId::new("com.example.plugin"),
            TrustLevel::Verified,
            &["vfs:read:assets/**"],
        );
        assert!(checker.check(&PluginId::new("com.example.plugin"), "vfs:write:documents/**").is_err());
    }

    #[test]
    fn revoked_capability_denied() {
        let mut checker = PermissionChecker::new();
        checker.register(
            PluginId::new("com.example.plugin"),
            TrustLevel::Verified,
            &["vfs:read:assets/**"],
        );
        checker.revoke(&PluginId::new("com.example.plugin"), "vfs:read:assets/**").unwrap();
        assert!(checker.check(&PluginId::new("com.example.plugin"), "vfs:read:assets/**").is_err());
    }

    #[test]
    fn runtime_grant_overrides_absence() {
        let mut checker = PermissionChecker::new();
        checker.register(
            PluginId::new("com.example.plugin"),
            TrustLevel::Verified,
            &[],
        );
        checker.grant_runtime(&PluginId::new("com.example.plugin"), "storage:read").unwrap();
        assert!(checker.check(&PluginId::new("com.example.plugin"), "storage:read").is_ok());
    }

    #[test]
    fn trust_level_too_low_denied() {
        let mut checker = PermissionChecker::new();
        // vfs:write:** requires TrustLevel::Verified, but plugin is Community
        checker.register(
            PluginId::new("com.example.plugin"),
            TrustLevel::Community,
            &["vfs:write:**"],
        );
        assert!(checker.check(&PluginId::new("com.example.plugin"), "vfs:write:**").is_err());
    }
}

