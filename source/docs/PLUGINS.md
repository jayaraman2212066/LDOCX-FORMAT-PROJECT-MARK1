# LDOC Plugin System

## Overview

The LDOC plugin system provides a sandboxed, permission-controlled extension mechanism.

## Architecture

```
Plugin Bundle (bytes)
    │
    ▼
PluginValidator — validates manifest, semver, plugin ID format
    │
    ▼
PluginLoader — loads bundle, resolves dependencies
    │
    ▼
PluginLifecycle — DISCOVER → VALIDATE → LOAD → INIT → RUN → UNLOAD
    │
    ▼
PluginHost — permission-enforced method dispatch
    │
    ▼
PluginIpc — inter-plugin messaging
    │
    ▼
PluginStorage — isolated per-plugin key-value store
```

## Plugin Manifest

Every plugin declares its identity and required permissions:

```json
{
  "id": "com.example.my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "schema_version": "1",
  "description": "Does something useful",
  "capabilities": ["storage", "document"],
  "dependencies": {
    "com.example.other-plugin": "^1.0.0"
  }
}
```

## Capabilities

| Capability | Access Granted |
|-----------|---------------|
| `storage` | Plugin-isolated key-value store |
| `document` | Read document content and metadata |
| `ui` | Emit UI events |
| `network` | HTTP requests (future) |
| `ai` | AI runtime access |
| `filesystem` | Filesystem read (explicit grant only) |
| `filesystem.write` | Filesystem write (explicit grant only) |

Undeclared capabilities are denied at runtime. No capability grants unrestricted host access.

## Plugin Lifecycle

```
DISCOVERED
    │ validate()
    ▼
VALIDATED
    │ load()
    ▼
LOADED
    │ init()
    ▼
INITIALIZED
    │ start()
    ▼
RUNNING ◄──── resume()
    │               ▲
    │ pause()       │
    ▼               │
PAUSED ─────────────┘
    │ unload()
    ▼
UNLOADED
```

Crash → CRASHED → can transition to UNLOADED.

## Using Plugins (Rust SDK)

```rust
use ldoc_sdk::plugins::LdocPluginManager;

let pm = LdocPluginManager::new();

// Load a plugin
pm.load("com.example.my-plugin", manifest_json, bundle_bytes)?;

// Call a method (permission checked automatically)
let result = pm.call("com.example.my-plugin", "process", args)?;

// Unload
pm.unload("com.example.my-plugin")?;
```

## Dependency Resolution

The dependency resolver:
- Resolves linear chains
- Resolves diamond dependencies without duplication
- Detects version conflicts
- Detects circular dependencies
- Supports caret (`^`) and exact version constraints

## IPC (Inter-Plugin Communication)

Plugins communicate via named channels:

```
Plugin A → send("channel_name", message) → Plugin B
Plugin B → poll("channel_name") → message
```

Broadcast sends to all registered receivers on a channel.

## Storage

Each plugin has an isolated key-value store:

```
plugin.storage.set("key", "value")
plugin.storage.get("key")
plugin.storage.delete("key")
plugin.storage.clear()
```

Quota enforced per plugin. TTL-based expiry supported.

## Security

- Plugins cannot access other plugins' storage
- Undeclared capabilities are denied
- Trust levels enforced (Untrusted, Sandboxed, Trusted, System)
- Plugin IDs must follow `vendor.name` format
- Semver validated on load
- No unrestricted host execution

## Tests

```
cargo test --release -p ldoc-sdk --test plugin_tests
cargo test --release -p ldoc-core   # plugin_runtime unit tests (68)
```

86 plugin tests total, 0 failures.
