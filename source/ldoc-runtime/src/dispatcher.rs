// LDOC Runtime — Event Dispatcher
// Event delivery system with listener registry and priority handling

use std::sync::Arc;
use parking_lot::RwLock;
use crate::error::{RuntimeError, RuntimeResult};
use crate::events::{Event, EventType, EventPriority};

/// Event listener callback type
pub type EventListener = Arc<dyn Fn(&Event) + Send + Sync>;

/// Listener entry
struct ListenerEntry {
    id: String,
    listener: EventListener,
    priority: EventPriority,
    event_types: Vec<EventType>,
}

/// Event dispatcher
pub struct EventDispatcher {
    listeners: Arc<RwLock<Vec<ListenerEntry>>>,
    event_history: Arc<RwLock<Vec<Event>>>,
    max_history: usize,
}

impl EventDispatcher {
    /// Create new event dispatcher
    pub fn new(max_history: usize) -> Self {
        Self {
            listeners: Arc::new(RwLock::new(Vec::new())),
            event_history: Arc::new(RwLock::new(Vec::new())),
            max_history,
        }
    }

    /// Register event listener
    pub fn register(
        &self,
        id: String,
        listener: EventListener,
        priority: EventPriority,
        event_types: Vec<EventType>,
    ) -> RuntimeResult<()> {
        let mut listeners = self.listeners.write();
        
        // Check for duplicate ID
        if listeners.iter().any(|l| l.id == id) {
            return Err(RuntimeError::Other(
                format!("Listener already registered: {}", id)
            ));
        }

        listeners.push(ListenerEntry {
            id,
            listener,
            priority,
            event_types,
        });

        // Sort by priority — Critical(0) first, Deferred(4) last — spec §9.4
        listeners.sort_by(|a, b| a.priority.cmp(&b.priority));
        Ok(())
    }

    /// Unregister event listener
    pub fn unregister(&self, id: &str) -> RuntimeResult<()> {
        let mut listeners = self.listeners.write();
        let initial_len = listeners.len();
        listeners.retain(|l| l.id != id);
        
        if listeners.len() == initial_len {
            return Err(RuntimeError::Other(
                format!("Listener not found: {}", id)
            ));
        }
        Ok(())
    }

    /// Dispatch event to all matching listeners
    pub fn dispatch(&self, event: Event) -> RuntimeResult<()> {
        // Record in history
        let mut history = self.event_history.write();
        history.push(event.clone());
        if history.len() > self.max_history {
            history.remove(0);
        }
        drop(history);

        // Dispatch to listeners
        let listeners = self.listeners.read();
        for entry in listeners.iter() {
            // Check if listener is interested in this event type
            if entry.event_types.is_empty() || entry.event_types.contains(&event.event_type) {
                (entry.listener)(&event);
            }
        }
        Ok(())
    }

    /// Dispatch event with filtering
    pub fn dispatch_filtered<F>(&self, event: Event, filter: F) -> RuntimeResult<()>
    where
        F: Fn(&EventType) -> bool,
    {
        if !filter(&event.event_type) {
            return Ok(());
        }
        self.dispatch(event)
    }

    /// Get listener count
    pub fn listener_count(&self) -> usize {
        self.listeners.read().len()
    }

    /// Get listeners for event type
    pub fn listeners_for_event(&self, event_type: &EventType) -> usize {
        self.listeners.read()
            .iter()
            .filter(|l| l.event_types.is_empty() || l.event_types.contains(event_type))
            .count()
    }

    /// Get event history
    pub fn history(&self) -> Vec<Event> {
        self.event_history.read().clone()
    }

    /// Get recent events (last n)
    pub fn recent_events(&self, count: usize) -> Vec<Event> {
        let history = self.event_history.read();
        let start = if history.len() > count {
            history.len() - count
        } else {
            0
        };
        history[start..].to_vec()
    }

    /// Get events by type
    pub fn events_by_type(&self, event_type: &EventType) -> Vec<Event> {
        self.event_history.read()
            .iter()
            .filter(|e| e.event_type == *event_type)
            .cloned()
            .collect()
    }

    /// Get events by priority
    pub fn events_by_priority(&self, priority: EventPriority) -> Vec<Event> {
        self.event_history.read()
            .iter()
            .filter(|e| e.priority == priority)
            .cloned()
            .collect()
    }

    /// Clear event history
    pub fn clear_history(&self) {
        self.event_history.write().clear();
    }

    /// Clear all listeners
    pub fn clear_listeners(&self) {
        self.listeners.write().clear();
    }

    /// Get event statistics
    pub fn statistics(&self) -> (usize, usize, usize) {
        let history = self.event_history.read();
        let total_events = history.len();
        let critical_events = history.iter().filter(|e| e.priority == EventPriority::Critical).count();
        let error_events = history.iter().filter(|e| e.event_type.to_string().contains("Error")).count();
        (total_events, critical_events, error_events)
    }
}

