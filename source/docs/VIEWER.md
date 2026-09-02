# LDOC Viewer

## Overview

The LDOC Viewer (`ldoc-view`) is a terminal-based document viewer that opens real `.ldocx` files.

## Launch

```
ldoc view <file.ldocx>
```

or directly:

```
target\release\ldoc-view.exe <file.ldocx>
```

## Architecture

```
.ldocx file
    │
    ▼
DocumentLoader
    │
    ▼
PageManager
    │
    ▼
InteractiveSession
    │
    ▼
Terminal Renderer
    │
    ▼
User Interface
```

## UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│ LDOC Viewer v2.0.0          [Document Title]   Validation ✓  │
├───────────────────┬──────────────────────────────────────────┤
│ Pages             │                                          │
│                   │  [Page Title]                            │
│  1 Welcome        │                                          │
│  2 Content        │  [Content rendered here]                 │
│  3 Tables         │                                          │
│  4 Forms          │  heading, paragraph, list, code,         │
│  5 Media          │  table, form, image, audio, video,       │
│  6 Interactivity  │  ai_block, quote, button                 │
│  7 AI             │                                          │
│  8 Accessibility  │                                          │
│  9 Security       │                                          │
│ 10 Architecture   │                                          │
│ 11 Advanced       │                                          │
│ 12 System Info    │                                          │
│                   │                                          │
├───────────────────┴──────────────────────────────────────────┤
│  [P]rev  [N]ext  [F]irst  [L]ast  [G]oto  [V]alidate  [Q]uit │
│                        3 / 12                                 │
└──────────────────────────────────────────────────────────────┘
```

## Keyboard Controls

| Key | Action |
|-----|--------|
| N / → | Next page |
| P / ← | Previous page |
| F | First page |
| L | Last page |
| G | Go to page number |
| V | Show validation panel |
| Q / Esc | Quit |

## Validation Panel

Displays real validation results from the document:

```
LDOC Validation
───────────────
✓ Magic bytes
✓ Header CRC
✓ ZIP container
✓ manifest.json
✓ metadata.json
✓ pages/index.json
✓ Content nodes
✓ Asset index
✓ Hash verification
✓ Feature flags

Document: VALID
```

All statuses come from actual validation results — never fabricated.

## Content Rendering

Supported node types rendered in terminal:

| Node Type | Rendering |
|-----------|-----------|
| heading | Bold text with H1-H6 prefix |
| paragraph | Wrapped text |
| list / list_item | Bullet or numbered list |
| code_block | Indented monospace with language label |
| quote | Indented with `>` prefix |
| table | ASCII table with borders |
| form | Field labels and input placeholders |
| image | `[Image: alt_text]` |
| audio | `[Audio: src]` |
| video | `[Video: src]` |
| ai_block | `[AI: prompt]` with response if cached |
| button | `[Button: label]` |
| container | Renders children |
| unknown | `[Unsupported node: type]` — never crashes |

## Accessibility

- Semantic heading hierarchy preserved in output
- Alt text displayed for images
- Form labels shown
- Reading order follows content tree order

## Build

```
cargo build --release -p ldoc-runtime
```

Produces: `target\release\ldoc-view.exe`

## Showcase

```
ldoc view ldoc-core\examples\ldoc-showcase.ldocx
```
