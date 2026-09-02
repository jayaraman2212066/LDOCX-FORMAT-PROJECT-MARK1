// LDOC Runtime — Developer Inspector
// Context inspection, hot reload, profiling, and event logging

use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use crate::error::RuntimeResult;

/// Inspection mode
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InspectionMode {
    Disabled,
    Basic,
    Detailed,
    Full,
}

/// Profile data
#[derive(Debug, Clone)]
pub struct ProfileData {
    pub function: String,
    pub call_count: u64,
    pub total_time_ms: f64,
    pub average_time_ms: f64,
}

/// Inspection snapshot
#[derive(Debug, Clone)]
pub struct InspectionSnapshot {
    pub timestamp: u64,
    pub mode: InspectionMode,
    pub context_data: HashMap<String, String>,
    pub profile_data: Vec<ProfileData>,
}

/// Developer inspector
pub struct DeveloperInspector {
    mode: Arc<RwLock<InspectionMode>>,
    snapshots: Arc<RwLock<Vec<InspectionSnapshot>>>,
    profiles: Arc<RwLock<HashMap<String, ProfileData>>>,
    max_snapshots: usize,
    hot_reload_enabled: Arc<RwLock<bool>>,
}

impl DeveloperInspector {
    /// Create new developer inspector
    pub fn new(max_snapshots: usize) -> Self {
        Self {
            mode: Arc::new(RwLock::new(InspectionMode::Disabled)),
            snapshots: Arc::new(RwLock::new(Vec::new())),
            profiles: Arc::new(RwLock::new(HashMap::new())),
            max_snapshots,
            hot_reload_enabled: Arc::new(RwLock::new(false)),
        }
    }

    /// Set inspection mode
    pub fn set_mode(&self, mode: InspectionMode) -> RuntimeResult<()> {
        *self.mode.write() = mode;
        Ok(())
    }

    /// Get inspection mode
    pub fn get_mode(&self) -> InspectionMode {
        *self.mode.read()
    }

    /// Enable hot reload
    pub fn enable_hot_reload(&self) -> RuntimeResult<()> {
        *self.hot_reload_enabled.write() = true;
        Ok(())
    }

    /// Disable hot reload
    pub fn disable_hot_reload(&self) -> RuntimeResult<()> {
        *self.hot_reload_enabled.write() = false;
        Ok(())
    }

    /// Check if hot reload enabled
    pub fn is_hot_reload_enabled(&self) -> bool {
        *self.hot_reload_enabled.read()
    }

    /// Record profile data
    pub fn record_profile(&self, function: String, time_ms: f64) -> RuntimeResult<()> {
        let mut profiles = self.profiles.write();
        
        if let Some(profile) = profiles.get_mut(&function) {
            profile.call_count += 1;
            profile.total_time_ms += time_ms;
            profile.average_time_ms = profile.total_time_ms / profile.call_count as f64;
        } else {
            profiles.insert(function.clone(), ProfileData {
                function,
                call_count: 1,
                total_time_ms: time_ms,
                average_time_ms: time_ms,
            });
        }

        Ok(())
    }

    /// Get profile data
    pub fn get_profile(&self, function: &str) -> RuntimeResult<Option<ProfileData>> {
        Ok(self.profiles.read().get(function).cloned())
    }

    /// Get all profiles
    pub fn get_all_profiles(&self) -> Vec<ProfileData> {
        self.profiles.read().values().cloned().collect()
    }

    /// Get slowest functions
    pub fn get_slowest_functions(&self, count: usize) -> Vec<ProfileData> {
        let mut profiles = self.get_all_profiles();
        profiles.sort_by(|a, b| b.average_time_ms.partial_cmp(&a.average_time_ms).unwrap());
        profiles.into_iter().take(count).collect()
    }

    /// Create inspection snapshot
    pub fn create_snapshot(&self, context_data: HashMap<String, String>) -> RuntimeResult<()> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let snapshot = InspectionSnapshot {
            timestamp: now,
            mode: *self.mode.read(),
            context_data,
            profile_data: self.get_all_profiles(),
        };

        let mut snapshots = self.snapshots.write();
        snapshots.push(snapshot);

        if snapshots.len() > self.max_snapshots {
            snapshots.remove(0);
        }

