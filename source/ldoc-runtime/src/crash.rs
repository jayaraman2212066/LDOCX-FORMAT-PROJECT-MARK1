// LDOC Runtime — Crash Reporter
// Crash detection, report generation, privacy filtering, and storage

use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use crate::error::{RuntimeError, RuntimeResult};

/// Crash severity
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CrashSeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl std::fmt::Display for CrashSeverity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

/// Crash report
#[derive(Debug, Clone)]
pub struct CrashReport {
    pub id: String,
    pub timestamp: u64,
    pub severity: CrashSeverity,
    pub component: String,
    pub error_message: String,
    pub stack_trace: Option<String>,
    pub context: HashMap<String, String>,
    pub filtered: bool,
}

impl CrashReport {
    /// Create new crash report
    pub fn new(
        id: String,
        severity: CrashSeverity,
        component: String,
        error_message: String,
    ) -> Self {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Self {
            id,
            timestamp,
            severity,
            component,
            error_message,
            stack_trace: None,
            context: HashMap::new(),
            filtered: false,
        }
    }

    /// Add stack trace
    pub fn with_stack_trace(mut self, trace: String) -> Self {
        self.stack_trace = Some(trace);
        self
    }

    /// Add context
    pub fn with_context(mut self, key: String, value: String) -> Self {
        self.context.insert(key, value);
        self
    }

    /// Filter sensitive data
    pub fn filter_sensitive(&mut self) {
        let sensitive_keys = vec!["password", "token", "secret", "key", "credential"];
        
        for key in sensitive_keys {
            if let Some(value) = self.context.get_mut(key) {
                *value = "***FILTERED***".to_string();
            }
        }

        if let Some(ref mut trace) = self.stack_trace {
            if trace.contains("password") || trace.contains("token") {
                *trace = "***FILTERED***".to_string();
            }
        }

        self.filtered = true;
    }
}

/// Crash reporter
pub struct CrashReporter {
    reports: Arc<RwLock<Vec<CrashReport>>>,
    max_reports: usize,
    auto_filter: bool,
}

impl CrashReporter {
    /// Create new crash reporter
    pub fn new(max_reports: usize, auto_filter: bool) -> Self {
        Self {
            reports: Arc::new(RwLock::new(Vec::new())),
            max_reports,
            auto_filter,
        }
    }

    /// Report crash
    pub fn report_crash(&self, mut report: CrashReport) -> RuntimeResult<()> {
        if self.auto_filter {
            report.filter_sensitive();
        }

        let mut reports = self.reports.write();
        reports.push(report);

        if reports.len() > self.max_reports {
            reports.remove(0);
        }

        Ok(())
    }

    /// Get crash report
    pub fn get_report(&self, id: &str) -> RuntimeResult<CrashReport> {
        self.reports.read()
            .iter()
            .find(|r| r.id == id)
            .cloned()
            .ok_or_else(|| RuntimeError::Other(format!("Report not found: {}", id)))
    }

    /// Get all reports
    pub fn get_all_reports(&self) -> Vec<CrashReport> {
        self.reports.read().clone()
    }

    /// Get reports by severity
    pub fn get_reports_by_severity(&self, severity: CrashSeverity) -> Vec<CrashReport> {
        self.reports.read()
            .iter()
            .filter(|r| r.severity == severity)
            .cloned()
            .collect()
    }

    /// Get reports by component
    pub fn get_reports_by_component(&self, component: &str) -> Vec<CrashReport> {
        self.reports.read()
            .iter()
            .filter(|r| r.component == component)
            .cloned()
            .collect()
    }

    /// Get recent reports
    pub fn get_recent_reports(&self, count: usize) -> Vec<CrashReport> {
        let reports = self.reports.read();
        let start = if reports.len() > count {
            reports.len() - count
        } else {
            0
        };
        reports[start..].to_vec()
    }

    /// Delete report
    pub fn delete_report(&self, id: &str) -> RuntimeResult<()> {
        let mut reports = self.reports.write();
        let initial_len = reports.len();
        reports.retain(|r| r.id != id);
        
        if reports.len() == initial_len {
            return Err(RuntimeError::Other(format!("Report not found: {}", id)));
        }
        Ok(())
    }

    /// Get report count
    pub fn report_count(&self) -> usize {
        self.reports.read().len()
    }

    /// Get critical report count
    pub fn critical_count(&self) -> usize {
        self.reports.read()
            .iter()
            .filter(|r| r.severity == CrashSeverity::Critical)
            .count()
    }

    /// Clear all reports
    pub fn clear(&self) -> RuntimeResult<()> {
        self.reports.write().clear();
        Ok(())
    }

