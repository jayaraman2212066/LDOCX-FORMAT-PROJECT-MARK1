// LDOC Runtime — Boot Manager
// 15-phase boot sequence with timeouts and error recovery

use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use parking_lot::RwLock;
use crate::error::{RuntimeError, RuntimeResult};
use crate::lifecycle::{LifecycleManager, LifecycleState};

/// Boot phase enumeration — spec Module 04 §4.3 (15 phases)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BootPhase {
    Preflight = 1,
    Header = 2,
    Container = 3,
    Manifest = 4,
    VersionCheck = 5,
    Integrity = 6,
    Signatures = 7,
    Metadata = 8,
    Configuration = 9,
    ResourcesInit = 10,
    PluginDiscovery = 11,
    StateInit = 12,
    RuntimeInit = 13,
    UiInit = 14,
    Ready = 15,
}

/// Boot phase result
#[derive(Debug, Clone)]
pub struct BootPhaseResult {
    pub phase: BootPhase,
    pub success: bool,
    pub duration_ms: u64,
    pub message: String,
}

/// Boot manager
pub struct BootManager {
    lifecycle: Arc<LifecycleManager>,
    phases_completed: Arc<RwLock<Vec<BootPhaseResult>>>,
    current_phase: Arc<RwLock<Option<BootPhase>>>,
    boot_started_at: Arc<RwLock<u64>>,
}

impl BootManager {
    /// Create new boot manager
    pub fn new(lifecycle: Arc<LifecycleManager>) -> Self {
        Self {
            lifecycle,
            phases_completed: Arc::new(RwLock::new(Vec::new())),
            current_phase: Arc::new(RwLock::new(None)),
            boot_started_at: Arc::new(RwLock::new(0)),
        }
    }