impl Default for EventDispatcher {
    fn default() -> Self {
        Self::new(1000)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    #[test]
    fn test_dispatcher_creation() {
        let dispatcher = EventDispatcher::new(100);
        assert_eq!(dispatcher.listener_count(), 0);
    }

    #[test]
    fn test_register_listener() {
        let dispatcher = EventDispatcher::new(100);
        let counter = Arc::new(AtomicUsize::new(0));
        let counter_clone = Arc::clone(&counter);
        
        let listener = Arc::new(move |_event: &Event| {
            counter_clone.fetch_add(1, Ordering::SeqCst);
        });

        dispatcher.register(
            "test".to_string(),
            listener,
            EventPriority::Normal,
            vec![EventType::BootStarted],
        ).unwrap();

        assert_eq!(dispatcher.listener_count(), 1);
    }

    #[test]
    fn test_dispatch_event() {
        let dispatcher = EventDispatcher::new(100);
        let counter = Arc::new(AtomicUsize::new(0));
        let counter_clone = Arc::clone(&counter);
        
        let listener = Arc::new(move |_event: &Event| {
            counter_clone.fetch_add(1, Ordering::SeqCst);
        });

        dispatcher.register(
            "test".to_string(),
            listener,
            EventPriority::Normal,
            vec![EventType::BootStarted],
        ).unwrap();

        let event = Event::new(
            EventType::BootStarted,
            EventPriority::High,
            "boot".to_string(),
            "Boot started".to_string(),
        );

        dispatcher.dispatch(event).unwrap();
        assert_eq!(counter.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn test_unregister_listener() {
        let dispatcher = EventDispatcher::new(100);
        let listener = Arc::new(|_event: &Event| {});

        dispatcher.register(
            "test".to_string(),
            listener,
            EventPriority::Normal,
            vec![],
        ).unwrap();

        assert_eq!(dispatcher.listener_count(), 1);
        dispatcher.unregister("test").unwrap();
        assert_eq!(dispatcher.listener_count(), 0);
    }

    #[test]
    fn test_event_history() {
        let dispatcher = EventDispatcher::new(100);
        
        let event1 = Event::new(
            EventType::BootStarted,
            EventPriority::High,
            "boot".to_string(),
            "Boot started".to_string(),
        );
        let event2 = Event::new(
            EventType::BootCompleted,
            EventPriority::High,
            "boot".to_string(),
            "Boot completed".to_string(),
        );

        dispatcher.dispatch(event1).unwrap();
        dispatcher.dispatch(event2).unwrap();

        assert_eq!(dispatcher.history().len(), 2);
    }

    #[test]
    fn test_recent_events() {
        let dispatcher = EventDispatcher::new(100);
        
        for i in 0..10 {
            let event = Event::new(
                EventType::SystemInfo,
                EventPriority::Low,
                "system".to_string(),
                format!("Event {}", i),
            );
            dispatcher.dispatch(event).unwrap();
        }

        let recent = dispatcher.recent_events(5);
        assert_eq!(recent.len(), 5);
    }

    #[test]
    fn test_events_by_type() {
        let dispatcher = EventDispatcher::new(100);
        
        let event1 = Event::new(
            EventType::BootStarted,
            EventPriority::High,
            "boot".to_string(),
            "Boot started".to_string(),
        );
        let event2 = Event::new(
            EventType::SystemInfo,
            EventPriority::Low,
            "system".to_string(),
            "System info".to_string(),
        );

        dispatcher.dispatch(event1).unwrap();
        dispatcher.dispatch(event2).unwrap();

        let boot_events = dispatcher.events_by_type(&EventType::BootStarted);
        assert_eq!(boot_events.len(), 1);
    }

    #[test]
    fn test_priority_ordering() {
        let dispatcher = EventDispatcher::new(100);
        let call_order = Arc::new(RwLock::new(Vec::new()));

        for (priority, name) in &[
            (EventPriority::Low, "low"),
            (EventPriority::Critical, "critical"),
            (EventPriority::Normal, "normal"),
        ] {
            let order = Arc::clone(&call_order);
            let name = name.to_string();
            let name_for_closure = name.clone();
            let listener = Arc::new(move |_event: &Event| {
                order.write().push(name_for_closure.clone());
            });

            dispatcher.register(
                name.clone(),
                listener,
                *priority,
                vec![],
            ).unwrap();
        }

        let event = Event::new(
            EventType::SystemInfo,
            EventPriority::Normal,
            "system".to_string(),
            "Test".to_string(),
        );
        dispatcher.dispatch(event).unwrap();

        // Critical(0) < High(1) < Normal(2) — so Critical is delivered first
        let order = call_order.read();
        assert_eq!(order[0], "critical");
        assert_eq!(order[1], "normal");
        assert_eq!(order[2], "low");
    }

    #[test]
    fn test_statistics() {
        let dispatcher = EventDispatcher::new(100);
        
        let event1 = Event::new(
            EventType::BootStarted,
            EventPriority::Critical,
            "boot".to_string(),
            "Boot started".to_string(),
        );
        let event2 = Event::new(
            EventType::SystemInfo,
            EventPriority::Low,
            "system".to_string(),
            "System info".to_string(),
        );

        dispatcher.dispatch(event1).unwrap();
        dispatcher.dispatch(event2).unwrap();

        let (total, critical, _errors) = dispatcher.statistics();
        assert_eq!(total, 2);
        assert_eq!(critical, 1);
    }
}
