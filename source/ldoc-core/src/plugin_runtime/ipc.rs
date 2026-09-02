use std::collections::{HashMap, VecDeque};
use serde::{Deserialize, Serialize};
use crate::plugin_runtime::{
    error::PluginRuntimeError,
    types::PluginId,
};

// ── IpcMessageKind ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IpcMessageKind {
    /// Fire-and-forget message.
    Send,
    /// Request expecting a response (identified by `correlation_id`).
    Request,
    /// Response to a prior Request.
    Response,
    /// Broadcast to all plugins listening on the channel.
    Broadcast,
}

// ── IpcMessage ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IpcMessage {
    pub message_id:     String,
    pub correlation_id: Option<String>,  // set on Response to match Request
    pub kind:           IpcMessageKind,
    pub sender:         PluginId,
    pub channel:        String,
    pub payload:        serde_json::Value,
    pub timestamp_ms:   u64,
}

impl IpcMessage {
    pub fn send(
        sender: PluginId,
        channel: impl Into<String>,
        payload: serde_json::Value,
    ) -> Self {
        Self::build(sender, channel.into(), payload, IpcMessageKind::Send, None)
    }

    pub fn request(
        sender: PluginId,
        channel: impl Into<String>,
        payload: serde_json::Value,
    ) -> (Self, String) {
        let msg = Self::build(sender, channel.into(), payload, IpcMessageKind::Request, None);
        let correlation = msg.message_id.clone();
        (msg, correlation)
    }

    pub fn response(
        sender: PluginId,
        channel: impl Into<String>,
        payload: serde_json::Value,
        correlation_id: String,
    ) -> Self {
        Self::build(sender, channel.into(), payload, IpcMessageKind::Response, Some(correlation_id))
    }

    pub fn broadcast(
        sender: PluginId,
        channel: impl Into<String>,
        payload: serde_json::Value,
    ) -> Self {
        Self::build(sender, channel.into(), payload, IpcMessageKind::Broadcast, None)
    }

    fn build(
        sender: PluginId,
        channel: String,
        payload: serde_json::Value,
        kind: IpcMessageKind,
        correlation_id: Option<String>,
    ) -> Self {
        Self {
            message_id:   new_id(),
            correlation_id,
            kind,
            sender,
            channel,
            payload,
            timestamp_ms: now_ms(),
        }
    }
}

// ── IpcChannel ────────────────────────────────────────────────────────────────

const DEFAULT_CHANNEL_CAPACITY: usize = 128;

/// A named IPC channel with a set of registered receivers and per-receiver queues.
#[allow(dead_code)]
struct IpcChannel {
    name:      String,
    /// Plugins registered as receivers on this channel.
    receivers: Vec<PluginId>,
    /// Per-receiver inboxes.
    inboxes:   HashMap<PluginId, VecDeque<IpcMessage>>,
    capacity:  usize,
    sent:      u64,
    dropped:   u64,
}

impl IpcChannel {
    fn new(name: impl Into<String>) -> Self {
        Self {
            name:      name.into(),
            receivers: Vec::new(),
            inboxes:   HashMap::new(),
            capacity:  DEFAULT_CHANNEL_CAPACITY,
            sent:      0,
            dropped:   0,
        }
    }

    fn add_receiver(&mut self, plugin_id: PluginId) {
        if !self.receivers.contains(&plugin_id) {
            self.inboxes.entry(plugin_id.clone()).or_insert_with(VecDeque::new);
            self.receivers.push(plugin_id);
        }
    }

    fn remove_receiver(&mut self, plugin_id: &PluginId) {
        self.receivers.retain(|r| r != plugin_id);
        self.inboxes.remove(plugin_id);
    }

    /// Deliver to a specific receiver.
    fn deliver_to(
        &mut self,
        target: &PluginId,
        msg: IpcMessage,
    ) -> Result<(), PluginRuntimeError> {
        let inbox = self.inboxes.get_mut(target).ok_or_else(|| {
            PluginRuntimeError::IpcMessageDropped {
                target:  target.clone(),
                reason:  "receiver not registered on channel".into(),
            }
        })?;
        if inbox.len() >= self.capacity {
            self.dropped += 1;
            return Err(PluginRuntimeError::IpcMessageDropped {
                target:  target.clone(),
                reason:  "inbox full".into(),
            });
        }
        inbox.push_back(msg);
        self.sent += 1;
        Ok(())
    }

