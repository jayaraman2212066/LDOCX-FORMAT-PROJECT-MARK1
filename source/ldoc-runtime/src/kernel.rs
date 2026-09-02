// LDOC Runtime — Runtime Kernel (Layer 2)
// Core runtime orchestration and component management

use std::sync::Arc;
use parking_lot::RwLock;
use crate::error::{RuntimeError, RuntimeResult};
use crate::security::SecurityManager;
use crate::resources::ResourcePool;
use crate::config::ConfigManager;

/// Kernel state mirrors the lifecycle states relevant to the kernel
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KernelState {
    Uninitialized,
    Initializing,
    Ready,
    Running,
    Closing,
    Destroyed,
    Error,
}

/// Runtime kernel managing all components
pub struct RuntimeKernel {
    state: Arc<RwLock<KernelState>>,
    security: Arc<SecurityManager>,
    resources: Arc<ResourcePool>,
    config: Arc<ConfigManager>,
}

impl RuntimeKernel {
    /// Create new runtime kernel
    pub fn new(max_memory: u64) -> RuntimeResult<Self> {
        let security = Arc::new(SecurityManager::new());
        let resources = Arc::new(ResourcePool::new(max_memory));
        let config = Arc::new(ConfigManager::new());

        Ok(Self {
            state: Arc::new(RwLock::new(KernelState::Uninitialized)),
            security,
            resources,
            config,
        })
    }

    /// Initialize kernel
    pub fn initialize(&self) -> RuntimeResult<()> {
        let mut state = self.state.write();

        if *state != KernelState::Uninitialized {
            return Err(RuntimeError::Other(
                format!("Cannot initialize from state: {:?}", state)
            ));
        }

        *state = KernelState::Initializing;
        drop(state);

        self.config.set(
            "runtime.version".to_string(),
            crate::config::ConfigValue::String(crate::RUNTIME_VERSION.to_string()),
            crate::config::ConfigLayer::RuntimeOverrides,
        )?;

        let mut state = self.state.write();
        *state = KernelState::Ready;
        Ok(())
    }

    /// Start kernel
    pub fn start(&self) -> RuntimeResult<()> {
        let mut state = self.state.write();

        if *state != KernelState::Ready {
            return Err(RuntimeError::Other(
                format!("Cannot start from state: {:?}", state)
            ));
        }

        *state = KernelState::Running;
        Ok(())
    }

    /// Pause kernel
    pub fn pause(&self) -> RuntimeResult<()> {
        let state = self.state.write();
        if *state != KernelState::Running {
            return Err(RuntimeError::Other(
                format!("Cannot pause from state: {:?}", state)
            ));
        }
        drop(state);
        Ok(())
    }

    /// Resume kernel
    pub fn resume(&self) -> RuntimeResult<()> {
        let state = self.state.read();
        if *state != KernelState::Running {
            return Err(RuntimeError::Other(
                format!("Cannot resume from state: {:?}", state)
            ));
        }
        Ok(())
    }

    /// Shutdown kernel
    pub fn shutdown(&self) -> RuntimeResult<()> {
        let mut state = self.state.write();

        if matches!(*state, KernelState::Destroyed | KernelState::Uninitialized) {
            return Err(RuntimeError::Other(
                format!("Cannot shutdown from state: {:?}", state)
            ));
        }

        *state = KernelState::Closing;
        drop(state);

        self.resources.cleanup_unused()?;
        self.config.clear();

        let mut state = self.state.write();
        *state = KernelState::Destroyed;
        Ok(())
    }

    /// Get current kernel state
    pub fn state(&self) -> KernelState {
        *self.state.read()
    }

    /// Get security manager
    pub fn security(&self) -> Arc<SecurityManager> {
        Arc::clone(&self.security)
    }

    /// Get resource pool
    pub fn resources(&self) -> Arc<ResourcePool> {
        Arc::clone(&self.resources)
    }

    /// Get configuration manager
    pub fn config(&self) -> Arc<ConfigManager> {
        Arc::clone(&self.config)
    }

    /// Check if kernel is running
    pub fn is_running(&self) -> bool {
        *self.state.read() == KernelState::Running
    }

    /// Check if kernel is ready
    pub fn is_ready(&self) -> bool {
        matches!(*self.state.read(), KernelState::Ready | KernelState::Running)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kernel_creation() {
        let kernel = RuntimeKernel::new(64 * 1024 * 1024).unwrap();
        assert_eq!(kernel.state(), KernelState::Uninitialized);
    }

    #[test]
    fn test_kernel_initialization() {
        let kernel = RuntimeKernel::new(64 * 1024 * 1024).unwrap();
        assert!(kernel.initialize().is_ok());
        assert_eq!(kernel.state(), KernelState::Ready);
    }

    #[test]
    fn test_kernel_start() {
        let kernel = RuntimeKernel::new(64 * 1024 * 1024).unwrap();
        kernel.initialize().unwrap();
        assert!(kernel.start().is_ok());
        assert_eq!(kernel.state(), KernelState::Running);
    }

    #[test]
    fn test_kernel_pause_resume() {
        let kernel = RuntimeKernel::new(64 * 1024 * 1024).unwrap();
        kernel.initialize().unwrap();
        kernel.start().unwrap();
        assert!(kernel.pause().is_ok());
        assert!(kernel.resume().is_ok());
        assert_eq!(kernel.state(), KernelState::Running);
    }

    #[test]
    fn test_kernel_shutdown() {
        let kernel = RuntimeKernel::new(64 * 1024 * 1024).unwrap();
        kernel.initialize().unwrap();
        kernel.start().unwrap();
        assert!(kernel.shutdown().is_ok());
        assert_eq!(kernel.state(), KernelState::Destroyed);
    }

    #[test]
    fn test_kernel_invalid_transitions() {
        let kernel = RuntimeKernel::new(64 * 1024 * 1024).unwrap();
        assert!(kernel.start().is_err());
        kernel.initialize().unwrap();
        assert!(kernel.pause().is_err());
    }

    #[test]
    fn test_kernel_component_access() {
        let kernel = RuntimeKernel::new(64 * 1024 * 1024).unwrap();
        let _security = kernel.security();
        let _resources = kernel.resources();
        let _config = kernel.config();
    }

    #[test]
    fn test_kernel_state_checks() {
        let kernel = RuntimeKernel::new(64 * 1024 * 1024).unwrap();
        assert!(!kernel.is_running());
        assert!(!kernel.is_ready());
        kernel.initialize().unwrap();
        assert!(kernel.is_ready());
        kernel.start().unwrap();
        assert!(kernel.is_running());
    }
}
