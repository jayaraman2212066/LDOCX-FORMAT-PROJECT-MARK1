use std::collections::HashMap;
use crate::plugin_runtime::{
    error::PluginRuntimeError,
    types::{PluginId, TrustLevel},
};

// ── SandboxConfig ─────────────────────────────────────────────────────────────

/// Per-plugin sandbox resource limits.
#[derive(Debug, Clone)]
pub struct SandboxConfig {
    pub memory_limit_bytes: u64,
    pub fuel_limit:         Option<u64>,  // WASM fuel units (instruction budget)
    pub stack_size_bytes:   u32,
    pub allow_threads:      bool,
    pub allow_simd:         bool,
}

impl SandboxConfig {
    pub fn for_trust_level(trust: TrustLevel) -> Self {
        Self {
            memory_limit_bytes: trust.default_heap_bytes(),
            fuel_limit:         Some(500_000_000),
            stack_size_bytes:   512 * 1024,
            allow_threads:      trust >= TrustLevel::Trusted,
            allow_simd:         true,
        }
    }
}

// ── SandboxStats ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Default)]
pub struct SandboxStats {
    pub memory_used_bytes: u64,
    pub fuel_consumed:     u64,
    pub trap_count:        u32,
}

// ── SandboxHandle ─────────────────────────────────────────────────────────────

/// Opaque handle to a live sandbox instance.
/// The inner representation is feature-gated; outside this module only the
/// public API surface is visible.
pub struct SandboxHandle {
    plugin_id: PluginId,
    config:    SandboxConfig,
    inner:     SandboxInner,
}

impl SandboxHandle {
    pub fn plugin_id(&self) -> &PluginId {
        &self.plugin_id
    }

    pub fn memory_limit_bytes(&self) -> u64 {
        self.config.memory_limit_bytes
    }

    /// Current memory usage reported by the sandbox.
    pub fn memory_used_bytes(&self) -> u64 {
        self.inner.memory_used_bytes()
    }

    /// Returns true if memory usage is within the configured limit.
    pub fn within_budget(&self) -> bool {
        self.memory_used_bytes() <= self.config.memory_limit_bytes
    }

    /// Enforce memory budget — returns error if exceeded.
    pub fn check_budget(&self) -> Result<(), PluginRuntimeError> {
        let used = self.memory_used_bytes();
        if used > self.config.memory_limit_bytes {
            return Err(PluginRuntimeError::MemoryBudgetExceeded {
                plugin_id:    self.plugin_id.clone(),
                used_bytes:   used,
                budget_bytes: self.config.memory_limit_bytes,
            });
        }
        Ok(())
    }

    /// Snapshot current sandbox statistics.
    pub fn stats(&self) -> SandboxStats {
        self.inner.stats()
    }

    /// Terminate the sandbox, releasing all WASM resources.
    pub fn terminate(self) {
        self.inner.terminate();
    }
}

// ── SandboxManager ────────────────────────────────────────────────────────────

/// Owns all live sandbox instances indexed by plugin ID.
pub struct SandboxManager {
    sandboxes: HashMap<PluginId, SandboxHandle>,
}

impl SandboxManager {
    pub fn new() -> Self {
        Self { sandboxes: HashMap::new() }
    }

    /// Create and register a new sandbox for `plugin_id` using `wasm_bytes`.
    pub fn create(
        &mut self,
        plugin_id: PluginId,
        wasm_bytes: &[u8],
        config: SandboxConfig,
    ) -> Result<(), PluginRuntimeError> {
        if self.sandboxes.contains_key(&plugin_id) {
            return Err(PluginRuntimeError::AlreadyInstalled {
                plugin_id: plugin_id.clone(),
                version: String::new(),
            });
        }
        let inner = SandboxInner::create(&plugin_id, wasm_bytes, &config)?;
        self.sandboxes.insert(
            plugin_id.clone(),
            SandboxHandle { plugin_id, config, inner },
        );
        Ok(())
    }

    pub fn get(&self, id: &PluginId) -> Option<&SandboxHandle> {
        self.sandboxes.get(id)
    }

    pub fn get_mut(&mut self, id: &PluginId) -> Option<&mut SandboxHandle> {
        self.sandboxes.get_mut(id)
    }

    /// Remove and terminate the sandbox for `plugin_id`.
    pub fn destroy(&mut self, id: &PluginId) -> bool {
        if let Some(handle) = self.sandboxes.remove(id) {
            handle.terminate();
            true
        } else {
            false
        }
    }

    pub fn len(&self) -> usize {
        self.sandboxes.len()
    }

