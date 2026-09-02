use std::path::Path;
use serde_json::Value;

use crate::plugin_runtime::{
    error::PluginRuntimeError,
    events::{EventBus, EventPriority, PluginEvent},
    ipc::{IpcMessage, IpcRouter},
    lifecycle::LifecycleRegistry,
    loader::PluginLoader,
    metrics::{MetricsCollector, MetricsDelta},
    permissions::{GrantSource, PermissionChecker},
    sandbox::SandboxManager,
    storage::StorageManager,
    types::{
        CrashReason, PluginId, PluginMetrics, PluginRuntimeMetrics, PluginState, TrustLevel,
    },
    validator::ValidatorConfig,
};

// ── PluginRuntimeApi ──────────────────────────────────────────────────────────

/// Single entry point for all plugin runtime operations.
/// Owns and coordinates every subsystem.
pub struct PluginRuntimeApi {
    pub(crate) lifecycle:   LifecycleRegistry,
    pub(crate) loader:      PluginLoader,
    pub(crate) sandbox_mgr: SandboxManager,
    pub(crate) events:      EventBus,
    pub(crate) ipc:         IpcRouter,
    pub(crate) storage:     StorageManager,
    pub(crate) metrics:     MetricsCollector,
    pub(crate) permissions: PermissionChecker,
}

impl PluginRuntimeApi {
    pub fn new(validator_config: ValidatorConfig) -> Self {
        Self {
            lifecycle:   LifecycleRegistry::new(),
            loader:      PluginLoader::new(validator_config),
            sandbox_mgr: SandboxManager::new(),
            events:      EventBus::new(),
            ipc:         IpcRouter::new(),
            storage:     StorageManager::new(),
            metrics:     MetricsCollector::new(),
            permissions: PermissionChecker::new(),
        }
    }

    // ── Plugin loading ────────────────────────────────────────────────────────

    /// Load a plugin bundle from disk. Runs the full validation + lifecycle pipeline.
    pub fn load_plugin(&mut self, path: &Path) -> Result<PluginId, PluginRuntimeError> {
        let plugin_id = self.loader.load(path, &mut self.lifecycle, &mut self.sandbox_mgr)?;

        // Register with all subsystems.
        self.events.register_plugin(plugin_id.clone());
        self.storage.register_plugin(plugin_id.clone());
        self.metrics.register(plugin_id.clone());
        self.metrics.set_state(&plugin_id, PluginState::Loaded);

        Ok(plugin_id)
    }

    /// Advance a loaded plugin through Initialized → Running.
    pub fn start_plugin(&mut self, plugin_id: &PluginId) -> Result<(), PluginRuntimeError> {
        self.require_state(plugin_id, PluginState::Loaded)?;
        {
            let lc = self.lifecycle.get_mut(plugin_id).ok_or_else(|| {
                PluginRuntimeError::PluginNotFound { plugin_id: plugin_id.clone() }
            })?;
            lc.mark_initialized()?;
            lc.mark_running()?;
        }
        self.metrics.set_state(plugin_id, PluginState::Running);
        Ok(())
    }

    /// Pause a running plugin.
    pub fn pause_plugin(
        &mut self,
        plugin_id: &PluginId,
        reason: crate::plugin_runtime::types::PauseReason,
    ) -> Result<(), PluginRuntimeError> {
        let lc = self.lifecycle.get_mut(plugin_id).ok_or_else(|| {
            PluginRuntimeError::PluginNotFound { plugin_id: plugin_id.clone() }
        })?;
        lc.pause(reason)?;
        self.metrics.set_state(plugin_id, PluginState::Paused);
        Ok(())
    }

    /// Resume a paused plugin.
    pub fn resume_plugin(&mut self, plugin_id: &PluginId) -> Result<(), PluginRuntimeError> {
        let lc = self.lifecycle.get_mut(plugin_id).ok_or_else(|| {
            PluginRuntimeError::PluginNotFound { plugin_id: plugin_id.clone() }
        })?;
        lc.resume()?;
        self.metrics.set_state(plugin_id, PluginState::Running);
        Ok(())
    }

    /// Crash a plugin with a reason and record a crash report.
    pub fn crash_plugin(
        &mut self,
        plugin_id: &PluginId,
        reason: CrashReason,
    ) -> Result<(), PluginRuntimeError> {
        let version = self
            .loader
            .get(plugin_id)
            .map(|p| p.version.clone())
            .unwrap_or_default();
        let memory = self
            .sandbox_mgr
            .get(plugin_id)
            .map_or(0, |s| s.memory_used_bytes());
        self.lifecycle.crash_plugin(plugin_id, &version, reason.clone(), memory)?;
        self.metrics.record_crash(plugin_id, &reason.to_string());
        Ok(())
    }

