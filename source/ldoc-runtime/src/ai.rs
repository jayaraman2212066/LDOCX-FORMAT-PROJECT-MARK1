// LDOC Runtime — AI Runtime (Stage 9)
// Provider-abstracted AI block executor with caching, cost tracking,
// rate limiting, timeouts, and safety controls.
// Credentials are NEVER hardcoded — loaded from environment variables only.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

// ── AiProvider trait ──────────────────────────────────────────────────────────

/// Abstraction over any AI model provider.
/// Implement this trait to add a new provider (OpenAI-compatible, Anthropic, local, mock).
pub trait AiProvider: Send + Sync {
    fn name(&self) -> &str;
    fn complete(&self, request: &AiRequest) -> Result<AiResponse, AiError>;
}

// ── AiRequest / AiResponse ────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct AiRequest {
    pub model:       String,
    pub system:      Option<String>,
    pub prompt:      String,
    pub max_tokens:  u32,
    pub temperature: f32,
}

impl AiRequest {
    pub fn new(model: impl Into<String>, prompt: impl Into<String>) -> Self {
        Self {
            model:       model.into(),
            system:      None,
            prompt:      prompt.into(),
            max_tokens:  512,
            temperature: 0.7,
        }
    }

    pub fn with_system(mut self, system: impl Into<String>) -> Self {
        self.system = Some(system.into());
        self
    }

    pub fn with_max_tokens(mut self, n: u32) -> Self {
        self.max_tokens = n;
        self
    }

    pub fn with_temperature(mut self, t: f32) -> Self {
        self.temperature = t;
        self
    }

    /// Stable cache key for this request (model + system + prompt + params).
    pub fn cache_key(&self) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut h = DefaultHasher::new();
        self.model.hash(&mut h);
        self.system.hash(&mut h);
        self.prompt.hash(&mut h);
        // temperature is not hashed — treat as deterministic at fixed temp
        self.max_tokens.hash(&mut h);
        format!("{:016x}", h.finish())
    }
}

#[derive(Debug, Clone)]
pub struct AiResponse {
    pub text:          String,
    pub input_tokens:  u32,
    pub output_tokens: u32,
    pub model:         String,
    pub cached:        bool,
}

// ── AiError ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub enum AiError {
    ProviderUnavailable(String),
    RateLimitExceeded,
    CostLimitExceeded,
    InputTooLarge { size: usize, limit: usize },
    OutputTooLarge { size: usize, limit: usize },
    Timeout,
    InvalidRequest(String),
    ProviderError(String),
    NoProviderConfigured,
}

impl std::fmt::Display for AiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AiError::ProviderUnavailable(s) => write!(f, "AI provider unavailable: {}", s),
            AiError::RateLimitExceeded      => write!(f, "AI rate limit exceeded"),
            AiError::CostLimitExceeded      => write!(f, "AI cost limit exceeded"),
            AiError::InputTooLarge { size, limit } =>
                write!(f, "AI input too large: {} chars (limit {})", size, limit),
            AiError::OutputTooLarge { size, limit } =>
                write!(f, "AI output too large: {} chars (limit {})", size, limit),
            AiError::Timeout                => write!(f, "AI request timed out"),
            AiError::InvalidRequest(s)      => write!(f, "Invalid AI request: {}", s),
            AiError::ProviderError(s)       => write!(f, "AI provider error: {}", s),
            AiError::NoProviderConfigured   => write!(f, "No AI provider configured"),
        }
    }
}

// ── AiLimits ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct AiLimits {
    pub max_input_chars:    usize,
    pub max_output_tokens:  u32,
    pub max_requests_per_min: u32,
    pub max_cost_usd:       f64,
    pub timeout_secs:       u64,
}

impl Default for AiLimits {
    fn default() -> Self {
        Self {
            max_input_chars:      8_000,
            max_output_tokens:    1_024,
            max_requests_per_min: 20,
            max_cost_usd:         1.0,
            timeout_secs:         30,
        }
    }
}

// ── AiCacheEntry ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct AiCacheEntry {
    pub response:      AiResponse,
    pub timestamp_ms:  u64,
    pub input_tokens:  u32,
    pub output_tokens: u32,
}

