use std::collections::{HashMap, VecDeque};
use serde::{Deserialize, Serialize};
use crate::plugin_runtime::{
    error::PluginRuntimeError,
    types::PluginId,
};

// ── EventPriority ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[repr(u8)]
pub enum EventPriority {
    Low    = 0,
    Normal = 1,
    High   = 2,
    System = 3,
}

impl Default for EventPriority {
    fn default() -> Self { Self::Normal }
}

// ── PluginEvent ───────────────────────────────────────────────────────────────

/// A runtime event routed through the event bus.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginEvent {
    /// Dot-separated event type, e.g. `"ldoc.document.opened"`.
    pub event_type:  String,
    /// Plugin that emitted this event, or `None` for host-originated events.
    pub source:      Option<PluginId>,
    /// Serialised event payload.
    pub payload:     serde_json::Value,
    pub priority:    EventPriority,
    pub timestamp_ms: u64,
    /// Unique event ID (UUID v4 hex, no dashes).
    pub event_id:    String,
}

impl PluginEvent {
    pub fn new(
        event_type: impl Into<String>,
        source: Option<PluginId>,
        payload: serde_json::Value,
        priority: EventPriority,
    ) -> Self {
        Self {
            event_type:   event_type.into(),
            source,
            payload,
            priority,
            timestamp_ms: now_ms(),
            event_id:     new_event_id(),
        }
    }

    /// Convenience: host-originated normal-priority event with no payload.
    pub fn host(event_type: impl Into<String>) -> Self {
        Self::new(event_type, None, serde_json::Value::Null, EventPriority::Normal)
    }
}

// ── Subscription ──────────────────────────────────────────────────────────────

/// A single subscription entry.
#[derive(Debug, Clone)]
struct Subscription {
    subscriber: PluginId,
    /// Glob-style pattern: `"ldoc.document.*"`, `"ldoc.**"`, or exact type.
    pattern:    String,
}

// ── PerPluginQueue ────────────────────────────────────────────────────────────

const DEFAULT_QUEUE_CAPACITY: usize = 256;

struct PerPluginQueue {
    queue:    VecDeque<PluginEvent>,
    capacity: usize,
    dropped:  u64,
}

impl PerPluginQueue {
    fn new(capacity: usize) -> Self {
        Self { queue: VecDeque::with_capacity(capacity), capacity, dropped: 0 }
    }

    fn push(&mut self, event: PluginEvent) -> bool {
        if self.queue.len() >= self.capacity {
            self.dropped += 1;
            return false;
        }
        self.queue.push_back(event);
        true
    }

    fn pop(&mut self) -> Option<PluginEvent> {
        self.queue.pop_front()
    }

    fn drain_all(&mut self) -> Vec<PluginEvent> {
        self.queue.drain(..).collect()
    }

    fn len(&self) -> usize { self.queue.len() }
}

// ── EventBus ──────────────────────────────────────────────────────────────────

/// Central event bus: subscriptions, routing, per-plugin delivery queues,
/// dead-letter queue for undeliverable events.
pub struct EventBus {
    subscriptions: Vec<Subscription>,
    queues:        HashMap<PluginId, PerPluginQueue>,
    dead_letters:  VecDeque<PluginEvent>,
    routed_total:  u64,
}

impl EventBus {
    pub fn new() -> Self {
        Self {
            subscriptions: Vec::new(),
            queues:        HashMap::new(),
            dead_letters:  VecDeque::new(),
            routed_total:  0,
        }
    }

    // ── Registration ─────────────────────────────────────────────────────────

    /// Register a plugin so it can receive events.
    pub fn register_plugin(&mut self, plugin_id: PluginId) {
        self.queues
            .entry(plugin_id)
            .or_insert_with(|| PerPluginQueue::new(DEFAULT_QUEUE_CAPACITY));
    }

