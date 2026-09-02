// LDOC Runtime — Platform Adapter (Layer 7)
// Specification: Module 02 (Layered Architecture), Module 15 (Folder Ownership)
// 
// The Platform Adapter is the OS abstraction layer. All platform-specific behavior
// is isolated here. The runtime core never calls the OS directly.

use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};
use crate::error::RuntimeResult;

/// Platform identifier
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Platform {
    Windows,
    Linux,
    MacOS,
    Wasm,
}

impl Platform {
    pub fn name(&self) -> &'static str {
        match self {
            Platform::Windows => "windows",
            Platform::Linux => "linux",
            Platform::MacOS => "macos",
            Platform::Wasm => "wasm",
        }
    }
}

/// Thread handle for spawned threads
pub struct ThreadHandle {
    inner: std::thread::JoinHandle<()>,
}

impl ThreadHandle {
    pub fn join(self) -> RuntimeResult<()> {
        self.inner.join().map_err(|_| {
            crate::error::RuntimeError::Other("Thread join failed".to_string())
        })
    }
}

/// Platform Adapter trait — the single interface for all OS operations
/// 
/// Every platform implementation (Windows, Linux, macOS, WASM) must implement this trait.
/// The runtime core calls only this trait — never the OS directly.
pub trait PlatformAdapter: Send + Sync {
    // ── File System Operations ──────────────────────────────────────────────────

    /// Read entire file into memory
    fn read_file(&self, path: &Path) -> RuntimeResult<Vec<u8>>;

    /// Write bytes to file (atomic)
    fn write_file(&self, path: &Path, data: &[u8]) -> RuntimeResult<()>;

    /// Delete a file
    fn delete_file(&self, path: &Path) -> RuntimeResult<()>;

    /// Check if file exists
    fn file_exists(&self, path: &Path) -> bool;

    /// Get file size in bytes
    fn file_size(&self, path: &Path) -> RuntimeResult<u64>;

    /// Create a directory
    fn create_dir(&self, path: &Path) -> RuntimeResult<()>;

    /// Create directory and all parent directories
    fn create_dir_all(&self, path: &Path) -> RuntimeResult<()>;

    /// Delete a directory (must be empty)
    fn delete_dir(&self, path: &Path) -> RuntimeResult<()>;

    /// List entries in a directory
    fn list_dir(&self, path: &Path) -> RuntimeResult<Vec<PathBuf>>;

    // ── Path Operations ────────────────────────────────────────────────────────

    /// Get the platform's temporary directory
    fn temp_dir(&self) -> PathBuf;

    /// Get the user's data directory (platform-specific)
    fn user_data_dir(&self) -> PathBuf;

    /// Get the user's cache directory
    fn user_cache_dir(&self) -> PathBuf;

    /// Get the user's config directory
    fn user_config_dir(&self) -> PathBuf;

    /// Resolve a path to its canonical form
    fn canonicalize(&self, path: &Path) -> RuntimeResult<PathBuf>;

    // ── Time Operations ────────────────────────────────────────────────────────

    /// Get current UTC time
    fn now_utc(&self) -> SystemTime;

    /// Get monotonic clock (for measuring elapsed time)
    fn monotonic_now(&self) -> Duration;

    /// Sleep for the specified duration
    fn sleep(&self, duration: Duration);

    // ── Thread Operations ──────────────────────────────────────────────────────

    /// Spawn a new OS thread
    fn spawn_thread(&self, f: Box<dyn FnOnce() + Send + 'static>) -> RuntimeResult<ThreadHandle>;

    /// Get the number of logical CPUs
    fn logical_cpu_count(&self) -> u8;

    /// Get available system memory in bytes
    fn available_memory(&self) -> u64;

    // ── Process Operations ─────────────────────────────────────────────────────

    /// Get the current process ID
    fn process_id(&self) -> u32;

    /// Get environment variable
    fn env_var(&self, key: &str) -> Option<String>;

    /// Set environment variable
    fn set_env_var(&self, key: &str, value: &str) -> RuntimeResult<()>;

    // ── Platform Information ───────────────────────────────────────────────────

    /// Get the current platform
    fn platform(&self) -> Platform;

    /// Get platform name as string
    fn platform_name(&self) -> &'static str {
        self.platform().name()
    }

