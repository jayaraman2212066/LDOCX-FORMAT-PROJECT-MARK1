// ── plugin_runtime — Phase 2.8 Plugin Runtime Module ─────────────────────────
//
// Submodule declaration order follows the dependency graph:
//   types → error → manifest → permissions → lifecycle → dependency
//   → validator → sandbox → loader → events → ipc → storage → metrics → api

pub mod types;
pub mod error;
pub mod manifest;
pub mod permissions;
pub mod lifecycle;
pub mod dependency;
pub mod validator;
pub mod sandbox;
pub mod loader;
pub mod events;
pub mod ipc;
pub mod storage;
pub mod metrics;
pub mod api;

// ── Primary public re-exports ─────────────────────────────────────────────────

pub use api::PluginRuntimeApi;
pub use error::PluginRuntimeError;
pub use manifest::PluginManifest;
pub use types::{
    CrashReason, CrashReport, LoadStrategy, PluginId, PluginMetrics,
    PluginRuntimeMetrics, PluginState, PluginType, TrustLevel,
};
pub use validator::ValidatorConfig;