    /// Unload a plugin: destroy sandbox, advance lifecycle, clean up subsystems.
    pub fn unload_plugin(&mut self, plugin_id: &PluginId) -> Result<(), PluginRuntimeError> {
        self.loader.unload(plugin_id, &mut self.lifecycle, &mut self.sandbox_mgr)?;
        self.events.unregister_plugin(plugin_id);
        self.ipc.remove_plugin(plugin_id);
        self.metrics.set_state(plugin_id, PluginState::Unloaded);
        Ok(())
    }

    // ── Permission checks ─────────────────────────────────────────────────────

    pub fn check_permission(
        &self,
        plugin_id: &PluginId,
        capability: &str,
    ) -> Result<(), PluginRuntimeError> {
        self.permissions.check(plugin_id, capability)
    }

    pub fn grant_permission(
        &mut self,
        plugin_id: &PluginId,
        capability: impl Into<String>,
        _source: GrantSource,
    ) -> Result<(), PluginRuntimeError> {
        self.permissions.grant_runtime(plugin_id, capability)
    }

    pub fn revoke_permission(
        &mut self,
        plugin_id: &PluginId,
        capability: &str,
    ) -> Result<(), PluginRuntimeError> {
        self.permissions.revoke(plugin_id, capability)
    }

    // ── Events ────────────────────────────────────────────────────────────────

    pub fn subscribe_event(
        &mut self,
        plugin_id: &PluginId,
        pattern: impl Into<String>,
    ) -> Result<(), PluginRuntimeError> {
        self.events.subscribe(plugin_id, pattern)
    }

    pub fn publish_event(
        &mut self,
        event_type: impl Into<String>,
        source: Option<PluginId>,
        payload: Value,
        priority: EventPriority,
    ) -> Result<usize, PluginRuntimeError> {
        let event = PluginEvent::new(event_type, source, payload, priority);
        let n = self.events.publish(event)?;
        self.metrics.increment_events_routed();
        Ok(n)
    }

    pub fn poll_event(
        &mut self,
        plugin_id: &PluginId,
    ) -> Result<Option<PluginEvent>, PluginRuntimeError> {
        self.events.poll(plugin_id)
    }

    // ── IPC ───────────────────────────────────────────────────────────────────

    pub fn create_ipc_channel(&mut self, name: impl Into<String>) -> Result<(), PluginRuntimeError> {
        self.ipc.create_channel(name)
    }

    pub fn join_ipc_channel(
        &mut self,
        channel: &str,
        plugin_id: PluginId,
    ) -> Result<(), PluginRuntimeError> {
        self.ipc.join(channel, plugin_id)
    }

    pub fn send_ipc(
        &mut self,
        msg: IpcMessage,
        target: &PluginId,
    ) -> Result<(), PluginRuntimeError> {
        self.ipc.send(msg, target)?;
        self.metrics.increment_ipc_total();
        Ok(())
    }

    pub fn broadcast_ipc(&mut self, msg: IpcMessage) -> Result<usize, PluginRuntimeError> {
        let n = self.ipc.broadcast(msg)?;
        self.metrics.increment_ipc_total();
        Ok(n)
    }

    pub fn poll_ipc(
        &mut self,
        channel: &str,
        receiver: &PluginId,
    ) -> Result<Option<IpcMessage>, PluginRuntimeError> {
        self.ipc.poll(channel, receiver)
    }

    // ── Storage ───────────────────────────────────────────────────────────────

    pub fn storage_get(
        &mut self,
        plugin_id: &PluginId,
        key: &str,
    ) -> Result<Option<Value>, PluginRuntimeError> {
        self.storage.get(plugin_id, key)
    }

    pub fn storage_set(
        &mut self,
        plugin_id: &PluginId,
        key: impl Into<String>,
        value: Value,
    ) -> Result<(), PluginRuntimeError> {
        self.storage.set(plugin_id, key, value)
    }

    pub fn storage_delete(
        &mut self,
        plugin_id: &PluginId,
        key: &str,
    ) -> Result<bool, PluginRuntimeError> {
        self.storage.delete(plugin_id, key)
    }

    // ── Metrics ───────────────────────────────────────────────────────────────

    pub fn apply_metrics_delta(&mut self, plugin_id: &PluginId, delta: MetricsDelta) {
        self.metrics.apply_delta(plugin_id, delta);
    }