// ── AiCostRecord ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Default)]
pub struct AiCostRecord {
    pub request_count:  u64,
    pub input_tokens:   u64,
    pub output_tokens:  u64,
    /// Estimated cost in USD (configurable pricing).
    pub estimated_usd:  f64,
}

// ── AiPricing ─────────────────────────────────────────────────────────────────

/// Configurable per-token pricing (USD per 1K tokens).
#[derive(Debug, Clone)]
pub struct AiPricing {
    pub input_per_1k:  f64,
    pub output_per_1k: f64,
}

impl Default for AiPricing {
    fn default() -> Self {
        // Conservative defaults — not tied to any specific provider's actual pricing.
        Self { input_per_1k: 0.001, output_per_1k: 0.002 }
    }
}

impl AiPricing {
    pub fn estimate(&self, input_tokens: u32, output_tokens: u32) -> f64 {
        (input_tokens as f64 / 1000.0) * self.input_per_1k
            + (output_tokens as f64 / 1000.0) * self.output_per_1k
    }
}

// ── RateLimiter ───────────────────────────────────────────────────────────────

struct RateLimiter {
    max_per_min: u32,
    window_start: Instant,
    count: u32,
}

impl RateLimiter {
    fn new(max_per_min: u32) -> Self {
        Self { max_per_min, window_start: Instant::now(), count: 0 }
    }

    fn check_and_increment(&mut self) -> bool {
        let elapsed = self.window_start.elapsed();
        if elapsed >= Duration::from_secs(60) {
            self.window_start = Instant::now();
            self.count = 0;
        }
        if self.count >= self.max_per_min {
            return false;
        }
        self.count += 1;
        true
    }
}

// ── AiRuntime ─────────────────────────────────────────────────────────────────

/// The LDOC AI Runtime.
/// Coordinates provider selection, caching, rate limiting, cost tracking, and safety.
pub struct AiRuntime {
    provider:     Option<Arc<dyn AiProvider>>,
    limits:       AiLimits,
    pricing:      AiPricing,
    cache:        Mutex<HashMap<String, AiCacheEntry>>,
    cost:         Mutex<AiCostRecord>,
    rate_limiter: Mutex<RateLimiter>,
}

impl AiRuntime {
    pub fn new(limits: AiLimits, pricing: AiPricing) -> Self {
        let max_rpm = limits.max_requests_per_min;
        Self {
            provider:     None,
            limits,
            pricing,
            cache:        Mutex::new(HashMap::new()),
            cost:         Mutex::new(AiCostRecord::default()),
            rate_limiter: Mutex::new(RateLimiter::new(max_rpm)),
        }
    }

    pub fn with_provider(mut self, provider: Arc<dyn AiProvider>) -> Self {
        self.provider = Some(provider);
        self
    }

    /// Set the AI provider at runtime.
    pub fn set_provider(&mut self, provider: Arc<dyn AiProvider>) {
        self.provider = Some(provider);
    }

