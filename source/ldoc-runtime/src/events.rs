// LDOC Runtime — Event System
// Specification: Module 09 (Runtime Events)
//
// Typed event catalog with correct priority ordering per spec §9.4.

use std::fmt;

/// Event priority — spec Module 09 §9.4
/// Critical=0 is highest priority (delivered first).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum EventPriority {
    Deferred = 4,
    Low = 3,
    Normal = 2,
    High = 1,
    Critical = 0,
}

/// Complete event type catalog — spec Module 09 §9.5
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum EventType {
    // ── Runtime Lifecycle Events §9.5.1 ──────────────────────────────────────
    RuntimeCreated,
    RuntimeInitializing,
    RuntimeLoading,
    RuntimeReady,
    RuntimeRunning,
    RuntimeIdle,
    RuntimePaused,
    RuntimeBackground,
    RuntimeRestoring,
    RuntimeSleeping,
    RuntimeResuming,
    RuntimeUpdating,
    RuntimeRestarting,
    RuntimeClosing,
    RuntimeDestroyed,

    // ── Boot Progress Events §9.5.2 ───────────────────────────────────────────
    BootStarted,
    HeaderVerified,
    ContainerOpened,
    ManifestLoaded,
    VersionVerified,
    IntegrityVerified,
    SignatureVerified,
    MetadataLoaded,
    ConfigurationResolved,
    ResourcesLoading,
    ResourcesReady,
    PluginsDiscovered,
    PluginsReady,
    BootCompleted,
    BootFailed,

    // ── Resource Events §9.5.3 ────────────────────────────────────────────────
    PageLoadStarted,
    PageLoaded,
    PageLoadFailed,
    PageReleased,
    AssetLoadStarted,
    AssetLoaded,
    AssetLoadFailed,
    AssetReleased,
    CachePressure,
    CacheEvicted,

    // ── Security Events §9.5.4 ────────────────────────────────────────────────
    IntegrityViolation,
    SignatureValid,
    SignatureInvalid,
    PermissionGranted,
    PermissionDenied,
    PermissionRequested,
    SecurityViolation,
    SandboxViolation,

    // ── Plugin Events §9.5.5 ──────────────────────────────────────────────────
    PluginLoading,
    PluginReady,
    PluginFailed,
    PluginCrashed,
    PluginRestarted,
    PluginTerminated,
    PluginMessage,

    // ── Configuration Events §9.5.6 ───────────────────────────────────────────
    ConfigChanged,
    ConfigRollback,
    ProfileApplied,
    ThemeChanged,
    LanguageChanged,

    // ── State Events §9.5.7 ───────────────────────────────────────────────────
    StateChanged,
    StatePersisted,
    StateRestored,
    ScrollPositionChanged,
    FormStateChanged,

    // ── Performance Events §9.5.8 ─────────────────────────────────────────────
    BootTimeSlow,
    MemoryPressure,
    MemoryCritical,
    CpuThrottled,
    AssetLoadSlow,
    PluginCpuLimit,

    // ── Document Interaction Events ────────────────────────────────────────────
    DocumentLoaded,
    DocumentReady,
    DocumentUnloaded,
    PageEnter,
    PageExit,
    ElementClick,
    FormInput,
    FormChange,
    FormSubmit,
    NavigateNext,
    NavigatePrev,
    NavigateToPage,

    // ── General ───────────────────────────────────────────────────────────────
    SystemInfo,
    SystemWarning,
    SystemError,
}

impl fmt::Display for EventType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

/// Runtime event — spec Module 09 §9.6
#[derive(Debug, Clone)]
pub struct Event {
    pub event_type: EventType,
    pub priority: EventPriority,
    pub timestamp: u64,
    pub source: String,
    pub message: String,
    pub payload: Option<String>,
    pub cancellable: bool,
    pub cancelled: bool,
}

impl Event {
    pub fn new(
        event_type: EventType,
        priority: EventPriority,
        source: String,
        message: String,
    ) -> Self {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        Self {
            event_type,
            priority,
            timestamp,
            source,
            message,
            payload: None,
            cancellable: false,
            cancelled: false,
        }
    }

    pub fn with_payload(mut self, payload: String) -> Self {
        self.payload = Some(payload);
        self
    }

    pub fn cancellable(mut self) -> Self {
        self.cancellable = true;
        self
    }

    /// Cancel this event — only effective if cancellable — spec §9.7
    pub fn cancel(&mut self) {
        if self.cancellable {
            self.cancelled = true;
        }
    }

    pub fn summary(&self) -> String {
        format!(
            "[{:?}] {:?} from {} — {}",
            self.priority, self.event_type, self.source, self.message
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_priority_ordering() {
        // Critical (0) < High (1) < Normal (2) < Low (3) < Deferred (4)
        // Lower numeric value = higher priority
        assert!(EventPriority::Critical < EventPriority::High);
        assert!(EventPriority::High < EventPriority::Normal);
        assert!(EventPriority::Normal < EventPriority::Low);
        assert!(EventPriority::Low < EventPriority::Deferred);
    }

    #[test]
    fn test_event_creation() {
        let e = Event::new(
            EventType::RuntimeReady,
            EventPriority::Critical,
            "boot".into(),
            "Boot complete".into(),
        );
        assert_eq!(e.event_type, EventType::RuntimeReady);
        assert_eq!(e.priority, EventPriority::Critical);
        assert!(!e.cancelled);
    }

    #[test]
    fn test_event_cancellation() {
        let mut e = Event::new(
            EventType::PermissionRequested,
            EventPriority::High,
            "security".into(),
            "Permission prompt".into(),
        )
        .cancellable();
        assert!(e.cancellable);
        e.cancel();
        assert!(e.cancelled);
    }

    #[test]
    fn test_non_cancellable_event() {
        let mut e = Event::new(
            EventType::SecurityViolation,
            EventPriority::Critical,
            "security".into(),
            "Violation".into(),
        );
        e.cancel(); // should have no effect
        assert!(!e.cancelled);
    }

    #[test]
    fn test_lifecycle_events_exist() {
        let _ = EventType::RuntimeCreated;
        let _ = EventType::RuntimeReady;
        let _ = EventType::RuntimeRunning;
        let _ = EventType::RuntimeIdle;
        let _ = EventType::RuntimePaused;
        let _ = EventType::RuntimeBackground;
        let _ = EventType::RuntimeRestoring;
        let _ = EventType::RuntimeSleeping;
        let _ = EventType::RuntimeResuming;
        let _ = EventType::RuntimeUpdating;
        let _ = EventType::RuntimeRestarting;
        let _ = EventType::RuntimeClosing;
        let _ = EventType::RuntimeDestroyed;
    }

    #[test]
    fn test_boot_events_exist() {
        let _ = EventType::BootStarted;
        let _ = EventType::HeaderVerified;
        let _ = EventType::ContainerOpened;
        let _ = EventType::ManifestLoaded;
        let _ = EventType::IntegrityVerified;
        let _ = EventType::ResourcesReady;
        let _ = EventType::PluginsReady;
        let _ = EventType::BootFailed;
    }

    #[test]
    fn test_security_events_exist() {
        let _ = EventType::IntegrityViolation;
        let _ = EventType::SecurityViolation;
        let _ = EventType::SandboxViolation;
        let _ = EventType::PermissionGranted;
        let _ = EventType::PermissionDenied;
    }

    #[test]
    fn test_performance_events_exist() {
        let _ = EventType::BootTimeSlow;
        let _ = EventType::MemoryPressure;
        let _ = EventType::MemoryCritical;
        let _ = EventType::PluginCpuLimit;
    }
}