    pub fn plugin_metrics(&self, plugin_id: &PluginId) -> Option<PluginMetrics> {
        self.metrics.snapshot_plugin(plugin_id)
    }

    pub fn runtime_metrics(&self) -> PluginRuntimeMetrics {
        self.metrics.snapshot_runtime()
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    pub fn plugin_state(&self, plugin_id: &PluginId) -> Option<PluginState> {
        self.lifecycle.state(plugin_id)
    }

    pub fn is_loaded(&self, plugin_id: &PluginId) -> bool {
        self.loader.is_loaded(plugin_id)
    }

    pub fn trust_level(&self, plugin_id: &PluginId) -> TrustLevel {
        self.loader
            .get(plugin_id)
            .map(|p| p.trust_level)
            .unwrap_or(TrustLevel::Untrusted)
    }

    pub fn permission_grants(
        &self,
        plugin_id: &PluginId,
    ) -> Result<Vec<&crate::plugin_runtime::permissions::PermissionGrant>, PluginRuntimeError> {
        self.permissions.grants_for(plugin_id)
    }

    // ── Private ───────────────────────────────────────────────────────────────

    fn require_state(
        &self,
        plugin_id: &PluginId,
        expected: PluginState,
    ) -> Result<(), PluginRuntimeError> {
        let actual = self.lifecycle.state(plugin_id).ok_or_else(|| {
            PluginRuntimeError::PluginNotFound { plugin_id: plugin_id.clone() }
        })?;
        if actual != expected {
            return Err(PluginRuntimeError::InvalidPluginState {
                plugin_id: plugin_id.clone(),
                state:     actual,
            });
        }
        Ok(())
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::plugin_runtime::permissions::GrantSource;

    fn pid(s: &str) -> PluginId { PluginId::from(s) }

    fn api() -> PluginRuntimeApi {
        PluginRuntimeApi::new(ValidatorConfig::default())
    }

    #[test]
    fn load_plugin_missing_bundle() {
        let mut api = api();
        let err = api.load_plugin(Path::new("nonexistent.ldocplugin"));
        assert!(matches!(err, Err(PluginRuntimeError::BundleNotFound { .. })));
    }

    #[test]
    fn permission_denied_without_grant() {
        let mut api = api();
        // Register plugin in permissions subsystem directly.
        api.permissions.register(pid("com.example.plugin"), TrustLevel::Untrusted, &[]);
        let err = api.check_permission(&pid("com.example.plugin"), "vfs:read:assets/**");
        assert!(matches!(err, Err(PluginRuntimeError::PermissionDenied { .. })));
    }

    #[test]
    fn permission_granted_after_grant() {
        let mut api = api();
        api.permissions.register(pid("com.example.plugin"), TrustLevel::Verified, &[]);
        api.grant_permission(&pid("com.example.plugin"), "vfs:read:assets/**", GrantSource::Manifest).unwrap();
        assert!(api.check_permission(&pid("com.example.plugin"), "vfs:read:assets/**").is_ok());
    }

    #[test]
    fn event_publish_and_poll() {
        let mut api = api();
        api.events.register_plugin(pid("com.example.plugin"));
        api.subscribe_event(&pid("com.example.plugin"), "ldoc.**").unwrap();
        api.publish_event(
            "ldoc.test.event",
            None,
            serde_json::json!({"data": 1}),
            EventPriority::Normal,
        ).unwrap();
        let event = api.poll_event(&pid("com.example.plugin")).unwrap().unwrap();
        assert_eq!(event.event_type, "ldoc.test.event");
    }

    #[test]
    fn storage_round_trip() {
        let mut api = api();
        api.storage.register_plugin(pid("com.example.plugin"));
        api.storage_set(&pid("com.example.plugin"), "key", serde_json::json!(42)).unwrap();
        let v = api.storage_get(&pid("com.example.plugin"), "key").unwrap().unwrap();
        assert_eq!(v, serde_json::json!(42));
    }

    #[test]
    fn ipc_send_and_poll() {
        let mut api = api();
        api.create_ipc_channel("ch").unwrap();
        api.join_ipc_channel("ch", pid("com.a")).unwrap();
        api.join_ipc_channel("ch", pid("com.b")).unwrap();
        let msg = IpcMessage::send(pid("com.a"), "ch", serde_json::json!("hello"));
        api.send_ipc(msg, &pid("com.b")).unwrap();
        let received = api.poll_ipc("ch", &pid("com.b")).unwrap().unwrap();
        assert_eq!(received.payload, serde_json::json!("hello"));
    }
}