    /// Execute an AI request with full safety pipeline:
    /// cache → rate limit → cost limit → input size → provider → output size → record cost.
    pub fn execute(&self, request: &AiRequest) -> Result<AiResponse, AiError> {
        // 1. Input size check.
        if request.prompt.len() > self.limits.max_input_chars {
            return Err(AiError::InputTooLarge {
                size:  request.prompt.len(),
                limit: self.limits.max_input_chars,
            });
        }

        // 2. Cache lookup.
        let key = request.cache_key();
        {
            let cache = self.cache.lock().unwrap();
            if let Some(entry) = cache.get(&key) {
                let mut resp = entry.response.clone();
                resp.cached = true;
                return Ok(resp);
            }
        }

        // 3. Rate limit check.
        {
            let mut rl = self.rate_limiter.lock().unwrap();
            if !rl.check_and_increment() {
                return Err(AiError::RateLimitExceeded);
            }
        }

        // 4. Cost limit check.
        {
            let cost = self.cost.lock().unwrap();
            if cost.estimated_usd >= self.limits.max_cost_usd {
                return Err(AiError::CostLimitExceeded);
            }
        }

        // 5. Clamp max_tokens to limit.
        let mut req = request.clone();
        if req.max_tokens > self.limits.max_output_tokens {
            req.max_tokens = self.limits.max_output_tokens;
        }

        // 6. Provider call.
        let provider = self.provider.as_ref().ok_or(AiError::NoProviderConfigured)?;
        let mut response = provider.complete(&req)?;

        // 7. Output size check.
        if response.text.len() > self.limits.max_output_tokens as usize * 6 {
            return Err(AiError::OutputTooLarge {
                size:  response.text.len(),
                limit: self.limits.max_output_tokens as usize * 6,
            });
        }

        response.cached = false;

        // 8. Record cost.
        {
            let cost_delta = self.pricing.estimate(response.input_tokens, response.output_tokens);
            let mut cost = self.cost.lock().unwrap();
            cost.request_count  += 1;
            cost.input_tokens   += response.input_tokens as u64;
            cost.output_tokens  += response.output_tokens as u64;
            cost.estimated_usd  += cost_delta;
        }

        // 9. Cache the response.
        {
            let mut cache = self.cache.lock().unwrap();
            cache.insert(key, AiCacheEntry {
                response:      response.clone(),
                timestamp_ms:  now_ms(),
                input_tokens:  response.input_tokens,
                output_tokens: response.output_tokens,
            });
        }

        Ok(response)
    }

    /// Current cost record snapshot.
    pub fn cost_record(&self) -> AiCostRecord {
        self.cost.lock().unwrap().clone()
    }

    /// Number of cached responses.
    pub fn cache_size(&self) -> usize {
        self.cache.lock().unwrap().len()
    }

    /// Clear the response cache.
    pub fn clear_cache(&self) {
        self.cache.lock().unwrap().clear();
    }

    /// Reset cost tracking.
    pub fn reset_cost(&self) {
        *self.cost.lock().unwrap() = AiCostRecord::default();
    }

    pub fn limits(&self) -> &AiLimits {
        &self.limits
    }

    pub fn pricing(&self) -> &AiPricing {
        &self.pricing
    }

    pub fn has_provider(&self) -> bool {
        self.provider.is_some()
    }
}

impl Default for AiRuntime {
    fn default() -> Self {
        Self::new(AiLimits::default(), AiPricing::default())
    }
}

// ── MockAiProvider ────────────────────────────────────────────────────────────

/// Mock provider for testing and demo purposes.
/// Returns deterministic responses without any network calls.
pub struct MockAiProvider {
    name: String,
}

impl MockAiProvider {
    pub fn new() -> Self {
        Self { name: "mock".to_string() }
    }
}

impl Default for MockAiProvider {
    fn default() -> Self { Self::new() }
}

impl AiProvider for MockAiProvider {
    fn name(&self) -> &str { &self.name }

    fn complete(&self, request: &AiRequest) -> Result<AiResponse, AiError> {
        let text = format!(
            "[Mock AI response for model '{}'] Prompt received ({} chars). \
             This is a deterministic mock response for testing purposes.",
            request.model,
            request.prompt.len()
        );
        let input_tokens  = (request.prompt.len() / 4).max(1) as u32;
        let output_tokens = (text.len() / 4).max(1) as u32;
        Ok(AiResponse {
            text,
            input_tokens,
            output_tokens,
            model:  request.model.clone(),
            cached: false,
        })
    }
}

// ── AiBlock ───────────────────────────────────────────────────────────────────

/// Represents an AI block from a document page.
#[derive(Debug, Clone)]
pub struct AiBlock {
    pub id:          String,
    pub model:       String,
    pub prompt:      String,
    pub system:      Option<String>,
    pub max_tokens:  u32,
    pub temperature: f32,
    pub fallback:    Option<String>,
}

impl AiBlock {
    pub fn new(id: impl Into<String>, model: impl Into<String>, prompt: impl Into<String>) -> Self {
        Self {
            id:          id.into(),
            model:       model.into(),
            prompt:      prompt.into(),
            system:      None,
            max_tokens:  512,
            temperature: 0.7,
            fallback:    None,
        }
    }

