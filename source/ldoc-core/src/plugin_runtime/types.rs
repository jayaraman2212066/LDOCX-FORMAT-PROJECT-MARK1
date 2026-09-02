use serde::{Deserialize, Serialize};
use std::fmt;

// ── PluginId ──────────────────────────────────────────────────────────────────

/// Unique stable identifier for a plugin. Reverse-domain format: `com.example.myplugin`.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
pub struct PluginId(pub String);

impl PluginId {
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
}

impl fmt::Display for PluginId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl From<&str> for PluginId {
    fn from(s: &str) -> Self {
        Self(s.to_owned())
    }
}

impl From<String> for PluginId {
    fn from(s: String) -> Self {
        Self(s)
    }
}

// ── PluginType ────────────────────────────────────────────────────────────────

/// Primary role of a plugin within the LDOC runtime.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PluginType {
    Ui,
    Runtime,
    Resource,
    Storage,
    Security,
    Ai,
    Analytics,
    Theme,
    Language,
    Widget,
    Enterprise,
    Developer,
    Testing,
}

impl fmt::Display for PluginType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::Ui         => "ui",
            Self::Runtime    => "runtime",
            Self::Resource   => "resource",
            Self::Storage    => "storage",
            Self::Security   => "security",
            Self::Ai         => "ai",
            Self::Analytics  => "analytics",
            Self::Theme      => "theme",
            Self::Language   => "language",
            Self::Widget     => "widget",
            Self::Enterprise => "enterprise",
            Self::Developer  => "developer",
            Self::Testing    => "testing",
        };
        f.write_str(s)
    }
}

// ── TrustLevel ────────────────────────────────────────────────────────────────

/// Trust tier assigned by the Security Runtime based on the plugin's certificate chain.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[repr(u8)]
pub enum TrustLevel {
    Untrusted  = 0,
    Community  = 1,
    Verified   = 2,
    Trusted    = 3,
    Privileged = 4,
    System     = 5,
}

impl TrustLevel {
    pub fn from_u8(v: u8) -> Self {
        match v {
            0 => Self::Untrusted,
            1 => Self::Community,
            2 => Self::Verified,
            3 => Self::Trusted,
            4 => Self::Privileged,
            _ => Self::System,
        }
    }

    /// Default WASM heap budget in bytes.
    pub fn default_heap_bytes(self) -> u64 {
        match self {
            Self::Untrusted  =>   4 * 1024 * 1024,
            Self::Community  =>   8 * 1024 * 1024,
            Self::Verified   =>  16 * 1024 * 1024,
            Self::Trusted    =>  32 * 1024 * 1024,
            Self::Privileged =>  64 * 1024 * 1024,
            Self::System     => 128 * 1024 * 1024,
        }
    }

    /// Maximum WASM heap budget in bytes.
    pub fn max_heap_bytes(self) -> u64 {
        match self {
            Self::Untrusted  =>   8 * 1024 * 1024,
            Self::Community  =>  32 * 1024 * 1024,
            Self::Verified   =>  64 * 1024 * 1024,
            Self::Trusted    => 128 * 1024 * 1024,
            Self::Privileged => 256 * 1024 * 1024,
            Self::System     => 512 * 1024 * 1024,
        }
    }

    /// Whether this trust level requires eager loading.
    pub fn is_eager(self) -> bool {
        self >= Self::Trusted
    }
}

impl Default for TrustLevel {
    fn default() -> Self {
        Self::Untrusted
    }
}

impl fmt::Display for TrustLevel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::Untrusted  => "untrusted",
            Self::Community  => "community",
            Self::Verified   => "verified",
            Self::Trusted    => "trusted",
            Self::Privileged => "privileged",
            Self::System     => "system",
        };
        f.write_str(s)
    }
}

// ── LoadStrategy ─────────────────────────────────────────────────────────────

/// Controls when the Plugin Loader compiles and initialises a plugin's WASM module.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum LoadStrategy {
    /// Loaded during runtime boot, blocking boot completion.
    Eager,
    /// Loaded on first use; boot is not blocked.
    #[default]
    Lazy,
    /// Loaded on a background thread after boot; never blocks.
    Background,
}

// ── PluginState ───────────────────────────────────────────────────────────────

/// Lifecycle state of a plugin instance.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PluginState {
    Discovered,
    Validated,
    Installed,
    Loaded,
    Initialized,
    Running,
    Paused,
    Updating,
    Disabled,
    Crashed,
    Unloaded,
    Removed,
}