    /// Export reports as JSON-like format
    pub fn export_reports(&self) -> String {
        let reports = self.reports.read();
        let mut output = String::from("[\n");
        
        for (i, report) in reports.iter().enumerate() {
            output.push_str(&format!(
                "  {{\n    \"id\": \"{}\",\n    \"severity\": \"{}\",\n    \"component\": \"{}\",\n    \"message\": \"{}\"\n  }}",
                report.id, report.severity, report.component, report.error_message
            ));
            
            if i < reports.len() - 1 {
                output.push(',');
            }
            output.push('\n');
        }
        
        output.push(']');
        output
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_crash_report_creation() {
        let report = CrashReport::new(
            "crash1".to_string(),
            CrashSeverity::High,
            "boot".to_string(),
            "Boot failed".to_string(),
        );
        assert_eq!(report.id, "crash1");
        assert_eq!(report.severity, CrashSeverity::High);
    }

    #[test]
    fn test_crash_report_with_stack_trace() {
        let report = CrashReport::new(
            "crash1".to_string(),
            CrashSeverity::High,
            "boot".to_string(),
            "Boot failed".to_string(),
        )
        .with_stack_trace("at boot::initialize".to_string());
        
        assert_eq!(report.stack_trace, Some("at boot::initialize".to_string()));
    }

    #[test]
    fn test_crash_report_with_context() {
        let report = CrashReport::new(
            "crash1".to_string(),
            CrashSeverity::High,
            "boot".to_string(),
            "Boot failed".to_string(),
        )
        .with_context("phase".to_string(), "validation".to_string());
        
        assert_eq!(report.context.get("phase"), Some(&"validation".to_string()));
    }

    #[test]
    fn test_filter_sensitive() {
        let mut report = CrashReport::new(
            "crash1".to_string(),
            CrashSeverity::High,
            "boot".to_string(),
            "Boot failed".to_string(),
        )
        .with_context("password".to_string(), "secret123".to_string());
        
        report.filter_sensitive();
        assert_eq!(report.context.get("password"), Some(&"***FILTERED***".to_string()));
        assert!(report.filtered);
    }

    #[test]
    fn test_crash_reporter_creation() {
        let reporter = CrashReporter::new(100, true);
        assert_eq!(reporter.report_count(), 0);
    }

    #[test]
    fn test_report_crash() {
        let reporter = CrashReporter::new(100, false);
        let report = CrashReport::new(
            "crash1".to_string(),
            CrashSeverity::High,
            "boot".to_string(),
            "Boot failed".to_string(),
        );
        
        assert!(reporter.report_crash(report).is_ok());
        assert_eq!(reporter.report_count(), 1);
    }

    #[test]
    fn test_get_report() {
        let reporter = CrashReporter::new(100, false);
        let report = CrashReport::new(
            "crash1".to_string(),
            CrashSeverity::High,
            "boot".to_string(),
            "Boot failed".to_string(),
        );
        
        reporter.report_crash(report).unwrap();
        let retrieved = reporter.get_report("crash1").unwrap();
        assert_eq!(retrieved.id, "crash1");
    }

    #[test]
    fn test_get_reports_by_severity() {
        let reporter = CrashReporter::new(100, false);
        
        let report1 = CrashReport::new(
            "crash1".to_string(),
            CrashSeverity::High,
            "boot".to_string(),
            "Boot failed".to_string(),
        );
        let report2 = CrashReport::new(
            "crash2".to_string(),
            CrashSeverity::Critical,
            "kernel".to_string(),
            "Kernel panic".to_string(),
        );
        
        reporter.report_crash(report1).unwrap();
        reporter.report_crash(report2).unwrap();
        
        let critical = reporter.get_reports_by_severity(CrashSeverity::Critical);
        assert_eq!(critical.len(), 1);
    }

    #[test]
    fn test_get_reports_by_component() {
        let reporter = CrashReporter::new(100, false);
        
        let report1 = CrashReport::new(
            "crash1".to_string(),
            CrashSeverity::High,
            "boot".to_string(),
            "Boot failed".to_string(),
        );
        let report2 = CrashReport::new(
            "crash2".to_string(),
            CrashSeverity::High,
            "boot".to_string(),
            "Boot failed again".to_string(),
        );
        
        reporter.report_crash(report1).unwrap();
        reporter.report_crash(report2).unwrap();
        
        let boot_reports = reporter.get_reports_by_component("boot");
        assert_eq!(boot_reports.len(), 2);
    }

    #[test]
    fn test_delete_report() {
        let reporter = CrashReporter::new(100, false);
        let report = CrashReport::new(
            "crash1".to_string(),
            CrashSeverity::High,
            "boot".to_string(),
            "Boot failed".to_string(),
        );
        
        reporter.report_crash(report).unwrap();
        assert!(reporter.delete_report("crash1").is_ok());
        assert_eq!(reporter.report_count(), 0);
    }

    #[test]
    fn test_critical_count() {
        let reporter = CrashReporter::new(100, false);
        
        let report1 = CrashReport::new(
            "crash1".to_string(),
            CrashSeverity::High,
            "boot".to_string(),
            "Boot failed".to_string(),
        );
        let report2 = CrashReport::new(
            "crash2".to_string(),
            CrashSeverity::Critical,
            "kernel".to_string(),
            "Kernel panic".to_string(),
        );
        
        reporter.report_crash(report1).unwrap();
        reporter.report_crash(report2).unwrap();
        
        assert_eq!(reporter.critical_count(), 1);
    }

    #[test]
    fn test_clear() {
        let reporter = CrashReporter::new(100, false);
        let report = CrashReport::new(
            "crash1".to_string(),
            CrashSeverity::High,
            "boot".to_string(),
            "Boot failed".to_string(),
        );
        
        reporter.report_crash(report).unwrap();
        assert!(reporter.clear().is_ok());
        assert_eq!(reporter.report_count(), 0);
    }
}