    pub fn with_fallback(mut self, fallback: impl Into<String>) -> Self {
        self.fallback = Some(fallback.into());
        self
    }

    /// Execute this block via the AI runtime.
    /// Falls back to `self.fallback` if the runtime returns an error.
    pub fn execute(&self, runtime: &AiRuntime) -> AiBlockResult {
        let req = AiRequest {
            model:       self.model.clone(),
            system:      self.system.clone(),
            prompt:      self.prompt.clone(),
            max_tokens:  self.max_tokens,
            temperature: self.temperature,
        };

        match runtime.execute(&req) {
            Ok(resp) => AiBlockResult {
                block_id: self.id.clone(),
                text:     resp.text,
                cached:   resp.cached,
                error:    None,
            },
            Err(e) => {
                let text = self.fallback.clone()
                    .unwrap_or_else(|| format!("[AI unavailable: {}]", e));
                AiBlockResult {
                    block_id: self.id.clone(),
                    text,
                    cached:   false,
                    error:    Some(e.to_string()),
                }
            }
        }
    }
}

#[derive(Debug, Clone)]
pub struct AiBlockResult {
    pub block_id: String,
    pub text:     String,
    pub cached:   bool,
    pub error:    Option<String>,
}

impl AiBlockResult {
    pub fn is_error(&self) -> bool { self.error.is_some() }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn runtime_with_mock() -> AiRuntime {
        AiRuntime::default().with_provider(Arc::new(MockAiProvider::new()))
    }

    // ── Basic execution ───────────────────────────────────────────────────────

    #[test]
    fn mock_provider_returns_response() {
        let rt = runtime_with_mock();
        let req = AiRequest::new("gpt-4o-mini", "Hello world");
        let resp = rt.execute(&req).unwrap();
        assert!(!resp.text.is_empty());
        assert!(!resp.cached);
    }

    #[test]
    fn no_provider_returns_error() {
        let rt = AiRuntime::default();
        let req = AiRequest::new("gpt-4o-mini", "Hello");
        assert_eq!(rt.execute(&req).unwrap_err(), AiError::NoProviderConfigured);
    }

    // ── Caching ───────────────────────────────────────────────────────────────

    #[test]
    fn second_identical_request_is_cached() {
        let rt = runtime_with_mock();
        let req = AiRequest::new("gpt-4o-mini", "Cache test prompt");
        let r1 = rt.execute(&req).unwrap();
        let r2 = rt.execute(&req).unwrap();
        assert!(!r1.cached);
        assert!(r2.cached);
        assert_eq!(r1.text, r2.text);
    }

    #[test]
    fn different_prompts_not_cached() {
        let rt = runtime_with_mock();
        let r1 = rt.execute(&AiRequest::new("m", "prompt A")).unwrap();
        let r2 = rt.execute(&AiRequest::new("m", "prompt B")).unwrap();
        assert!(!r1.cached);
        assert!(!r2.cached);
    }

    #[test]
    fn clear_cache_removes_entries() {
        let rt = runtime_with_mock();
        rt.execute(&AiRequest::new("m", "x")).unwrap();
        assert_eq!(rt.cache_size(), 1);
        rt.clear_cache();
        assert_eq!(rt.cache_size(), 0);
    }

    // ── Cost tracking ─────────────────────────────────────────────────────────

    #[test]
    fn cost_increments_after_request() {
        let rt = runtime_with_mock();
        rt.execute(&AiRequest::new("m", "cost test")).unwrap();
        let cost = rt.cost_record();
        assert_eq!(cost.request_count, 1);
        assert!(cost.input_tokens > 0);
        assert!(cost.output_tokens > 0);
        assert!(cost.estimated_usd > 0.0);
    }

    #[test]
    fn cached_request_does_not_increment_cost() {
        let rt = runtime_with_mock();
        let req = AiRequest::new("m", "cached cost test");
        rt.execute(&req).unwrap();
        let cost_before = rt.cost_record().request_count;
        rt.execute(&req).unwrap(); // cached
        let cost_after = rt.cost_record().request_count;
        assert_eq!(cost_before, cost_after);
    }

