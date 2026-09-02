# LDOC Editor

## Overview

The LDOC Editor (`ldoc edit`) is a terminal-based document editor that creates valid `.ldocx` files.

## Launch

```
ldoc edit [output.ldocx]
```

If no output path is given, defaults to `output.ldocx`.

## Workflow

```
ldoc edit my-doc.ldocx
    │
    ▼
Interactive terminal editor
    │
    ▼
Commands: title, author, lang, page, h1/h2/h3, p, li, code, quote, table, form, ai
    │
    ▼
save
    │
    ▼
DynamicDocumentBuilder → .ldocx file
    │
    ▼
ldoc validate my-doc.ldocx   ← verify output
    │
    ▼
ldoc view my-doc.ldocx        ← open in viewer
```

## Commands

| Command | Description |
|---------|-------------|
| `title <text>` | Set document title |
| `author <name>` | Set document author |
| `lang <code>` | Set language (e.g. `en`, `fr`) |
| `page <title>` | Add a new page |
| `h1 <text>` | Add H1 heading to current page |
| `h2 <text>` | Add H2 heading |
| `h3 <text>` | Add H3 heading |
| `p <text>` | Add paragraph |
| `li <text>` | Add list item |
| `code <lang> <text>` | Add code block |
| `quote <text>` | Add blockquote |
| `table <cols> <rows>` | Add table scaffold |
| `form <id>` | Add form |
| `ai <prompt>` | Add AI block |
| `status` | Show current document state |
| `preview` | Preview current page content |
| `save` | Save and generate .ldocx file |
| `quit` / `exit` | Exit without saving |
| `help` | Show command list |

## Output

The editor uses `DynamicDocumentBuilder` internally. The saved `.ldocx` file:

- Has a valid 64-byte binary header with magic bytes and CRC
- Contains a valid ZIP container
- Passes `ldoc validate`
- Opens correctly in `ldoc view`

## Example Session

```
ldoc edit demo.ldocx

> title My First Document
> author Alice
> page Introduction
> h1 Welcome to LDOC
> p This is a living document format.
> li Feature 1
> li Feature 2
> page Details
> h2 Technical Details
> code rust fn main() { println!("Hello"); }
> save

Saved: demo.ldocx (4821 bytes)
Validation: PASS

> quit
```

## Build

```
cargo build --release -p ldoc-core
```

The `ldoc edit` command is part of the `ldoc` binary.
