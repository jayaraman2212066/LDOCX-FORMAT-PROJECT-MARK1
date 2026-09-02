use std::collections::HashMap;
use crate::plugin_runtime::types::{PluginId, PluginState, PauseReason, CrashReason, CrashReport};
use crate::plugin_runtime::error::PluginRuntimeError;

// ── StateTransition ───────────────────────────────────────────────────────────

/// A recorded state transition with timestamp.
#[derive(Debug, Clone)]
pub struct StateTransition {
    pub from:        PluginState,
    pub to:          PluginState,
    pub timestamp_ms: u64,
    pub reason:      Option<String>,
}

// ── PluginLifecycle ───────────────────────────────────────────────────────────

/// Manages the lifecycle state machine for a single plugin instance.
#[derive(Debug)]
pub struct PluginLifecycle {
    plugin_id:   PluginId,
    state:       PluginState,
    history:     Vec<StateTransition>,
    started_at:  Option<u64>,
}

impl PluginLifecycle {
    pub fn new(plugin_id: PluginId) -> Self {
        Self {
            plugin_id,
            state:      PluginState::Discovered,
            history:    Vec::new(),
            started_at: None,
        }
    }

    pub fn state(&self) -> PluginState {
        self.state
    }

    pub fn plugin_id(&self) -> &PluginId {
        &self.plugin_id
    }

    pub fn history(&self) -> &[StateTransition] {
        &self.history
    }

    /// Uptime in milliseconds since the plugin entered Running state.
    pub fn uptime_ms(&self) -> u64 {
        match self.started_at {
            Some(t) => now_ms().saturating_sub(t),
            None    => 0,
        }
    }

    // ── Transition methods ────────────────────────────────────────────────────

    pub fn validate(&mut self) -> Result<(), PluginRuntimeError> {
        self.transition(PluginState::Validated, None)
    }

    pub fn install(&mut self) -> Result<(), PluginRuntimeError> {
        self.transition(PluginState::Installed, None)
    }

    pub fn mark_loaded(&mut self) -> Result<(), PluginRuntimeError> {
        self.transition(PluginState::Loaded, None)
    }

    pub fn mark_initialized(&mut self) -> Result<(), PluginRuntimeError> {
        self.transition(PluginState::Initialized, None)
    }

    pub fn mark_running(&mut self) -> Result<(), PluginRuntimeError> {
        let result = self.transition(PluginState::Running, None);
        if result.is_ok() && self.started_at.is_none() {
            self.started_at = Some(now_ms());
        }
        result
    }

    pub fn pause(&mut self, reason: PauseReason) -> Result<(), PluginRuntimeError> {
        self.transition(PluginState::Paused, Some(format!("{reason:?}")))
    }

    pub fn resume(&mut self) -> Result<(), PluginRuntimeError> {
        self.transition(PluginState::Running, Some("resumed".to_owned()))
    }

    pub fn begin_update(&mut self) -> Result<(), PluginRuntimeError> {
        self.transition(PluginState::Updating, None)
    }

    pub fn finish_update(&mut self) -> Result<(), PluginRuntimeError> {
        self.transition(PluginState::Running, Some("update complete".to_owned()))
    }

    pub fn disable(&mut self) -> Result<(), PluginRuntimeError> {
        self.transition(PluginState::Disabled, None)
    }

    pub fn enable(&mut self) -> Result<(), PluginRuntimeError> {
        self.transition(PluginState::Loaded, Some("re-enabled".to_owned()))
    }

    pub fn crash(&mut self, reason: &CrashReason) -> Result<(), PluginRuntimeError> {
        self.transition(PluginState::Crashed, Some(reason.to_string()))
    }

    pub fn unload(&mut self) -> Result<(), PluginRuntimeError> {
        self.transition(PluginState::Unloaded, None)
    }

    pub fn remove(&mut self) -> Result<(), PluginRuntimeError> {
        self.transition(PluginState::Removed, None)
    }

    // ── Core transition engine ────────────────────────────────────────────────

    fn transition(
        &mut self,
        to: PluginState,
        reason: Option<String>,
    ) -> Result<(), PluginRuntimeError> {
        if !is_valid_transition(self.state, to) {
            return Err(PluginRuntimeError::InvalidTransition {
                plugin_id: self.plugin_id.clone(),
                from:      self.state,
                to,
            });
        }
        self.history.push(StateTransition {
            from:         self.state,
            to,
            timestamp_ms: now_ms(),
            reason,
        });
        self.state = to;
        Ok(())
    }
}

// ── Valid transition table ────────────────────────────────────────────────────