    pub fn is_empty(&self) -> bool {
        self.sandboxes.is_empty()
    }

    /// Check memory budgets for all sandboxes; returns list of violators.
    pub fn audit_budgets(&self) -> Vec<PluginRuntimeError> {
        self.sandboxes
            .values()
            .filter_map(|h| h.check_budget().err())
            .collect()
    }
}

impl Default for SandboxManager {
    fn default() -> Self {
        Self::new()
    }
}

// ── SandboxInner (feature-gated) ──────────────────────────────────────────────
//
// When the `plugin-wasm` Cargo feature is enabled this would wrap a real
// Wasmtime / Wasmer engine instance.  Without that feature we use a no-op
// stub so the rest of the codebase compiles and tests pass on all platforms.

#[cfg(feature = "plugin-wasm")]
mod inner_impl {
    // Real WASM engine integration goes here.
    // Placeholder — replace with wasmtime::Instance when feature is wired up.
    pub(super) struct SandboxInner {
        pub memory_used: u64,
        pub fuel_consumed: u64,
        pub trap_count: u32,
    }

    impl SandboxInner {
        pub fn create(
            _plugin_id: &super::PluginId,
            _wasm_bytes: &[u8],
            _config: &super::SandboxConfig,
        ) -> Result<Self, super::PluginRuntimeError> {
            // TODO: initialise wasmtime::Engine, compile module, create instance.
            Ok(Self { memory_used: 0, fuel_consumed: 0, trap_count: 0 })
        }

        pub fn memory_used_bytes(&self) -> u64 { self.memory_used }

        pub fn stats(&self) -> super::SandboxStats {
            super::SandboxStats {
                memory_used_bytes: self.memory_used,
                fuel_consumed:     self.fuel_consumed,
                trap_count:        self.trap_count,
            }
        }

        pub fn terminate(self) {}
    }
}

#[cfg(not(feature = "plugin-wasm"))]
mod inner_impl {
    /// No-op stub used when the `plugin-wasm` feature is not enabled.
    pub(super) struct SandboxInner;

    impl SandboxInner {
        pub fn create(
            _plugin_id: &super::PluginId,
            _wasm_bytes: &[u8],
            _config: &super::SandboxConfig,
        ) -> Result<Self, super::PluginRuntimeError> {
            // Sandbox is unavailable without the plugin-wasm feature.
            // Callers that need a real sandbox must enable the feature.
            // We return Ok here so that non-WASM paths (manifest validation,
            // lifecycle, events, IPC, storage) can be tested without a WASM runtime.
            Ok(Self)
        }

        pub fn memory_used_bytes(&self) -> u64 { 0 }

        pub fn stats(&self) -> super::SandboxStats {
            super::SandboxStats::default()
        }

        pub fn terminate(self) {}
    }
}

use inner_impl::SandboxInner;

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::plugin_runtime::types::TrustLevel;

    fn pid(s: &str) -> PluginId { PluginId::from(s) }

    #[test]
    fn create_and_destroy() {
        let mut mgr = SandboxManager::new();
        mgr.create(pid("com.example.a"), b"", SandboxConfig::for_trust_level(TrustLevel::Untrusted))
            .unwrap();
        assert_eq!(mgr.len(), 1);
        assert!(mgr.destroy(&pid("com.example.a")));
        assert!(mgr.is_empty());
    }

    #[test]
    fn duplicate_create_errors() {
        let mut mgr = SandboxManager::new();
        let cfg = SandboxConfig::for_trust_level(TrustLevel::Community);
        mgr.create(pid("com.example.b"), b"", cfg.clone()).unwrap();
        let err = mgr.create(pid("com.example.b"), b"", cfg);
        assert!(matches!(err, Err(PluginRuntimeError::AlreadyInstalled { .. })));
    }

    #[test]
    fn budget_within_limit() {
        let mut mgr = SandboxManager::new();
        mgr.create(pid("com.example.c"), b"", SandboxConfig::for_trust_level(TrustLevel::Verified))
            .unwrap();
        // No-op stub always reports 0 bytes used — budget check must pass.
        let violations = mgr.audit_budgets();
        assert!(violations.is_empty());
    }

    #[test]
    fn config_trust_levels() {
        let untrusted = SandboxConfig::for_trust_level(TrustLevel::Untrusted);
        let system    = SandboxConfig::for_trust_level(TrustLevel::System);
        assert!(system.memory_limit_bytes > untrusted.memory_limit_bytes);
        assert!(!untrusted.allow_threads);
        assert!(system.allow_threads);
    }
}