    /// Unregister a plugin and remove all its subscriptions and queued events.
    pub fn unregister_plugin(&mut self, plugin_id: &PluginId) {
        self.queues.remove(plugin_id);
        self.subscriptions.retain(|s| &s.subscriber != plugin_id);
    }

    // ── Subscriptions ─────────────────────────────────────────────────────────

    /// Subscribe `plugin_id` to events matching `pattern`.
    /// Duplicate subscriptions (same plugin + same pattern) are silently ignored.
    pub fn subscribe(
        &mut self,
        plugin_id: &PluginId,
        pattern: impl Into<String>,
    ) -> Result<(), PluginRuntimeError> {
        if !self.queues.contains_key(plugin_id) {
            return Err(PluginRuntimeError::PluginNotFound { plugin_id: plugin_id.clone() });
        }
        let pattern = pattern.into();
        let already = self.subscriptions.iter().any(|s| {
            &s.subscriber == plugin_id && s.pattern == pattern
        });
        if !already {
            self.subscriptions.push(Subscription { subscriber: plugin_id.clone(), pattern });
        }
        Ok(())
    }

    /// Unsubscribe `plugin_id` from `pattern`.
    pub fn unsubscribe(&mut self, plugin_id: &PluginId, pattern: &str) {
        self.subscriptions.retain(|s| {
            !(&s.subscriber == plugin_id && s.pattern == pattern)
        });
    }

    // ── Publishing ────────────────────────────────────────────────────────────

    /// Publish an event: route to all matching subscriber queues.
    /// Returns the number of plugins the event was delivered to.
    pub fn publish(&mut self, event: PluginEvent) -> Result<usize, PluginRuntimeError> {
        if event.event_type.is_empty() {
            return Err(PluginRuntimeError::InvalidEventType { event_type: event.event_type });
        }

        // Collect matching subscribers (deduplicated).
        let mut targets: Vec<PluginId> = self
            .subscriptions
            .iter()
            .filter(|s| pattern_matches(&s.pattern, &event.event_type))
            .map(|s| s.subscriber.clone())
            .collect();
        targets.dedup();

        let delivered = targets.len();
        self.routed_total += 1;

        if targets.is_empty() {
            self.dead_letters.push_back(event);
            return Ok(0);
        }

        for target in targets {
            if let Some(q) = self.queues.get_mut(&target) {
                if !q.push(event.clone()) {
                    return Err(PluginRuntimeError::EventQueueFull { plugin_id: target });
                }
            }
        }

        Ok(delivered)
    }

    // ── Consumption ───────────────────────────────────────────────────────────

    /// Pop the next event from a plugin's queue (FIFO).
    pub fn poll(
        &mut self,
        plugin_id: &PluginId,
    ) -> Result<Option<PluginEvent>, PluginRuntimeError> {
        let q = self.queues.get_mut(plugin_id).ok_or_else(|| {
            PluginRuntimeError::PluginNotFound { plugin_id: plugin_id.clone() }
        })?;
        Ok(q.pop())
    }

    /// Drain all pending events for a plugin.
    pub fn drain(
        &mut self,
        plugin_id: &PluginId,
    ) -> Result<Vec<PluginEvent>, PluginRuntimeError> {
        let q = self.queues.get_mut(plugin_id).ok_or_else(|| {
            PluginRuntimeError::PluginNotFound { plugin_id: plugin_id.clone() }
        })?;
        Ok(q.drain_all())
    }

    // ── Diagnostics ───────────────────────────────────────────────────────────

    pub fn queue_depth(&self, plugin_id: &PluginId) -> usize {
        self.queues.get(plugin_id).map_or(0, |q| q.len())
    }

    pub fn dead_letter_count(&self) -> usize {
        self.dead_letters.len()
    }

    pub fn routed_total(&self) -> u64 {
        self.routed_total
    }

    pub fn dropped_count(&self, plugin_id: &PluginId) -> u64 {
        self.queues.get(plugin_id).map_or(0, |q| q.dropped)
    }
}