impl Default for PluginState {
    fn default() -> Self {
        Self::Discovered
    }
}

impl fmt::Display for PluginState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::Discovered  => "Discovered",
            Self::Validated   => "Validated",
            Self::Installed   => "Installed",
            Self::Loaded      => "Loaded",
            Self::Initialized => "Initialized",
            Self::Running     => "Running",
            Self::Paused      => "Paused",
            Self::Updating    => "Updating",
            Self::Disabled    => "Disabled",
            Self::Crashed     => "Crashed",
            Self::Unloaded    => "Unloaded",
            Self::Removed     => "Removed",
        };
        f.write_str(s)
    }
}

// ── PauseReason ───────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PauseReason {
    ApiRequest,
    DocumentClosed,
    MemoryPressure,
    DebugPause,
}

// ── CrashReason ───────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CrashReason {
    WasmTrap(String),
    SandboxViolation(String),
    MemoryBudgetExceeded,
    Timeout,
    HostApiPanic(String),
    ExplicitAbort,
}

impl fmt::Display for CrashReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WasmTrap(msg)         => write!(f, "WASM trap: {msg}"),
            Self::SandboxViolation(msg) => write!(f, "sandbox violation: {msg}"),
            Self::MemoryBudgetExceeded  => write!(f, "memory budget exceeded"),
            Self::Timeout               => write!(f, "execution timeout"),
            Self::HostApiPanic(msg)     => write!(f, "host API panic: {msg}"),
            Self::ExplicitAbort         => write!(f, "explicit abort"),
        }
    }
}

// ── CrashReport ──────────────────────────────────────────────────────────────

/// Full diagnostic record captured when a plugin transitions to Crashed.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrashReport {
    pub plugin_id:       PluginId,
    pub plugin_version:  String,
    pub timestamp_ms:    u64,
    pub reason:          CrashReason,
    pub last_api_call:   Option<String>,
    pub memory_at_crash: u64,
    pub event_at_crash:  Option<String>,
}

impl CrashReport {
    pub fn new(
        plugin_id: PluginId,
        plugin_version: impl Into<String>,
        reason: CrashReason,
        memory_at_crash: u64,
    ) -> Self {
        Self {
            plugin_id,
            plugin_version: plugin_version.into(),
            timestamp_ms: current_timestamp_ms(),
            reason,
            last_api_call: None,
            memory_at_crash,
            event_at_crash: None,
        }
    }
}

// ── PluginMetrics ─────────────────────────────────────────────────────────────

/// Real-time counters for a single plugin instance.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginMetrics {
    pub plugin_id:         PluginId,
    pub state:             PluginState,
    pub uptime_ms:         u64,
    pub cpu_time_ms:       u64,
    pub memory_heap_bytes: u64,
    pub memory_host_bytes: u64,
    pub events_received:   u64,
    pub events_sent:       u64,
    pub api_calls_total:   u64,
    pub api_calls_denied:  u64,
    pub ipc_messages_sent: u64,
    pub ipc_messages_recv: u64,
    pub crash_count:       u32,
    pub last_crash_reason: Option<String>,
}

impl PluginMetrics {
    pub fn new(plugin_id: PluginId) -> Self {
        Self {
            plugin_id,
            state:             PluginState::Discovered,
            uptime_ms:         0,
            cpu_time_ms:       0,
            memory_heap_bytes: 0,
            memory_host_bytes: 0,
            events_received:   0,
            events_sent:       0,
            api_calls_total:   0,
            api_calls_denied:  0,
            ipc_messages_sent: 0,
            ipc_messages_recv: 0,
            crash_count:       0,
            last_crash_reason: None,
        }
    }
}

// ── PluginRuntimeMetrics ──────────────────────────────────────────────────────

/// Aggregate snapshot of the entire Plugin Runtime.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PluginRuntimeMetrics {
    pub total_plugins:      u32,
    pub running_plugins:    u32,
    pub paused_plugins:     u32,
    pub crashed_plugins:    u32,
    pub total_wasm_heap:    u64,
    pub total_host_memory:  u64,
    pub events_routed:      u64,
    pub ipc_messages_total: u64,
    pub load_queue_depth:   u32,
    pub plugins:            Vec<PluginMetrics>,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn current_timestamp_ms() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

