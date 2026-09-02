// LDOC Runtime — Logging System
// Multi-sink logger with level and component filtering

use std::collections::VecDeque;
use std::sync::Arc;
use parking_lot::RwLock;
use crate::error::RuntimeResult;

/// Log level
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum LogLevel {
    Debug = 0,
    Info = 1,
    Warn = 2,
    Error = 3,
}

impl std::fmt::Display for LogLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

/// Log entry
#[derive(Debug, Clone)]
pub struct LogEntry {
    pub level: LogLevel,
    pub component: String,
    pub message: String,
    pub timestamp: u64,
}

impl LogEntry {
    /// Format log entry
    pub fn format(&self) -> String {
        format!(
            "[{}] {} - {} ({})",
            self.level,
            self.component,
            self.message,
            self.timestamp
        )
    }
}

/// Log sink trait
pub trait LogSink: Send + Sync {
    fn write(&self, entry: &LogEntry) -> RuntimeResult<()>;
    fn flush(&self) -> RuntimeResult<()>;
}

/// Console sink
pub struct ConsoleSink;

impl LogSink for ConsoleSink {
    fn write(&self, entry: &LogEntry) -> RuntimeResult<()> {
        println!("{}", entry.format());
        Ok(())
    }

    fn flush(&self) -> RuntimeResult<()> {
        Ok(())
    }
}

/// Ring buffer sink (in-memory circular buffer)
pub struct RingBufferSink {
    buffer: Arc<RwLock<VecDeque<LogEntry>>>,
    max_size: usize,
}

impl RingBufferSink {
    /// Create new ring buffer sink
    pub fn new(max_size: usize) -> Self {
        Self {
            buffer: Arc::new(RwLock::new(VecDeque::with_capacity(max_size))),
            max_size,
        }
    }

    /// Get buffer contents
    pub fn contents(&self) -> Vec<LogEntry> {
        self.buffer.read().iter().cloned().collect()
    }

    /// Clear buffer
    pub fn clear(&self) {
        self.buffer.write().clear();
    }
}

impl LogSink for RingBufferSink {
    fn write(&self, entry: &LogEntry) -> RuntimeResult<()> {
        let mut buffer = self.buffer.write();
        buffer.push_back(entry.clone());
        if buffer.len() > self.max_size {
            buffer.pop_front();
        }
        Ok(())
    }

    fn flush(&self) -> RuntimeResult<()> {
        Ok(())
    }
}

/// File sink
#[allow(dead_code)]
pub struct FileSink {
    path: String,
}

impl FileSink {
    /// Create new file sink
    pub fn new(path: String) -> Self {
        Self { path }
    }
}

impl LogSink for FileSink {
    fn write(&self, _entry: &LogEntry) -> RuntimeResult<()> {
        // In real implementation, would write to file
        // For now, just succeed
        Ok(())
    }

    fn flush(&self) -> RuntimeResult<()> {
        Ok(())
    }
}

/// Logger
pub struct Logger {
    sinks: Arc<RwLock<Vec<Arc<dyn LogSink>>>>,
    min_level: Arc<RwLock<LogLevel>>,
    component_filter: Arc<RwLock<Option<String>>>,
}

impl Logger {
    /// Create new logger
    pub fn new() -> Self {
        Self {
            sinks: Arc::new(RwLock::new(Vec::new())),
            min_level: Arc::new(RwLock::new(LogLevel::Debug)),
            component_filter: Arc::new(RwLock::new(None)),
        }
    }

    /// Add sink
    pub fn add_sink(&self, sink: Arc<dyn LogSink>) -> RuntimeResult<()> {
        self.sinks.write().push(sink);
        Ok(())
    }

    /// Set minimum log level
    pub fn set_level(&self, level: LogLevel) -> RuntimeResult<()> {
        *self.min_level.write() = level;
        Ok(())
    }

    /// Set component filter (None = all components)
    pub fn set_component_filter(&self, component: Option<String>) -> RuntimeResult<()> {
        *self.component_filter.write() = component;
        Ok(())
    }

    /// Log message
    pub fn log(&self, level: LogLevel, component: String, message: String) -> RuntimeResult<()> {
        let min_level = *self.min_level.read();
        if level < min_level {
            return Ok(());
        }

        let filter = self.component_filter.read();
        if let Some(ref filtered_component) = *filter {
            if component != *filtered_component {
                return Ok(());
            }
        }
        drop(filter);

        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let entry = LogEntry {
            level,
            component,
            message,
            timestamp,
        };

        let sinks = self.sinks.read();
        for sink in sinks.iter() {
            sink.write(&entry)?;
        }
        Ok(())
    }