        Ok(())
    }

    /// Get snapshots
    pub fn get_snapshots(&self) -> Vec<InspectionSnapshot> {
        self.snapshots.read().clone()
    }

    /// Get latest snapshot
    pub fn get_latest_snapshot(&self) -> Option<InspectionSnapshot> {
        self.snapshots.read().last().cloned()
    }

    /// Get snapshot count
    pub fn snapshot_count(&self) -> usize {
        self.snapshots.read().len()
    }

    /// Clear profiles
    pub fn clear_profiles(&self) -> RuntimeResult<()> {
        self.profiles.write().clear();
        Ok(())
    }

    /// Clear snapshots
    pub fn clear_snapshots(&self) -> RuntimeResult<()> {
        self.snapshots.write().clear();
        Ok(())
    }

    /// Get profile count
    pub fn profile_count(&self) -> usize {
        self.profiles.read().len()
    }

    /// Export profile data
    pub fn export_profiles(&self) -> String {
        let profiles = self.get_all_profiles();
        let mut output = String::from("Function,Calls,Total(ms),Average(ms)\n");
        
        for profile in profiles {
            output.push_str(&format!(
                "{},{},{:.2},{:.2}\n",
                profile.function,
                profile.call_count,
                profile.total_time_ms,
                profile.average_time_ms
            ));
        }

        output
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_inspector_creation() {
        let inspector = DeveloperInspector::new(100);
        assert_eq!(inspector.get_mode(), InspectionMode::Disabled);
    }

    #[test]
    fn test_set_mode() {
        let inspector = DeveloperInspector::new(100);
        assert!(inspector.set_mode(InspectionMode::Detailed).is_ok());
        assert_eq!(inspector.get_mode(), InspectionMode::Detailed);
    }

    #[test]
    fn test_hot_reload() {
        let inspector = DeveloperInspector::new(100);
        assert!(!inspector.is_hot_reload_enabled());
        assert!(inspector.enable_hot_reload().is_ok());
        assert!(inspector.is_hot_reload_enabled());
        assert!(inspector.disable_hot_reload().is_ok());
        assert!(!inspector.is_hot_reload_enabled());
    }

    #[test]
    fn test_record_profile() {
        let inspector = DeveloperInspector::new(100);
        assert!(inspector.record_profile("boot".to_string(), 100.0).is_ok());
        assert_eq!(inspector.profile_count(), 1);
    }

    #[test]
    fn test_get_profile() {
        let inspector = DeveloperInspector::new(100);
        inspector.record_profile("boot".to_string(), 100.0).unwrap();
        let profile = inspector.get_profile("boot").unwrap();
        assert_eq!(profile.unwrap().call_count, 1);
    }

    #[test]
    fn test_profile_aggregation() {
        let inspector = DeveloperInspector::new(100);
        inspector.record_profile("boot".to_string(), 100.0).unwrap();
        inspector.record_profile("boot".to_string(), 150.0).unwrap();
        
        let profile = inspector.get_profile("boot").unwrap().unwrap();
        assert_eq!(profile.call_count, 2);
        assert_eq!(profile.total_time_ms, 250.0);
        assert_eq!(profile.average_time_ms, 125.0);
    }

    #[test]
    fn test_get_slowest_functions() {
        let inspector = DeveloperInspector::new(100);
        inspector.record_profile("fast".to_string(), 10.0).unwrap();
        inspector.record_profile("slow".to_string(), 100.0).unwrap();
        inspector.record_profile("medium".to_string(), 50.0).unwrap();
        
        let slowest = inspector.get_slowest_functions(2);
        assert_eq!(slowest.len(), 2);
        assert_eq!(slowest[0].function, "slow");
    }

    #[test]
    fn test_create_snapshot() {
        let inspector = DeveloperInspector::new(100);
        let mut context = HashMap::new();
        context.insert("phase".to_string(), "boot".to_string());
        
        assert!(inspector.create_snapshot(context).is_ok());
        assert_eq!(inspector.snapshot_count(), 1);
    }

    #[test]
    fn test_get_latest_snapshot() {
        let inspector = DeveloperInspector::new(100);
        let mut context = HashMap::new();
        context.insert("phase".to_string(), "boot".to_string());
        
        inspector.create_snapshot(context).unwrap();
        let snapshot = inspector.get_latest_snapshot();
        assert!(snapshot.is_some());
    }

    #[test]
    fn test_clear_profiles() {
        let inspector = DeveloperInspector::new(100);
        inspector.record_profile("boot".to_string(), 100.0).unwrap();
        assert!(inspector.clear_profiles().is_ok());
        assert_eq!(inspector.profile_count(), 0);
    }

    #[test]
    fn test_clear_snapshots() {
        let inspector = DeveloperInspector::new(100);
        let mut context = HashMap::new();
        context.insert("phase".to_string(), "boot".to_string());
        
        inspector.create_snapshot(context).unwrap();
        assert!(inspector.clear_snapshots().is_ok());
        assert_eq!(inspector.snapshot_count(), 0);
    }

    #[test]
    fn test_export_profiles() {
        let inspector = DeveloperInspector::new(100);
        inspector.record_profile("boot".to_string(), 100.0).unwrap();
        
        let export = inspector.export_profiles();
        assert!(export.contains("boot"));
        assert!(export.contains("1"));
    }
}