/// Returns true if transitioning from `from` to `to` is permitted by the spec.
fn is_valid_transition(from: PluginState, to: PluginState) -> bool {
    use PluginState::*;
    matches!(
        (from, to),
        // Forward path
        (Discovered,  Validated)   |
        (Validated,   Installed)   |
        (Installed,   Loaded)      |
        (Loaded,      Initialized) |
        (Initialized, Running)     |
        // Normal operation
        (Running,     Paused)      |
        (Paused,      Running)     |
        (Running,     Updating)    |
        (Updating,    Running)     |
        (Running,     Disabled)    |
        (Disabled,    Loaded)      |   // re-enable goes back to Loaded for re-init
        // Crash
        (Running,     Crashed)     |
        (Paused,      Crashed)     |
        (Updating,    Crashed)     |
        (Initialized, Crashed)     |
        (Loaded,      Crashed)     |
        // Unload
        (Running,     Unloaded)    |
        (Paused,      Unloaded)    |
        (Crashed,     Unloaded)    |
        (Disabled,    Unloaded)    |
        (Initialized, Unloaded)    |
        (Loaded,      Unloaded)    |
        // Remove
        (Unloaded,    Removed)     |
        (Installed,   Removed)     |
        (Validated,   Removed)
    )
}

// ── LifecycleRegistry ─────────────────────────────────────────────────────────

/// Manages lifecycle state for all plugins in the runtime.
#[derive(Debug, Default)]
pub struct LifecycleRegistry {
    plugins: HashMap<PluginId, PluginLifecycle>,
}

impl LifecycleRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    /// Register a new plugin in Discovered state.
    pub fn register(&mut self, plugin_id: PluginId) {
        self.plugins.insert(plugin_id.clone(), PluginLifecycle::new(plugin_id));
    }

    /// Remove a plugin from the registry.
    pub fn unregister(&mut self, plugin_id: &PluginId) {
        self.plugins.remove(plugin_id);
    }

    /// Get the current state of a plugin.
    pub fn state(&self, plugin_id: &PluginId) -> Option<PluginState> {
        self.plugins.get(plugin_id).map(|lc| lc.state())
    }

    /// Get a mutable reference to a plugin's lifecycle.
    pub fn get_mut(&mut self, plugin_id: &PluginId) -> Option<&mut PluginLifecycle> {
        self.plugins.get_mut(plugin_id)
    }

    /// Get an immutable reference to a plugin's lifecycle.
    pub fn get(&self, plugin_id: &PluginId) -> Option<&PluginLifecycle> {
        self.plugins.get(plugin_id)
    }

    /// Returns all plugin IDs in the given state.
    pub fn plugins_in_state(&self, state: PluginState) -> Vec<&PluginId> {
        self.plugins.values()
            .filter(|lc| lc.state() == state)
            .map(|lc| lc.plugin_id())
            .collect()
    }

    /// Returns all plugin IDs and their current states.
    pub fn all_states(&self) -> Vec<(&PluginId, PluginState)> {
        self.plugins.values()
            .map(|lc| (lc.plugin_id(), lc.state()))
            .collect()
    }

    /// Convenience: transition a plugin to Crashed and build a CrashReport.
    pub fn crash_plugin(
        &mut self,
        plugin_id: &PluginId,
        version: &str,
        reason: CrashReason,
        memory_at_crash: u64,
    ) -> Result<CrashReport, PluginRuntimeError> {
        let lc = self.plugins.get_mut(plugin_id).ok_or_else(|| {
            PluginRuntimeError::PluginNotFound { plugin_id: plugin_id.clone() }
        })?;
        lc.crash(&reason)?;
        Ok(CrashReport::new(plugin_id.clone(), version, reason, memory_at_crash))
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn now_ms() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_running() -> PluginLifecycle {
        let mut lc = PluginLifecycle::new(PluginId::new("com.example.plugin"));
        lc.validate().unwrap();
        lc.install().unwrap();
        lc.mark_loaded().unwrap();
        lc.mark_initialized().unwrap();
        lc.mark_running().unwrap();
        lc
    }

    #[test]
    fn full_forward_path() {
        let lc = make_running();
        assert_eq!(lc.state(), PluginState::Running);
        assert_eq!(lc.history().len(), 5);
    }

    #[test]
    fn pause_and_resume() {
        let mut lc = make_running();
        lc.pause(PauseReason::ApiRequest).unwrap();
        assert_eq!(lc.state(), PluginState::Paused);
        lc.resume().unwrap();
        assert_eq!(lc.state(), PluginState::Running);
    }

    #[test]
    fn invalid_transition_rejected() {
        let mut lc = make_running();
        // Running → Installed is not a valid transition
        let err = lc.transition(PluginState::Installed, None);
        assert!(err.is_err());
        // State must be unchanged
        assert_eq!(lc.state(), PluginState::Running);
    }

    #[test]
    fn crash_from_running() {
        let mut lc = make_running();
        lc.crash(&CrashReason::ExplicitAbort).unwrap();
        assert_eq!(lc.state(), PluginState::Crashed);
    }

    #[test]
    fn unload_after_crash() {
        let mut lc = make_running();
        lc.crash(&CrashReason::Timeout).unwrap();
        lc.unload().unwrap();
        assert_eq!(lc.state(), PluginState::Unloaded);
    }

    #[test]
    fn registry_tracks_states() {
        let mut reg = LifecycleRegistry::new();
        let id = PluginId::new("com.example.plugin");
        reg.register(id.clone());
        assert_eq!(reg.state(&id), Some(PluginState::Discovered));
        reg.get_mut(&id).unwrap().validate().unwrap();
        assert_eq!(reg.state(&id), Some(PluginState::Validated));
    }
}