    /// Broadcast to all receivers.
    fn broadcast(&mut self, msg: IpcMessage) -> usize {
        let targets: Vec<PluginId> = self.receivers.clone();
        let mut delivered = 0;
        for target in &targets {
            if let Ok(()) = self.deliver_to(target, msg.clone()) {
                delivered += 1;
            }
        }
        delivered
    }

    fn poll(&mut self, receiver: &PluginId) -> Option<IpcMessage> {
        self.inboxes.get_mut(receiver)?.pop_front()
    }

    fn drain(&mut self, receiver: &PluginId) -> Vec<IpcMessage> {
        self.inboxes
            .get_mut(receiver)
            .map(|q| q.drain(..).collect())
            .unwrap_or_default()
    }

    fn inbox_depth(&self, receiver: &PluginId) -> usize {
        self.inboxes.get(receiver).map_or(0, |q| q.len())
    }
}

// ── IpcRouter ─────────────────────────────────────────────────────────────────

/// Manages all named IPC channels and routes messages between plugins.
pub struct IpcRouter {
    channels:      HashMap<String, IpcChannel>,
    total_routed:  u64,
}

impl IpcRouter {
    pub fn new() -> Self {
        Self { channels: HashMap::new(), total_routed: 0 }
    }

    // ── Channel management ────────────────────────────────────────────────────

    pub fn create_channel(&mut self, name: impl Into<String>) -> Result<(), PluginRuntimeError> {
        let name = name.into();
        if self.channels.contains_key(&name) {
            return Err(PluginRuntimeError::IpcChannelAlreadyExists { channel: name });
        }
        self.channels.insert(name.clone(), IpcChannel::new(name));
        Ok(())
    }

    pub fn drop_channel(&mut self, name: &str) -> bool {
        self.channels.remove(name).is_some()
    }

    pub fn channel_exists(&self, name: &str) -> bool {
        self.channels.contains_key(name)
    }

    // ── Receiver registration ─────────────────────────────────────────────────

    pub fn join(&mut self, channel: &str, plugin_id: PluginId) -> Result<(), PluginRuntimeError> {
        let ch = self.channels.get_mut(channel).ok_or_else(|| {
            PluginRuntimeError::IpcChannelNotFound { channel: channel.into() }
        })?;
        ch.add_receiver(plugin_id);
        Ok(())
    }

    pub fn leave(&mut self, channel: &str, plugin_id: &PluginId) {
        if let Some(ch) = self.channels.get_mut(channel) {
            ch.remove_receiver(plugin_id);
        }
    }

    /// Remove a plugin from all channels (called on unload).
    pub fn remove_plugin(&mut self, plugin_id: &PluginId) {
        for ch in self.channels.values_mut() {
            ch.remove_receiver(plugin_id);
        }
    }

    // ── Sending ───────────────────────────────────────────────────────────────

    /// Send a direct message to a specific receiver on a channel.
    pub fn send(
        &mut self,
        msg: IpcMessage,
        target: &PluginId,
    ) -> Result<(), PluginRuntimeError> {
        let channel_name = msg.channel.clone();
        let ch = self.channels.get_mut(&channel_name).ok_or_else(|| {
            PluginRuntimeError::IpcChannelNotFound { channel: channel_name.clone() }
        })?;
        ch.deliver_to(target, msg)?;
        self.total_routed += 1;
        Ok(())
    }

    /// Broadcast a message to all receivers on the channel.
    pub fn broadcast(&mut self, msg: IpcMessage) -> Result<usize, PluginRuntimeError> {
        let channel_name = msg.channel.clone();
        let ch = self.channels.get_mut(&channel_name).ok_or_else(|| {
            PluginRuntimeError::IpcChannelNotFound { channel: channel_name }
        })?;
        let n = ch.broadcast(msg);
        self.total_routed += 1;
        Ok(n)
    }

    // ── Receiving ─────────────────────────────────────────────────────────────