impl Default for EventBus {
    fn default() -> Self { Self::new() }
}

// ── Pattern matching ──────────────────────────────────────────────────────────

/// Match an event type string against a subscription pattern.
/// - `"ldoc.**"` matches any event starting with `"ldoc."`
/// - `"ldoc.document.*"` matches exactly one more segment
/// - Exact string match otherwise
fn pattern_matches(pattern: &str, event_type: &str) -> bool {
    if pattern == "**" {
        return true;
    }
    if let Some(prefix) = pattern.strip_suffix(".**") {
        return event_type.starts_with(prefix);
    }
    if let Some(prefix) = pattern.strip_suffix(".*") {
        // One more segment — no further dots allowed after prefix.
        if let Some(rest) = event_type.strip_prefix(&format!("{prefix}.")) {
            return !rest.contains('.');
        }
        return false;
    }
    pattern == event_type
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn now_ms() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn new_event_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    // Deterministic-enough ID without uuid dependency: timestamp_ns + counter.
    static COUNTER: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0);
    let seq = COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    format!("{:016x}{:08x}", ts, seq)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn pid(s: &str) -> PluginId { PluginId::from(s) }

    fn setup() -> EventBus {
        let mut bus = EventBus::new();
        bus.register_plugin(pid("com.a"));
        bus.register_plugin(pid("com.b"));
        bus
    }

    #[test]
    fn exact_match_delivery() {
        let mut bus = setup();
        bus.subscribe(&pid("com.a"), "ldoc.document.opened").unwrap();
        let n = bus.publish(PluginEvent::host("ldoc.document.opened")).unwrap();
        assert_eq!(n, 1);
        assert_eq!(bus.queue_depth(&pid("com.a")), 1);
    }

    #[test]
    fn wildcard_single_segment() {
        let mut bus = setup();
        bus.subscribe(&pid("com.a"), "ldoc.document.*").unwrap();
        bus.publish(PluginEvent::host("ldoc.document.opened")).unwrap();
        bus.publish(PluginEvent::host("ldoc.document.closed")).unwrap();
        // Should NOT match two-segment suffix
        bus.publish(PluginEvent::host("ldoc.document.section.added")).unwrap();
        assert_eq!(bus.queue_depth(&pid("com.a")), 2);
    }

    #[test]
    fn double_star_matches_all() {
        let mut bus = setup();
        bus.subscribe(&pid("com.b"), "ldoc.**").unwrap();
        bus.publish(PluginEvent::host("ldoc.document.opened")).unwrap();
        bus.publish(PluginEvent::host("ldoc.plugin.loaded")).unwrap();
        assert_eq!(bus.queue_depth(&pid("com.b")), 2);
    }

    #[test]
    fn undelivered_goes_to_dead_letter() {
        let mut bus = setup();
        // No subscriptions
        bus.publish(PluginEvent::host("ldoc.orphan.event")).unwrap();
        assert_eq!(bus.dead_letter_count(), 1);
    }

    #[test]
    fn poll_fifo_order() {
        let mut bus = setup();
        bus.subscribe(&pid("com.a"), "**").unwrap();
        bus.publish(PluginEvent::host("first")).unwrap();
        bus.publish(PluginEvent::host("second")).unwrap();
        let e1 = bus.poll(&pid("com.a")).unwrap().unwrap();
        let e2 = bus.poll(&pid("com.a")).unwrap().unwrap();
        assert_eq!(e1.event_type, "first");
        assert_eq!(e2.event_type, "second");
    }

    #[test]
    fn unregister_removes_subscriptions() {
        let mut bus = setup();
        bus.subscribe(&pid("com.a"), "ldoc.**").unwrap();
        bus.unregister_plugin(&pid("com.a"));
        let n = bus.publish(PluginEvent::host("ldoc.test")).unwrap();
        assert_eq!(n, 0);
    }
}