    /// Get OS version string
    fn os_version(&self) -> String;

    /// Get architecture string (x86_64, aarch64, wasm32, etc.)
    fn architecture(&self) -> &'static str;
}

/// Default platform adapter selection based on compile-time features
pub fn default_platform_adapter() -> Box<dyn PlatformAdapter> {
    #[cfg(target_os = "windows")]
    return Box::new(WindowsPlatformAdapter);

    #[cfg(target_os = "linux")]
    return Box::new(LinuxPlatformAdapter);

    #[cfg(target_os = "macos")]
    return Box::new(MacOsPlatformAdapter);

    #[cfg(target_arch = "wasm32")]
    return Box::new(WasmPlatformAdapter);

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos", target_arch = "wasm32")))]
    panic!("Unsupported platform");
}

// ── Platform Implementations ────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
struct WindowsPlatformAdapter;

#[cfg(target_os = "windows")]
impl PlatformAdapter for WindowsPlatformAdapter {
    fn read_file(&self, path: &Path) -> RuntimeResult<Vec<u8>> {
        std::fs::read(path).map_err(|e| e.into())
    }

    fn write_file(&self, path: &Path, data: &[u8]) -> RuntimeResult<()> {
        std::fs::write(path, data).map_err(|e| e.into())
    }

    fn delete_file(&self, path: &Path) -> RuntimeResult<()> {
        std::fs::remove_file(path).map_err(|e| e.into())
    }

    fn file_exists(&self, path: &Path) -> bool {
        path.exists()
    }

    fn file_size(&self, path: &Path) -> RuntimeResult<u64> {
        Ok(std::fs::metadata(path)?.len())
    }

    fn create_dir(&self, path: &Path) -> RuntimeResult<()> {
        std::fs::create_dir(path).map_err(|e| e.into())
    }

    fn create_dir_all(&self, path: &Path) -> RuntimeResult<()> {
        std::fs::create_dir_all(path).map_err(|e| e.into())
    }

    fn delete_dir(&self, path: &Path) -> RuntimeResult<()> {
        std::fs::remove_dir(path).map_err(|e| e.into())
    }

    fn list_dir(&self, path: &Path) -> RuntimeResult<Vec<PathBuf>> {
        let entries = std::fs::read_dir(path)?
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .collect();
        Ok(entries)
    }

    fn temp_dir(&self) -> PathBuf {
        std::env::temp_dir()
    }

    fn user_data_dir(&self) -> PathBuf {
        if let Some(home) = std::env::var_os("APPDATA") {
            PathBuf::from(home)
        } else {
            PathBuf::from(".")
        }
    }

    fn user_cache_dir(&self) -> PathBuf {
        if let Some(home) = std::env::var_os("LOCALAPPDATA") {
            PathBuf::from(home).join("Cache")
        } else {
            self.temp_dir()
        }
    }

    fn user_config_dir(&self) -> PathBuf {
        self.user_data_dir()
    }

    fn canonicalize(&self, path: &Path) -> RuntimeResult<PathBuf> {
        std::fs::canonicalize(path).map_err(|e| e.into())
    }

    fn now_utc(&self) -> SystemTime {
        SystemTime::now()
    }

    fn monotonic_now(&self) -> Duration {
        // Windows: use QueryPerformanceCounter via std::time::Instant
        let instant = std::time::Instant::now();
        instant.elapsed()
    }

    fn sleep(&self, duration: Duration) {
        std::thread::sleep(duration);
    }

    fn spawn_thread(&self, f: Box<dyn FnOnce() + Send + 'static>) -> RuntimeResult<ThreadHandle> {
        let handle = std::thread::spawn(f);
        Ok(ThreadHandle { inner: handle })
    }

    fn logical_cpu_count(&self) -> u8 {
        std::thread::available_parallelism().map(|n| n.get() as u8).unwrap_or(1)
    }

