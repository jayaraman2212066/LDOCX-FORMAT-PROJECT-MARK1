# LDOC Architecture

## Overview

LDOC is a binary document format and runtime platform. A `.ldocx` file is a 64-byte binary header followed by a ZIP container.

```
.ldocx file
├── [0..64]   Binary header
│   ├── [0..4]   Magic bytes: 0x4C 0x44 0x4F 0x43 ("LDOC")
│   ├── [4..8]   Format version (u32 LE)
│   ├── [8..10]  Feature flags (u16 LE)
│   ├── [10..12] Reserved
│   ├── [12..16] CRC-32 of header bytes 0..12
│   ├── [16..32] UUID (16 bytes)
│   ├── [32..36] Creation timestamp (u32 Unix epoch)
│   └── [36..64] Reserved / padding
└── [64..]    ZIP container
    ├── manifest.json
    ├── metadata/
    │   └── metadata.json
    ├── pages/
    │   ├── index.json
    │   └── page_NNN/
    │       ├── content.json
    │       └── layout.json
    ├── assets/
    │   ├── index.json
    │   └── <asset files>
    ├── scripts/
    ├── security/
    │   └── hashes.json
    └── signatures/
        └── signatures.json
```

## Crate Structure

```
general_LDFX/
├── ldoc-core/       — Format, builder, validator, CLI (ldoc binary)
├── ldoc-runtime/    — Runtime kernel, loader, viewer (ldoc-view binary)
├── ldoc-sdk/        — Public SDK, REST+WS server (ldoc-server binary)
└── Cargo.toml       — Workspace root
```

## ldoc-core

Owns the format definition and all Phase 1 functionality.

| Module | Responsibility |
|--------|---------------|
| `header` | Binary header encode/decode, magic, CRC |
| `container` | ZIP read/write, entry management |
| `manifest` | manifest.json schema and parsing |
| `metadata` | metadata.json schema and parsing |
| `pages` | pages/index.json, page entries, content nodes |
| `builder` | DynamicDocumentBuilder fluent API |
| `validator` | Full validation pipeline |
| `cli` | `ldoc` binary: pack, pack-dynamic, validate, inspect, version, view, edit |

## ldoc-runtime

Owns the runtime execution environment.

| Module | Responsibility |
|--------|---------------|
| `kernel` | RuntimeKernel — lifecycle state machine |
| `loader` | DocumentLoader — opens .ldocx, populates PageManager |
| `page_manager` | PageManager — navigation, hierarchy |
| `interactive` | InteractiveSession — events, state, forms |
| `state` | StateManager — session state, snapshots |
| `dispatcher` | EventDispatcher — event routing |
| `vfs` | VirtualFileSystem — ZIP abstraction, path validation |
| `assets` | AssetPipeline — asset loading, decompression |
| `ai` | AiRuntime — provider abstraction, caching, cost tracking |
| `plugins` | PluginRegistry + plugin_runtime sub-crate |
| `plugin_host` | PluginHost — permission-enforced plugin execution |
| `security` | SecurityManager — permission checks, audit |
| `boot` | BootManager — phased startup |
| `cache` | CacheSystem — LRU multi-tier cache |
| `config` | ConfigSystem — layered configuration |
| `context` | DocumentContext — document metadata and stats |
| `performance` | PerformanceMonitor — timing, memory |
| `health` | HealthMonitor — component health |
| `inspector` | RuntimeInspector — profiling, snapshots |
| `logger` | RuntimeLogger — structured logging, ring buffer |
| `crash` | CrashReporter — crash capture and reporting |
| `lifecycle` | LifecycleManager — state transitions |
| `language` | LanguageService — i18n |
| `theme` | ThemeService — theming |
| `resources` | ResourcePool — reference-counted resource management |
| `api` | RuntimeHandle — public API surface |
| `platform` | PlatformAdapter — OS abstraction |

## ldoc-sdk

Public-facing SDK and server.

| Module | Responsibility |
|--------|---------------|
| `document` | LdocDocument — load, validate, inspect |
| `session` | LdocSession — interactive runtime session |
| `api` | LdocApi — multi-document registry |
| `plugins` | LdocPluginManager — plugin lifecycle |
| `ai` | LdocAiRuntime — AI provider abstraction |
| `server_main` | ldoc-server binary — REST + WebSocket |

## Data Flow

```
.ldocx file
    │
    ▼
DocumentLoader (ldoc-runtime)
    │  reads header, validates magic/CRC
    │  opens ZIP via VirtualFileSystem
    │  parses manifest.json + metadata.json
    │  builds PageManager
    ▼
RuntimeKernel
    │  BOOT → LOAD → VALIDATE → INITIALIZE → READY
    ▼
InteractiveSession
    │  page navigation, form state, events
    ▼
EventDispatcher → StateManager → UI / Viewer
```

## Security Architecture

- Path traversal: blocked in VirtualFileSystem.validate_path()
- ZIP bomb: 64 MB per-entry decompressed size limit in VirtualFileSystem
- Magic validation: first 4 bytes must be 0x4C44 4F43
- CRC validation: header bytes 0..12 verified against bytes 12..16
- Plugin permissions: declared capabilities checked before every call
- No eval(), no shell execution, no arbitrary filesystem access
- Credentials: environment variables only, never in source or documents

## Feature Flags (u16 bitmask in header)

| Bit | Feature |
|-----|---------|
| 0 | Scripts |
| 1 | AI |
| 2 | Plugins |
| 3 | Encryption |
| 4 | Digital Signature |
| 5 | Annotations |
| 6 | Collaboration |
| 7 | Cloud Sync |
| 8 | 3D |
| 9 | Video |
| 10 | Audio |
| 11 | Forms |
| 12 | Version History |
| 13 | Readonly |
