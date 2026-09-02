// LDOC Runtime — Plugin Host
// Bridges ldoc-core PluginManifest into the runtime Plugin trait.
// Enforces the full lifecycle: DISCOVER → VALIDATE → LOAD → INIT → RUN → UNLOAD
// Sandboxes plugins: any call requiring an undeclared permission is denied.

use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use crate::error::{RuntimeError, RuntimeResult};
use crate::plugins::{Plugin, PluginInstance, PluginMetadata, PluginRegistry, PluginState};
use crate::security::{Permission, PermissionSet};
use crate::dispatcher::EventDispatcher;
use crate::events::{Event, EventType, EventPriority};
use ldoc_core::plugins::PluginManifest;

// ── Permission mapping ────────────────────────────────────────────────────────

fn str_to_permission(s: &str) -> Option<Permission> {
    match s {
        "read_all_pages"    => Some(Permission::ReadAllPages),
        "write_annotations" => Some(Permission::WriteAnnotations),
        "read_annotations"  => Some(Permission::ReadAnnotations),
        "network_read"      => Some(Permission::NetworkRead),
        "network_write"     => Some(Permission::NetworkWrite),
        "filesystem_read"   => Some(Permission::FilesystemRead),
        "filesystem_write"  => Some(Permission::FilesystemWrite),
        "execute_ai"        => Some(Permission::ExecuteAi),
        "clipboard_read"    => Some(Permission::ClipboardRead),
        "clipboard_write"   => Some(Permission::ClipboardWrite),
        "notifications"     => Some(Permission::Notifications),
        "camera"            => Some(Permission::Camera),
        "microphone"        => Some(Permission::Microphone),
        "geolocation"       => Some(Permission::Geolocation),
        _ => None,
    }
}

// ── Sandboxed plugin implementation ──────────────────────────────────────────

/// A sandboxed plugin loaded from a PluginManifest.
/// All method calls are checked against declared permissions.
pub struct SandboxedPlugin {
    manifest: PluginManifest,
    declared: HashSet<String>,
    call_log: Mutex<Vec<String>>,
}

impl SandboxedPlugin {
    fn new(manifest: PluginManifest) -> Self {
        let declared: HashSet<String> = manifest.permissions.iter().cloned().collect();
        Self { manifest, declared, call_log: Mutex::new(Vec::new()) }
    }

    fn check_permission(&self, perm: &str) -> RuntimeResult<()> {
        if self.declared.contains(perm) {
            Ok(())
        } else {
            Err(RuntimeError::PermissionDenied {
                permission: format!("plugin '{}' did not declare '{}'", self.manifest.id, perm),
            })
        }
    }
}

impl Plugin for SandboxedPlugin {
    fn metadata(&self) -> PluginMetadata {
        let mut pset = PermissionSet::new();
        for p in &self.manifest.permissions {
            if let Some(perm) = str_to_permission(p) {
                pset.add(perm);
            }
        }
        PluginMetadata {
            id: self.manifest.id.clone(),
            name: self.manifest.name.clone(),
            version: self.manifest.version.clone(),
            author: self.manifest.author.name.clone(),
            description: self.manifest.description.clone(),
            permissions: pset,
        }
    }

    fn initialize(&self) -> RuntimeResult<()> { Ok(()) }
    fn start(&self)      -> RuntimeResult<()> { Ok(()) }
    fn stop(&self)       -> RuntimeResult<()> { Ok(()) }
    fn shutdown(&self)   -> RuntimeResult<()> { Ok(()) }

    fn call(&self, method: &str, args: Vec<String>) -> RuntimeResult<String> {
        // Map well-known methods to permission checks
        let required = match method {
            "read_page"         => Some("read_all_pages"),
            "write_annotation"  => Some("write_annotations"),
            "read_annotation"   => Some("read_annotations"),
            "network_get"       => Some("network_read"),
            "network_post"      => Some("network_write"),
            "fs_read"           => Some("filesystem_read"),
            "fs_write"          => Some("filesystem_write"),
            "ai_execute"        => Some("execute_ai"),
            "clipboard_get"     => Some("clipboard_read"),
            "clipboard_set"     => Some("clipboard_write"),
            _ => None,
        };
        if let Some(perm) = required {
            self.check_permission(perm)?;
        }
        let entry = format!("{}({})", method, args.join(","));
        self.call_log.lock().unwrap().push(entry.clone());
        Ok(format!("ok:{}", entry))
    }
}

