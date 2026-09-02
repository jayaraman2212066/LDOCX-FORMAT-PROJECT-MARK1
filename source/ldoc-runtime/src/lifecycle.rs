// LDOC Runtime — Lifecycle Manager
// Specification: Module 05 (Runtime Lifecycle), Module 10 (State Machine)
//
// 15 lifecycle states with strict transition rules per spec.

use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use parking_lot::RwLock;
use crate::error::{RuntimeError, RuntimeResult};

/// 15 lifecycle states — spec Module 05 §5.2
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum LifecycleState {
    Created,
    Initializing,
    Loading,
    Ready,
    Running,
    Idle,
    Paused,
    Background,
    Restoring,
    Sleeping,
    Resuming,
    Updating,
    Restarting,
    Closing,
    Destroyed,
}

impl std::fmt::Display for LifecycleState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

/// Lifecycle transition record
#[derive(Debug, Clone)]
pub struct LifecycleTransition {
    pub from: LifecycleState,
    pub to: LifecycleState,
    pub timestamp: u64,
    pub reason: String,
}

/// Lifecycle event record
#[derive(Debug, Clone)]
pub struct LifecycleEvent {
    pub state: LifecycleState,
    pub timestamp: u64,
    pub message: String,
}

/// Lifecycle Manager — owns the document state machine
/// Spec: Module 05 §5.11, Module 10 §10.7
pub struct LifecycleManager {
    current_state: Arc<RwLock<LifecycleState>>,
    transitions: Arc<RwLock<Vec<LifecycleTransition>>>,
    events: Arc<RwLock<Vec<LifecycleEvent>>>,
    state_entered_at: Arc<RwLock<u64>>,
}

impl LifecycleManager {
    pub fn new() -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        Self {
            current_state: Arc::new(RwLock::new(LifecycleState::Created)),
            transitions: Arc::new(RwLock::new(Vec::new())),
            events: Arc::new(RwLock::new(Vec::new())),
            state_entered_at: Arc::new(RwLock::new(now)),
        }
    }

    pub fn current_state(&self) -> LifecycleState {
        *self.current_state.read()
    }

    pub fn time_in_state_secs(&self) -> u64 {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        now.saturating_sub(*self.state_entered_at.read())
    }

    /// Attempt a state transition. Rejects invalid transitions per spec §5.4 / §5.5.
    pub fn transition(&self, to: LifecycleState, reason: String) -> RuntimeResult<()> {
        let from = *self.current_state.read();

        // Invariant: Destroyed is terminal — spec §10.7
        if from == LifecycleState::Destroyed {
            return Err(RuntimeError::InvalidTransition {
                from: format!("{:?}", from),
                to: format!("{:?}", to),
            });
        }

        // Invariant: Closing only goes to Destroyed — spec §10.7
        if from == LifecycleState::Closing && to != LifecycleState::Destroyed {
            return Err(RuntimeError::InvalidTransition {
                from: format!("{:?}", from),
                to: format!("{:?}", to),
            });
        }

        if !Self::is_valid(from, to) {
            return Err(RuntimeError::InvalidTransition {
                from: format!("{:?}", from),
                to: format!("{:?}", to),
            });
        }

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        self.transitions.write().push(LifecycleTransition {
            from,
            to,
            timestamp: now,
            reason: reason.clone(),
        });
        self.events.write().push(LifecycleEvent {
            state: to,
            timestamp: now,
            message: format!("{:?} -> {:?}: {}", from, to, reason),
        });

        *self.current_state.write() = to;
        *self.state_entered_at.write() = now;
        Ok(())
    }

    /// Allowed transitions table — spec Module 05 §5.4
    fn is_valid(from: LifecycleState, to: LifecycleState) -> bool {
        use LifecycleState::*;
        matches!(
            (from, to),
            // Boot path
            (Created, Initializing) |
            (Created, Destroyed) |
            (Initializing, Loading) |
            (Initializing, Closing) |
            (Loading, Ready) |
            (Loading, Closing) |
            // Active path
            (Ready, Running) |
            (Ready, Closing) |
            (Running, Idle) |
            (Running, Paused) |
            (Running, Background) |
            (Running, Sleeping) |
            (Running, Updating) |
            (Running, Restarting) |
            (Running, Closing) |
            // Idle
            (Idle, Running) |
            (Idle, Paused) |
            (Idle, Background) |
            (Idle, Sleeping) |
            (Idle, Closing) |
            // Paused
            (Paused, Restoring) |
            (Paused, Sleeping) |
            (Paused, Closing) |
            // Background
            (Background, Restoring) |
            (Background, Sleeping) |
            (Background, Closing) |
            // Restoring
            (Restoring, Running) |
            (Restoring, Closing) |
            // Sleeping / Resuming
            (Sleeping, Resuming) |
            (Sleeping, Closing) |
            (Resuming, Running) |
            (Resuming, Closing) |
            // Updating
            (Updating, Running) |
            (Updating, Closing) |
            // Restarting
            (Restarting, Initializing) |
            (Restarting, Destroyed) |
            // Shutdown
            (Closing, Destroyed)
        )
    }

    pub fn transitions(&self) -> Vec<LifecycleTransition> {
        self.transitions.read().clone()
    }

    pub fn events(&self) -> Vec<LifecycleEvent> {
        self.events.read().clone()
    }

    pub fn clear_history(&self) {
        self.transitions.write().clear();
        self.events.write().clear();
    }

    /// Terminal state — spec §10.7
    pub fn is_terminal(&self) -> bool {
        self.current_state() == LifecycleState::Destroyed
    }

    pub fn is_running(&self) -> bool {
        matches!(self.current_state(), LifecycleState::Running | LifecycleState::Idle)
    }

    pub fn is_paused(&self) -> bool {
        matches!(
            self.current_state(),
            LifecycleState::Paused | LifecycleState::Background | LifecycleState::Sleeping
        )
    }
}

