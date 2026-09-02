# LDOC SDK

## Overview

The LDOC SDK (`ldoc-sdk`) provides a clean public API for working with `.ldocx` documents programmatically.

## Rust SDK

### LdocDocument

Load and inspect a `.ldocx` file.

```rust
use ldoc_sdk::document::LdocDocument;

let bytes = std::fs::read("my-doc.ldocx")?;
let doc = LdocDocument::from_bytes(bytes)?;

println!("Title:  {}", doc.title());
println!("Author: {}", doc.author());
println!("Pages:  {}", doc.page_count());

let validation = doc.validate();
println!("Valid:  {}", validation.valid);

let pages = doc.pages();
for page in &pages {
    println!("  {} — {}", page.number, page.title);
}
```

### LdocSession

Interactive runtime session for a document.

```rust
use ldoc_sdk::session::LdocSession;

let bytes = std::fs::read("my-doc.ldocx")?;
let mut session = LdocSession::from_bytes(bytes)?;

session.open_entry()?;
session.set_field("username", "alice");
session.submit_form("login_form")?;
session.set_state("theme", "dark");

let theme = session.get_state("theme");
println!("Theme: {:?}", theme);
```

### LdocApi

Multi-document registry for server use.

```rust
use ldoc_sdk::api::LdocApi;

let api = LdocApi::new();

let bytes = std::fs::read("doc.ldocx")?;
let id = api.create_document(bytes)?;

let doc = api.get_document(&id)?;
let pages = api.get_pages(&id)?;
let validation = api.validate_document(&id)?;
```

### LdocPluginManager

```rust
use ldoc_sdk::plugins::LdocPluginManager;

let pm = LdocPluginManager::new();
pm.load("my.plugin.id", manifest, bundle)?;
pm.call("my.plugin.id", "method", args)?;
pm.unload("my.plugin.id")?;
```

### LdocAiRuntime

```rust
use ldoc_sdk::ai::{LdocAiRuntime, MockAiProvider};

let mut ai = LdocAiRuntime::new();
ai.set_provider(Box::new(MockAiProvider::new()));

let response = ai.complete("Summarise this document", None)?;
println!("{}", response.content);
println!("Tokens: {}", response.tokens_used);
println!("Cost:   ${:.6}", ai.total_cost());
```

## REST API

The `ldoc-server` binary exposes a REST API.

### Start server

```
ldoc-server
# Listening on http://127.0.0.1:8080
```

### Endpoints

#### POST /documents

Upload a `.ldocx` file. Returns document ID.

```
POST /documents
Content-Type: application/octet-stream
Body: <raw .ldocx bytes>

Response 201:
{"id": "a1b2c3d4"}
```

#### GET /documents/:id

Get document metadata.

```
GET /documents/a1b2c3d4

Response 200:
{
  "id": "a1b2c3d4",
  "title": "My Document",
  "author": "Alice",
  "page_count": 12,
  "raw_size": 48210,
  "valid": true
}
```

#### GET /documents/:id/pages

Get page list.

```
GET /documents/a1b2c3d4/pages

Response 200:
[
  {"id": "page_001", "title": "Welcome", "number": 1},
  {"id": "page_002", "title": "Content", "number": 2}
]
```

#### POST /documents/:id/validate

Validate a document.

```
POST /documents/a1b2c3d4/validate

Response 200:
{
  "valid": true,
  "checks": ["magic", "header", "zip", "manifest", "metadata", "pages"]
}
```

## WebSocket API

Connect to `ws://127.0.0.1:8080/ws` for real-time events.

### Events

```json
{"event": "connected", "server": "ldoc-server", "version": "1.0.0"}
{"event": "document_loaded", "id": "a1b2c3d4"}
{"event": "validation_completed", "id": "a1b2c3d4", "valid": true}
```

### Example (JavaScript)

```javascript
const ws = new WebSocket('ws://127.0.0.1:8080/ws');
ws.onmessage = (e) => {
  const event = JSON.parse(e.data);
  console.log(event.event, event);
};
```

## Build

```
cargo build --release -p ldoc-sdk
```

Produces:
- `target\release\ldoc-server.exe`

## Tests

```
cargo test --release -p ldoc-sdk
```

45 tests (unit + integration + security), 0 failures.

## Deferred

- JavaScript/TypeScript SDK — PLATFORM LIMITATION (separate npm package required)
- Python SDK — PLATFORM LIMITATION (separate pyproject required)