    fn available_memory(&self) -> u64 {
        // Windows: use GlobalMemoryStatusEx
        // For now, return a reasonable default
        8 * 1024 * 1024 * 1024 // 8 GB
    }

    fn process_id(&self) -> u32 {
        std::process::id()
    }

    fn env_var(&self, key: &str) -> Option<String> {
        std::env::var(key).ok()
    }

    fn set_env_var(&self, key: &str, value: &str) -> RuntimeResult<()> {
        std::env::set_var(key, value);
        Ok(())
    }

    fn platform(&self) -> Platform {
        Platform::Windows
    }

    fn os_version(&self) -> String {
        "Windows".to_string()
    }

    fn architecture(&self) -> &'static str {
        #[cfg(target_arch = "x86_64")]
        {
            "x86_64"
        }
        #[cfg(target_arch = "aarch64")]
        {
            "aarch64"
        }
        #[cfg(not(any(target_arch = "x86_64", target_arch = "aarch64")))]
        {
            "unknown"
        }
    }
}

#[cfg(target_os = "linux")]
struct LinuxPlatformAdapter;

#[cfg(target_os = "linux")]
impl PlatformAdapter for LinuxPlatformAdapter {
    fn read_file(&self, path: &Path) -> RuntimeResult<Vec<u8>> {
        std::fs::read(path).map_err(|e| e.into())
    }

    fn write_file(&self, path: &Path, data: &[u8]) -> RuntimeResult<()> {
        std::fs::write(path, data).map_err(|e| e.into())
    }

    fn delete_file(&self, path: &Path) -> RuntimeResult<()> {
        std::fs::remove_file(path).map_err(|e| e.into())
    }

    fn file_exists(&self, path: &Path) -> bool {
        path.exists()
    }

    fn file_size(&self, path: &Path) -> RuntimeResult<u64> {
        Ok(std::fs::metadata(path)?.len())
    }

    fn create_dir(&self, path: &Path) -> RuntimeResult<()> {
        std::fs::create_dir(path).map_err(|e| e.into())
    }

    fn create_dir_all(&self, path: &Path) -> RuntimeResult<()> {
        std::fs::create_dir_all(path).map_err(|e| e.into())
    }

    fn delete_dir(&self, path: &Path) -> RuntimeResult<()> {
        std::fs::remove_dir(path).map_err(|e| e.into())
    }

    fn list_dir(&self, path: &Path) -> RuntimeResult<Vec<PathBuf>> {
        let entries = std::fs::read_dir(path)?
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .collect();
        Ok(entries)
    }

    fn temp_dir(&self) -> PathBuf {
        std::env::temp_dir()
    }

    fn user_data_dir(&self) -> PathBuf {
        if let Some(home) = std::env::var_os("HOME") {
            PathBuf::from(home).join(".local/share")
        } else {
            PathBuf::from(".")
        }
    }

    fn user_cache_dir(&self) -> PathBuf {
        if let Some(home) = std::env::var_os("HOME") {
            PathBuf::from(home).join(".cache")
        } else {
            self.temp_dir()
        }
    }

    fn user_config_dir(&self) -> PathBuf {
        if let Some(home) = std::env::var_os("HOME") {
            PathBuf::from(home).join(".config")
        } else {
            PathBuf::from(".")
        }
    }

    fn canonicalize(&self, path: &Path) -> RuntimeResult<PathBuf> {
        std::fs::canonicalize(path).map_err(|e| e.into())
    }

    fn now_utc(&self) -> SystemTime {
        SystemTime::now()
    }

    fn monotonic_now(&self) -> Duration {
        let instant = std::time::Instant::now();
        instant.elapsed()
    }

    fn sleep(&self, duration: Duration) {
        std::thread::sleep(duration);
    }

    fn spawn_thread(&self, f: Box<dyn FnOnce() + Send + 'static>) -> RuntimeResult<ThreadHandle> {
        let handle = std::thread::spawn(f);
        Ok(ThreadHandle { inner: handle })
    }

    fn logical_cpu_count(&self) -> u8 {
        std::thread::available_parallelism().map(|n| n.get() as u8).unwrap_or(1)
    }

