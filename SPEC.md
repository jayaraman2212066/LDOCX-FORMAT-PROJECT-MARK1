# LDOCX Container & AST Specification

**Standard Version:** 2.5.0  
**MIME Type:** `application/vnd.ldocx`  
**License:** Open Standard (MIT / Apache-2.0 for SDK & Viewer)

---

## 1. Container Architecture (ZIP Envelope)

An `.ldocx` document is an open, standards-based ZIP package containing:
- `manifest.json`: Package metadata, schema version, generator info.
- `document.json`: Primary document AST (pages, blocks, styles).
- `checksum.sha256`: Cryptographic SHA-256 signatures for package integrity.
- `assets/`, `models/`, `audio/`, `video/`: Embedded or streamed media resources.

---

## 2. Core AST Hierarchy
- Document: `{ schema_version: "2.5.0", title, author, theme, pages: [...] }`
- Page: `{ id, title, fx, blocks: [...] }`
- Standard Block Types:
  - `heading`, `paragraph`, `quote`, `list`, `code`, `table`
  - `3d_model`, `web_video`, `web_audio`, `button`, `form`, `feature_grid`, `live_feed`, `preorder`

---

## 3. Two-Tier Licensing Model
- **Tier 1 (Open-Source)**: `@ldoc/sdk` parser, serializer, and standalone viewer are free and open-source (MIT).
- **Tier 2 (Proprietary Studio & Cloud)**: Multi-user cloud collaboration, server-side Draco 3D optimization, and enterprise VIP lead routing.