// ── Plugin Host ───────────────────────────────────────────────────────────────

/// Manages the full plugin lifecycle for the runtime.
pub struct PluginHost {
    registry: Arc<PluginRegistry>,
    dispatcher: Arc<EventDispatcher>,
}

impl PluginHost {
    pub fn new(dispatcher: Arc<EventDispatcher>) -> Self {
        Self {
            registry: Arc::new(PluginRegistry::new()),
            dispatcher,
        }
    }

    /// DISCOVER + VALIDATE + LOAD + INIT — from a PluginManifest.
    pub fn load_from_manifest(&self, manifest: PluginManifest) -> RuntimeResult<()> {
        // DISCOVER
        self.fire(EventType::PluginLoading,
            format!("Discovering plugin: {}", manifest.id));

        // VALIDATE
        manifest.validate()
            .map_err(|e| RuntimeError::PluginError(format!("Manifest invalid: {}", e)))?;

        let id = manifest.id.clone();
        let plugin = Arc::new(SandboxedPlugin::new(manifest));
        let meta = plugin.metadata();
        let instance = Arc::new(PluginInstance::new(meta, plugin));

        // LOAD
        self.registry.register(Arc::clone(&instance))?;

        // INIT
        instance.initialize()?;

        // RUN
        instance.start()?;

        self.fire(EventType::PluginReady, format!("Plugin ready: {}", id));
        Ok(())
    }

    /// RUN — call a method on a running plugin (sandbox-enforced).
    pub fn call(&self, plugin_id: &str, method: &str, args: Vec<String>) -> RuntimeResult<String> {
        self.registry.get(plugin_id)?.call(method, args)
    }

    /// UNLOAD — stop + unregister a plugin.
    pub fn unload(&self, plugin_id: &str) -> RuntimeResult<()> {
        let instance = self.registry.get(plugin_id)?;
        if instance.state() == PluginState::Running {
            instance.stop()?;
        }
        instance.shutdown()?;
        self.registry.unregister(plugin_id)?;
        self.fire(EventType::PluginTerminated, format!("Plugin unloaded: {}", plugin_id));
        Ok(())
    }

    /// Unload all plugins.
    pub fn unload_all(&self) {
        let ids: Vec<String> = self.registry.list().iter().map(|m| m.id.clone()).collect();
        for id in ids {
            let _ = self.unload(&id);
        }
    }

    pub fn registry(&self) -> &PluginRegistry { &self.registry }

    fn fire(&self, event_type: EventType, message: String) {
        let _ = self.dispatcher.dispatch(
            Event::new(event_type, EventPriority::Normal, "plugin_host".into(), message)
        );
    }
}

// ── Builder helper ────────────────────────────────────────────────────────────

