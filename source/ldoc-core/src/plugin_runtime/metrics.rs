use std::collections::HashMap;
use crate::plugin_runtime::types::{
    PluginId, PluginMetrics, PluginRuntimeMetrics, PluginState,
};

// ── MetricsDelta ──────────────────────────────────────────────────────────────

/// Incremental update applied to a plugin's counters.
#[derive(Debug, Default, Clone)]
pub struct MetricsDelta {
    pub cpu_time_ms:       u64,
    pub memory_heap_bytes: Option<u64>,  // absolute snapshot, not delta
    pub memory_host_bytes: Option<u64>,
    pub events_received:   u64,
    pub events_sent:       u64,
    pub api_calls_total:   u64,
    pub api_calls_denied:  u64,
    pub ipc_messages_sent: u64,
    pub ipc_messages_recv: u64,
}

// ── PluginMetricsTracker ──────────────────────────────────────────────────────

/// Live metrics accumulator for a single plugin.
struct PluginMetricsTracker {
    metrics:    PluginMetrics,
    started_ms: Option<u64>,
}

impl PluginMetricsTracker {
    fn new(plugin_id: PluginId) -> Self {
        Self {
            metrics:    PluginMetrics::new(plugin_id),
            started_ms: None,
        }
    }

    fn apply_delta(&mut self, delta: &MetricsDelta) {
        let m = &mut self.metrics;
        m.cpu_time_ms       += delta.cpu_time_ms;
        m.events_received   += delta.events_received;
        m.events_sent       += delta.events_sent;
        m.api_calls_total   += delta.api_calls_total;
        m.api_calls_denied  += delta.api_calls_denied;
        m.ipc_messages_sent += delta.ipc_messages_sent;
        m.ipc_messages_recv += delta.ipc_messages_recv;
        if let Some(v) = delta.memory_heap_bytes { m.memory_heap_bytes = v; }
        if let Some(v) = delta.memory_host_bytes { m.memory_host_bytes = v; }
    }

    fn set_state(&mut self, state: PluginState) {
        self.metrics.state = state;
        if state == PluginState::Running && self.started_ms.is_none() {
            self.started_ms = Some(now_ms());
        }
    }

    fn record_crash(&mut self, reason: &str) {
        self.metrics.crash_count += 1;
        self.metrics.last_crash_reason = Some(reason.to_owned());
        self.metrics.state = PluginState::Crashed;
    }

    fn snapshot(&self) -> PluginMetrics {
        let mut m = self.metrics.clone();
        m.uptime_ms = self.started_ms.map_or(0, |t| now_ms().saturating_sub(t));
        m
    }
}

// ── MetricsCollector ──────────────────────────────────────────────────────────

/// Central metrics registry for all plugins.
pub struct MetricsCollector {
    trackers:      HashMap<PluginId, PluginMetricsTracker>,
    events_routed: u64,
    ipc_total:     u64,
    load_queue:    u32,
}

impl MetricsCollector {
    pub fn new() -> Self {
        Self {
            trackers:      HashMap::new(),
            events_routed: 0,
            ipc_total:     0,
            load_queue:    0,
        }
    }

    // ── Registration ─────────────────────────────────────────────────────────

    pub fn register(&mut self, plugin_id: PluginId) {
        self.trackers
            .entry(plugin_id.clone())
            .or_insert_with(|| PluginMetricsTracker::new(plugin_id));
    }

    pub fn unregister(&mut self, plugin_id: &PluginId) {
        self.trackers.remove(plugin_id);
    }

    // ── Updates ───────────────────────────────────────────────────────────────

    /// Apply an incremental delta to a plugin's counters.
    /// Silently ignored if the plugin is not registered.
    pub fn apply_delta(&mut self, plugin_id: &PluginId, delta: MetricsDelta) {
        if let Some(t) = self.trackers.get_mut(plugin_id) {
            t.apply_delta(&delta);
        }
    }

    pub fn set_state(&mut self, plugin_id: &PluginId, state: PluginState) {
        if let Some(t) = self.trackers.get_mut(plugin_id) {
            t.set_state(state);
        }
    }

    pub fn record_crash(&mut self, plugin_id: &PluginId, reason: &str) {
        if let Some(t) = self.trackers.get_mut(plugin_id) {
            t.record_crash(reason);
        }
    }

    pub fn increment_events_routed(&mut self) {
        self.events_routed += 1;
    }

    pub fn increment_ipc_total(&mut self) {
        self.ipc_total += 1;
    }