    pub fn poll(
        &mut self,
        channel: &str,
        receiver: &PluginId,
    ) -> Result<Option<IpcMessage>, PluginRuntimeError> {
        let ch = self.channels.get_mut(channel).ok_or_else(|| {
            PluginRuntimeError::IpcChannelNotFound { channel: channel.into() }
        })?;
        Ok(ch.poll(receiver))
    }

    pub fn drain(
        &mut self,
        channel: &str,
        receiver: &PluginId,
    ) -> Result<Vec<IpcMessage>, PluginRuntimeError> {
        let ch = self.channels.get_mut(channel).ok_or_else(|| {
            PluginRuntimeError::IpcChannelNotFound { channel: channel.into() }
        })?;
        Ok(ch.drain(receiver))
    }

    // ── Diagnostics ───────────────────────────────────────────────────────────

    pub fn inbox_depth(&self, channel: &str, receiver: &PluginId) -> usize {
        self.channels.get(channel).map_or(0, |ch| ch.inbox_depth(receiver))
    }

    pub fn total_routed(&self) -> u64 { self.total_routed }

    pub fn channel_names(&self) -> impl Iterator<Item = &str> {
        self.channels.keys().map(|s| s.as_str())
    }
}

impl Default for IpcRouter {
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

fn new_id() -> String {
    static COUNTER: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    let seq = COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    format!("{:016x}", seq)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn pid(s: &str) -> PluginId { PluginId::from(s) }

    fn router_with_channel() -> IpcRouter {
        let mut r = IpcRouter::new();
        r.create_channel("test").unwrap();
        r.join("test", pid("com.a")).unwrap();
        r.join("test", pid("com.b")).unwrap();
        r
    }

    #[test]
    fn direct_send_and_poll() {
        let mut r = router_with_channel();
        let msg = IpcMessage::send(pid("com.a"), "test", serde_json::json!({"x": 1}));
        r.send(msg, &pid("com.b")).unwrap();
        let received = r.poll("test", &pid("com.b")).unwrap().unwrap();
        assert_eq!(received.payload, serde_json::json!({"x": 1}));
    }

    #[test]
    fn broadcast_reaches_all_receivers() {
        let mut r = router_with_channel();
        let msg = IpcMessage::broadcast(pid("com.a"), "test", serde_json::json!(42));
        let n = r.broadcast(msg).unwrap();
        assert_eq!(n, 2);
        assert_eq!(r.inbox_depth("test", &pid("com.a")), 1);
        assert_eq!(r.inbox_depth("test", &pid("com.b")), 1);
    }

    #[test]
    fn channel_not_found_error() {
        let mut r = IpcRouter::new();
        let msg = IpcMessage::send(pid("com.a"), "missing", serde_json::Value::Null);
        let err = r.send(msg, &pid("com.b"));
        assert!(matches!(err, Err(PluginRuntimeError::IpcChannelNotFound { .. })));
    }

    #[test]
    fn duplicate_channel_errors() {
        let mut r = IpcRouter::new();
        r.create_channel("ch").unwrap();
        let err = r.create_channel("ch");
        assert!(matches!(err, Err(PluginRuntimeError::IpcChannelAlreadyExists { .. })));
    }

    #[test]
    fn remove_plugin_clears_all_channels() {
        let mut r = router_with_channel();
        r.create_channel("other").unwrap();
        r.join("other", pid("com.a")).unwrap();
        r.remove_plugin(&pid("com.a"));
        // Broadcast should only reach com.b now
        let msg = IpcMessage::broadcast(pid("com.b"), "test", serde_json::Value::Null);
        let n = r.broadcast(msg).unwrap();
        assert_eq!(n, 1);
    }

    #[test]
    fn drain_returns_all_messages() {
        let mut r = router_with_channel();
        for i in 0..3 {
            let msg = IpcMessage::send(pid("com.a"), "test", serde_json::json!(i));
            r.send(msg, &pid("com.b")).unwrap();
        }
        let msgs = r.drain("test", &pid("com.b")).unwrap();
        assert_eq!(msgs.len(), 3);
        assert_eq!(r.inbox_depth("test", &pid("com.b")), 0);
    }
}