/// Build a minimal valid PluginManifest for testing.
pub fn build_test_manifest(id: &str, permissions: Vec<&str>) -> PluginManifest {
    use ldoc_core::plugins::{PluginAuthor};
    PluginManifest {
        schema_version: "1.0.0".into(),
        id: id.to_string(),
        name: format!("{} Plugin", id),
        description: "Test plugin".into(),
        version: "1.0.0".into(),
        minimum_runtime_version: "2.0.0".into(),
        maximum_runtime_version: None,
        plugin_type: "tool".into(),
        author: PluginAuthor { name: "Test".into(), email: None, url: None },
        license: "MIT".into(),
        homepage: None,
        entry_point: "main".into(),
        permissions: permissions.iter().map(|s| s.to_string()).collect(),
        network_domains: vec![],
        node_types: vec![],
        exports: vec![],
        checksum: "sha256:0000".into(),
        signed: false,
        signature: None,
        trust_level: "untrusted".into(),
        _reserved: serde_json::Value::Null,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dispatcher::EventDispatcher;

    fn make_host() -> PluginHost {
        PluginHost::new(Arc::new(EventDispatcher::new(200)))
    }

    #[test]
    fn test_load_plugin() {
        let host = make_host();
        let m = build_test_manifest("p1", vec![]);
        assert!(host.load_from_manifest(m).is_ok());
        assert_eq!(host.registry().count(), 1);
    }

    #[test]
    fn test_plugin_running_after_load() {
        let host = make_host();
        host.load_from_manifest(build_test_manifest("p2", vec![])).unwrap();
        let inst = host.registry().get("p2").unwrap();
        assert_eq!(inst.state(), PluginState::Running);
    }

    #[test]
    fn test_call_undeclared_permission_denied() {
        let host = make_host();
        host.load_from_manifest(build_test_manifest("p3", vec![])).unwrap();
        let result = host.call("p3", "network_get", vec![]);
        assert!(result.is_err());
    }

    #[test]
    fn test_call_declared_permission_allowed() {
        let host = make_host();
        host.load_from_manifest(build_test_manifest("p4", vec!["network_read"])).unwrap();
        let result = host.call("p4", "network_get", vec!["https://example.com".into()]);
        assert!(result.is_ok());
    }

    #[test]
    fn test_call_unknown_method_allowed() {
        let host = make_host();
        host.load_from_manifest(build_test_manifest("p5", vec![])).unwrap();
        let result = host.call("p5", "ping", vec![]);
        assert!(result.is_ok());
    }

    #[test]
    fn test_unload_plugin() {
        let host = make_host();
        host.load_from_manifest(build_test_manifest("p6", vec![])).unwrap();
        assert!(host.unload("p6").is_ok());
        assert_eq!(host.registry().count(), 0);
    }

    #[test]
    fn test_unload_all() {
        let host = make_host();
        host.load_from_manifest(build_test_manifest("pa", vec![])).unwrap();
        host.load_from_manifest(build_test_manifest("pb", vec![])).unwrap();
        host.unload_all();
        assert_eq!(host.registry().count(), 0);
    }

    #[test]
    fn test_duplicate_registration_fails() {
        let host = make_host();
        host.load_from_manifest(build_test_manifest("dup", vec![])).unwrap();
        let result = host.load_from_manifest(build_test_manifest("dup", vec![]));
        assert!(result.is_err());
    }

    #[test]
    fn test_plugin_events_fired() {
        let dispatcher = Arc::new(EventDispatcher::new(200));
        let host = PluginHost::new(Arc::clone(&dispatcher));
        host.load_from_manifest(build_test_manifest("pe", vec![])).unwrap();
        let history = dispatcher.history();
        let types: Vec<&EventType> = history.iter().map(|e| &e.event_type).collect();
        assert!(types.contains(&&EventType::PluginLoading));
        assert!(types.contains(&&EventType::PluginReady));
    }

    #[test]
    fn test_invalid_plugin_type_rejected() {
        let mut m = build_test_manifest("bad", vec![]);
        m.plugin_type = "invalid_type".into();
        let host = make_host();
        assert!(host.load_from_manifest(m).is_err());
    }

    #[test]
    fn test_filesystem_write_permission() {
        let host = make_host();
        host.load_from_manifest(build_test_manifest("fsw", vec!["filesystem_write"])).unwrap();
        assert!(host.call("fsw", "fs_write", vec!["path".into()]).is_ok());
        assert!(host.call("fsw", "fs_read", vec!["path".into()]).is_err());
    }

    #[test]
    fn test_ai_permission() {
        let host = make_host();
        host.load_from_manifest(build_test_manifest("ai", vec!["execute_ai"])).unwrap();
        assert!(host.call("ai", "ai_execute", vec!["prompt".into()]).is_ok());
    }

    #[test]
    fn test_call_not_found_plugin() {
        let host = make_host();
        assert!(host.call("nonexistent", "ping", vec![]).is_err());
    }
}