    pub fn set_load_queue_depth(&mut self, depth: u32) {
        self.load_queue = depth;
    }

    // ── Snapshots ─────────────────────────────────────────────────────────────

    /// Snapshot metrics for a single plugin.
    pub fn snapshot_plugin(&self, plugin_id: &PluginId) -> Option<PluginMetrics> {
        self.trackers.get(plugin_id).map(|t| t.snapshot())
    }

    /// Aggregate snapshot of the entire runtime.
    pub fn snapshot_runtime(&self) -> PluginRuntimeMetrics {
        let plugins: Vec<PluginMetrics> = self.trackers.values().map(|t| t.snapshot()).collect();

        let running  = plugins.iter().filter(|m| m.state == PluginState::Running).count() as u32;
        let paused   = plugins.iter().filter(|m| m.state == PluginState::Paused).count() as u32;
        let crashed  = plugins.iter().filter(|m| m.state == PluginState::Crashed).count() as u32;
        let wasm_heap = plugins.iter().map(|m| m.memory_heap_bytes).sum();
        let host_mem  = plugins.iter().map(|m| m.memory_host_bytes).sum();

        PluginRuntimeMetrics {
            total_plugins:      plugins.len() as u32,
            running_plugins:    running,
            paused_plugins:     paused,
            crashed_plugins:    crashed,
            total_wasm_heap:    wasm_heap,
            total_host_memory:  host_mem,
            events_routed:      self.events_routed,
            ipc_messages_total: self.ipc_total,
            load_queue_depth:   self.load_queue,
            plugins,
        }
    }

    /// All plugin IDs currently tracked.
    pub fn tracked_ids(&self) -> impl Iterator<Item = &PluginId> {
        self.trackers.keys()
    }
}

impl Default for MetricsCollector {
    fn default() -> Self { Self::new() }
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

    fn pid(s: &str) -> PluginId { PluginId::from(s) }

    #[test]
    fn delta_accumulates() {
        let mut col = MetricsCollector::new();
        col.register(pid("com.a"));
        col.apply_delta(&pid("com.a"), MetricsDelta { api_calls_total: 5, ..Default::default() });
        col.apply_delta(&pid("com.a"), MetricsDelta { api_calls_total: 3, ..Default::default() });
        let snap = col.snapshot_plugin(&pid("com.a")).unwrap();
        assert_eq!(snap.api_calls_total, 8);
    }

    #[test]
    fn state_transition_recorded() {
        let mut col = MetricsCollector::new();
        col.register(pid("com.a"));
        col.set_state(&pid("com.a"), PluginState::Running);
        let snap = col.snapshot_plugin(&pid("com.a")).unwrap();
        assert_eq!(snap.state, PluginState::Running);
    }

    #[test]
    fn crash_increments_count() {
        let mut col = MetricsCollector::new();
        col.register(pid("com.a"));
        col.record_crash(&pid("com.a"), "timeout");
        col.record_crash(&pid("com.a"), "trap");
        let snap = col.snapshot_plugin(&pid("com.a")).unwrap();
        assert_eq!(snap.crash_count, 2);
        assert_eq!(snap.last_crash_reason.as_deref(), Some("trap"));
    }

    #[test]
    fn runtime_snapshot_aggregates() {
        let mut col = MetricsCollector::new();
        col.register(pid("com.a"));
        col.register(pid("com.b"));
        col.set_state(&pid("com.a"), PluginState::Running);
        col.set_state(&pid("com.b"), PluginState::Paused);
        col.increment_events_routed();
        col.increment_events_routed();
        let rt = col.snapshot_runtime();
        assert_eq!(rt.total_plugins, 2);
        assert_eq!(rt.running_plugins, 1);
        assert_eq!(rt.paused_plugins, 1);
        assert_eq!(rt.events_routed, 2);
    }

    #[test]
    fn memory_snapshot_is_absolute() {
        let mut col = MetricsCollector::new();
        col.register(pid("com.a"));
        col.apply_delta(&pid("com.a"), MetricsDelta {
            memory_heap_bytes: Some(1024),
            ..Default::default()
        });
        col.apply_delta(&pid("com.a"), MetricsDelta {
            memory_heap_bytes: Some(2048),
            ..Default::default()
        });
        // Should be 2048, not 1024+2048
        let snap = col.snapshot_plugin(&pid("com.a")).unwrap();
        assert_eq!(snap.memory_heap_bytes, 2048);
    }
}

