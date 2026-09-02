// LDOC SDK — AI Runtime wrapper
// Clean public interface over ldoc_runtime::AiRuntime.

use std::sync::Arc;
use ldoc_runtime::{AiRuntime, AiRequest, AiLimits, AiPricing, MockAiProvider, AiProvider};
use crate::error::SdkError;

/// SDK-level AI runtime.
/// Wraps ldoc_runtime::AiRuntime with a clean public API.
pub struct LdocAiRuntime {
    inner: AiRuntime,
}

impl LdocAiRuntime {
    /// Create with default limits and no provider (mock mode).
    pub fn new_mock() -> Self {
        let inner = AiRuntime::default()
            .with_provider(Arc::new(MockAiProvider::new()));
        Self { inner }
    }

    /// Create with custom limits and a provider.
    pub fn new(limits: AiLimits, pricing: AiPricing, provider: Arc<dyn AiProvider>) -> Self {
        let inner = AiRuntime::new(limits, pricing).with_provider(provider);
        Self { inner }
    }

    /// Execute a prompt and return the response text.
    pub fn complete(&self, model: &str, prompt: &str) -> Result<String, SdkError> {
        let req = AiRequest::new(model, prompt);
        self.inner.execute(&req)
            .map(|r| r.text)
            .map_err(|e| SdkError::InvalidArgument(e.to_string()))
    }

    /// Execute a prompt with a system message.
    pub fn complete_with_system(&self, model: &str, system: &str, prompt: &str) -> Result<String, SdkError> {
        let req = AiRequest::new(model, prompt).with_system(system);
        self.inner.execute(&req)
            .map(|r| r.text)
            .map_err(|e| SdkError::InvalidArgument(e.to_string()))
    }

    /// Number of cached responses.
    pub fn cache_size(&self) -> usize {
        self.inner.cache_size()
    }

    /// Total requests made (not counting cache hits).
    pub fn request_count(&self) -> u64 {
        self.inner.cost_record().request_count
    }

    /// Estimated cost in USD.
    pub fn estimated_cost_usd(&self) -> f64 {
        self.inner.cost_record().estimated_usd
    }

    /// Clear the response cache.
    pub fn clear_cache(&self) {
        self.inner.clear_cache();
    }

    /// Whether a provider is configured.
    pub fn has_provider(&self) -> bool {
        self.inner.has_provider()
    }
}

impl Default for LdocAiRuntime {
    fn default() -> Self { Self::new_mock() }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_complete() {
        let ai = LdocAiRuntime::new_mock();
        let result = ai.complete("gpt-4o-mini", "Hello world");
        assert!(result.is_ok());
        assert!(!result.unwrap().is_empty());
    }

    #[test]
    fn test_mock_complete_with_system() {
        let ai = LdocAiRuntime::new_mock();
        let result = ai.complete_with_system("gpt-4o-mini", "You are helpful.", "Hello");
        assert!(result.is_ok());
    }

    #[test]
    fn test_cache_increments() {
        let ai = LdocAiRuntime::new_mock();
        ai.complete("m", "unique prompt abc123").unwrap();
        assert_eq!(ai.cache_size(), 1);
    }

    #[test]
    fn test_request_count() {
        let ai = LdocAiRuntime::new_mock();
        ai.complete("m", "req1_xyz").unwrap();
        ai.complete("m", "req2_xyz").unwrap();
        assert_eq!(ai.request_count(), 2);
    }

    #[test]
    fn test_cost_positive() {
        let ai = LdocAiRuntime::new_mock();
        ai.complete("m", "cost test prompt").unwrap();
        assert!(ai.estimated_cost_usd() > 0.0);
    }

    #[test]
    fn test_clear_cache() {
        let ai = LdocAiRuntime::new_mock();
        ai.complete("m", "cache clear test").unwrap();
        ai.clear_cache();
        assert_eq!(ai.cache_size(), 0);
    }

    #[test]
    fn test_has_provider() {
        let ai = LdocAiRuntime::new_mock();
        assert!(ai.has_provider());
    }
}