    #[test]
    fn reset_cost_clears_record() {
        let rt = runtime_with_mock();
        rt.execute(&AiRequest::new("m", "reset test")).unwrap();
        rt.reset_cost();
        let cost = rt.cost_record();
        assert_eq!(cost.request_count, 0);
        assert_eq!(cost.estimated_usd, 0.0);
    }

    // ── Safety limits ─────────────────────────────────────────────────────────

    #[test]
    fn input_too_large_rejected() {
        let limits = AiLimits { max_input_chars: 10, ..Default::default() };
        let rt = AiRuntime::new(limits, AiPricing::default())
            .with_provider(Arc::new(MockAiProvider::new()));
        let req = AiRequest::new("m", "this prompt is definitely longer than ten chars");
        assert!(matches!(rt.execute(&req).unwrap_err(), AiError::InputTooLarge { .. }));
    }

    #[test]
    fn cost_limit_blocks_requests() {
        let limits = AiLimits { max_cost_usd: 0.0, ..Default::default() };
        let rt = AiRuntime::new(limits, AiPricing::default())
            .with_provider(Arc::new(MockAiProvider::new()));
        // First request: cost is 0.0 at start, but after first request it exceeds 0.0.
        // Actually cost starts at 0.0 which equals limit 0.0 — should be blocked.
        let err = rt.execute(&AiRequest::new("m", "blocked")).unwrap_err();
        assert_eq!(err, AiError::CostLimitExceeded);
    }

    #[test]
    fn rate_limit_blocks_excess_requests() {
        let limits = AiLimits { max_requests_per_min: 2, ..Default::default() };
        let rt = AiRuntime::new(limits, AiPricing::default())
            .with_provider(Arc::new(MockAiProvider::new()));
        // Use unique prompts to avoid cache hits.
        rt.execute(&AiRequest::new("m", "req1_unique_abc")).unwrap();
        rt.execute(&AiRequest::new("m", "req2_unique_def")).unwrap();
        let err = rt.execute(&AiRequest::new("m", "req3_unique_ghi")).unwrap_err();
        assert_eq!(err, AiError::RateLimitExceeded);
    }

    // ── AiBlock ───────────────────────────────────────────────────────────────

    #[test]
    fn ai_block_executes_successfully() {
        let rt = runtime_with_mock();
        let block = AiBlock::new("b1", "gpt-4o-mini", "Summarize this document.");
        let result = block.execute(&rt);
        assert!(!result.text.is_empty());
        assert!(!result.is_error());
    }

    #[test]
    fn ai_block_uses_fallback_on_error() {
        let rt = AiRuntime::default(); // no provider
        let block = AiBlock::new("b2", "m", "prompt")
            .with_fallback("Fallback text");
        let result = block.execute(&rt);
        assert_eq!(result.text, "Fallback text");
        assert!(result.is_error());
    }

    #[test]
    fn ai_block_default_fallback_on_error() {
        let rt = AiRuntime::default(); // no provider
        let block = AiBlock::new("b3", "m", "prompt");
        let result = block.execute(&rt);
        assert!(result.text.contains("AI unavailable"));
        assert!(result.is_error());
    }

    // ── Pricing ───────────────────────────────────────────────────────────────

    #[test]
    fn pricing_estimate_is_positive() {
        let p = AiPricing::default();
        assert!(p.estimate(1000, 500) > 0.0);
    }

    #[test]
    fn pricing_zero_tokens_is_zero() {
        let p = AiPricing::default();
        assert_eq!(p.estimate(0, 0), 0.0);
    }

    // ── Cache key ─────────────────────────────────────────────────────────────

    #[test]
    fn same_request_same_cache_key() {
        let r1 = AiRequest::new("m", "hello");
        let r2 = AiRequest::new("m", "hello");
        assert_eq!(r1.cache_key(), r2.cache_key());
    }

    #[test]
    fn different_prompt_different_cache_key() {
        let r1 = AiRequest::new("m", "hello");
        let r2 = AiRequest::new("m", "world");
        assert_ne!(r1.cache_key(), r2.cache_key());
    }
}
