// LDOC Runtime — Performance Monitor
// Metrics collection, boot timing, memory tracking, and cache statistics

use std::sync::Arc;
use parking_lot::RwLock;
use crate::error::RuntimeResult;

/// Performance metric
#[derive(Debug, Clone)]
pub struct PerformanceMetric {
    pub name: String,
    pub value: f64,
    pub unit: String,
    pub timestamp: u64,
}

/// Boot timing
#[derive(Debug, Clone)]
pub struct BootTiming {
    pub phase: String,
    pub duration_ms: u64,
    pub start_time: u64,
    pub end_time: u64,
}

/// Memory snapshot
#[derive(Debug, Clone)]
pub struct MemorySnapshot {
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub peak_bytes: u64,
    pub timestamp: u64,
}

/// Performance monitor
pub struct PerformanceMonitor {
    metrics: Arc<RwLock<Vec<PerformanceMetric>>>,
    boot_timings: Arc<RwLock<Vec<BootTiming>>>,
    memory_snapshots: Arc<RwLock<Vec<MemorySnapshot>>>,
    max_history: usize,
}

impl PerformanceMonitor {
    /// Create new performance monitor
    pub fn new(max_history: usize) -> Self {
        Self {
            metrics: Arc::new(RwLock::new(Vec::new())),
            boot_timings: Arc::new(RwLock::new(Vec::new())),
            memory_snapshots: Arc::new(RwLock::new(Vec::new())),
            max_history,
        }
    }

    /// Record metric
    pub fn record_metric(&self, name: String, value: f64, unit: String) -> RuntimeResult<()> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let metric = PerformanceMetric {
            name,
            value,
            unit,
            timestamp: now,
        };

        let mut metrics = self.metrics.write();
        metrics.push(metric);
        if metrics.len() > self.max_history {
            metrics.remove(0);
        }