    fn available_memory(&self) -> u64 {
        8 * 1024 * 1024 * 1024 // 8 GB default
    }

    fn process_id(&self) -> u32 {
        std::process::id()
    }

    fn env_var(&self, key: &str) -> Option<String> {
        std::env::var(key).ok()
    }

    fn set_env_var(&self, key: &str, value: &str) -> RuntimeResult<()> {
        std::env::set_var(key, value);
        Ok(())
    }

    fn platform(&self) -> Platform {
        Platform::Linux
    }

    fn os_version(&self) -> String {
        "Linux".to_string()
    }

    fn architecture(&self) -> &'static str {
        #[cfg(target_arch = "x86_64")]
        {
            "x86_64"
        }
        #[cfg(target_arch = "aarch64")]
        {
            "aarch64"
        }
        #[cfg(not(any(target_arch = "x86_64", target_arch = "aarch64")))]
        {
            "unknown"
        }
    }
}

#[cfg(target_os = "macos")]
struct MacOsPlatformAdapter;

#[cfg(target_os = "macos")]
impl PlatformAdapter for MacOsPlatformAdapter {
    fn read_file(&self, path: &Path) -> RuntimeResult<Vec<u8>> {
        std::fs::read(path).map_err(|e| e.into())
    }

    fn write_file(&self, path: &Path, data: &[u8]) -> RuntimeResult<()> {
        std::fs::write(path, data).map_err(|e| e.into())
    }

    fn delete_file(&self, path: &Path) -> RuntimeResult<()> {
        std::fs::remove_file(path).map_err(|e| e.into())
    }

    fn file_exists(&self, path: &Path) -> bool {
        path.exists()
    }

    fn file_size(&self, path: &Path) -> RuntimeResult<u64> {
        Ok(std::fs::metadata(path)?.len())
    }

    fn create_dir(&self, path: &Path) -> RuntimeResult<()> {
        std::fs::create_dir(path).map_err(|e| e.into())
    }

    fn create_dir_all(&self, path: &Path) -> RuntimeResult<()> {
        std::fs::create_dir_all(path).map_err(|e| e.into())
    }

    fn delete_dir(&self, path: &Path) -> RuntimeResult<()> {
        std::fs::remove_dir(path).map_err(|e| e.into())
    }

    fn list_dir(&self, path: &Path) -> RuntimeResult<Vec<PathBuf>> {
        let entries = std::fs::read_dir(path)?
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .collect();
        Ok(entries)
    }

    fn temp_dir(&self) -> PathBuf {
        std::env::temp_dir()
    }

    fn user_data_dir(&self) -> PathBuf {
        if let Some(home) = std::env::var_os("HOME") {
            PathBuf::from(home).join("Library/Application Support")
        } else {
            PathBuf::from(".")
        }
    }

    fn user_cache_dir(&self) -> PathBuf {
        if let Some(home) = std::env::var_os("HOME") {
            PathBuf::from(home).join("Library/Caches")
        } else {
            self.temp_dir()
        }
    }

    fn user_config_dir(&self) -> PathBuf {
        if let Some(home) = std::env::var_os("HOME") {
            PathBuf::from(home).join("Library/Preferences")
        } else {
            PathBuf::from(".")
        }
    }

    fn canonicalize(&self, path: &Path) -> RuntimeResult<PathBuf> {
        std::fs::canonicalize(path).map_err(|e| e.into())
    }

    fn now_utc(&self) -> SystemTime {
        SystemTime::now()
    }

    fn monotonic_now(&self) -> Duration {
        let instant = std::time::Instant::now();
        instant.elapsed()
    }

    fn sleep(&self, duration: Duration) {
        std::thread::sleep(duration);
    }

    fn spawn_thread(&self, f: Box<dyn FnOnce() + Send + 'static>) -> RuntimeResult<ThreadHandle> {
        let handle = std::thread::spawn(f);
        Ok(ThreadHandle { inner: handle })
    }

    fn logical_cpu_count(&self) -> u8 {
        std::thread::available_parallelism().map(|n| n.get() as u8).unwrap_or(1)
    }

