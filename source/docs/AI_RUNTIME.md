# LDOC AI Runtime

## Overview

The LDOC AI Runtime provides a provider-abstracted AI execution layer for `ai_block` and `ai_summary` content nodes.

## Architecture

```
ai_block / ai_summary node
    │
    ▼
AiRuntime (ldoc-runtime)
    │  checks cache
    │  checks rate limit
    │  checks cost limit
    │  checks input size
    ▼
Provider Adapter
    │
    ▼
Model (OpenAI-compatible / Anthropic-compatible / Local / Mock)
    │
    ▼
Response
    │  checks output size
    │  stores in cache
    │  records cost
    ▼
State / UI
```

## Configuration

All configuration via environment variables — no hardcoded credentials.

| Variable | Description |
|----------|-------------|
| `LDOC_AI_PROVIDER` | Provider name (`openai`, `anthropic`, `local`, `mock`) |
| `LDOC_AI_API_KEY` | API key |
| `LDOC_AI_MODEL` | Model name (e.g. `gpt-4o`, `claude-3-5-sonnet`) |
| `LDOC_AI_BASE_URL` | Base URL for OpenAI-compatible endpoints |
| `LDOC_AI_MAX_TOKENS` | Max output tokens per request |
| `LDOC_AI_TIMEOUT_SECS` | Request timeout in seconds |
| `LDOC_AI_RATE_LIMIT` | Max requests per minute |
| `LDOC_AI_COST_LIMIT` | Max total cost per session (USD) |

## Rust SDK Usage

```rust
use ldoc_sdk::ai::{LdocAiRuntime, MockAiProvider};

let mut ai = LdocAiRuntime::new();

// Use mock provider for testing
ai.set_provider(Box::new(MockAiProvider::new()));

// Execute a completion
let response = ai.complete("Summarise this document", None)?;
println!("Response: {}", response.content);
println!("Tokens:   {}", response.tokens_used);

// Cost tracking
println!("Requests: {}", ai.request_count());
println!("Cost:     ${:.6}", ai.total_cost());

// Cache management
ai.clear_cache();
```

## Caching

Deterministic requests are cached by input hash:

- Cache key: `hash(model + prompt + system_prompt)`
- Cache hit: returns stored response, does not increment cost
- Cache miss: calls provider, stores response

## Cost Tracking

```rust
ai.total_cost()      // total estimated cost this session
ai.request_count()   // total requests made
```

Pricing is configurable — not hardcoded. Provider pricing changes are handled by updating configuration, not code.

## Safety Controls

| Control | Default |
|---------|---------|
| Max input tokens | 4096 |
| Max output tokens | 2048 |
| Request timeout | 30 seconds |
| Rate limit | 60 req/min |
| Cost limit | $1.00/session |

All limits configurable. Requests exceeding limits return an error — never silently dropped.

## Fallback Strategy

If the primary provider fails:
1. Return cached response if available
2. Return configured fallback text
3. Return error with clear message

Never crash the document runtime due to AI failure.

## Providers

| Provider | Status |
|----------|--------|
| MockAiProvider | ✅ Implemented — for testing |
| OpenAI-compatible | 🟡 Adapter interface defined — requires API key |
| Anthropic-compatible | 🟡 Adapter interface defined — requires API key |
| Local model | 🟡 Adapter interface defined — requires local endpoint |

## Tests

```
cargo test --release -p ldoc-runtime ai::
cargo test --release -p ldoc-sdk ai::
```

25 AI tests (runtime) + 7 AI tests (SDK) = 32 total, 0 failures.