impl Default for LifecycleManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let lm = LifecycleManager::new();
        assert_eq!(lm.current_state(), LifecycleState::Created);
    }

    #[test]
    fn test_boot_path() {
        let lm = LifecycleManager::new();
        lm.transition(LifecycleState::Initializing, "boot".into()).unwrap();
        lm.transition(LifecycleState::Loading, "phases 1-9 ok".into()).unwrap();
        lm.transition(LifecycleState::Ready, "resources ready".into()).unwrap();
        assert_eq!(lm.current_state(), LifecycleState::Ready);
    }

    #[test]
    fn test_running_to_idle() {
        let lm = LifecycleManager::new();
        lm.transition(LifecycleState::Initializing, "".into()).unwrap();
        lm.transition(LifecycleState::Loading, "".into()).unwrap();
        lm.transition(LifecycleState::Ready, "".into()).unwrap();
        lm.transition(LifecycleState::Running, "session start".into()).unwrap();
        lm.transition(LifecycleState::Idle, "idle timeout".into()).unwrap();
        assert_eq!(lm.current_state(), LifecycleState::Idle);
    }

    #[test]
    fn test_pause_resume_path() {
        let lm = LifecycleManager::new();
        lm.transition(LifecycleState::Initializing, "".into()).unwrap();
        lm.transition(LifecycleState::Loading, "".into()).unwrap();
        lm.transition(LifecycleState::Ready, "".into()).unwrap();
        lm.transition(LifecycleState::Running, "".into()).unwrap();
        lm.transition(LifecycleState::Paused, "pause".into()).unwrap();
        lm.transition(LifecycleState::Restoring, "resume".into()).unwrap();
        lm.transition(LifecycleState::Running, "restore ok".into()).unwrap();
        assert!(lm.is_running());
    }

    #[test]
    fn test_sleep_resume_path() {
        let lm = LifecycleManager::new();
        lm.transition(LifecycleState::Initializing, "".into()).unwrap();
        lm.transition(LifecycleState::Loading, "".into()).unwrap();
        lm.transition(LifecycleState::Ready, "".into()).unwrap();
        lm.transition(LifecycleState::Running, "".into()).unwrap();
        lm.transition(LifecycleState::Sleeping, "os suspend".into()).unwrap();
        lm.transition(LifecycleState::Resuming, "os resume".into()).unwrap();
        lm.transition(LifecycleState::Running, "resume ok".into()).unwrap();
        assert!(lm.is_running());
    }

    #[test]
    fn test_shutdown_path() {
        let lm = LifecycleManager::new();
        lm.transition(LifecycleState::Initializing, "".into()).unwrap();
        lm.transition(LifecycleState::Loading, "".into()).unwrap();
        lm.transition(LifecycleState::Ready, "".into()).unwrap();
        lm.transition(LifecycleState::Closing, "close".into()).unwrap();
        lm.transition(LifecycleState::Destroyed, "shutdown ok".into()).unwrap();
        assert!(lm.is_terminal());
    }

    #[test]
    fn test_destroyed_is_terminal() {
        let lm = LifecycleManager::new();
        lm.transition(LifecycleState::Initializing, "".into()).unwrap();
        lm.transition(LifecycleState::Loading, "".into()).unwrap();
        lm.transition(LifecycleState::Ready, "".into()).unwrap();
        lm.transition(LifecycleState::Closing, "".into()).unwrap();
        lm.transition(LifecycleState::Destroyed, "".into()).unwrap();
        assert!(lm.transition(LifecycleState::Running, "invalid".into()).is_err());
    }

    #[test]
    fn test_closing_only_to_destroyed() {
        let lm = LifecycleManager::new();
        lm.transition(LifecycleState::Initializing, "".into()).unwrap();
        lm.transition(LifecycleState::Loading, "".into()).unwrap();
        lm.transition(LifecycleState::Ready, "".into()).unwrap();
        lm.transition(LifecycleState::Closing, "".into()).unwrap();
        assert!(lm.transition(LifecycleState::Running, "invalid".into()).is_err());
    }

    #[test]
    fn test_invalid_skip_transition() {
        let lm = LifecycleManager::new();
        assert!(lm.transition(LifecycleState::Running, "skip".into()).is_err());
    }

    #[test]
    fn test_restart_path() {
        let lm = LifecycleManager::new();
        lm.transition(LifecycleState::Initializing, "".into()).unwrap();
        lm.transition(LifecycleState::Loading, "".into()).unwrap();
        lm.transition(LifecycleState::Ready, "".into()).unwrap();
        lm.transition(LifecycleState::Running, "".into()).unwrap();
        lm.transition(LifecycleState::Restarting, "restart".into()).unwrap();
        lm.transition(LifecycleState::Initializing, "teardown ok".into()).unwrap();
        assert_eq!(lm.current_state(), LifecycleState::Initializing);
    }

    #[test]
    fn test_transition_history() {
        let lm = LifecycleManager::new();
        lm.transition(LifecycleState::Initializing, "boot".into()).unwrap();
        let t = lm.transitions();
        assert_eq!(t.len(), 1);
        assert_eq!(t[0].from, LifecycleState::Created);
        assert_eq!(t[0].to, LifecycleState::Initializing);
    }
}
