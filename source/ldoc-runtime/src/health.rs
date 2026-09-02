// LDOC Runtime — Health Monitor
// Heartbeat tracking, component status, health reporting, and degradation detection

use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use crate::error::{RuntimeError, RuntimeResult};

/// Health status
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
    Unknown,
}

impl std::fmt::Display for HealthStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

/// Component health
#[derive(Debug, Clone)]
pub struct ComponentHealth {
    pub name: String,
    pub status: HealthStatus,
    pub last_heartbeat: u64,
    pub error_count: u32,
    pub warning_count: u32,
    pub uptime_seconds: u64,
}

/// Health metrics
#[derive(Debug, Clone)]
pub struct HealthMetrics {
    pub total_components: u32,
    pub healthy_components: u32,
    pub degraded_components: u32,
    pub unhealthy_components: u32,
    pub overall_status: HealthStatus,
    pub timestamp: u64,
}

/// Health monitor
pub struct HealthMonitor {
    components: Arc<RwLock<HashMap<String, ComponentHealth>>>,
    heartbeat_timeout: u64,
    degradation_threshold: u32,
}

impl HealthMonitor {
    /// Create new health monitor
    pub fn new(heartbeat_timeout: u64, degradation_threshold: u32) -> Self {
        Self {
            components: Arc::new(RwLock::new(HashMap::new())),
            heartbeat_timeout,
            degradation_threshold,
        }
    }

    /// Register component
    pub fn register_component(&self, name: String) -> RuntimeResult<()> {
        let _now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let mut components = self.components.write();
        if components.contains_key(&name) {
            return Err(RuntimeError::Other(
                format!("Component already registered: {}", name)
            ));
        }

        let health = ComponentHealth {
            name: name.clone(),
            status: HealthStatus::Healthy,
            last_heartbeat: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            error_count: 0,
            warning_count: 0,
            uptime_seconds: 0,
        };
        components.insert(name, health);
        Ok(())
    }

    /// Unregister component
    pub fn unregister_component(&self, name: &str) -> RuntimeResult<()> {
        let mut components = self.components.write();
        components.remove(name)
            .ok_or_else(|| RuntimeError::Other(format!("Component not found: {}", name)))?;
        Ok(())
    }