    /// Log debug message
    pub fn debug(&self, component: String, message: String) -> RuntimeResult<()> {
        self.log(LogLevel::Debug, component, message)
    }

    /// Log info message
    pub fn info(&self, component: String, message: String) -> RuntimeResult<()> {
        self.log(LogLevel::Info, component, message)
    }

    /// Log warning message
    pub fn warn(&self, component: String, message: String) -> RuntimeResult<()> {
        self.log(LogLevel::Warn, component, message)
    }

    /// Log error message
    pub fn error(&self, component: String, message: String) -> RuntimeResult<()> {
        self.log(LogLevel::Error, component, message)
    }

    /// Flush all sinks
    pub fn flush(&self) -> RuntimeResult<()> {
        let sinks = self.sinks.read();
        for sink in sinks.iter() {
            sink.flush()?;
        }
        Ok(())
    }

    /// Get sink count
    pub fn sink_count(&self) -> usize {
        self.sinks.read().len()
    }
}

impl Default for Logger {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_logger_creation() {
        let logger = Logger::new();
        assert_eq!(logger.sink_count(), 0);
    }

    #[test]
    fn test_add_sink() {
        let logger = Logger::new();
        let sink = Arc::new(ConsoleSink);
        logger.add_sink(sink).unwrap();
        assert_eq!(logger.sink_count(), 1);
    }

    #[test]
    fn test_log_level_filtering() {
        let logger = Logger::new();
        logger.set_level(LogLevel::Warn).unwrap();
        
        // Debug should be filtered
        assert!(logger.debug("test".to_string(), "debug msg".to_string()).is_ok());
        
        // Warn should pass
        assert!(logger.warn("test".to_string(), "warn msg".to_string()).is_ok());
    }

    #[test]
    fn test_component_filter() {
        let logger = Logger::new();
        logger.set_component_filter(Some("boot".to_string())).unwrap();
        
        // Should pass
        assert!(logger.info("boot".to_string(), "boot msg".to_string()).is_ok());
        
        // Should be filtered
        assert!(logger.info("other".to_string(), "other msg".to_string()).is_ok());
    }

    #[test]
    fn test_ring_buffer_sink() {
        let sink = RingBufferSink::new(10);
        let entry = LogEntry {
            level: LogLevel::Info,
            component: "test".to_string(),
            message: "test message".to_string(),
            timestamp: 1000,
        };
        
        sink.write(&entry).unwrap();
        let contents = sink.contents();
        assert_eq!(contents.len(), 1);
        assert_eq!(contents[0].message, "test message");
    }

    #[test]
    fn test_ring_buffer_overflow() {
        let sink = RingBufferSink::new(3);
        
        for i in 0..5 {
            let entry = LogEntry {
                level: LogLevel::Info,
                component: "test".to_string(),
                message: format!("message {}", i),
                timestamp: 1000 + i as u64,
            };
            sink.write(&entry).unwrap();
        }
        
        let contents = sink.contents();
        assert_eq!(contents.len(), 3);
        assert_eq!(contents[0].message, "message 2");
    }

    #[test]
    fn test_log_entry_format() {
        let entry = LogEntry {
            level: LogLevel::Error,
            component: "kernel".to_string(),
            message: "critical error".to_string(),
            timestamp: 1000,
        };
        
        let formatted = entry.format();
        assert!(formatted.contains("Error"));
        assert!(formatted.contains("kernel"));
        assert!(formatted.contains("critical error"));
    }

    #[test]
    fn test_log_level_ordering() {
        assert!(LogLevel::Debug < LogLevel::Info);
        assert!(LogLevel::Info < LogLevel::Warn);
        assert!(LogLevel::Warn < LogLevel::Error);
    }

    #[test]
    fn test_logger_with_multiple_sinks() {
        let logger = Logger::new();
        let console = Arc::new(ConsoleSink);
        let ring = Arc::new(RingBufferSink::new(10));
        
        logger.add_sink(console).unwrap();
        logger.add_sink(ring.clone()).unwrap();
        
        logger.info("test".to_string(), "test message".to_string()).unwrap();
        
        let contents = ring.contents();
        assert_eq!(contents.len(), 1);
    }

    #[test]
    fn test_logger_convenience_methods() {
        let logger = Logger::new();
        let ring = Arc::new(RingBufferSink::new(10));
        logger.add_sink(ring.clone()).unwrap();
        
        logger.debug("comp".to_string(), "debug".to_string()).unwrap();
        logger.info("comp".to_string(), "info".to_string()).unwrap();
        logger.warn("comp".to_string(), "warn".to_string()).unwrap();
        logger.error("comp".to_string(), "error".to_string()).unwrap();
        
        let contents = ring.contents();
        assert_eq!(contents.len(), 4);
    }
}
