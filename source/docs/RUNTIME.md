# LDOC Runtime

## Overview

The LDOC Runtime (`ldoc-runtime`) is the execution engine that loads, validates, and runs `.ldocx` documents.

## Lifecycle

```
UNINITIALIZED
    │ initialize()
    ▼
INITIALIZED
    │ start()
    ▼
RUNNING ◄──── resume()
    │               ▲
    │ pause()       │
    ▼               │
PAUSED ─────────────┘
    │ shutdown()
    ▼
SHUTDOWN
    │
    ▼
DESTROYED
```

## Key Components

### RuntimeKernel

Central state machine. Controls lifecycle transitions. Owns all sub-systems.

```rust
let kernel = Arc::new(RuntimeKernel::new(64 * 1024 * 1024)?);
kernel.initialize()?;
kernel.start()?;
// ... use runtime ...
kernel.shutdown()?;
```

### DocumentLoader

Loads a `.ldocx` file from bytes. Validates header, opens ZIP, parses manifest and metadata, builds PageManager.

```rust
let loader = DocumentLoader::new();
let doc = loader.load(bytes)?;
// doc.page_manager() — PageManager
// doc.title()        — document title
// doc.author()       — document author
```

### PageManager

Manages page navigation and hierarchy.

```rust
let pm = doc.page_manager();
pm.open_entry()?;          // open entry page
pm.next()?;                // next page
pm.previous()?;            // previous page
pm.open_by_id("page_001")?;
pm.open_by_number(3)?;
pm.first()?;
pm.last()?;
pm.list_pages()            // all pages
pm.list_visible_pages()    // visible pages only
pm.current_number()        // 1-based current page number
pm.page_count()            // total pages
```

### InteractiveSession

Handles user interaction: events, form state, page navigation, data binding.

```rust
let session = InteractiveSession::new(doc);
session.open_entry()?;
session.set_field("name", "Alice");
session.submit_form("contact_form")?;
session.handle_click("btn_next")?;
session.set_state("theme", "dark");
let val = session.get_state("theme");
```

### StateManager

Persistent session state with snapshot support.

```rust
let sm = StateManager::new();
sm.set("key", "value");
sm.get("key");
sm.delete("key");
sm.snapshot("checkpoint_1")?;
sm.restore("checkpoint_1")?;
```

### EventDispatcher

Routes events to registered listeners.

```rust
let dispatcher = EventDispatcher::new(1000);
dispatcher.register("page_enter", priority, handler);
dispatcher.dispatch(event);
dispatcher.history()       // recent events
dispatcher.statistics()    // (total, delivered)
```

### VirtualFileSystem

Abstracts the ZIP container. Enforces path security.

- Blocks `..` path traversal
- Blocks absolute paths
- Blocks null bytes
- Enforces 64 MB per-entry decompressed size limit (ZIP bomb protection)

### AiRuntime

Provider-abstracted AI execution.

```rust
let ai = AiRuntime::new();
ai.set_provider(Box::new(MockAiProvider::new()));
let response = ai.execute_block(&block)?;
// Caching, cost tracking, rate limiting, timeouts all automatic
```

Provider configured via environment variables:
- `LDOC_AI_PROVIDER` — provider name
- `LDOC_AI_API_KEY` — API key (never hardcoded)
- `LDOC_AI_MODEL` — model name

## Performance Targets

| Metric | Target | Measured |
|--------|--------|---------|
| Document load | < 100ms | < 5ms |
| Page navigation | < 10ms | < 1ms |
| State get/set | < 1ms | < 0.1ms |
| Baseline memory | < 50MB | ~8MB |

## Error Handling

All errors return `RuntimeResult<T>` = `Result<T, RuntimeError>`.

Never panics on malformed input. All 25 security/malformed document tests pass.

## Build

```
cargo build --release -p ldoc-runtime
```

## Tests

```
cargo test --release -p ldoc-runtime
```

288 unit tests, 0 failures.