    fn available_memory(&self) -> u64 {
        8 * 1024 * 1024 * 1024 // 8 GB default
    }

    fn process_id(&self) -> u32 {
        std::process::id()
    }

    fn env_var(&self, key: &str) -> Option<String> {
        std::env::var(key).ok()
    }

    fn set_env_var(&self, key: &str, value: &str) -> RuntimeResult<()> {
        std::env::set_var(key, value);
        Ok(())
    }

    fn platform(&self) -> Platform {
        Platform::MacOS
    }

    fn os_version(&self) -> String {
        "macOS".to_string()
    }

    fn architecture(&self) -> &'static str {
        #[cfg(target_arch = "x86_64")]
        {
            "x86_64"
        }
        #[cfg(target_arch = "aarch64")]
        {
            "aarch64"
        }
        #[cfg(not(any(target_arch = "x86_64", target_arch = "aarch64")))]
        {
            "unknown"
        }
    }
}

#[cfg(target_arch = "wasm32")]
struct WasmPlatformAdapter;

#[cfg(target_arch = "wasm32")]
impl PlatformAdapter for WasmPlatformAdapter {
    fn read_file(&self, _path: &Path) -> RuntimeResult<Vec<u8>> {
        Err(crate::error::RuntimeError::NotSupported)
    }

    fn write_file(&self, _path: &Path, _data: &[u8]) -> RuntimeResult<()> {
        Err(crate::error::RuntimeError::NotSupported)
    }

    fn delete_file(&self, _path: &Path) -> RuntimeResult<()> {
        Err(crate::error::RuntimeError::NotSupported)
    }

    fn file_exists(&self, _path: &Path) -> bool {
        false
    }

    fn file_size(&self, _path: &Path) -> RuntimeResult<u64> {
        Err(crate::error::RuntimeError::NotSupported)
    }

    fn create_dir(&self, _path: &Path) -> RuntimeResult<()> {
        Err(crate::error::RuntimeError::NotSupported)
    }

    fn create_dir_all(&self, _path: &Path) -> RuntimeResult<()> {
        Err(crate::error::RuntimeError::NotSupported)
    }

    fn delete_dir(&self, _path: &Path) -> RuntimeResult<()> {
        Err(crate::error::RuntimeError::NotSupported)
    }

    fn list_dir(&self, _path: &Path) -> RuntimeResult<Vec<PathBuf>> {
        Err(crate::error::RuntimeError::NotSupported)
    }

    fn temp_dir(&self) -> PathBuf {
        PathBuf::from("/tmp")
    }

    fn user_data_dir(&self) -> PathBuf {
        PathBuf::from("/data")
    }

    fn user_cache_dir(&self) -> PathBuf {
        PathBuf::from("/cache")
    }

    fn user_config_dir(&self) -> PathBuf {
        PathBuf::from("/config")
    }

    fn canonicalize(&self, path: &Path) -> RuntimeResult<PathBuf> {
        Ok(path.to_path_buf())
    }

    fn now_utc(&self) -> SystemTime {
        SystemTime::now()
    }

    fn monotonic_now(&self) -> Duration {
        Duration::from_secs(0)
    }

    fn sleep(&self, _duration: Duration) {
        // WASM: no-op
    }

    fn spawn_thread(&self, _f: Box<dyn FnOnce() + Send + 'static>) -> RuntimeResult<ThreadHandle> {
        Err(crate::error::RuntimeError::NotSupported)
    }

    fn logical_cpu_count(&self) -> u8 {
        1
    }

    fn available_memory(&self) -> u64 {
        256 * 1024 * 1024 // 256 MB for WASM
    }

    fn process_id(&self) -> u32 {
        0
    }

    fn env_var(&self, _key: &str) -> Option<String> {
        None
    }

    fn set_env_var(&self, _key: &str, _value: &str) -> RuntimeResult<()> {
        Err(crate::error::RuntimeError::NotSupported)
    }

    fn platform(&self) -> Platform {
        Platform::Wasm
    }

    fn os_version(&self) -> String {
        "WASM".to_string()
    }

    fn architecture(&self) -> &'static str {
        "wasm32"
    }
}