        Ok(())
    }

    /// Record boot phase
    pub fn record_boot_phase(&self, phase: String, duration_ms: u64) -> RuntimeResult<()> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let timing = BootTiming {
            phase,
            duration_ms,
            start_time: now,
            end_time: now + (duration_ms as u64 / 1000),
        };

        let mut timings = self.boot_timings.write();
        timings.push(timing);
        if timings.len() > self.max_history {
            timings.remove(0);
        }

        Ok(())
    }

    /// Record memory snapshot
    pub fn record_memory(&self, used_bytes: u64, available_bytes: u64) -> RuntimeResult<()> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let peak = self.memory_snapshots.read()
            .iter()
            .map(|s| s.peak_bytes)
            .max()
            .unwrap_or(used_bytes);

        let peak_bytes = peak.max(used_bytes);

        let snapshot = MemorySnapshot {
            used_bytes,
            available_bytes,
            peak_bytes,
            timestamp: now,
        };

        let mut snapshots = self.memory_snapshots.write();
        snapshots.push(snapshot);
        if snapshots.len() > self.max_history {
            snapshots.remove(0);
        }

        Ok(())
    }

    /// Get metrics
    pub fn get_metrics(&self) -> Vec<PerformanceMetric> {
        self.metrics.read().clone()
    }

    /// Get metrics by name
    pub fn get_metrics_by_name(&self, name: &str) -> Vec<PerformanceMetric> {
        self.metrics.read()
            .iter()
            .filter(|m| m.name == name)
            .cloned()
            .collect()
    }

    /// Get boot timings
    pub fn get_boot_timings(&self) -> Vec<BootTiming> {
        self.boot_timings.read().clone()
    }

    /// Get total boot time
    pub fn total_boot_time(&self) -> u64 {
        self.boot_timings.read()
            .iter()
            .map(|t| t.duration_ms)
            .sum()
    }

    /// Get memory snapshots
    pub fn get_memory_snapshots(&self) -> Vec<MemorySnapshot> {
        self.memory_snapshots.read().clone()
    }

    /// Get latest memory snapshot
    pub fn latest_memory(&self) -> Option<MemorySnapshot> {
        self.memory_snapshots.read().last().cloned()
    }

    /// Get peak memory usage
    pub fn peak_memory(&self) -> u64 {
        self.memory_snapshots.read()
            .iter()
            .map(|s| s.peak_bytes)
            .max()
            .unwrap_or(0)
    }

    /// Get average metric value
    pub fn average_metric(&self, name: &str) -> Option<f64> {
        let metrics = self.get_metrics_by_name(name);
        if metrics.is_empty() {
            return None;
        }

        let sum: f64 = metrics.iter().map(|m| m.value).sum();
        Some(sum / metrics.len() as f64)
    }

    /// Get metric count
    pub fn metric_count(&self) -> usize {
        self.metrics.read().len()
    }

    /// Get boot phase count
    pub fn boot_phase_count(&self) -> usize {
        self.boot_timings.read().len()
    }

    /// Get memory snapshot count
    pub fn memory_snapshot_count(&self) -> usize {
        self.memory_snapshots.read().len()
    }

    /// Clear all metrics
    pub fn clear(&self) -> RuntimeResult<()> {
        self.metrics.write().clear();
        self.boot_timings.write().clear();
        self.memory_snapshots.write().clear();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_performance_monitor_creation() {
        let monitor = PerformanceMonitor::new(100);
        assert_eq!(monitor.metric_count(), 0);
    }

    #[test]
    fn test_record_metric() {
        let monitor = PerformanceMonitor::new(100);
        assert!(monitor.record_metric("cpu".to_string(), 45.5, "%".to_string()).is_ok());
        assert_eq!(monitor.metric_count(), 1);
    }

    #[test]
    fn test_get_metrics() {
        let monitor = PerformanceMonitor::new(100);
        monitor.record_metric("cpu".to_string(), 45.5, "%".to_string()).unwrap();
        monitor.record_metric("memory".to_string(), 60.0, "%".to_string()).unwrap();
        
        let metrics = monitor.get_metrics();
        assert_eq!(metrics.len(), 2);
    }

    #[test]
    fn test_get_metrics_by_name() {
        let monitor = PerformanceMonitor::new(100);
        monitor.record_metric("cpu".to_string(), 45.5, "%".to_string()).unwrap();
        monitor.record_metric("cpu".to_string(), 50.0, "%".to_string()).unwrap();
        monitor.record_metric("memory".to_string(), 60.0, "%".to_string()).unwrap();
        
        let cpu_metrics = monitor.get_metrics_by_name("cpu");
        assert_eq!(cpu_metrics.len(), 2);
    }

    #[test]
    fn test_record_boot_phase() {
        let monitor = PerformanceMonitor::new(100);
        assert!(monitor.record_boot_phase("validation".to_string(), 100).is_ok());
        assert_eq!(monitor.boot_phase_count(), 1);
    }

    #[test]
    fn test_total_boot_time() {
        let monitor = PerformanceMonitor::new(100);
        monitor.record_boot_phase("validation".to_string(), 100).unwrap();
        monitor.record_boot_phase("initialization".to_string(), 150).unwrap();
        
        let total = monitor.total_boot_time();
        assert_eq!(total, 250);
    }

    #[test]
    fn test_record_memory() {
        let monitor = PerformanceMonitor::new(100);
        assert!(monitor.record_memory(1024, 2048).is_ok());
        assert_eq!(monitor.memory_snapshot_count(), 1);
    }

    #[test]
    fn test_latest_memory() {
        let monitor = PerformanceMonitor::new(100);
        monitor.record_memory(1024, 2048).unwrap();
        monitor.record_memory(1536, 2048).unwrap();
        
        let latest = monitor.latest_memory().unwrap();
        assert_eq!(latest.used_bytes, 1536);
    }

    #[test]
    fn test_peak_memory() {
        let monitor = PerformanceMonitor::new(100);
        monitor.record_memory(1024, 2048).unwrap();
        monitor.record_memory(2048, 2048).unwrap();
        monitor.record_memory(1536, 2048).unwrap();
        
        let peak = monitor.peak_memory();
        assert_eq!(peak, 2048);
    }

    #[test]
    fn test_average_metric() {
        let monitor = PerformanceMonitor::new(100);
        monitor.record_metric("cpu".to_string(), 40.0, "%".to_string()).unwrap();
        monitor.record_metric("cpu".to_string(), 50.0, "%".to_string()).unwrap();
        monitor.record_metric("cpu".to_string(), 60.0, "%".to_string()).unwrap();
        
        let avg = monitor.average_metric("cpu").unwrap();
        assert_eq!(avg, 50.0);
    }

    #[test]
    fn test_clear() {
        let monitor = PerformanceMonitor::new(100);
        monitor.record_metric("cpu".to_string(), 45.5, "%".to_string()).unwrap();
        monitor.record_boot_phase("validation".to_string(), 100).unwrap();
        monitor.record_memory(1024, 2048).unwrap();
        
        assert!(monitor.clear().is_ok());
        assert_eq!(monitor.metric_count(), 0);
        assert_eq!(monitor.boot_phase_count(), 0);
        assert_eq!(monitor.memory_snapshot_count(), 0);
    }
}