    /// Record heartbeat
    pub fn heartbeat(&self, name: &str) -> RuntimeResult<()> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let mut components = self.components.write();
        if let Some(component) = components.get_mut(name) {
            component.last_heartbeat = now;
            if component.status == HealthStatus::Unhealthy {
                component.status = HealthStatus::Healthy;
            }
            Ok(())
        } else {
            Err(RuntimeError::Other(format!("Component not found: {}", name)))
        }
    }

    /// Record error
    pub fn record_error(&self, name: &str) -> RuntimeResult<()> {
        let mut components = self.components.write();
        if let Some(component) = components.get_mut(name) {
            component.error_count = component.error_count.saturating_add(1);
            if component.error_count > self.degradation_threshold {
                component.status = HealthStatus::Unhealthy;
            } else if component.error_count > self.degradation_threshold / 2 {
                component.status = HealthStatus::Degraded;
            }
            Ok(())
        } else {
            Err(RuntimeError::Other(format!("Component not found: {}", name)))
        }
    }

    /// Record warning
    pub fn record_warning(&self, name: &str) -> RuntimeResult<()> {
        let mut components = self.components.write();
        if let Some(component) = components.get_mut(name) {
            component.warning_count = component.warning_count.saturating_add(1);
            Ok(())
        } else {
            Err(RuntimeError::Other(format!("Component not found: {}", name)))
        }
    }

    /// Get component health
    pub fn get_component_health(&self, name: &str) -> RuntimeResult<ComponentHealth> {
        self.components.read()
            .get(name)
            .cloned()
            .ok_or_else(|| RuntimeError::Other(format!("Component not found: {}", name)))
    }

    /// Check component timeout
    pub fn check_timeouts(&self) -> RuntimeResult<()> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let mut components = self.components.write();
        for component in components.values_mut() {
            let time_since_heartbeat = now.saturating_sub(component.last_heartbeat);
            if time_since_heartbeat > self.heartbeat_timeout {
                component.status = HealthStatus::Unhealthy;
            }
        }

        Ok(())
    }

    /// Get health metrics
    pub fn get_metrics(&self) -> HealthMetrics {
        let components = self.components.read();
        let total = components.len() as u32;
        let healthy = components.values().filter(|c| c.status == HealthStatus::Healthy).count() as u32;
        let degraded = components.values().filter(|c| c.status == HealthStatus::Degraded).count() as u32;
        let unhealthy = components.values().filter(|c| c.status == HealthStatus::Unhealthy).count() as u32;

        let overall_status = if unhealthy > 0 {
            HealthStatus::Unhealthy
        } else if degraded > 0 {
            HealthStatus::Degraded
        } else if healthy == total {
            HealthStatus::Healthy
        } else {
            HealthStatus::Unknown
        };

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        HealthMetrics {
            total_components: total,
            healthy_components: healthy,
            degraded_components: degraded,
            unhealthy_components: unhealthy,
            overall_status,
            timestamp: now,
        }
    }

    /// Get all component health
    pub fn get_all_components(&self) -> Vec<ComponentHealth> {
        self.components.read().values().cloned().collect()
    }

    /// Get component count
    pub fn component_count(&self) -> usize {
        self.components.read().len()
    }

    /// Reset component errors
    pub fn reset_component(&self, name: &str) -> RuntimeResult<()> {
        let mut components = self.components.write();
        if let Some(component) = components.get_mut(name) {
            component.error_count = 0;
            component.warning_count = 0;
            component.status = HealthStatus::Healthy;
            Ok(())
        } else {
            Err(RuntimeError::Other(format!("Component not found: {}", name)))
        }
    }

    /// Clear all components
    pub fn clear(&self) -> RuntimeResult<()> {
        self.components.write().clear();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_monitor_creation() {
        let monitor = HealthMonitor::new(60, 5);
        assert_eq!(monitor.component_count(), 0);
    }

    #[test]
    fn test_register_component() {
        let monitor = HealthMonitor::new(60, 5);
        assert!(monitor.register_component("boot".to_string()).is_ok());
        assert_eq!(monitor.component_count(), 1);
    }

    #[test]
    fn test_unregister_component() {
        let monitor = HealthMonitor::new(60, 5);
        monitor.register_component("boot".to_string()).unwrap();
        assert!(monitor.unregister_component("boot").is_ok());
        assert_eq!(monitor.component_count(), 0);
    }

    #[test]
    fn test_heartbeat() {
        let monitor = HealthMonitor::new(60, 5);
        monitor.register_component("boot".to_string()).unwrap();
        assert!(monitor.heartbeat("boot").is_ok());
        let health = monitor.get_component_health("boot").unwrap();
        assert_eq!(health.status, HealthStatus::Healthy);
    }

    #[test]
    fn test_record_error() {
        let monitor = HealthMonitor::new(60, 5);
        monitor.register_component("boot".to_string()).unwrap();
        
        for _ in 0..3 {
            monitor.record_error("boot").unwrap();
        }
        
        let health = monitor.get_component_health("boot").unwrap();
        assert_eq!(health.error_count, 3);
        assert_eq!(health.status, HealthStatus::Degraded);
    }

    #[test]
    fn test_record_warning() {
        let monitor = HealthMonitor::new(60, 5);
        monitor.register_component("boot".to_string()).unwrap();
        assert!(monitor.record_warning("boot").is_ok());
        let health = monitor.get_component_health("boot").unwrap();
        assert_eq!(health.warning_count, 1);
    }

    #[test]
    fn test_error_threshold() {
        let monitor = HealthMonitor::new(60, 5);
        monitor.register_component("boot".to_string()).unwrap();
        
        for _ in 0..6 {
            monitor.record_error("boot").unwrap();
        }
        
        let health = monitor.get_component_health("boot").unwrap();
        assert_eq!(health.status, HealthStatus::Unhealthy);
    }

    #[test]
    fn test_get_metrics() {
        let monitor = HealthMonitor::new(60, 5);
        monitor.register_component("boot".to_string()).unwrap();
        monitor.register_component("vfs".to_string()).unwrap();
        
        let metrics = monitor.get_metrics();
        assert_eq!(metrics.total_components, 2);
        assert_eq!(metrics.healthy_components, 2);
        assert_eq!(metrics.overall_status, HealthStatus::Healthy);
    }

    #[test]
    fn test_reset_component() {
        let monitor = HealthMonitor::new(60, 5);
        monitor.register_component("boot".to_string()).unwrap();
        
        for _ in 0..6 {
            monitor.record_error("boot").unwrap();
        }
        
        assert!(monitor.reset_component("boot").is_ok());
        let health = monitor.get_component_health("boot").unwrap();
        assert_eq!(health.error_count, 0);
        assert_eq!(health.status, HealthStatus::Healthy);
    }

    #[test]
    fn test_get_all_components() {
        let monitor = HealthMonitor::new(60, 5);
        monitor.register_component("boot".to_string()).unwrap();
        monitor.register_component("vfs".to_string()).unwrap();
        
        let components = monitor.get_all_components();
        assert_eq!(components.len(), 2);
    }

    #[test]
    fn test_clear() {
        let monitor = HealthMonitor::new(60, 5);
        monitor.register_component("boot".to_string()).unwrap();
        assert!(monitor.clear().is_ok());
        assert_eq!(monitor.component_count(), 0);
    }
}