    /// Start boot sequence — transitions lifecycle to Initializing
    pub fn start_boot(&self) -> RuntimeResult<()> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        *self.boot_started_at.write() = now;
        self.lifecycle.transition(LifecycleState::Initializing, "Boot started".into())?;
        Ok(())
    }

    /// Execute boot phase
    pub fn execute_phase(&self, phase: BootPhase, timeout_ms: u64) -> RuntimeResult<()> {
        let phase_start = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        *self.current_phase.write() = Some(phase);

        // Simulate phase execution with timeout check
        let phase_duration = self.simulate_phase_execution(phase)?;
        
        if phase_duration > timeout_ms {
            return Err(RuntimeError::BootError(
                format!("Phase {:?} exceeded timeout: {} > {}", phase, phase_duration, timeout_ms)
            ));
        }

        let phase_end = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let result = BootPhaseResult {
            phase,
            success: true,
            duration_ms: phase_end - phase_start,
            message: format!("Phase {:?} completed successfully", phase),
        };

        self.phases_completed.write().push(result);
        *self.current_phase.write() = None;
        Ok(())
    }

    /// Execute full boot sequence
    pub fn execute_full_boot(&self) -> RuntimeResult<()> {
        self.start_boot()?;

        // Phases 1–9: Initializing state
        self.execute_phase(BootPhase::Preflight, 10)?;
        self.execute_phase(BootPhase::Header, 20)?;
        self.execute_phase(BootPhase::Container, 50)?;
        self.execute_phase(BootPhase::Manifest, 50)?;
        self.execute_phase(BootPhase::VersionCheck, 5)?;
        self.execute_phase(BootPhase::Integrity, 200)?;
        self.execute_phase(BootPhase::Signatures, 100)?;
        self.execute_phase(BootPhase::Metadata, 50)?;
        self.execute_phase(BootPhase::Configuration, 20)?;

        // Transition to Loading — spec §5.3
        self.lifecycle.transition(LifecycleState::Loading, "Phases 1-9 complete".into())?;

        // Phases 10–14: Loading state
        self.execute_phase(BootPhase::ResourcesInit, 300)?;
        self.execute_phase(BootPhase::PluginDiscovery, 200)?;
        self.execute_phase(BootPhase::StateInit, 20)?;
        self.execute_phase(BootPhase::RuntimeInit, 50)?;
        self.execute_phase(BootPhase::UiInit, 100)?;
        self.execute_phase(BootPhase::Ready, u64::MAX)?;

        // Transition to Ready — spec §5.3
        self.lifecycle.transition(LifecycleState::Ready, "Boot complete".into())?;
        Ok(())
    }

    /// Simulate phase execution (placeholder)
    fn simulate_phase_execution(&self, _phase: BootPhase) -> RuntimeResult<u64> {
        // Returns simulated duration in ms; 0 = instant (no real work yet)
        Ok(0)
    }

    /// Get boot progress
    pub fn boot_progress(&self) -> (u32, u32) {
        let completed = self.phases_completed.read().len() as u32;
        (completed, 15)
    }

    /// Get phase results
    pub fn phase_results(&self) -> Vec<BootPhaseResult> {
        self.phases_completed.read().clone()
    }

    /// Get total boot time (milliseconds)
    pub fn total_boot_time(&self) -> u64 {
        let results = self.phases_completed.read();
        results.iter().map(|r| r.duration_ms).sum()
    }

    /// Get current phase
    pub fn current_phase(&self) -> Option<BootPhase> {
        *self.current_phase.read()
    }

    /// Rollback boot (cleanup on error)
    pub fn rollback(&self) -> RuntimeResult<()> {
        self.phases_completed.write().clear();
        *self.current_phase.write() = None;
        self.lifecycle.transition(LifecycleState::Closing, "Boot rollback".into())?;
        Ok(())
    }

    /// Check if boot is complete
    pub fn is_boot_complete(&self) -> bool {
        self.phases_completed.read().len() == 15
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_boot_manager_creation() {
        let lifecycle = Arc::new(LifecycleManager::new());
        let boot = BootManager::new(lifecycle);
        assert_eq!(boot.boot_progress(), (0, 15));
    }

    #[test]
    fn test_boot_start() {
        let lifecycle = Arc::new(LifecycleManager::new());
        let boot = BootManager::new(lifecycle);
        assert!(boot.start_boot().is_ok());
        assert_eq!(boot.lifecycle.current_state(), LifecycleState::Initializing);
    }

    #[test]
    fn test_execute_phase() {
        let lifecycle = Arc::new(LifecycleManager::new());
        let boot = BootManager::new(lifecycle);
        boot.start_boot().unwrap();
        assert!(boot.execute_phase(BootPhase::Preflight, 100).is_ok());
        assert_eq!(boot.boot_progress().0, 1);
    }

    #[test]
    fn test_phase_timeout() {
        let lifecycle = Arc::new(LifecycleManager::new());
        let boot = BootManager::new(lifecycle);
        boot.start_boot().unwrap();
        // simulate_phase_execution returns 0; a timeout of u64::MAX always passes,
        // but we can still test the error path by using a helper that returns > 0.
        // For now just verify a generous timeout succeeds.
        assert!(boot.execute_phase(BootPhase::Preflight, 1000).is_ok());
    }

    #[test]
    fn test_full_boot_sequence() {
        let lifecycle = Arc::new(LifecycleManager::new());
        let boot = BootManager::new(lifecycle);
        assert!(boot.execute_full_boot().is_ok());
        assert!(boot.is_boot_complete());
        assert_eq!(boot.lifecycle.current_state(), LifecycleState::Ready);
    }

    #[test]
    fn test_phase_results() {
        let lifecycle = Arc::new(LifecycleManager::new());
        let boot = BootManager::new(lifecycle);
        boot.start_boot().unwrap();
        boot.execute_phase(BootPhase::Preflight, 100).unwrap();
        let results = boot.phase_results();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].phase, BootPhase::Preflight);
        assert!(results[0].success);
    }

    #[test]
    fn test_boot_rollback() {
        let lifecycle = Arc::new(LifecycleManager::new());
        let boot = BootManager::new(lifecycle);
        boot.start_boot().unwrap();
        boot.execute_phase(BootPhase::Preflight, 100).unwrap();
        assert!(boot.rollback().is_ok());
        assert_eq!(boot.phase_results().len(), 0);
        assert_eq!(boot.lifecycle.current_state(), LifecycleState::Closing);
    }

    #[test]
    fn test_total_boot_time() {
        let lifecycle = Arc::new(LifecycleManager::new());
        let boot = BootManager::new(lifecycle);
        boot.start_boot().unwrap();
        boot.execute_phase(BootPhase::Preflight, 100).unwrap();
        // duration_ms is wall-clock and may be 0 on fast machines; just verify it doesn't panic
        let _ = boot.total_boot_time();
    }
}
