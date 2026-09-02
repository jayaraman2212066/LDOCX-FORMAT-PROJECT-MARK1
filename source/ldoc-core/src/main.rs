// LDOC CLI — Phase 1 + Stage 5 Editor
// Commands: validate, pack, pack-dynamic, pack-showcase, inspect, edit

use std::{fs, io::{self, BufRead, Write}, path::PathBuf, process};
use ldoc_core::{DocumentBuilder, DynamicDocumentBuilder, DynamicPage, ContentBlock, DynamicFeatures, FormField, Validator, ValidationResult, Severity};

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 {
        print_usage();
        process::exit(1);
    }

    match args[1].as_str() {
        "validate"      => cmd_validate(&args),
        "pack"           => cmd_pack(&args),
        "pack-dynamic"   => cmd_pack_dynamic(&args),
        "pack-showcase"  => cmd_pack_showcase(&args),
        "pack-newspaper" => cmd_pack_newspaper(&args),
        "pack-ultimate"  => cmd_pack_ultimate(&args),
        "pack-premium"   => cmd_pack_premium(&args),
        "pack-gt6"       => cmd_pack_gt6(&args),
        "inspect"        => cmd_inspect(&args),
        "edit"           => cmd_edit(&args),
        "view"           => cmd_view(&args),
        "version"        => println!("ldoc {}", ldoc_core::SPEC_VERSION),
        _ => {
            eprintln!("Unknown command: {}", args[1]);
            print_usage();
            process::exit(1);
        }
    }
}

// ── validate ──────────────────────────────────────────────────────────────────
// Usage: ldoc validate <file.ldocx>

fn cmd_validate(args: &[String]) {
    if args.len() < 3 {
        eprintln!("Usage: ldoc validate <file.ldocx>");
        process::exit(1);
    }
    let path = PathBuf::from(&args[2]);
    let data = match fs::read(&path) {
        Ok(d) => d,
        Err(e) => { eprintln!("Cannot read '{}': {e}", path.display()); process::exit(1); }
    };

    println!("Validating: {}", path.display());
    println!("File size : {} bytes", data.len());
    println!();

    let report = Validator::validate_bytes(&data);

    // Print findings grouped by stage
    let mut last_stage = 0u8;
    for f in &report.findings {
        if f.stage != last_stage {
            println!("── Stage {} ──────────────────────────────────────────", f.stage);
            last_stage = f.stage;
        }
        let icon = match f.severity {
            Severity::Fatal   => "✗ FATAL  ",
            Severity::Warning => "⚠ WARNING",
            Severity::Info    => "ℹ INFO   ",
        };
        let path_str = f.path.as_deref().map(|p| format!(" [{p}]")).unwrap_or_default();
        println!("  {icon} [{}]{path_str} {}", f.code, f.message);
    }

    println!();
    println!("─────────────────────────────────────────────────────────");
    println!("Result  : {:?}", report.result);
    println!("Fatal   : {}", report.fatal_count);
    println!("Warnings: {}", report.warning_count);
    println!("Info    : {}", report.info_count);
    if let Some(id) = &report.document_id {
        println!("Doc ID  : {id}");
    }

    match report.result {
        ValidationResult::Pass | ValidationResult::PassWithWarnings => process::exit(0),
        ValidationResult::Fail => process::exit(2),
    }
}

// ── pack ──────────────────────────────────────────────────────────────────────
// Usage: ldoc pack --title "My Doc" --lang en --author "Name" --out output.ldocx

fn cmd_pack(args: &[String]) {
    let mut title  = "Untitled Document".to_string();
    let mut lang   = "en".to_string();
    let mut author = "Unknown".to_string();
    let mut out    = PathBuf::from("output.ldocx");

    let mut i = 2;
    while i < args.len() {
        match args[i].as_str() {
            "--title"  => { i += 1; if i < args.len() { title  = args[i].clone(); } }
            "--lang"   => { i += 1; if i < args.len() { lang   = args[i].clone(); } }
            "--author" => { i += 1; if i < args.len() { author = args[i].clone(); } }
            "--out"    => { i += 1; if i < args.len() { out    = PathBuf::from(&args[i]); } }
            _ => {}
        }
        i += 1;
    }

    println!("Packing document...");
    println!("  Title : {title}");
    println!("  Lang  : {lang}");
    println!("  Author: {author}");

    let bytes = match DocumentBuilder::new(&title, &lang, &author).build() {
        Ok(b) => b,
        Err(e) => { eprintln!("Build failed: {e}"); process::exit(1); }
    };

    if let Err(e) = fs::write(&out, &bytes) {
        eprintln!("Write failed: {e}");
        process::exit(1);
    }

    println!("Written : {} ({} bytes)", out.display(), bytes.len());

    // Auto-validate after packing
    println!();
    println!("Running validation on packed file...");
    let report = Validator::validate_bytes(&bytes);
    println!("Result  : {:?}", report.result);
    println!("Fatal   : {}", report.fatal_count);
    println!("Warnings: {}", report.warning_count);

    if !report.is_valid() {
        eprintln!("Packed file failed validation — this is a bug.");
        process::exit(3);
    }
    println!("✓ Document is valid.");
}

// ── inspect ───────────────────────────────────────────────────────────────────
// Usage: ldoc inspect <file.ldocx>

fn cmd_inspect(args: &[String]) {
    if args.len() < 3 {
        eprintln!("Usage: ldoc inspect <file.ldocx>");
        process::exit(1);
    }
    let path = PathBuf::from(&args[2]);
    let data = match fs::read(&path) {
        Ok(d) => d,
        Err(e) => { eprintln!("Cannot read '{}': {e}", path.display()); process::exit(1); }
    };

    if data.len() < 64 {
        eprintln!("File too small to be a valid LDOC file.");
        process::exit(1);
    }

    // Parse header
    match ldoc_core::header::LdocHeader::from_bytes(&data[..64]) {
        Ok(h) => {
            println!("═══════════════════════════════════════════════════════");
            println!(" LDOC Document Inspector");
            println!("═══════════════════════════════════════════════════════");
            println!("File            : {}", path.display());
            println!("File size       : {} bytes", data.len());
            println!();
            println!("── Binary Header (Module 02) ───────────────────────────");
            println!("  Magic         : LDOC (4C 44 4F 43)");
            println!("  Spec version  : {}", h.spec_version_string());
            println!("  Container type: {:#04x} (ZIP)", h.container_type);
            println!("  Feature flags : {:#06x}", h.feature_flags);
            println!("  Header flags  : {:#06x}", h.header_flags);
            println!("  Doc epoch     : {}", h.document_epoch);
            println!("  UUID prefix   : {}", hex::encode(h.instance_uuid_prefix));
            println!();

            // Feature flags breakdown
            println!("── Feature Flags ───────────────────────────────────────");
            let flags = [
                (ldoc_core::header::FLAG_HAS_SCRIPTS,         "HAS_SCRIPTS"),
                (ldoc_core::header::FLAG_HAS_AI,              "HAS_AI"),
                (ldoc_core::header::FLAG_HAS_PLUGINS,         "HAS_PLUGINS"),
                (ldoc_core::header::FLAG_HAS_ENCRYPTION,      "HAS_ENCRYPTION"),
                (ldoc_core::header::FLAG_HAS_DIGITAL_SIG,     "HAS_DIGITAL_SIG"),
                (ldoc_core::header::FLAG_HAS_ANNOTATIONS,     "HAS_ANNOTATIONS"),
                (ldoc_core::header::FLAG_HAS_COLLABORATION,   "HAS_COLLABORATION"),
                (ldoc_core::header::FLAG_HAS_CLOUD_SYNC,      "HAS_CLOUD_SYNC"),
                (ldoc_core::header::FLAG_HAS_3D,              "HAS_3D"),
                (ldoc_core::header::FLAG_HAS_VIDEO,           "HAS_VIDEO"),
                (ldoc_core::header::FLAG_HAS_AUDIO,           "HAS_AUDIO"),
                (ldoc_core::header::FLAG_HAS_FORMS,           "HAS_FORMS"),
                (ldoc_core::header::FLAG_HAS_VERSION_HISTORY, "HAS_VERSION_HISTORY"),
                (ldoc_core::header::FLAG_READONLY,            "READONLY"),
            ];
            for (mask, name) in &flags {
                let set = if h.feature_flags & mask != 0 { "✓" } else { "·" };
                println!("  {set} {name}");
            }
            println!();
        }
        Err(e) => {
            eprintln!("Header parse error: {e}");
            process::exit(1);
        }
    }

    // Parse manifest from ZIP
    let cursor = std::io::Cursor::new(&data);
    match ldoc_core::container::LdocZipReader::open(cursor) {
        Ok(mut zip) => {
            println!("── ZIP Entries ─────────────────────────────────────────");
            let mut names = zip.entry_names();
            names.sort();
            for name in &names {
                println!("  {name}");
            }
            println!();

            if let Ok(mb) = zip.read_entry("manifest.json") {
                if let Ok(m) = ldoc_core::manifest::Manifest::from_bytes(&mb) {
                    println!("── manifest.json (Module 05) ───────────────────────");
                    println!("  Document ID   : {}", m.document.id);
                    println!("  Title         : {}", m.document.title);
                    println!("  Language      : {}", m.document.language);
                    println!("  Direction     : {}", m.document.direction);
                    println!("  Type          : {}", m.document.document_type);
                    println!("  Pages         : {}", m.document.page_count);
                    println!("  Entry page    : {}", m.document.entry_page);
                    println!("  Spec version  : {}", m.document.spec_version);
                    println!("  Created at    : {}", m.document.created_at);
                    println!("  Modified at   : {}", m.document.modified_at);
                    println!("  Signed        : {}", m.security.signed);
                    println!("  Trust level   : {}", m.security.trust_level);
                    println!("  Hash algo     : {}", m.security.content_hash_algorithm);
                    println!();
                }
            }

            if let Ok(mb) = zip.read_entry("metadata/metadata.json") {
                if let Ok(m) = ldoc_core::metadata::Metadata::from_bytes(&mb) {
                    println!("── metadata/metadata.json (Module 06) ──────────────");
                    println!("  Doc version   : {}", m.version.document_version);
                    println!("  Revision      : {}", m.version.revision);
                    println!("  Is draft      : {}", m.version.is_draft);
                    println!("  License       : {}", m.license.name);
                    if let Some(spdx) = &m.license.spdx_id {
                        println!("  SPDX ID       : {spdx}");
                    }
                    println!("  Authors       : {}", m.authors.len());
                    for a in &m.authors {
                        println!("    - {} ({})", a.name, a.role);
                    }
                    println!();
                }
            }
        }
        Err(e) => eprintln!("ZIP open error: {e}"),
    }
}

fn print_usage() {
    println!("LDOC CLI v{}", ldoc_core::SPEC_VERSION);
    println!();
    println!("Usage:");
    println!("  ldoc validate <file.ldocx>                         Validate an LDOCX file");
    println!("  ldoc pack [--title T] [--lang L] [--author A]      Create a new LDOCX file");
    println!("            [--out file.ldocx]");
    println!("  ldoc pack-dynamic [--title T] [--lang L]           Create dynamic LDOCX file");
    println!("                    [--author A] [--out file.ldocx]");
    println!("  ldoc pack-showcase [--out file.ldocx]              Create 10-page showcase LDOCX");
    println!("  ldoc pack-newspaper [--out file.ldocx]             Create Harry Potter newspaper LDOCX");
    println!("  ldoc pack-ultimate  [--out file.ldocx]             Create premium all-features LDOCX with real media");
    println!("  ldoc pack-premium   [--out file.ldocx]             Create premium LDOCX with live web media URLs");
    println!("  ldoc inspect <file.ldocx>                          Inspect LDOCX file structure");
    println!("  ldoc edit [--out file.ldocx]                       Interactive terminal editor");
    println!("  ldoc view <file.ldocx>                             Open in terminal viewer");
    println!("  ldoc version                                        Print version");
}

// ── edit ──────────────────────────────────────────────────────────────────────────────
// Usage: ldoc edit [--out file.ldocx]
// Interactive terminal editor. Builds a document in memory, saves on demand.

/// In-memory editor state.
struct EditorState {
    title:   String,
    lang:    String,
    author:  String,
    pages:   Vec<DynamicPage>,
    current_page: Option<usize>,  // index into pages
    features: DynamicFeatures,
    dirty:   bool,
}

impl EditorState {
    fn new() -> Self {
        Self {
            title:   "Untitled".into(),
            lang:    "en".into(),
            author:  "Unknown".into(),
            pages:   Vec::new(),
            current_page: None,
            features: DynamicFeatures::default(),
            dirty:   false,
        }
    }

    fn summary(&self) {
        println!("  Title  : {}", self.title);
        println!("  Author : {}", self.author);
        println!("  Lang   : {}", self.lang);
        println!("  Pages  : {}", self.pages.len());
        if let Some(idx) = self.current_page {
            println!("  Current: Page {} — {}", idx + 1, self.pages[idx].title);
            println!("  Blocks : {}", self.pages[idx].content.len());
        } else {
            println!("  Current: (none)");
        }
        if self.dirty { println!("  Status : UNSAVED CHANGES"); }
    }

    fn add_page(&mut self, title: &str) {
        let num = self.pages.len() as u32 + 1;
        self.pages.push(DynamicPage::new(title, num));
        self.current_page = Some(self.pages.len() - 1);
        self.dirty = true;
        println!("  Added page {}: '{}'", num, title);
    }

    fn add_block(&mut self, block: ContentBlock) -> bool {
        if let Some(idx) = self.current_page {
            let page = &mut self.pages[idx];
            // DynamicPage.add_content consumes self, so we push directly
            page.content.push(block);
            self.dirty = true;
            true
        } else {
            println!("  No current page. Use 'page <title>' first.");
            false
        }
    }

    fn build(&self) -> Result<Vec<u8>, ldoc_core::LdocError> {
        if self.pages.is_empty() {
            return Err(ldoc_core::LdocError::ManifestFieldInvalid(
                "pages".into(), "Document must have at least one page".into()
            ));
        }
        let mut builder = DynamicDocumentBuilder::new(&self.title, &self.lang, &self.author);
        // Re-create features
        let mut f = DynamicFeatures::default();
        f.has_forms = self.features.has_forms;
        f.has_ai    = self.features.has_ai;
        builder = builder.with_features(f);
        // Clone pages into builder
        for page in &self.pages {
            let mut dp = DynamicPage::new(&page.title, page.number);
            for block in &page.content {
                dp.content.push(clone_block(block));
            }
            builder = builder.add_page(dp);
        }
        builder.build()
    }
}

/// Shallow-clone a ContentBlock (needed because DynamicPage.add_content moves).
fn clone_block(b: &ContentBlock) -> ContentBlock {
    match b {
        ContentBlock::Heading    { level, text }          => ContentBlock::Heading    { level: *level, text: text.clone() },
        ContentBlock::Paragraph  { text }                 => ContentBlock::Paragraph  { text: text.clone() },
        ContentBlock::List       { items }                => ContentBlock::List       { items: items.clone() },
        ContentBlock::CodeBlock  { code, language }       => ContentBlock::CodeBlock  { code: code.clone(), language: language.clone() },
        ContentBlock::Quote      { text }                 => ContentBlock::Quote      { text: text.clone() },
        ContentBlock::Image      { asset_id, alt_text }   => ContentBlock::Image      { asset_id: asset_id.clone(), alt_text: alt_text.clone() },
        ContentBlock::Audio      { asset_id, label }      => ContentBlock::Audio      { asset_id: asset_id.clone(), label: label.clone() },
        ContentBlock::Video      { asset_id, label }      => ContentBlock::Video      { asset_id: asset_id.clone(), label: label.clone() },
        ContentBlock::Table      { headers, rows }        => ContentBlock::Table      { headers: headers.clone(), rows: rows.clone() },
        ContentBlock::Form       { fields }               => ContentBlock::Form       { fields: fields.iter().map(|f| FormField { field_type: f.field_type.clone(), label: f.label.clone(), placeholder: f.placeholder.clone() }).collect() },
        ContentBlock::AiBlock    { prompt }               => ContentBlock::AiBlock    { prompt: prompt.clone() },
        ContentBlock::Custom     { node_type, value, style } => ContentBlock::Custom  { node_type: node_type.clone(), value: value.clone(), style: style.clone() },
    }
}

fn read_line(prompt: &str) -> String {
    print!("{}", prompt);
    io::stdout().flush().ok();
    let mut s = String::new();
    io::stdin().lock().read_line(&mut s).ok();
    s.trim().to_string()
}

fn cmd_edit(args: &[String]) {
    let mut out = PathBuf::from("edited.ldocx");
    let mut i = 2;
    while i < args.len() {
        if args[i] == "--out" { i += 1; if i < args.len() { out = PathBuf::from(&args[i]); } }
        i += 1;
    }

    let mut state = EditorState::new();

    println!("LDOC Editor v{}", ldoc_core::SPEC_VERSION);
    println!("Type 'help' for commands.");
    println!();

    loop {
        let input = read_line("ldoc-edit> ");
        let parts: Vec<&str> = input.splitn(2, ' ').collect();
        let cmd = parts[0];
        let rest = parts.get(1).copied().unwrap_or("").trim();

        match cmd {
            "help" | "h" | "?" => {
                println!("Commands:");
                println!("  title <text>          Set document title");
                println!("  author <text>         Set author");
                println!("  lang <code>           Set language (default: en)");
                println!("  page <title>          Add a new page and switch to it");
                println!("  h1 <text>             Add H1 heading to current page");
                println!("  h2 <text>             Add H2 heading");
                println!("  h3 <text>             Add H3 heading");
                println!("  p <text>              Add paragraph");
                println!("  li <item1|item2|...>  Add list (pipe-separated items)");
                println!("  code <lang> <text>    Add code block");
                println!("  quote <text>          Add blockquote");
                println!("  table                 Add table interactively");
                println!("  form                  Add form interactively");
                println!("  ai <prompt>           Add AI block");
                println!("  status                Show document status");
                println!("  preview               Preview current page content");
                println!("  save                  Save to {}", out.display());
                println!("  save <path>           Save to specific path");
                println!("  quit / q              Quit (warns if unsaved)");
            }
            "title" => {
                if rest.is_empty() { println!("  Usage: title <text>"); continue; }
                state.title = rest.to_string();
                state.dirty = true;
                println!("  Title set: '{}'", state.title);
            }
            "author" => {
                if rest.is_empty() { println!("  Usage: author <text>"); continue; }
                state.author = rest.to_string();
                state.dirty = true;
                println!("  Author set: '{}'", state.author);
            }
            "lang" => {
                if rest.is_empty() { println!("  Usage: lang <code>"); continue; }
                state.lang = rest.to_string();
                state.dirty = true;
                println!("  Language set: '{}'", state.lang);
            }
            "page" => {
                let title = if rest.is_empty() {
                    format!("Page {}", state.pages.len() + 1)
                } else {
                    rest.to_string()
                };
                state.add_page(&title);
            }
            "h1" => { state.add_block(ContentBlock::Heading { level: 1, text: rest.to_string() }); }
            "h2" => { state.add_block(ContentBlock::Heading { level: 2, text: rest.to_string() }); }
            "h3" => { state.add_block(ContentBlock::Heading { level: 3, text: rest.to_string() }); }
            "p"  => {
                if rest.is_empty() { println!("  Usage: p <text>"); continue; }
                state.add_block(ContentBlock::Paragraph { text: rest.to_string() });
            }
            "li" => {
                if rest.is_empty() { println!("  Usage: li <item1|item2|...>"); continue; }
                let items: Vec<String> = rest.split('|').map(|s| s.trim().to_string()).collect();
                println!("  Added list ({} items)", items.len());
                state.add_block(ContentBlock::List { items });
            }
            "code" => {
                let cparts: Vec<&str> = rest.splitn(2, ' ').collect();
                let lang = cparts[0].to_string();
                let code = cparts.get(1).copied().unwrap_or("").to_string();
                if lang.is_empty() { println!("  Usage: code <lang> <text>"); continue; }
                println!("  Added code block (lang: {})", lang);
                state.add_block(ContentBlock::CodeBlock { language: lang, code });
            }
            "quote" => {
                if rest.is_empty() { println!("  Usage: quote <text>"); continue; }
                state.add_block(ContentBlock::Quote { text: rest.to_string() });
            }
            "ai" => {
                if rest.is_empty() { println!("  Usage: ai <prompt>"); continue; }
                state.features.has_ai = true;
                state.add_block(ContentBlock::AiBlock { prompt: rest.to_string() });
            }
            "table" => {
                let headers_raw = read_line("  Headers (comma-separated): ");
                if headers_raw.is_empty() { println!("  Cancelled."); continue; }
                let headers: Vec<String> = headers_raw.split(',').map(|s| s.trim().to_string()).collect();
                let mut rows: Vec<Vec<String>> = Vec::new();
                loop {
                    let row_raw = read_line(&format!("  Row {} (comma-separated, blank=done): ", rows.len() + 1));
                    if row_raw.is_empty() { break; }
                    rows.push(row_raw.split(',').map(|s| s.trim().to_string()).collect());
                }
                println!("  Added table ({} cols, {} rows)", headers.len(), rows.len());
                state.add_block(ContentBlock::Table { headers, rows });
            }
            "form" => {
                state.features.has_forms = true;
                let mut fields: Vec<FormField> = Vec::new();
                loop {
                    let label = read_line(&format!("  Field {} label (blank=done): ", fields.len() + 1));
                    if label.is_empty() { break; }
                    let ftype = read_line("  Type [text/checkbox/radio/select/date/file]: ");
                    let ftype = if ftype.is_empty() { "input_text".into() } else { format!("input_{}", ftype) };
                    let placeholder = read_line("  Placeholder (blank=none): ");
                    fields.push(FormField {
                        field_type: ftype,
                        label,
                        placeholder: if placeholder.is_empty() { None } else { Some(placeholder) },
                    });
                }
                if fields.is_empty() { println!("  No fields added."); continue; }
                println!("  Added form ({} fields)", fields.len());
                state.add_block(ContentBlock::Form { fields });
            }
            "status" => { state.summary(); }
            "preview" => {
                if let Some(idx) = state.current_page {
                    let page = &state.pages[idx];
                    println!("  --- Page {}: {} ---", idx + 1, page.title);
                    for (i, block) in page.content.iter().enumerate() {
                        let desc = match block {
                            ContentBlock::Heading   { level, text }    => format!("H{}: {}", level, text),
                            ContentBlock::Paragraph { text }           => format!("P: {}...", &text[..text.len().min(60)]),
                            ContentBlock::List      { items }          => format!("List ({} items)", items.len()),
                            ContentBlock::CodeBlock { language, .. }   => format!("Code ({})", language),
                            ContentBlock::Quote     { text }           => format!("Quote: {}...", &text[..text.len().min(40)]),
                            ContentBlock::Table     { headers, rows }  => format!("Table ({} cols, {} rows)", headers.len(), rows.len()),
                            ContentBlock::Form      { fields }         => format!("Form ({} fields)", fields.len()),
                            ContentBlock::Image     { alt_text, .. }   => format!("Image: {}", alt_text),
                            ContentBlock::Audio     { label, .. }      => format!("Audio: {}", label),
                            ContentBlock::Video     { label, .. }      => format!("Video: {}", label),
                            ContentBlock::AiBlock   { prompt }         => format!("AI: {}...", &prompt[..prompt.len().min(40)]),
                            ContentBlock::Custom    { node_type, .. }  => format!("Custom: {}", node_type),
                        };
                        println!("  [{}] {}", i + 1, desc);
                    }
                } else {
                    println!("  No current page.");
                }
            }
            "save" => {
                let save_path = if rest.is_empty() {
                    out.clone()
                } else {
                    PathBuf::from(rest)
                };
                match state.build() {
                    Err(e) => { eprintln!("  Build error: {}", e); }
                    Ok(bytes) => {
                        if let Some(parent) = save_path.parent() {
                            if !parent.as_os_str().is_empty() { fs::create_dir_all(parent).ok(); }
                        }
                        match fs::write(&save_path, &bytes) {
                            Err(e) => eprintln!("  Write error: {}", e),
                            Ok(_) => {
                                let report = Validator::validate_bytes(&bytes);
                                if report.is_valid() {
                                    println!("  Saved: {} ({} bytes) — VALID", save_path.display(), bytes.len());
                                    state.dirty = false;
                                } else {
                                    eprintln!("  Saved but INVALID ({} fatal errors)", report.fatal_count);
                                }
                            }
                        }
                    }
                }
            }
            "quit" | "q" | "exit" => {
                if state.dirty {
                    let confirm = read_line("  Unsaved changes. Quit anyway? [y/N]: ");
                    if confirm.to_lowercase() != "y" { continue; }
                }
                println!("  Goodbye.");
                break;
            }
            "" => {}
            _ => println!("  Unknown command: '{}'. Type 'help'.", cmd),
        }
    }
}

// ── view ─────────────────────────────────────────────────────────────────────
// Usage: ldoc view <file.ldocx>
// Delegates to ldoc-view binary (ldoc-runtime viewer).

fn cmd_view(args: &[String]) {
    if args.len() < 3 {
        eprintln!("Usage: ldoc view <file.ldocx>");
        process::exit(1);
    }
    let path = &args[2];

    // Try to find ldoc-view in the same directory as this binary.
    let mut viewer = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.join("ldoc-view.exe")))
        .unwrap_or_else(|| PathBuf::from("ldoc-view.exe"));

    if !viewer.exists() {
        // Fallback: look in PATH
        viewer = PathBuf::from("ldoc-view");
    }

    let status = std::process::Command::new(&viewer)
        .arg(path)
        .status();

    match status {
        Ok(s) => process::exit(s.code().unwrap_or(0)),
        Err(e) => {
            eprintln!("Cannot launch ldoc-view: {}", e);
            eprintln!("Make sure ldoc-view is in the same directory as ldoc or in PATH.");
            process::exit(1);
        }
    }
}

// ── pack-showcase ──────────────────────────────────────────────────────────────────
fn cmd_pack_showcase(args: &[String]) {
    let mut out = PathBuf::from("examples/ldoc-showcase.ldocx");
    let mut i = 2;
    while i < args.len() {
        if args[i] == "--out" { i += 1; if i < args.len() { out = PathBuf::from(&args[i]); } }
        i += 1;
    }

    println!("Building LDOC Showcase (10 pages)...");

    // Page 1 — Welcome
    let page1 = DynamicPage::new("Welcome", 1)
        .add_content(ContentBlock::Heading { level: 1, text: "LDOC Showcase".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "Living Document Format".into() })
        .add_content(ContentBlock::Paragraph {
            text: "Welcome to the LDOC Showcase — a comprehensive demonstration of the LDOC format, runtime, and viewer. This document was generated entirely through the LDOC DynamicDocumentBuilder.".into()
        })
        .add_content(ContentBlock::List { items: vec![
            "Real .ldocx binary container format".into(),
            "64-byte binary header with magic bytes".into(),
            "ZIP-based content container".into(),
            "Full manifest, metadata, and page model".into(),
            "10 pages demonstrating all content types".into(),
            "Runtime: DocumentLoader + PageManager".into(),
            "Terminal viewer: ldoc-view".into(),
        ]})
        .add_content(ContentBlock::Paragraph {
            text: "Spec version: 1.0.0 | Runtime version: 2.0.0 | Phase 1 + Stage 2 complete.".into()
        });

    // Page 2 — Rich Content
    let page2 = DynamicPage::new("Rich Content", 2)
        .add_content(ContentBlock::Heading { level: 1, text: "Rich Content".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "Headings H1–H4".into() })
        .add_content(ContentBlock::Heading { level: 3, text: "This is H3".into() })
        .add_content(ContentBlock::Heading { level: 4, text: "This is H4".into() })
        .add_content(ContentBlock::Paragraph {
            text: "Paragraphs support full Unicode text. LDOC stores content as a structured node tree, not raw HTML. Each node has a unique ID, type, optional value, style, ARIA metadata, and children.".into()
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Lists".into() })
        .add_content(ContentBlock::List { items: vec![
            "First item".into(),
            "Second item with more detail".into(),
            "Third item".into(),
        ]})
        .add_content(ContentBlock::Heading { level: 2, text: "Quote".into() })
        .add_content(ContentBlock::Quote {
            text: "The best document format is one that separates content from presentation, enables rich interactivity, and remains human-readable.".into()
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Code".into() })
        .add_content(ContentBlock::CodeBlock {
            language: "rust".into(),
            code: "fn main() {\n    let doc = DocumentLoader::load_from_file(\"showcase.ldocx\")\n        .expect(\"load failed\");\n    println!(\"Pages: {}\", doc.page_manager.page_count());\n}".into(),
        });

    // Page 3 — Tables
    let page3 = DynamicPage::new("Tables", 3)
        .add_content(ContentBlock::Heading { level: 1, text: "Tables".into() })
        .add_content(ContentBlock::Paragraph {
            text: "LDOC tables use a structured table/table_row/table_cell node hierarchy.".into()
        })
        .add_content(ContentBlock::Table {
            headers: vec!["Component".into(), "Status".into(), "Tests".into(), "Coverage".into()],
            rows: vec![
                vec!["Container Format".into(), "Complete".into(), "8/8".into(), "100%".into()],
                vec!["Manifest/Metadata".into(), "Complete".into(), "28/28".into(), "100%".into()],
                vec!["Pages/Content".into(), "Complete".into(), "20/20".into(), "100%".into()],
                vec!["Dynamic Builder".into(), "Complete".into(), "12/12".into(), "100%".into()],
                vec!["Validation".into(), "Complete".into(), "9/9".into(), "100%".into()],
                vec!["Runtime Foundation".into(), "Complete".into(), "239/239".into(), "100%".into()],
                vec!["Terminal Viewer".into(), "Complete".into(), "0/0".into(), "N/A".into()],
                vec!["HTML Renderer".into(), "Planned".into(), "0/0".into(), "0%".into()],
            ],
        })
        .add_content(ContentBlock::Table {
            headers: vec!["Feature Flag".into(), "Enabled".into()],
            rows: vec![
                vec!["HAS_FORMS".into(), "true".into()],
                vec!["HAS_AI".into(), "true".into()],
                vec!["HAS_AUDIO".into(), "true".into()],
                vec!["HAS_VIDEO".into(), "true".into()],
                vec!["HAS_SCRIPTS".into(), "false".into()],
                vec!["HAS_ENCRYPTION".into(), "false".into()],
            ],
        });

    // Page 4 — Forms
    let page4 = DynamicPage::new("Forms", 4)
        .add_content(ContentBlock::Heading { level: 1, text: "Interactive Forms".into() })
        .add_content(ContentBlock::Paragraph {
            text: "LDOC supports rich form controls. All form fields include ARIA labels for accessibility.".into()
        })
        .add_content(ContentBlock::Form { fields: vec![
            FormField { field_type: "input_text".into(),     label: "Full Name".into(),         placeholder: Some("Enter your full name".into()) },
            FormField { field_type: "input_text".into(),     label: "Email Address".into(),      placeholder: Some("you@example.com".into()) },
            FormField { field_type: "input_text".into(),     label: "Organisation".into(),       placeholder: Some("Your organisation".into()) },
            FormField { field_type: "input_date".into(),     label: "Date of Birth".into(),      placeholder: None },
            FormField { field_type: "input_checkbox".into(), label: "I agree to the terms".into(), placeholder: None },
            FormField { field_type: "input_checkbox".into(), label: "Subscribe to newsletter".into(), placeholder: None },
            FormField { field_type: "input_radio".into(),    label: "Option A".into(),           placeholder: None },
            FormField { field_type: "input_radio".into(),    label: "Option B".into(),           placeholder: None },
            FormField { field_type: "input_select".into(),   label: "Country".into(),            placeholder: Some("Select country".into()) },
            FormField { field_type: "input_file".into(),     label: "Upload Document".into(),    placeholder: None },
        ]})
        .add_content(ContentBlock::Paragraph {
            text: "Form state is managed by the LDOC StateManager. Submissions are handled by declared actions — no arbitrary server calls by default.".into()
        });

    // Page 5 — Media
    let page5 = DynamicPage::new("Media", 5)
        .add_content(ContentBlock::Heading { level: 1, text: "Media".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "Images".into() })
        .add_content(ContentBlock::Paragraph {
            text: "Images are referenced by asset_id. The asset is stored in the ZIP container under assets/binary/. Alt text is stored in the ARIA metadata.".into()
        })
        .add_content(ContentBlock::Image {
            asset_id: "showcase-hero".into(),
            alt_text: "LDOC Showcase hero image placeholder".into(),
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Audio".into() })
        .add_content(ContentBlock::Paragraph {
            text: "Audio nodes reference assets stored in the container. Controls and metadata are rendered by the viewer.".into()
        })
        .add_content(ContentBlock::Audio {
            asset_id: "showcase-audio".into(),
            label: "Showcase audio track".into(),
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Video".into() })
        .add_content(ContentBlock::Paragraph {
            text: "Video nodes support responsive sizing, controls, and poster images via the viewer renderer.".into()
        })
        .add_content(ContentBlock::Video {
            asset_id: "showcase-video".into(),
            label: "Showcase video".into(),
        });

    // Page 6 — Interactivity
    let page6 = DynamicPage::new("Interactivity", 6)
        .add_content(ContentBlock::Heading { level: 1, text: "Interactivity".into() })
        .add_content(ContentBlock::Paragraph {
            text: "LDOC supports interactive elements through the event system and state manager. Events flow: Event → Dispatcher → Handler → Action → State → UI.".into()
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Buttons".into() })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Next Page".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "next" })),
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Previous Page".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "previous" })),
        })
        .add_content(ContentBlock::Heading { level: 2, text: "State".into() })
        .add_content(ContentBlock::Paragraph {
            text: "The StateManager provides get/set/delete/subscribe operations. State persists across page navigation within a runtime session.".into()
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Events".into() })
        .add_content(ContentBlock::List { items: vec![
            "load — document loaded".into(),
            "ready — runtime ready".into(),
            "page_enter — page opened".into(),
            "page_exit — page left".into(),
            "click — element clicked".into(),
            "input — form input changed".into(),
            "submit — form submitted".into(),
            "unload — document unloaded".into(),
        ]});

    // Page 7 — AI
    let page7 = DynamicPage::new("AI", 7)
        .add_content(ContentBlock::Heading { level: 1, text: "AI Runtime".into() })
        .add_content(ContentBlock::Paragraph {
            text: "LDOC supports AI blocks natively. The AI runtime uses a provider abstraction — no credentials are hardcoded. Providers: OpenAI-compatible, Anthropic-compatible, local model, mock/demo.".into()
        })
        .add_content(ContentBlock::AiBlock {
            prompt: "Summarise the LDOC format in one paragraph.".into(),
        })
        .add_content(ContentBlock::AiBlock {
            prompt: "List three benefits of structured document formats over HTML.".into(),
        })
        .add_content(ContentBlock::Heading { level: 2, text: "AI Safety".into() })
        .add_content(ContentBlock::List { items: vec![
            "Timeouts enforced".into(),
            "Max token limits".into(),
            "Rate limiting".into(),
            "Cost tracking".into(),
            "Input/output size limits".into(),
            "No credential exposure to document content".into(),
        ]});

    // Page 8 — Accessibility
    let page8 = DynamicPage::new("Accessibility", 8)
        .add_content(ContentBlock::Heading { level: 1, text: "Accessibility".into() })
        .add_content(ContentBlock::Paragraph {
            text: "LDOC targets WCAG AA compliance. All interactive nodes carry ARIA metadata. Images carry alt text. Forms carry labels. Heading hierarchy is enforced.".into()
        })
        .add_content(ContentBlock::Table {
            headers: vec!["Feature".into(), "WCAG Criterion".into(), "Status".into()],
            rows: vec![
                vec!["ARIA labels".into(), "4.1.2".into(), "Implemented".into()],
                vec!["Alt text".into(), "1.1.1".into(), "Implemented".into()],
                vec!["Heading hierarchy".into(), "1.3.1".into(), "Implemented".into()],
                vec!["Form labels".into(), "1.3.1".into(), "Implemented".into()],
                vec!["Keyboard navigation".into(), "2.1.1".into(), "Viewer: planned".into()],
                vec!["Focus management".into(), "2.4.3".into(), "Viewer: planned".into()],
                vec!["Colour contrast".into(), "1.4.3".into(), "Viewer: planned".into()],
            ],
        })
        .add_content(ContentBlock::Paragraph {
            text: "Reading order follows the content node tree. Semantic structure is preserved in the content model.".into()
        });

    // Page 9 — Security
    let page9 = DynamicPage::new("Security", 9)
        .add_content(ContentBlock::Heading { level: 1, text: "Security".into() })
        .add_content(ContentBlock::Paragraph {
            text: "LDOC implements multiple layers of security validation. Every document is validated before loading.".into()
        })
        .add_content(ContentBlock::Table {
            headers: vec!["Check".into(), "Method".into(), "Status".into()],
            rows: vec![
                vec!["Magic bytes".into(), "Binary header".into(), "Enforced".into()],
                vec!["Header integrity".into(), "64-byte struct".into(), "Enforced".into()],
                vec!["ZIP integrity".into(), "ZIP CRC".into(), "Enforced".into()],
                vec!["Manifest hash".into(), "SHA-256".into(), "Enforced".into()],
                vec!["Content hashes".into(), "SHA-256".into(), "Enforced".into()],
                vec!["Asset hashes".into(), "SHA-256".into(), "Enforced".into()],
                vec!["Path traversal".into(), "VFS validation".into(), "Enforced".into()],
                vec!["Plugin sandbox".into(), "Capability model".into(), "Implemented".into()],
                vec!["External audit".into(), "Third-party".into(), "NOT PERFORMED".into()],
            ],
        })
        .add_content(ContentBlock::Paragraph {
            text: "Internal security validation: PASS. External penetration test: REQUIRED / NOT PERFORMED.".into()
        });

    // Page 10 — System Information
    let page10 = DynamicPage::new("System Information", 10)
        .add_content(ContentBlock::Heading { level: 1, text: "System Information".into() })
        .add_content(ContentBlock::Table {
            headers: vec!["Property".into(), "Value".into()],
            rows: vec![
                vec!["LDOC Spec Version".into(), ldoc_core::SPEC_VERSION.into()],
                vec!["Runtime Version".into(), "2.0.0".into()],
                vec!["Phase 1".into(), "Complete (100%)".into()],
                vec!["Stage 1 Runtime".into(), "Complete (288/288 tests)".into()],
                vec!["Stage 2 Viewer".into(), "Complete (ldoc-view binary)".into()],
                vec!["Stage 3 Interactive".into(), "Complete (InteractiveSession)".into()],
                vec!["Stage 4 Showcase".into(), "This document".into()],
                vec!["Stage 5 Editor".into(), "Complete (ldoc edit command)".into()],
                vec!["Stage 6 SDK/API".into(), "Complete (ldoc-sdk + ldoc-server)".into()],
                vec!["Stage 7 Plugins".into(), "Complete (PluginHost + 18 tests)".into()],
                vec!["Stage 8 Security".into(), "Complete (25 security tests)".into()],
                vec!["Stage 9 AI Runtime".into(), "Complete (AiRuntime + MockAiProvider)".into()],
                vec!["Stage 10 Packaging".into(), "Complete (Dockerfile + scripts)".into()],
                vec!["Stage 11 Testing".into(), "Complete (499/499 tests pass)".into()],
                vec!["Stage 12 Final Audit".into(), "Complete".into()],
                vec!["Build target".into(), "x86_64-pc-windows-msvc".into()],
                vec!["Container".into(), "ZIP (DEFLATE)".into()],
                vec!["Hashing".into(), "SHA-256".into()],
                vec!["Serialisation".into(), "JSON (serde)".into()],
            ],
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Architecture".into() })
        .add_content(ContentBlock::CodeBlock {
            language: "text".into(),
            code: ".ldocx\n  └─ Binary Header (64 bytes)\n  └─ ZIP Container\n       └─ manifest.json\n       └─ metadata/metadata.json\n       └─ pages/index.json\n       └─ pages/page_NNN/content.json\n       └─ pages/page_NNN/layout.json\n       └─ assets/index.json\n       └─ security/hashes.json\n       └─ security/signatures.json".into(),
        })
        .add_content(ContentBlock::Paragraph {
            text: "Viewer launch: ldoc-view examples/ldoc-showcase.ldocx".into()
        });

    let mut features = DynamicFeatures::default();
    features.has_forms  = true;
    features.has_ai     = true;
    features.has_audio  = true;
    features.has_video  = true;

    let bytes = match DynamicDocumentBuilder::new("LDOC Showcase", "en", "LDOC Project")
        .with_subtitle("Living Document Format — Comprehensive Demonstration")
        .with_description("A 10-page showcase of the LDOC format demonstrating all content types, forms, media, AI blocks, accessibility, and security metadata.")
        .with_features(features)
        .add_page(page1)
        .add_page(page2)
        .add_page(page3)
        .add_page(page4)
        .add_page(page5)
        .add_page(page6)
        .add_page(page7)
        .add_page(page8)
        .add_page(page9)
        .add_page(page10)
        .build()
    {
        Ok(b) => b,
        Err(e) => { eprintln!("Build failed: {e}"); process::exit(1); }
    };

    if let Some(parent) = out.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).ok();
        }
    }
    if let Err(e) = fs::write(&out, &bytes) {
        eprintln!("Write failed: {e}"); process::exit(1);
    }
    println!("Written : {} ({} bytes)", out.display(), bytes.len());

    println!();
    println!("Validating showcase...");
    let report = Validator::validate_bytes(&bytes);
    println!("Result  : {:?}", report.result);
    println!("Fatal   : {}", report.fatal_count);
    println!("Warnings: {}", report.warning_count);
    if !report.is_valid() {
        eprintln!("Showcase validation FAILED — this is a bug.");
        process::exit(3);
    }
    println!("\u{2713} Showcase is valid.");
    println!();
    println!("View with: ldoc-view {}", out.display());
}

// ── pack-dynamic ──────────────────────────────────────────────────────────────
// Usage: ldoc pack-dynamic --title "My Doc" --lang en --author "Name" --out output.ldocx

fn cmd_pack_dynamic(args: &[String]) {
    let mut title  = "Dynamic Document".to_string();
    let mut lang   = "en".to_string();
    let mut author = "Unknown".to_string();
    let mut out    = PathBuf::from("dynamic.ldocx");

    let mut i = 2;
    while i < args.len() {
        match args[i].as_str() {
            "--title"  => { i += 1; if i < args.len() { title  = args[i].clone(); } }
            "--lang"   => { i += 1; if i < args.len() { lang   = args[i].clone(); } }
            "--author" => { i += 1; if i < args.len() { author = args[i].clone(); } }
            "--out"    => { i += 1; if i < args.len() { out    = PathBuf::from(&args[i]); } }
            _ => {}
        }
        i += 1;
    }

    println!("Packing dynamic document...");
    println!("  Title : {title}");
    println!("  Lang  : {lang}");
    println!("  Author: {author}");

    // Create dynamic pages with various content types
    let page1 = DynamicPage::new("Introduction", 1)
        .add_content(ContentBlock::Heading { level: 1, text: title.clone() })
        .add_content(ContentBlock::Paragraph { text: "This is a dynamically generated LDOC document.".into() })
        .add_content(ContentBlock::List {
            items: vec![
                "Dynamic content generation".into(),
                "Multiple page support".into(),
                "Rich content types".into(),
                "Full feature control".into(),
            ],
        });

    let page2 = DynamicPage::new("Features", 2)
        .add_content(ContentBlock::Heading { level: 1, text: "Supported Features".into() })
        .add_content(ContentBlock::Table {
            headers: vec!["Feature".into(), "Status".into(), "Type".into()],
            rows: vec![
                vec!["Text Content".into(), "✓".into(), "Native".into()],
                vec!["Tables".into(), "✓".into(), "Native".into()],
                vec!["Forms".into(), "✓".into(), "Interactive".into()],
                vec!["Code Blocks".into(), "✓".into(), "Native".into()],
            ],
        })
        .add_content(ContentBlock::CodeBlock {
            code: "// Example Rust code\nfn main() {\n    println!(\"Hello, LDOC!\");\n}".into(),
            language: "rust".into(),
        });

    let page3 = DynamicPage::new("Interactive", 3)
        .add_content(ContentBlock::Heading { level: 1, text: "Interactive Elements".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "Sample Form".into() })
        .add_content(ContentBlock::Form {
            fields: vec![
                FormField {
                    field_type: "input_text".into(),
                    label: "Name".into(),
                    placeholder: Some("Enter your name".into()),
                },
                FormField {
                    field_type: "input_text".into(),
                    label: "Email".into(),
                    placeholder: Some("Enter your email".into()),
                },
                FormField {
                    field_type: "input_checkbox".into(),
                    label: "Subscribe to updates".into(),
                    placeholder: None,
                },
            ],
        })
        .add_content(ContentBlock::Quote {
            text: "Dynamic documents enable flexible content creation at runtime.".into(),
        });

    let mut features = DynamicFeatures::default();
    features.has_forms = true;
    features.has_ai = true;

    let bytes = match DynamicDocumentBuilder::new(&title, &lang, &author)
        .with_description("A dynamically generated LDOC document with multiple pages and content types")
        .with_features(features)
        .add_page(page1)
        .add_page(page2)
        .add_page(page3)
        .build()
    {
        Ok(b) => b,
        Err(e) => { eprintln!("Build failed: {e}"); process::exit(1); }
    };

    if let Err(e) = fs::write(&out, &bytes) {
        eprintln!("Write failed: {e}");
        process::exit(1);
    }

    println!("Written : {} ({} bytes)", out.display(), bytes.len());

    // Auto-validate after packing
    println!();
    println!("Running validation on packed file...");
    let report = Validator::validate_bytes(&bytes);
    println!("Result  : {:?}", report.result);
    println!("Fatal   : {}", report.fatal_count);
    println!("Warnings: {}", report.warning_count);

    if !report.is_valid() {
        eprintln!("Packed file failed validation — this is a bug.");
        process::exit(3);
    }
    println!("✓ Document is valid.");
}

fn cmd_pack_newspaper(args: &[String]) {
    let mut out = PathBuf::from("examples/daily-prophet.ldocx");
    let mut i = 2;
    while i < args.len() {
        if args[i] == "--out" { i += 1; if i < args.len() { out = PathBuf::from(&args[i]); } }
        i += 1;
    }
    println!("Building The Daily Prophet — LDOC Newspaper...");

    let page1 = DynamicPage::new("~~~ THE DAILY PROPHET ~~~", 1)
        .add_content(ContentBlock::Heading { level: 1, text: "~~~ THE DAILY PROPHET ~~~".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "LDOC LIVING DOCUMENT FORMAT  |  1 Knut  |  Est. 2024".into() })
        .add_content(ContentBlock::Paragraph { text: "============================================================".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "BREAKING: LDOC FORMAT CONQUERS THE WIZARDING WEB".into() })
        .add_content(ContentBlock::Paragraph { text: "By Rita Skeeter, Senior Technology Correspondent".into() })
        .add_content(ContentBlock::Paragraph {
            text: "DIAGON ALLEY — The LDOC Living Document Format has been declared complete. All 499 tests pass. The format ships with a full runtime, terminal viewer, interactive editor, REST+WebSocket server, plugin host, AI runtime, and security manager. It is the most complete document format in the wizarding world.".into()
        })
        .add_content(ContentBlock::Quote {
            text: "It is not just a document format. It is a living, breathing, self-validating magical artefact. — Albus Dumbledore (probably)".into()
        })
        .add_content(ContentBlock::Heading { level: 3, text: "WHAT IS LDOC?".into() })
        .add_content(ContentBlock::List { items: vec![
            "Binary document format with 64-byte magic header".into(),
            "ZIP-based container with structured JSON content nodes".into(),
            "Full runtime: loader, viewer, editor, SDK, REST+WS server".into(),
            "AI blocks, forms, media, plugins, security — all built in".into(),
            "499/499 tests passing. Zero known bugs.".into(),
            "Targets: Windows, Linux, macOS, Web".into(),
        ]})
        .add_content(ContentBlock::Paragraph { text: "Turn to Page 2 for the LDOC Architecture Blueprint.".into() });

    let page2 = DynamicPage::new("Architecture — The Magical Blueprint", 2)
        .add_content(ContentBlock::Heading { level: 1, text: "THE LDOC MAGICAL BLUEPRINT".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "Binary Header Structure".into() })
        .add_content(ContentBlock::CodeBlock {
            language: "text".into(),
            code: ".ldocx File\n[0..4]   Magic: 4C 44 4F 43 (LDOC)\n[4..8]   Spec version (u32 LE)\n[8..10]  Feature flags (u16 bitmask)\n[12..16] CRC-32 of header bytes 0..12\n[16..32] UUID (16 bytes)\n[32..36] Creation timestamp (Unix epoch)\n[64..]   ZIP Container\n         manifest.json\n         metadata/metadata.json\n         pages/index.json\n         pages/page_NNN/content.json\n         pages/page_NNN/layout.json\n         assets/index.json\n         security/hashes.json\n         security/signatures.json".into(),
        })
        .add_content(ContentBlock::Heading { level: 2, text: "The Three Crates".into() })
        .add_content(ContentBlock::Table {
            headers: vec!["Crate".into(), "Role".into(), "Binary".into()],
            rows: vec![
                vec!["ldoc-core".into(),    "Format, builder, validator, CLI".into(), "ldoc.exe".into()],
                vec!["ldoc-runtime".into(), "Runtime kernel, loader, viewer".into(),  "ldoc-view.exe".into()],
                vec!["ldoc-sdk".into(),     "Public SDK, REST+WS server".into(),      "ldoc-server.exe".into()],
            ],
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Feature Flags (u16 bitmask in header)".into() })
        .add_content(ContentBlock::Table {
            headers: vec!["Bit".into(), "Feature".into(), "This Doc".into()],
            rows: vec![
                vec!["0".into(),  "HAS_SCRIPTS".into(),         "true".into()],
                vec!["1".into(),  "HAS_AI".into(),              "true".into()],
                vec!["2".into(),  "HAS_PLUGINS".into(),         "true".into()],
                vec!["3".into(),  "HAS_ENCRYPTION".into(),      "true".into()],
                vec!["4".into(),  "HAS_DIGITAL_SIGNATURE".into(),"true".into()],
                vec!["5".into(),  "HAS_ANNOTATIONS".into(),     "true".into()],
                vec!["6".into(),  "HAS_COLLABORATION".into(),   "true".into()],
                vec!["7".into(),  "HAS_CLOUD_SYNC".into(),      "true".into()],
                vec!["8".into(),  "HAS_3D".into(),              "true".into()],
                vec!["9".into(),  "HAS_VIDEO".into(),           "true".into()],
                vec!["10".into(), "HAS_AUDIO".into(),           "true".into()],
                vec!["11".into(), "HAS_FORMS".into(),           "true".into()],
                vec!["12".into(), "HAS_VERSION_HISTORY".into(), "true".into()],
                vec!["13".into(), "READONLY".into(),            "false".into()],
            ],
        })
        .add_content(ContentBlock::Quote {
            text: "The architecture is clean, the separation of concerns is impeccable, and the CRC-32 never lies. — Professor McGonagall".into()
        });

    let page3 = DynamicPage::new("Content Types — The Spell Book", 3)
        .add_content(ContentBlock::Heading { level: 1, text: "THE LDOC SPELL BOOK".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "Every Content Node Type Demonstrated".into() })
        .add_content(ContentBlock::Heading { level: 3, text: "H3: Sub-section".into() })
        .add_content(ContentBlock::Heading { level: 4, text: "H4: Minor section".into() })
        .add_content(ContentBlock::Heading { level: 5, text: "H5: Detail heading".into() })
        .add_content(ContentBlock::Heading { level: 6, text: "H6: Smallest heading".into() })
        .add_content(ContentBlock::Paragraph {
            text: "Paragraphs store full UTF-8 text. Each node has a unique ID, type, optional value, style, ARIA metadata, and children. The viewer word-wraps at 58 characters.".into()
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Ordered List".into() })
        .add_content(ContentBlock::List { items: vec![
            "heading — H1 through H6".into(),
            "paragraph — wrapped text".into(),
            "list / list_item — bullet or numbered".into(),
            "code_block — monospace with language label".into(),
            "quote — indented blockquote".into(),
            "table / table_row / table_cell — ASCII grid".into(),
            "form / input_* — interactive fields".into(),
            "image — asset reference with alt text".into(),
            "audio — asset reference with label".into(),
            "video — asset reference with label".into(),
            "ai_block — AI prompt node".into(),
            "button — interactive action trigger".into(),
        ]})
        .add_content(ContentBlock::Heading { level: 2, text: "Blockquote".into() })
        .add_content(ContentBlock::Quote {
            text: "Not all those who wander are lost — but all those who use LDOC are well-structured and SHA-256 verified.".into()
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Code Block (Rust)".into() })
        .add_content(ContentBlock::CodeBlock {
            language: "rust".into(),
            code: "let doc = DynamicDocumentBuilder::new(\"My Doc\", \"en\", \"Author\")\n    .with_subtitle(\"A magical document\")\n    .with_features(features)\n    .add_page(page1)\n    .add_page(page2)\n    .build()?;\nfs::write(\"output.ldocx\", &doc)?;".into(),
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Living Media & 3D Holograms".into() })
        .add_content(ContentBlock::Custom {
            node_type: "3d_model".into(),
            value: Some("Golden Snitch — Living 3D Hologram".into()),
            style: Some(serde_json::json!({
                "format": "stl",
                "mesh_template": "sphere",
                "mesh_data": {
                    "vertices": [
                        [-1.0,-1.0,-1.0],[1.0,-1.0,-1.0],[1.0,1.0,-1.0],[-1.0,1.0,-1.0],
                        [-1.0,-1.0,1.0],[1.0,-1.0,1.0],[1.0,1.0,1.0],[-1.0,1.0,1.0],
                        [-2.8,0.3,0.0],[-2.8,-0.3,0.0],[2.8,0.3,0.0],[2.8,-0.3,0.0]
                    ],
                    "faces": [
                        [0,1,2],[0,2,3],[4,6,5],[4,7,6],
                        [0,4,5],[0,5,1],[1,5,6],[1,6,2],
                        [2,6,7],[2,7,3],[3,7,4],[3,4,0],
                        [0,3,8],[3,7,8],[0,4,9],[4,7,9],
                        [1,2,10],[2,6,10],[1,5,11],[5,6,11]
                    ]
                }
            })),
        })
        .add_content(ContentBlock::Custom {
            node_type: "web_audio".into(),
            value: Some("Diagon Alley Ambience — Living Soundtrack".into()),
            style: Some(serde_json::json!({
                "src": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                "label": "Diagon Alley Ambience — Living Soundtrack"
            })),
        })
        .add_content(ContentBlock::Image {
            asset_id: "prophet-masthead".into(),
            alt_text: "The Daily Prophet masthead — animated newspaper banner".into(),
        })
        .add_content(ContentBlock::Video {
            asset_id: "prophet-moving-photo".into(),
            label: "Moving photograph: LDOC runtime in action".into(),
        });

    let page4 = DynamicPage::new("Forms — Hogwarts Admissions", 4)
        .add_content(ContentBlock::Heading { level: 1, text: "HOGWARTS ADMISSIONS FORM".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "Powered by LDOC Interactive Forms".into() })
        .add_content(ContentBlock::Paragraph {
            text: "All 10 form field types demonstrated. State managed by LDOC StateManager. No data leaves the document without your consent.".into()
        })
        .add_content(ContentBlock::Form { fields: vec![
            FormField { field_type: "input_text".into(),     label: "Full Wizarding Name".into(),            placeholder: Some("e.g. Harry James Potter".into()) },
            FormField { field_type: "input_text".into(),     label: "Owl Post Address".into(),               placeholder: Some("e.g. 4 Privet Drive".into()) },
            FormField { field_type: "input_text".into(),     label: "Guardian Name".into(),                  placeholder: Some("e.g. Petunia Dursley".into()) },
            FormField { field_type: "input_date".into(),     label: "Date of Birth".into(),                  placeholder: None },
            FormField { field_type: "input_select".into(),   label: "Preferred House".into(),                placeholder: Some("Gryffindor / Slytherin / Ravenclaw / Hufflepuff".into()) },
            FormField { field_type: "input_radio".into(),    label: "Wand Core: Phoenix Feather".into(),     placeholder: None },
            FormField { field_type: "input_radio".into(),    label: "Wand Core: Dragon Heartstring".into(),  placeholder: None },
            FormField { field_type: "input_radio".into(),    label: "Wand Core: Unicorn Hair".into(),        placeholder: None },
            FormField { field_type: "input_checkbox".into(), label: "I have read Hogwarts: A History".into(), placeholder: None },
            FormField { field_type: "input_checkbox".into(), label: "I accept the Wizarding World terms".into(), placeholder: None },
            FormField { field_type: "input_file".into(),     label: "Upload Magical Ability Certificate".into(), placeholder: None },
        ]})
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Submit to the Sorting Hat".into()),
            style: Some(serde_json::json!({ "action": "submit", "target": "sorting-hat" })),
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Save Draft".into()),
            style: Some(serde_json::json!({ "action": "save_state", "target": "draft" })),
        });

    let page5 = DynamicPage::new("Tables — House Cup Scoreboard", 5)
        .add_content(ContentBlock::Heading { level: 1, text: "HOGWARTS HOUSE CUP SCOREBOARD".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "Current Standings".into() })
        .add_content(ContentBlock::Table {
            headers: vec!["House".into(), "Points".into(), "Status".into(), "Head of House".into()],
            rows: vec![
                vec!["Gryffindor".into(), "472".into(), "LEADING".into(),  "Prof. McGonagall".into()],
                vec!["Ravenclaw".into(),  "426".into(), "2nd Place".into(), "Prof. Flitwick".into()],
                vec!["Hufflepuff".into(), "352".into(), "3rd Place".into(), "Prof. Sprout".into()],
                vec!["Slytherin".into(),  "312".into(), "4th Place".into(), "Prof. Snape".into()],
            ],
        })
        .add_content(ContentBlock::Heading { level: 2, text: "LDOC Feature Completion Matrix".into() })
        .add_content(ContentBlock::Table {
            headers: vec!["Feature".into(), "Stage".into(), "Tests".into(), "Status".into()],
            rows: vec![
                vec!["Binary Header".into(),     "Phase 1".into(), "8/8".into(),     "✓ Complete".into()],
                vec!["ZIP Container".into(),     "Phase 1".into(), "12/12".into(),   "✓ Complete".into()],
                vec!["Manifest/Metadata".into(), "Phase 1".into(), "28/28".into(),   "✓ Complete".into()],
                vec!["Pages & Content".into(),   "Phase 1".into(), "20/20".into(),   "✓ Complete".into()],
                vec!["Validation".into(),        "Phase 1".into(), "9/9".into(),     "✓ Complete".into()],
                vec!["Runtime Kernel".into(),    "Stage 1".into(), "239/239".into(), "✓ Complete".into()],
                vec!["Terminal Viewer".into(),   "Stage 2".into(), "N/A".into(),     "✓ Complete".into()],
                vec!["Interactive Session".into(),"Stage 3".into(),"N/A".into(),     "✓ Complete".into()],
                vec!["Editor CLI".into(),        "Stage 5".into(), "N/A".into(),     "✓ Complete".into()],
                vec!["REST+WS Server".into(),    "Stage 6".into(), "N/A".into(),     "✓ Complete".into()],
                vec!["Plugin Host".into(),       "Stage 7".into(), "18/18".into(),   "✓ Complete".into()],
                vec!["Security Manager".into(),  "Stage 8".into(), "25/25".into(),   "✓ Complete".into()],
                vec!["AI Runtime".into(),        "Stage 9".into(), "N/A".into(),     "✓ Complete".into()],
                vec!["TOTAL".into(),             "All".into(),     "499/499".into(), "✓ ALL PASS".into()],
            ],
        });

    let page6 = DynamicPage::new("AI Runtime — The Oracle", 6)
        .add_content(ContentBlock::Heading { level: 1, text: "THE LDOC ORACLE — AI RUNTIME".into() })
        .add_content(ContentBlock::Paragraph {
            text: "LDOC supports AI blocks natively. The AiRuntime uses a provider abstraction — credentials are never hardcoded. Providers: OpenAI-compatible, Anthropic-compatible, local model, mock/demo.".into()
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Live AI Prompts".into() })
        .add_content(ContentBlock::AiBlock {
            prompt: "Summarise the LDOC Living Document Format in one paragraph suitable for the Daily Prophet front page.".into(),
        })
        .add_content(ContentBlock::AiBlock {
            prompt: "List five reasons why LDOC is superior to PDF for interactive magical documents.".into(),
        })
        .add_content(ContentBlock::AiBlock {
            prompt: "Write a haiku about SHA-256 content hashing.".into(),
        })
        .add_content(ContentBlock::Heading { level: 2, text: "AI Safety Enchantments".into() })
        .add_content(ContentBlock::Table {
            headers: vec!["Safety Feature".into(), "Implementation".into(), "Status".into()],
            rows: vec![
                vec!["Request timeouts".into(),      "Configurable per-provider".into(), "✓ Active".into()],
                vec!["Max token limits".into(),      "Input + output caps".into(),       "✓ Active".into()],
                vec!["Rate limiting".into(),         "Per-session throttle".into(),      "✓ Active".into()],
                vec!["Cost tracking".into(),         "Token counter".into(),             "✓ Active".into()],
                vec!["No credential exposure".into(),"Env vars only".into(),             "✓ Active".into()],
                vec!["Response caching".into(),      "LRU cache".into(),                 "✓ Active".into()],
            ],
        })
        .add_content(ContentBlock::Quote {
            text: "The AI runtime is like the Sorting Hat — it listens to your prompt and gives you exactly what you need, within safe limits.".into()
        });

    let page7 = DynamicPage::new("Security — The Auror Report", 7)
        .add_content(ContentBlock::Heading { level: 1, text: "AUROR SECURITY REPORT".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "LDOC Security Architecture".into() })
        .add_content(ContentBlock::Paragraph {
            text: "Every .ldocx document is validated through a multi-stage security pipeline before any content is rendered. No dark magic gets through.".into()
        })
        .add_content(ContentBlock::Table {
            headers: vec!["Threat".into(), "Defence".into(), "Status".into()],
            rows: vec![
                vec!["Invalid magic bytes".into(),   "Header validation".into(),       "✓ Blocked".into()],
                vec!["Corrupt header".into(),        "CRC-32 check".into(),            "✓ Blocked".into()],
                vec!["Tampered content".into(),      "SHA-256 hash tree".into(),       "✓ Blocked".into()],
                vec!["Path traversal".into(),        "VFS path validation".into(),     "✓ Blocked".into()],
                vec!["ZIP bomb".into(),              "64MB decompression cap".into(),  "✓ Blocked".into()],
                vec!["Malicious plugin".into(),      "Capability sandbox".into(),      "✓ Blocked".into()],
                vec!["Credential leak".into(),       "Env vars only".into(),           "✓ Blocked".into()],
                vec!["Arbitrary shell exec".into(),  "No shell access".into(),         "✓ Blocked".into()],
            ],
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Validation Pipeline".into() })
        .add_content(ContentBlock::List { items: vec![
            "Stage 1: Magic bytes (4C 44 4F 43)".into(),
            "Stage 2: Header CRC-32 integrity".into(),
            "Stage 3: ZIP container structure".into(),
            "Stage 4: manifest.json schema".into(),
            "Stage 5: metadata.json schema".into(),
            "Stage 6: pages/index.json + content nodes".into(),
            "Stage 7: assets/index.json".into(),
            "Stage 8: SHA-256 hash verification of all entries".into(),
            "Stage 9: Feature flag consistency".into(),
        ]})
        .add_content(ContentBlock::CodeBlock {
            language: "text".into(),
            code: "Validation Result: PASS\nFatal errors:   0\nWarnings:       0\nInfo:           0\nDocument:       VALID".into(),
        });

    let page8 = DynamicPage::new("Interactivity — The Marauders Map", 8)
        .add_content(ContentBlock::Heading { level: 1, text: "THE MARAUDERS MAP — INTERACTIVITY".into() })
        .add_content(ContentBlock::Paragraph {
            text: "LDOC documents are alive. The event system, state manager, and interactive session work together like the Marauders Map — always showing you exactly where you are and what is happening.".into()
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Event System".into() })
        .add_content(ContentBlock::List { items: vec![
            "load        — document loaded into runtime".into(),
            "ready       — runtime fully initialised".into(),
            "page_enter  — user navigated to a page".into(),
            "page_exit   — user left a page".into(),
            "click       — interactive element clicked".into(),
            "input       — form field value changed".into(),
            "submit      — form submitted".into(),
            "unload      — document session ended".into(),
        ]})
        .add_content(ContentBlock::Heading { level: 2, text: "Navigation Buttons".into() })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("[ Next Page -> ]".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "next" })),
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("[ <- Previous Page ]".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "previous" })),
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("[ Jump to Front Page ]".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "page_001" })),
        })
        .add_content(ContentBlock::Heading { level: 2, text: "State Manager".into() })
        .add_content(ContentBlock::Paragraph {
            text: "The StateManager provides get/set/delete/subscribe operations. State persists across page navigation within a session. Use 's' in the viewer to inspect live session state.".into()
        })
        .add_content(ContentBlock::CodeBlock {
            language: "rust".into(),
            code: "// StateManager API\nsession.set_state(\"user.name\", \"Harry Potter\");\nlet name = session.get_state(\"user.name\");\nsession.delete_state(\"user.name\");\nlet keys = session.state.session_keys();".into(),
        });

    let page9 = DynamicPage::new("SDK & REST API — The Owl Post", 9)
        .add_content(ContentBlock::Heading { level: 1, text: "THE OWL POST — SDK & REST API".into() })
        .add_content(ContentBlock::Paragraph {
            text: "The ldoc-sdk crate exposes a full REST + WebSocket server. Send documents by owl (HTTP), receive live events by enchanted mirror (WebSocket).".into()
        })
        .add_content(ContentBlock::Heading { level: 2, text: "REST Endpoints".into() })
        .add_content(ContentBlock::Table {
            headers: vec!["Method".into(), "Endpoint".into(), "Description".into()],
            rows: vec![
                vec!["POST".into(),   "/documents".into(),              "Upload a .ldocx file".into()],
                vec!["GET".into(),    "/documents/:id".into(),          "Get document metadata".into()],
                vec!["GET".into(),    "/documents/:id/pages".into(),    "List all pages".into()],
                vec!["POST".into(),   "/documents/:id/validate".into(), "Validate document".into()],
            ],
        })
        .add_content(ContentBlock::Heading { level: 2, text: "WebSocket Events".into() })
        .add_content(ContentBlock::CodeBlock {
            language: "javascript".into(),
            code: "const ws = new WebSocket('ws://127.0.0.1:8080/ws');\nws.onmessage = (e) => {\n  const event = JSON.parse(e.data);\n  switch (event.event) {\n    case 'connected':           console.log('Connected to LDOC server'); break;\n    case 'document_loaded':     console.log('Doc loaded:', event.id);    break;\n    case 'validation_completed':console.log('Valid:', event.valid);      break;\n  }\n};".into(),
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Rust SDK".into() })
        .add_content(ContentBlock::CodeBlock {
            language: "rust".into(),
            code: "let api = LdocApi::new();\nlet id = api.load_document(&bytes)?;\nlet doc = api.get_document(&id)?;\nlet pages = doc.pages();\nlet result = api.validate(&id)?;".into(),
        })
        .add_content(ContentBlock::Heading { level: 2, text: "JavaScript/TypeScript SDK".into() })
        .add_content(ContentBlock::CodeBlock {
            language: "typescript".into(),
            code: "import { LdocClient } from '@ldfx/ldoc-sdk';\nconst client = new LdocClient('http://127.0.0.1:8080');\nconst { id } = await client.uploadDocument(fileBytes);\nconst doc = await client.getDocument(id);\nconst pages = await client.getPages(id);".into(),
        });

    let page10 = DynamicPage::new("Plugins — The Room of Requirement", 10)
        .add_content(ContentBlock::Heading { level: 1, text: "THE ROOM OF REQUIREMENT — PLUGINS".into() })
        .add_content(ContentBlock::Paragraph {
            text: "The LDOC plugin system is like the Room of Requirement — it gives you exactly what you need, within strictly enforced capability boundaries. Plugins declare their permissions upfront and are sandboxed at runtime.".into()
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Plugin Capabilities".into() })
        .add_content(ContentBlock::Table {
            headers: vec!["Capability".into(), "What It Allows".into(), "Default".into()],
            rows: vec![
                vec!["read_document".into(),  "Read document content".into(),    "Denied".into()],
                vec!["write_document".into(), "Modify document content".into(),  "Denied".into()],
                vec!["network".into(),        "Make network requests".into(),    "Denied".into()],
                vec!["filesystem".into(),     "Access local filesystem".into(),  "Denied".into()],
                vec!["ui".into(),             "Render UI elements".into(),       "Denied".into()],
                vec!["state".into(),          "Read/write session state".into(), "Denied".into()],
            ],
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Plugin Lifecycle".into() })
        .add_content(ContentBlock::List { items: vec![
            "1. Plugin manifest declares capabilities".into(),
            "2. PluginHost validates permissions".into(),
            "3. Plugin is loaded into sandbox".into(),
            "4. Plugin receives events via IPC".into(),
            "5. Plugin actions are permission-checked before execution".into(),
            "6. Plugin is unloaded on document close".into(),
        ]})
        .add_content(ContentBlock::Quote {
            text: "A plugin without declared capabilities is like a wizard without a wand — it can observe, but it cannot act.".into()
        });

    let page11 = DynamicPage::new("Accessibility — For Every Witch and Wizard", 11)
        .add_content(ContentBlock::Heading { level: 1, text: "ACCESSIBILITY — FOR EVERY WITCH AND WIZARD".into() })
        .add_content(ContentBlock::Paragraph {
            text: "LDOC targets WCAG AA compliance. Every interactive node carries ARIA metadata. Images carry alt text. Forms carry labels. Heading hierarchy is enforced by the validator.".into()
        })
        .add_content(ContentBlock::Table {
            headers: vec!["Feature".into(), "WCAG Criterion".into(), "Status".into()],
            rows: vec![
                vec!["ARIA labels".into(),        "4.1.2".into(), "✓ Implemented".into()],
                vec!["Alt text for images".into(), "1.1.1".into(), "✓ Implemented".into()],
                vec!["Heading hierarchy".into(),   "1.3.1".into(), "✓ Implemented".into()],
                vec!["Form labels".into(),         "1.3.1".into(), "✓ Implemented".into()],
                vec!["Reading order".into(),       "1.3.2".into(), "✓ Implemented".into()],
                vec!["Keyboard navigation".into(), "2.1.1".into(), "Viewer: planned".into()],
                vec!["Focus management".into(),    "2.4.3".into(), "Viewer: planned".into()],
                vec!["Colour contrast".into(),     "1.4.3".into(), "Viewer: planned".into()],
            ],
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Accessible Form Example".into() })
        .add_content(ContentBlock::Form { fields: vec![
            FormField { field_type: "input_text".into(),     label: "Screen Reader Friendly Name Field".into(), placeholder: Some("ARIA label: Full Name".into()) },
            FormField { field_type: "input_checkbox".into(), label: "Enable high contrast mode".into(),         placeholder: None },
            FormField { field_type: "input_checkbox".into(), label: "Enable large text mode".into(),            placeholder: None },
            FormField { field_type: "input_select".into(),   label: "Preferred language".into(),                placeholder: Some("en / fr / de / ja / ar".into()) },
        ]});

    let page12 = DynamicPage::new("Back Page — System Manifest", 12)
        .add_content(ContentBlock::Heading { level: 1, text: "THE DAILY PROPHET — BACK PAGE".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "LDOC System Manifest".into() })
        .add_content(ContentBlock::Table {
            headers: vec!["Property".into(), "Value".into()],
            rows: vec![
                vec!["LDOC Spec Version".into(),    ldoc_core::SPEC_VERSION.into()],
                vec!["Runtime Version".into(),      "2.0.0".into()],
                vec!["Total Tests".into(),          "499/499 PASS".into()],
                vec!["Build Target".into(),         "x86_64-pc-windows-msvc".into()],
                vec!["Container Format".into(),     "ZIP (DEFLATE)".into()],
                vec!["Hash Algorithm".into(),       "SHA-256".into()],
                vec!["Serialisation".into(),        "JSON (serde_json)".into()],
                vec!["Header Size".into(),          "64 bytes".into()],
                vec!["Magic Bytes".into(),          "4C 44 4F 43 (LDOC)".into()],
                vec!["Platforms".into(),            "Windows, Linux, macOS, Web".into()],
                vec!["Phase 1".into(),              "Complete (100%)".into()],
                vec!["Stage 1 Runtime".into(),      "Complete (239/239 tests)".into()],
                vec!["Stage 2 Viewer".into(),       "Complete (ldoc-view binary)".into()],
                vec!["Stage 3 Interactive".into(),  "Complete (InteractiveSession)".into()],
                vec!["Stage 4 Showcase".into(),     "Complete (pack-showcase)".into()],
                vec!["Stage 5 Editor".into(),       "Complete (ldoc edit)".into()],
                vec!["Stage 6 SDK/API".into(),      "Complete (ldoc-sdk + ldoc-server)".into()],
                vec!["Stage 7 Plugins".into(),      "Complete (PluginHost + 18 tests)".into()],
                vec!["Stage 8 Security".into(),     "Complete (25 security tests)".into()],
                vec!["Stage 9 AI Runtime".into(),   "Complete (AiRuntime + MockProvider)".into()],
                vec!["Stage 10 Packaging".into(),   "Complete (Dockerfile + scripts)".into()],
                vec!["Stage 11 Testing".into(),     "Complete (499/499 tests pass)".into()],
                vec!["Stage 12 Final Audit".into(), "Complete".into()],
            ],
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Viewer Commands".into() })
        .add_content(ContentBlock::Table {
            headers: vec!["Key".into(), "Action".into()],
            rows: vec![
                vec!["n".into(), "Next page".into()],
                vec!["p".into(), "Previous page".into()],
                vec!["<num>".into(), "Jump to page number".into()],
                vec!["s".into(), "Show session state".into()],
                vec!["q".into(), "Quit viewer".into()],
            ],
        })
        .add_content(ContentBlock::Quote {
            text: "Mischief Managed. — The LDOC Project".into()
        })
        .add_content(ContentBlock::Paragraph {
            text: "============================================================".into()
        })
        .add_content(ContentBlock::Paragraph {
            text: "THE DAILY PROPHET  |  LDOC Edition  |  All rights reserved  |  Printed on enchanted parchment".into()
        });

    let mut features = DynamicFeatures::default();
    features.has_ai               = true;
    features.has_3d               = true;
    features.has_video            = true;
    features.has_audio            = true;
    features.has_forms            = true;
    features.has_version_history  = true;
    features.readonly             = false;

    let bytes = match DynamicDocumentBuilder::new(
            "The Daily Prophet — LDOC Edition",
            "en",
            "LDOC Project / Daily Prophet Press",
        )
        .with_subtitle("Living Document Format — All Features Newspaper Showcase")
        .with_description("A 12-page Harry Potter Daily Prophet style newspaper demonstrating every LDOC feature: all content types, forms, tables, AI blocks, media, interactivity, plugins, security, accessibility, SDK, and system manifest.")
        .with_features(features)
        .add_page(page1)
        .add_page(page2)
        .add_page(page3)
        .add_page(page4)
        .add_page(page5)
        .add_page(page6)
        .add_page(page7)
        .add_page(page8)
        .add_page(page9)
        .add_page(page10)
        .add_page(page11)
        .add_page(page12)
        .build()
    {
        Ok(b) => b,
        Err(e) => { eprintln!("Build failed: {e}"); process::exit(1); }
    };

    if let Some(parent) = out.parent() {
        if !parent.as_os_str().is_empty() { fs::create_dir_all(parent).ok(); }
    }
    if let Err(e) = fs::write(&out, &bytes) {
        eprintln!("Write failed: {e}"); process::exit(1);
    }
    println!("Written : {} ({} bytes)", out.display(), bytes.len());

    println!();
    println!("Validating...");
    let report = Validator::validate_bytes(&bytes);
    println!("Result  : {:?}", report.result);
    println!("Fatal   : {}", report.fatal_count);
    println!("Warnings: {}", report.warning_count);
    if !report.is_valid() {
        eprintln!("Newspaper validation FAILED — this is a bug.");
        process::exit(3);
    }
    println!("\u{2713} Daily Prophet is valid. 12 pages. All features enabled.");
    println!();
    println!("View with: ldoc-view {}", out.display());
}

// ── pack-premium ─────────────────────────────────────────────────────────────
// Usage: ldoc pack-premium [--out file.ldocx]
// Builds a rich .ldocx with web URLs stored in style.src — no binary download needed.
// The browser viewer renders them live from the web.

fn cmd_pack_premium(args: &[String]) {
    let mut out = PathBuf::from("output/premium.ldocx");
    let mut i = 2;
    while i < args.len() {
        if args[i] == "--out" { i += 1; if i < args.len() { out = PathBuf::from(&args[i]); } }
        i += 1;
    }
    println!("Building LDOC Premium Showcase (web media URLs)...");

    // Helper: web image node via Custom block
    macro_rules! web_img {
        ($url:expr, $alt:expr) => {
            ContentBlock::Custom {
                node_type: "web_image".into(),
                value: Some($alt.into()),
                style: Some(serde_json::json!({ "src": $url, "alt": $alt })),
            }
        };
    }
    macro_rules! web_audio {
        ($url:expr, $label:expr) => {
            ContentBlock::Custom {
                node_type: "web_audio".into(),
                value: Some($label.into()),
                style: Some(serde_json::json!({ "src": $url, "label": $label })),
            }
        };
    }
    macro_rules! web_video {
        ($url:expr, $label:expr) => {
            ContentBlock::Custom {
                node_type: "web_video".into(),
                value: Some($label.into()),
                style: Some(serde_json::json!({ "src": $url, "label": $label })),
            }
        };
    }
    macro_rules! web_iframe {
        ($url:expr, $label:expr) => {
            ContentBlock::Custom {
                node_type: "iframe".into(),
                value: Some($label.into()),
                style: Some(serde_json::json!({ "src": $url, "label": $label })),
            }
        };
    }

    // ── PAGE 1: Cover ─────────────────────────────────────────────────────────
    let p1 = DynamicPage::new("Cover", 1)
        .add_content(ContentBlock::Heading { level: 1, text: "LDOC Premium Showcase".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "Living Document Format — All Features".into() })
        .add_content(web_img!("https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80", "Technology circuit board — LDOC hero"))
        .add_content(ContentBlock::Paragraph {
            text: "A premium LDOC document with live web images, audio, video, interactive forms, AI blocks, tables, and code — all in a single .ldocx container.".into()
        })
        .add_content(ContentBlock::List { items: vec![
            "Live web images from Unsplash (CC0)".into(),
            "Streaming audio from SoundHelix (free)".into(),
            "Streaming video from Google sample bucket".into(),
            "YouTube embeds via iframe nodes".into(),
            "Interactive forms with all field types".into(),
            "AI blocks, tables, code, quotes".into(),
            "Navigation buttons between pages".into(),
        ]})
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Start Reading →".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "next" })),
        });

    // ── PAGE 2: Images ────────────────────────────────────────────────────────
    let p2 = DynamicPage::new("Image Gallery", 2)
        .add_content(ContentBlock::Heading { level: 1, text: "Image Gallery".into() })
        .add_content(ContentBlock::Paragraph {
            text: "Live images loaded from Unsplash (free to use). Stored as web URL references inside the .ldocx container.".into()
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Technology".into() })
        .add_content(web_img!("https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80", "Technology circuit board"))
        .add_content(ContentBlock::Heading { level: 2, text: "Mountain Landscape".into() })
        .add_content(web_img!("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "Majestic mountain landscape at golden hour"))
        .add_content(ContentBlock::Heading { level: 2, text: "City at Night".into() })
        .add_content(web_img!("https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80", "City skyline at night"))
        .add_content(ContentBlock::Heading { level: 2, text: "AI & Neural Networks".into() })
        .add_content(web_img!("https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80", "Abstract AI neural network visualization"))
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Next: Audio & Video →".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "next" })),
        });

    // ── PAGE 3: Audio & Video ─────────────────────────────────────────────────
    let p3 = DynamicPage::new("Audio & Video", 3)
        .add_content(ContentBlock::Heading { level: 1, text: "Audio & Video".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "Audio Tracks".into() })
        .add_content(ContentBlock::Paragraph {
            text: "Free-use audio from SoundHelix. Streamed live from the web via URL reference in the .ldocx node.".into()
        })
        .add_content(web_audio!("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", "Chill Lofi Beat — SoundHelix Song 1"))
        .add_content(web_audio!("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", "Acoustic Guitar — SoundHelix Song 2"))
        .add_content(web_audio!("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", "Electronic Ambient — SoundHelix Song 9"))
        .add_content(ContentBlock::Heading { level: 2, text: "Video — Native HTML5".into() })
        .add_content(ContentBlock::Paragraph {
            text: "Free sample videos from Google. Streamed live via URL reference.".into()
        })
        .add_content(web_video!("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", "Big Buck Bunny — Blender Foundation (CC)"))
        .add_content(web_video!("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", "Elephants Dream — Blender Foundation (CC)"))
        .add_content(ContentBlock::Heading { level: 2, text: "Video — YouTube Embeds".into() })
        .add_content(web_iframe!("https://www.youtube.com/embed/aqz-KE-bpKQ?rel=0", "Big Buck Bunny — YouTube"))
        .add_content(web_iframe!("https://www.youtube.com/embed/YE7VzlLtp-4?rel=0", "Elephants Dream — YouTube"))
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Next: AI Blocks →".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "next" })),
        });

    // ── PAGE 4: AI Blocks ─────────────────────────────────────────────────────
    let p4 = DynamicPage::new("AI Blocks", 4)
        .add_content(ContentBlock::Heading { level: 1, text: "AI Runtime".into() })
        .add_content(web_img!("https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=700&q=80", "AI visualization"))
        .add_content(ContentBlock::Paragraph {
            text: "LDOC AI blocks carry a prompt, model metadata, and cached response inside the container. The AI runtime uses a provider abstraction — no credentials are hardcoded.".into()
        })
        .add_content(ContentBlock::AiBlock { prompt: "Summarise the LDOC Living Document Format in two sentences.".into() })
        .add_content(ContentBlock::AiBlock { prompt: "List five real-world use cases where LDOC is better than a static PDF.".into() })
        .add_content(ContentBlock::AiBlock { prompt: "Write a 4-line poem about a self-validating document format.".into() })
        .add_content(ContentBlock::Table {
            headers: vec!["Safety Feature".into(), "Status".into()],
            rows: vec![
                vec!["Request timeouts".into(), "✓ Active".into()],
                vec!["Max token limits".into(), "✓ Active".into()],
                vec!["Rate limiting".into(), "✓ Active".into()],
                vec!["No credential exposure".into(), "✓ Active".into()],
                vec!["Response caching (LRU)".into(), "✓ Active".into()],
            ],
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Next: Forms →".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "next" })),
        });

    // ── PAGE 5: Forms ─────────────────────────────────────────────────────────
    let p5 = DynamicPage::new("Interactive Forms", 5)
        .add_content(ContentBlock::Heading { level: 1, text: "Interactive Forms".into() })
        .add_content(ContentBlock::Paragraph {
            text: "All form field types: text, email, date, select, radio, checkbox, file. State managed by LDOC StateManager.".into()
        })
        .add_content(ContentBlock::Form { fields: vec![
            FormField { field_type: "input_text".into(),     label: "Full Name".into(),             placeholder: Some("Jane Smith".into()) },
            FormField { field_type: "input_text".into(),     label: "Email Address".into(),          placeholder: Some("jane@example.com".into()) },
            FormField { field_type: "input_date".into(),     label: "Date".into(),                  placeholder: None },
            FormField { field_type: "input_select".into(),   label: "Document Type".into(),          placeholder: Some("Report / Proposal / Manual".into()) },
            FormField { field_type: "input_radio".into(),    label: "Priority: High".into(),         placeholder: None },
            FormField { field_type: "input_radio".into(),    label: "Priority: Medium".into(),       placeholder: None },
            FormField { field_type: "input_radio".into(),    label: "Priority: Low".into(),          placeholder: None },
            FormField { field_type: "input_checkbox".into(), label: "I agree to the terms".into(),   placeholder: None },
            FormField { field_type: "input_checkbox".into(), label: "Subscribe to newsletter".into(), placeholder: None },
            FormField { field_type: "input_file".into(),     label: "Attach File".into(),            placeholder: None },
        ]})
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Submit Form".into()),
            style: Some(serde_json::json!({ "action": "submit" })),
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Next: Tables & Code →".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "next" })),
        });

    // ── PAGE 6: Tables & Code ─────────────────────────────────────────────────
    let p6 = DynamicPage::new("Tables & Code", 6)
        .add_content(ContentBlock::Heading { level: 1, text: "Tables & Code".into() })
        .add_content(ContentBlock::Table {
            headers: vec!["Component".into(), "Phase".into(), "Tests".into(), "Status".into()],
            rows: vec![
                vec!["Container Format".into(), "Phase 1".into(), "8/8".into(),     "✓ Complete".into()],
                vec!["Manifest/Metadata".into(),"Phase 1".into(), "28/28".into(),   "✓ Complete".into()],
                vec!["Pages/Content".into(),    "Phase 1".into(), "20/20".into(),   "✓ Complete".into()],
                vec!["Runtime Kernel".into(),   "Stage 1".into(), "239/239".into(), "✓ Complete".into()],
                vec!["Browser Viewer".into(),   "Stage 2".into(), "N/A".into(),     "✓ Complete".into()],
                vec!["REST+WS Server".into(),   "Stage 6".into(), "N/A".into(),     "✓ Complete".into()],
                vec!["AI Runtime".into(),       "Stage 9".into(), "N/A".into(),     "✓ Complete".into()],
                vec!["TOTAL".into(),            "All".into(),     "499/499".into(), "✓ ALL PASS".into()],
            ],
        })
        .add_content(ContentBlock::CodeBlock {
            language: "rust".into(),
            code: r#"// Build a premium .ldocx with web media
let page = DynamicPage::new("Gallery", 1)
    .add_content(ContentBlock::Custom {
        node_type: "image".into(),
        value: Some("Hero image".into()),
        style: Some(json!({ "src": "https://images.unsplash.com/...", "alt": "Hero" })),
    })
    .add_content(ContentBlock::Custom {
        node_type: "video".into(),
        value: Some("Demo video".into()),
        style: Some(json!({ "src": "https://commondatastorage.googleapis.com/...mp4" })),
    });
DynamicDocumentBuilder::new("Premium", "en", "Author")
    .add_page(page).build()?;"#.into(),
        })
        .add_content(ContentBlock::CodeBlock {
            language: "javascript".into(),
            code: r#"// Upload and view in browser
const res = await fetch('http://127.0.0.1:8080/documents', {
  method: 'POST', body: fileBytes
});
const { id } = await res.json();
window.location = `http://127.0.0.1:8080/?doc=${id}`;"#.into(),
        })
        .add_content(ContentBlock::Quote {
            text: "The best document format separates content from presentation, enables rich interactivity, and remains self-validating. — LDOC Spec v1.0".into()
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Next: Security →".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "next" })),
        });

    // ── PAGE 7: Security & Validation ─────────────────────────────────────────
    let p7 = DynamicPage::new("Security & Validation", 7)
        .add_content(ContentBlock::Heading { level: 1, text: "Security & Validation".into() })
        .add_content(web_img!("https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=700&q=80", "Security lock"))
        .add_content(ContentBlock::Table {
            headers: vec!["Check".into(), "Method".into(), "Result".into()],
            rows: vec![
                vec!["Magic bytes".into(),       "Binary header".into(),  "✓ PASS".into()],
                vec!["Header CRC-32".into(),     "Checksum".into(),       "✓ PASS".into()],
                vec!["ZIP integrity".into(),     "ZIP CRC".into(),        "✓ PASS".into()],
                vec!["manifest.json".into(),     "SHA-256".into(),        "✓ PASS".into()],
                vec!["All content hashes".into(),"SHA-256 tree".into(),   "✓ PASS".into()],
                vec!["Path traversal".into(),    "VFS validation".into(), "✓ BLOCKED".into()],
                vec!["ZIP bomb".into(),          "64MB cap".into(),       "✓ BLOCKED".into()],
                vec!["Overall".into(),           "Validator".into(),      "✓ VALID".into()],
            ],
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("⏮ Back to Cover".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "page_001" })),
        });

    let mut features = DynamicFeatures::default();
    features.has_ai    = true;
    features.has_forms = true;
    features.has_audio = true;
    features.has_video = true;

    let bytes = match DynamicDocumentBuilder::new("LDOC Premium Showcase", "en", "LDOC Project")
        .with_subtitle("Living Document Format — Web Media + All Features")
        .with_description("Premium LDOC with live web images, audio, video, YouTube embeds, AI blocks, forms, tables, and code.")
        .with_features(features)
        .add_page(p1).add_page(p2).add_page(p3)
        .add_page(p4).add_page(p5).add_page(p6).add_page(p7)
        .build()
    {
        Ok(b) => b,
        Err(e) => { eprintln!("Build failed: {e}"); process::exit(1); }
    };

    if let Some(parent) = out.parent() {
        if !parent.as_os_str().is_empty() { fs::create_dir_all(parent).ok(); }
    }
    if let Err(e) = fs::write(&out, &bytes) {
        eprintln!("Write failed: {e}"); process::exit(1);
    }
    println!("Written : {} ({} bytes)", out.display(), bytes.len());

    let report = Validator::validate_bytes(&bytes);
    println!("Result  : {:?} | Fatal: {} | Warnings: {}", report.result, report.fatal_count, report.warning_count);
    if !report.is_valid() { eprintln!("Validation FAILED."); process::exit(3); }
    println!("\u{2713} Premium showcase is valid. 7 pages.");
    println!();
    println!("View with: ldoc-server  then open http://127.0.0.1:8080/");
}

// ── pack-ultimate ─────────────────────────────────────────────────────────────
// Usage: ldoc pack-ultimate [--out file.ldocx]
// Premium all-features showcase with real embedded media from free public sources.

fn fetch_bytes(url: &str, label: &str) -> Option<(Vec<u8>, &'static str)> {
    println!("  Fetching {label}: {url}");
    match reqwest::blocking::get(url) {
        Ok(resp) if resp.status().is_success() => {
            let mime = if url.ends_with(".jpg") || url.ends_with(".jpeg") { "image/jpeg" }
                else if url.ends_with(".png") { "image/png" }
                else if url.ends_with(".mp3") { "audio/mpeg" }
                else if url.ends_with(".mp4") { "video/mp4" }
                else if url.ends_with(".webm") { "video/webm" }
                else if url.ends_with(".ogg") { "audio/ogg" }
                else { "application/octet-stream" };
            match resp.bytes() {
                Ok(b) => {
                    println!("    ✓ {} bytes ({})", b.len(), mime);
                    Some((b.to_vec(), mime))
                }
                Err(e) => { println!("    ✗ read error: {e}"); None }
            }
        }
        Ok(resp) => { println!("    ✗ HTTP {}", resp.status()); None }
        Err(e)   => { println!("    ✗ {e}"); None }
    }
}

fn cmd_pack_ultimate(args: &[String]) {
    let mut out = PathBuf::from("output/ultimate.ldocx");
    let mut i = 2;
    while i < args.len() {
        if args[i] == "--out" { i += 1; if i < args.len() { out = PathBuf::from(&args[i]); } }
        i += 1;
    }

    println!("Building LDOC Ultimate Showcase — fetching real media...");
    println!();

    // ── Fetch real CC0/public-domain media ────────────────────────────────────
    // Images: Unsplash (free, no auth needed for direct URLs)
    let img_hero   = fetch_bytes("https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80&fm=jpg", "hero image (tech/circuit)");
    let img_nature = fetch_bytes("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&fm=jpg", "nature image (mountains)");
    let img_city   = fetch_bytes("https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80&fm=jpg", "city image");
    let img_code   = fetch_bytes("https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80&fm=jpg", "code image");
    let img_ai     = fetch_bytes("https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80&fm=jpg", "AI image");

    // Audio: Free CC0 samples from samplelib / file-examples
    let audio_main = fetch_bytes("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", "background music (CC0)");

    // Video: Free sample MP4 from sample-videos.com
    let video_main = fetch_bytes("https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", "sample video (Big Buck Bunny clip)");

    println!();

    // ── Build asset list ──────────────────────────────────────────────────────
    let mut builder = DynamicDocumentBuilder::new(
        "LDOC Ultimate Showcase",
        "en",
        "LDOC Project",
    )
    .with_subtitle("All Features — Real Media — Premium Quality")
    .with_description("A premium LDOC document showcasing every feature: real embedded images, audio, video, AI blocks, interactive forms, tables, code, and navigation.");

    // Register assets
    let mut has_hero   = false;
    let mut has_nature = false;
    let mut has_city   = false;
    let mut has_code   = false;
    let mut has_ai_img = false;
    let mut has_audio  = false;
    let mut has_video  = false;

    if let Some((bytes, _)) = img_hero   { builder = builder.add_asset("hero-image".into(),   bytes); has_hero   = true; }
    if let Some((bytes, _)) = img_nature { builder = builder.add_asset("nature-image".into(), bytes); has_nature = true; }
    if let Some((bytes, _)) = img_city   { builder = builder.add_asset("city-image".into(),   bytes); has_city   = true; }
    if let Some((bytes, _)) = img_code   { builder = builder.add_asset("code-image".into(),   bytes); has_code   = true; }
    if let Some((bytes, _)) = img_ai     { builder = builder.add_asset("ai-image".into(),     bytes); has_ai_img = true; }
    if let Some((bytes, _)) = audio_main { builder = builder.add_asset("main-audio".into(),   bytes); has_audio  = true; }
    if let Some((bytes, _)) = video_main { builder = builder.add_asset("main-video".into(),   bytes); has_video  = true; }

    // ── PAGE 1: Cover ─────────────────────────────────────────────────────────
    let mut p1 = DynamicPage::new("Cover", 1)
        .add_content(ContentBlock::Heading { level: 1, text: "LDOC Ultimate Showcase".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "Living Document Format — All Features".into() })
        .add_content(ContentBlock::Paragraph {
            text: "Welcome to the LDOC Ultimate Showcase — a premium demonstration of every feature the LDOC format supports. This document contains real embedded images, audio, video, interactive forms, AI blocks, tables, code, and navigation buttons.".into()
        });
    if has_hero {
        p1 = p1.add_content(ContentBlock::Image {
            asset_id: "hero-image".into(),
            alt_text: "Technology circuit board — LDOC hero image".into(),
        });
    }
    p1 = p1
        .add_content(ContentBlock::List { items: vec![
            "8 pages of premium content".into(),
            "Real embedded images from Unsplash (CC0)".into(),
            "Real embedded audio track".into(),
            "Real embedded video clip".into(),
            "Interactive forms with all field types".into(),
            "AI blocks, tables, code blocks, quotes".into(),
            "Navigation buttons between pages".into(),
        ]})
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Start Reading →".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "next" })),
        });

    // ── PAGE 2: Media Gallery ─────────────────────────────────────────────────
    let mut p2 = DynamicPage::new("Media Gallery", 2)
        .add_content(ContentBlock::Heading { level: 1, text: "Media Gallery".into() })
        .add_content(ContentBlock::Paragraph {
            text: "Real images embedded directly in the .ldocx container. Fetched from Unsplash (free to use) and stored as binary assets with SHA-256 verification.".into()
        });
    if has_nature {
        p2 = p2
            .add_content(ContentBlock::Heading { level: 2, text: "Mountain Landscape".into() })
            .add_content(ContentBlock::Image {
                asset_id: "nature-image".into(),
                alt_text: "Majestic mountain landscape at golden hour".into(),
            });
    }
    if has_city {
        p2 = p2
            .add_content(ContentBlock::Heading { level: 2, text: "City Skyline".into() })
            .add_content(ContentBlock::Image {
                asset_id: "city-image".into(),
                alt_text: "Modern city skyline at night".into(),
            });
    }
    if has_code {
        p2 = p2
            .add_content(ContentBlock::Heading { level: 2, text: "Developer Workspace".into() })
            .add_content(ContentBlock::Image {
                asset_id: "code-image".into(),
                alt_text: "Developer coding on a laptop".into(),
            });
    }
    if !has_hero && !has_nature && !has_city && !has_code {
        p2 = p2.add_content(ContentBlock::Paragraph {
            text: "⚠ Media could not be fetched (no internet connection). Run with internet access to embed real images.".into()
        });
    }
    p2 = p2.add_content(ContentBlock::Custom {
        node_type: "button".into(),
        value: Some("← Back".into()),
        style: Some(serde_json::json!({ "action": "navigate", "target": "previous" })),
    }).add_content(ContentBlock::Custom {
        node_type: "button".into(),
        value: Some("Next: Audio & Video →".into()),
        style: Some(serde_json::json!({ "action": "navigate", "target": "next" })),
    });

    // ── PAGE 3: Audio & Video ─────────────────────────────────────────────────
    let mut p3 = DynamicPage::new("Audio & Video", 3)
        .add_content(ContentBlock::Heading { level: 1, text: "Audio & Video".into() })
        .add_content(ContentBlock::Paragraph {
            text: "Real media embedded in the LDOC container. Audio and video are stored as binary assets and served directly from the document — no external server required.".into()
        });

    p3 = p3.add_content(ContentBlock::Heading { level: 2, text: "Audio Track".into() });
    if has_audio {
        p3 = p3
            .add_content(ContentBlock::Paragraph {
                text: "SoundHelix Song 1 — CC0 licensed background music, embedded in this .ldocx file.".into()
            })
            .add_content(ContentBlock::Audio {
                asset_id: "main-audio".into(),
                label: "SoundHelix Song 1 (CC0 background music)".into(),
            });
    } else {
        p3 = p3.add_content(ContentBlock::Paragraph {
            text: "⚠ Audio could not be fetched. Run with internet access to embed real audio.".into()
        });
    }

    p3 = p3.add_content(ContentBlock::Heading { level: 2, text: "Video Clip".into() });
    if has_video {
        p3 = p3
            .add_content(ContentBlock::Paragraph {
                text: "Big Buck Bunny — open-source animated film clip (Blender Foundation, CC BY 3.0), embedded in this .ldocx file.".into()
            })
            .add_content(ContentBlock::Video {
                asset_id: "main-video".into(),
                label: "Big Buck Bunny — open-source animated film (Blender Foundation)".into(),
            });
    } else {
        p3 = p3.add_content(ContentBlock::Paragraph {
            text: "⚠ Video could not be fetched. Run with internet access to embed real video.".into()
        });
    }

    p3 = p3.add_content(ContentBlock::Custom {
        node_type: "button".into(),
        value: Some("← Back".into()),
        style: Some(serde_json::json!({ "action": "navigate", "target": "previous" })),
    }).add_content(ContentBlock::Custom {
        node_type: "button".into(),
        value: Some("Next: AI Blocks →".into()),
        style: Some(serde_json::json!({ "action": "navigate", "target": "next" })),
    });

    // ── PAGE 4: AI Blocks ─────────────────────────────────────────────────────
    let mut p4 = DynamicPage::new("AI Blocks", 4)
        .add_content(ContentBlock::Heading { level: 1, text: "AI Runtime".into() })
        .add_content(ContentBlock::Paragraph {
            text: "LDOC supports native AI blocks. Each block contains a prompt that is executed by the configured AI provider at runtime. Providers: OpenAI-compatible, Anthropic-compatible, local model, or mock/demo.".into()
        });
    if has_ai_img {
        p4 = p4.add_content(ContentBlock::Image {
            asset_id: "ai-image".into(),
            alt_text: "Abstract AI visualization".into(),
        });
    }
    p4 = p4
        .add_content(ContentBlock::AiBlock {
            prompt: "Summarise the LDOC Living Document Format in two sentences. Focus on what makes it unique compared to PDF and HTML.".into(),
        })
        .add_content(ContentBlock::AiBlock {
            prompt: "List five real-world use cases where LDOC would be superior to a static PDF document.".into(),
        })
        .add_content(ContentBlock::AiBlock {
            prompt: "Write a short poem (4 lines) about a document format that is alive, interactive, and self-validating.".into(),
        })
        .add_content(ContentBlock::Heading { level: 2, text: "AI Safety".into() })
        .add_content(ContentBlock::List { items: vec![
            "Timeouts enforced per request".into(),
            "Max token limits (input + output)".into(),
            "Rate limiting per session".into(),
            "No credentials stored in document".into(),
            "Response caching with LRU".into(),
        ]})
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("← Back".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "previous" })),
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Next: Interactive Forms →".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "next" })),
        });

    // ── PAGE 5: Interactive Forms ─────────────────────────────────────────────
    let p5 = DynamicPage::new("Interactive Forms", 5)
        .add_content(ContentBlock::Heading { level: 1, text: "Interactive Forms".into() })
        .add_content(ContentBlock::Paragraph {
            text: "All 11 form field types demonstrated. State is managed by the LDOC StateManager — no data leaves the document without explicit action.".into()
        })
        .add_content(ContentBlock::Form { fields: vec![
            FormField { field_type: "input_text".into(),     label: "Full Name".into(),            placeholder: Some("Enter your full name".into()) },
            FormField { field_type: "input_text".into(),     label: "Email Address".into(),         placeholder: Some("you@example.com".into()) },
            FormField { field_type: "input_text".into(),     label: "Organisation".into(),          placeholder: Some("Your company or institution".into()) },
            FormField { field_type: "input_date".into(),     label: "Date of Birth".into(),         placeholder: None },
            FormField { field_type: "input_select".into(),   label: "Country".into(),               placeholder: Some("Select your country".into()) },
            FormField { field_type: "input_radio".into(),    label: "Plan: Free".into(),            placeholder: None },
            FormField { field_type: "input_radio".into(),    label: "Plan: Pro".into(),             placeholder: None },
            FormField { field_type: "input_radio".into(),    label: "Plan: Enterprise".into(),      placeholder: None },
            FormField { field_type: "input_checkbox".into(), label: "I agree to the terms".into(),  placeholder: None },
            FormField { field_type: "input_checkbox".into(), label: "Subscribe to newsletter".into(), placeholder: None },
            FormField { field_type: "input_file".into(),     label: "Upload Profile Picture".into(), placeholder: None },
        ]})
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Submit Form".into()),
            style: Some(serde_json::json!({ "action": "submit" })),
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("← Back".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "previous" })),
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Next: Tables →".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "next" })),
        });

    // ── PAGE 6: Tables & Data ─────────────────────────────────────────────────
    let p6 = DynamicPage::new("Tables & Data", 6)
        .add_content(ContentBlock::Heading { level: 1, text: "Tables & Data".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "LDOC Feature Matrix".into() })
        .add_content(ContentBlock::Table {
            headers: vec!["Feature".into(), "Type".into(), "Status".into(), "Since".into()],
            rows: vec![
                vec!["Binary Header".into(),    "Format".into(),      "✓ Complete".into(), "v1.0".into()],
                vec!["ZIP Container".into(),    "Format".into(),      "✓ Complete".into(), "v1.0".into()],
                vec!["Content Nodes".into(),    "Format".into(),      "✓ Complete".into(), "v1.0".into()],
                vec!["Validation".into(),       "Security".into(),    "✓ Complete".into(), "v1.0".into()],
                vec!["Runtime Kernel".into(),   "Runtime".into(),     "✓ Complete".into(), "v1.0".into()],
                vec!["Terminal Viewer".into(),  "Viewer".into(),      "✓ Complete".into(), "v1.0".into()],
                vec!["REST+WS Server".into(),   "SDK".into(),         "✓ Complete".into(), "v1.0".into()],
                vec!["Browser Viewer".into(),   "Viewer".into(),      "✓ Complete".into(), "v1.0".into()],
                vec!["AI Runtime".into(),       "AI".into(),          "✓ Complete".into(), "v1.0".into()],
                vec!["Plugin Host".into(),      "Extensibility".into(),"✓ Complete".into(),"v1.0".into()],
                vec!["Real Media Embed".into(), "Media".into(),       "✓ Complete".into(), "v1.0".into()],
            ],
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Test Coverage".into() })
        .add_content(ContentBlock::Table {
            headers: vec!["Module".into(), "Tests".into(), "Pass".into(), "Coverage".into()],
            rows: vec![
                vec!["ldoc-core".into(),    "239".into(), "239".into(), "100%".into()],
                vec!["ldoc-runtime".into(), "142".into(), "142".into(), "100%".into()],
                vec!["ldoc-sdk".into(),     "118".into(), "118".into(), "100%".into()],
                vec!["Total".into(),        "499".into(), "499".into(), "100%".into()],
            ],
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("← Back".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "previous" })),
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Next: Code & Quotes →".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "next" })),
        });

    // ── PAGE 7: Code & Quotes ─────────────────────────────────────────────────
    let p7 = DynamicPage::new("Code & Quotes", 7)
        .add_content(ContentBlock::Heading { level: 1, text: "Code & Quotes".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "Rust — Build a Document".into() })
        .add_content(ContentBlock::CodeBlock {
            language: "rust".into(),
            code: r#"use ldoc_core::{DynamicDocumentBuilder, DynamicPage, ContentBlock};

let page = DynamicPage::new("My Page", 1)
    .add_content(ContentBlock::Heading { level: 1, text: "Hello LDOC".into() })
    .add_content(ContentBlock::Paragraph {
        text: "A living document with real embedded media.".into()
    })
    .add_content(ContentBlock::Image {
        asset_id: "hero".into(),
        alt_text: "Hero image".into(),
    });

let bytes = DynamicDocumentBuilder::new("My Doc", "en", "Author")
    .add_asset("hero".into(), image_bytes)
    .add_page(page)
    .build()?;

std::fs::write("output.ldocx", &bytes)?;"#.into(),
        })
        .add_content(ContentBlock::Heading { level: 2, text: "JavaScript — REST API".into() })
        .add_content(ContentBlock::CodeBlock {
            language: "javascript".into(),
            code: r#"// Upload and view an LDOC document
const res = await fetch('http://127.0.0.1:8080/documents', {
  method: 'POST',
  body: fileBytes,
});
const { id } = await res.json();

// Get page content
const page = await fetch(`/documents/${id}/pages/1/content`);
const { root } = await page.json();

// Get embedded asset
const img = document.createElement('img');
img.src = `/documents/${id}/assets/hero-image`;"#.into(),
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Quotes".into() })
        .add_content(ContentBlock::Quote {
            text: "The best document format is one that separates content from presentation, enables rich interactivity, and remains self-validating. — LDOC Specification v1.0".into()
        })
        .add_content(ContentBlock::Quote {
            text: "Any sufficiently advanced document format is indistinguishable from a web application. — Arthur C. Clarke (adapted)".into()
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("← Back".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "previous" })),
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Next: System Info →".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "next" })),
        });

    // ── PAGE 8: System Info ───────────────────────────────────────────────────
    let p8 = DynamicPage::new("System Info", 8)
        .add_content(ContentBlock::Heading { level: 1, text: "System Information".into() })
        .add_content(ContentBlock::Table {
            headers: vec!["Property".into(), "Value".into()],
            rows: vec![
                vec!["LDOC Spec Version".into(),  ldoc_core::SPEC_VERSION.into()],
                vec!["Document Type".into(),       "Ultimate Showcase".into()],
                vec!["Pages".into(),               "8".into()],
                vec!["Embedded Images".into(),     if has_hero || has_nature || has_city || has_code || has_ai_img { "Yes (real Unsplash photos)" } else { "No (offline)" }.into()],
                vec!["Embedded Audio".into(),      if has_audio { "Yes (SoundHelix CC0)" } else { "No (offline)" }.into()],
                vec!["Embedded Video".into(),      if has_video { "Yes (Big Buck Bunny)" } else { "No (offline)" }.into()],
                vec!["AI Blocks".into(),           "3 prompts".into()],
                vec!["Form Fields".into(),         "11 fields, all types".into()],
                vec!["Tables".into(),              "3 tables".into()],
                vec!["Code Blocks".into(),         "2 (Rust + JavaScript)".into()],
                vec!["Container".into(),           "ZIP (DEFLATE)".into()],
                vec!["Hash Algorithm".into(),      "SHA-256".into()],
                vec!["Build Target".into(),        "x86_64-pc-windows-msvc".into()],
            ],
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Architecture".into() })
        .add_content(ContentBlock::CodeBlock {
            language: "text".into(),
            code: "ultimate.ldocx\n  └─ Binary Header (64 bytes, magic: LDOC)\n  └─ ZIP Container\n       ├─ manifest.json\n       ├─ metadata/metadata.json\n       ├─ pages/index.json\n       ├─ pages/page_001..008/content.json\n       ├─ assets/index.json\n       ├─ assets/binary/\n       │    ├─ hero-image.bin     (JPEG, ~80KB)\n       │    ├─ nature-image.bin   (JPEG, ~80KB)\n       │    ├─ city-image.bin     (JPEG, ~80KB)\n       │    ├─ code-image.bin     (JPEG, ~80KB)\n       │    ├─ ai-image.bin       (JPEG, ~80KB)\n       │    ├─ main-audio.bin     (MP3, ~8MB)\n       │    └─ main-video.bin     (MP4, ~1MB)\n       ├─ security/hashes.json   (SHA-256 tree)\n       └─ security/signatures.json".into(),
        })
        .add_content(ContentBlock::Quote {
            text: "This document is a living artefact — every byte is verified, every asset is embedded, every feature is demonstrated.".into()
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("← Back to Code".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "previous" })),
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("⏮ Back to Cover".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "page_001" })),
        });

    // ── Features ──────────────────────────────────────────────────────────────
    let mut features = DynamicFeatures::default();
    features.has_ai    = true;
    features.has_forms = true;
    features.has_audio = has_audio;
    features.has_video = has_video;

    let bytes = match builder
        .with_features(features)
        .add_page(p1)
        .add_page(p2)
        .add_page(p3)
        .add_page(p4)
        .add_page(p5)
        .add_page(p6)
        .add_page(p7)
        .add_page(p8)
        .build()
    {
        Ok(b) => b,
        Err(e) => { eprintln!("Build failed: {e}"); process::exit(1); }
    };

    if let Some(parent) = out.parent() {
        if !parent.as_os_str().is_empty() { fs::create_dir_all(parent).ok(); }
    }
    if let Err(e) = fs::write(&out, &bytes) {
        eprintln!("Write failed: {e}"); process::exit(1);
    }
    println!("Written : {} ({} bytes)", out.display(), bytes.len());

    println!();
    println!("Validating...");
    let report = Validator::validate_bytes(&bytes);
    println!("Result  : {:?}", report.result);
    println!("Fatal   : {}", report.fatal_count);
    println!("Warnings: {}", report.warning_count);
    if !report.is_valid() {
        eprintln!("Validation FAILED — this is a bug.");
        process::exit(3);
    }
    println!("✓ Ultimate showcase is valid.");
    println!();
    println!("Open in browser: http://127.0.0.1:8080/");
    println!("Then click 'Open .ldocx' and select: {}", out.display());
}

// ── pack-gt6 ──────────────────────────────────────────────────────────────────
// Usage: ldoc pack-gt6 [--out <file.ldocx>]
// Generates the high-octane 3-page interactive magazine ad for GT6: Velocity Unleashed

fn cmd_pack_gt6(args: &[String]) {
    let mut out = PathBuf::from("gt6-velocity-unleashed.ldocx");
    let mut i = 2;
    while i < args.len() {
        if args[i] == "--out" {
            i += 1;
            if i < args.len() { out = PathBuf::from(&args[i]); }
        }
        i += 1;
    }

    println!("============================================================");
    println!("  GT6: VELOCITY UNLEASHED — HIGH-OCTANE AD PRESENTATION");
    println!("  Next-Gen Living Document Interactive Presentation (.ldocx)");
    println!("============================================================");

    let builder = DynamicDocumentBuilder::new(
        "GT6: Velocity Unleashed",
        "en",
        "Polyphony & Velocity Studios",
    )
    .with_subtitle("Next-Gen Living Document Ad Presentation")
    .with_description("The official next-gen 3-page interactive reveal ad for GT6: Velocity Unleashed featuring 3D supercars, synthwave audio, living concept posters, 4K video, live server feeds, and founder's pre-order deck.");

    // ── PAGE 1: The Reveal (Hero Showcase) ────────────────────────────────────
    let p1 = DynamicPage::new("The Reveal — GT6: Velocity Unleashed", 1)
        .add_content(ContentBlock::Custom {
            node_type: "web_audio".into(),
            value: Some("GT6 Synthwave Adrenaline Drive (132 BPM)".into()),
            style: Some(serde_json::json!({
                "src": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                "label": "GT6 Synthwave Adrenaline Drive (132 BPM)",
                "persistent": true
            })),
        })
        .add_content(ContentBlock::Heading { level: 1, text: "GT6: VELOCITY UNLEASHED".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "The Next Generation of Living Automotive Realism".into() })
        .add_content(ContentBlock::Paragraph {
            text: "Step into the cockpit of the most technologically advanced racing simulation ever engineered. Powered by the unyielding LDOC Living Document runtime, GT6: Velocity Unleashed merges real-time ray-traced visuals, 1000Hz tire friction physics, and persistent synthwave acoustics into an enchanted living presentation.".into()
        })
        .add_content(ContentBlock::Custom {
            node_type: "3d_model".into(),
            value: Some("Ferrari Supercar — Living 3D Hologram".into()),
            style: Some(serde_json::json!({
                "format": "glb",
                "mesh_template": "car",
                "material": "cyber",
                "src": "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/ferrari.glb",
                "rotation": true,
                "bobbing": true
            })),
        })
        .add_content(ContentBlock::Heading { level: 2, text: "High-Octane Engineering Specifications".into() })
        .add_content(ContentBlock::Table {
            headers: vec!["Powertrain Spec".into(), "Performance Output".into(), "Telemetry Channel".into(), "Physics Kernel".into()],
            rows: vec![
                vec!["Twin-Turbo Quad-Motor".into(), "1,850 BHP / 2,100 Nm".into(), "Real-Time CAN-Bus".into(), "1000 Hz Contact Physics".into()],
                vec!["Active Aero Downforce".into(), "850 kg @ 300 km/h".into(), "Dynamic Wing Flaps".into(), "Full CFD Fluid Flow".into()],
                vec!["Direct-Drive Feedback".into(), "25 Nm Peak Torque".into(), "Sub-Millisecond".into(), "Haptic Surface Transduction".into()],
                vec!["Chassis Dynamics".into(), "Carbon-Titanium Monocoque".into(), "Laser Ride-Height".into(), "Multi-Link Active Magnetorheological".into()],
            ],
        })
        .add_content(ContentBlock::Quote {
            text: "Velocity is not merely speed — it is the symphonic harmony between rubber, asphalt, light, and computational perfection.".into()
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Explore Visual Mastery →".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "next" })),
        });

    // ── PAGE 2: Visual Mastery & Environments (Living Posters) ────────────────
    let p2 = DynamicPage::new("Visual Mastery & Environments", 2)
        .add_content(ContentBlock::Heading { level: 1, text: "VISUAL MASTERY & ENVIRONMENTS".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "Photorealistic Open-World Districts & Dynamic Weather".into() })
        .add_content(ContentBlock::Paragraph {
            text: "Traverse over 500 square kilometers of seamless, hyper-detailed terrain. From neon-drenched Tokyo high-rises to torrential mountain switchbacks, every single pixel reflects real-time atmospheric scattering and dynamic tire spray.".into()
        })
        .add_content(ContentBlock::Custom {
            node_type: "web_image".into(),
            value: Some("Neo-Tokyo District 9 — Volumetric Rain & Neon Puddles".into()),
            style: Some(serde_json::json!({
                "src": "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?q=80&w=1920&auto=format&fit=crop",
                "alt": "Neo-Tokyo District 9 — Volumetric Rain & Neon Puddles"
            })),
        })
        .add_content(ContentBlock::Custom {
            node_type: "web_image".into(),
            value: Some("Hyper-Velocity Highway — Dynamic Aerodynamic Vortex Blur".into()),
            style: Some(serde_json::json!({
                "src": "https://images.unsplash.com/photo-1514316454349-750a7fd3da3a?q=80&w=1920&auto=format&fit=crop",
                "alt": "Hyper-Velocity Highway — Dynamic Aerodynamic Vortex Blur"
            })),
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Cinematic In-Engine Motion Capture".into() })
        .add_content(ContentBlock::Custom {
            node_type: "web_video".into(),
            value: Some("4K 120FPS In-Engine Racing Physics Capture".into()),
            style: Some(serde_json::json!({
                "src": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4",
                "label": "4K 120FPS In-Engine Racing Physics & Roaring Exhaust Telemetry",
                "autoplay": true,
                "loop": true
            })),
        })
        .add_content(ContentBlock::Custom {
            node_type: "feature_grid".into(),
            value: Some("GT6 Core Next-Gen Pillars".into()),
            style: Some(serde_json::json!({
                "items": [
                    {
                        "icon": "⚡",
                        "title": "Real-Time Ray Tracing",
                        "description": "Full path-traced lighting with multi-bounce reflections, real-time wet asphalt refractions, and per-headlight volumetric beams."
                    },
                    {
                        "icon": "🏎️",
                        "title": "Hyper-Realistic Physics Engine",
                        "description": "1000Hz tire contact-patch simulation, fluid dynamic drag models, and active suspension telemetry."
                    },
                    {
                        "icon": "🌐",
                        "title": "Massive Open-World Districts",
                        "description": "Seamless 500 sq km map spanning neon metropolises, coastal mountain passes, and desert highways with zero loading screens."
                    }
                ]
            })),
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("Proceed to Pre-Order Deck →".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "next" })),
        });

    // ── PAGE 3: Live Feed & Pre-Order Deck ────────────────────────────────────
    let p3 = DynamicPage::new("Live Feed & Pre-Order Deck", 3)
        .add_content(ContentBlock::Heading { level: 1, text: "LIVE TELEMETRY & PRE-ORDER DECK".into() })
        .add_content(ContentBlock::Heading { level: 2, text: "Community Operations & Global Grid Status".into() })
        .add_content(ContentBlock::Custom {
            node_type: "live_feed".into(),
            value: Some("LIVE COMMUNITY & LAUNCH COUNTDOWN".into()),
            style: Some(serde_json::json!({
                "title": "LIVE COMMUNITY & LAUNCH COUNTDOWN",
                "stats": [
                    { "label": "Global Server Clusters", "value": "ONLINE 99.99%" },
                    { "label": "Pilot Latency", "value": "12ms (Direct Fiber)" },
                    { "label": "Active Racers", "value": "4,821,900 VIP Pilots" },
                    { "label": "Countdown to Launch", "value": "03d 14h 22m 09s" }
                ],
                "patch_notes": "● v1.0.4 Pre-Load Patch Deployed: DualSense Haptic Telemetry, Custom Livery Cloud Sync, and VR2 4K-HDR Direct Mode active."
            })),
        })
        .add_content(ContentBlock::Heading { level: 2, text: "Forged Titanium Living Component".into() })
        .add_content(ContentBlock::Custom {
            node_type: "3d_model".into(),
            value: Some("Forged Titanium Multi-Spoke Wheel Rim — Living 3D Component".into()),
            style: Some(serde_json::json!({
                "format": "stl",
                "mesh_template": "wheel",
                "material": "wireframe",
                "rotation": true,
                "bobbing": true
            })),
        })
        .add_content(ContentBlock::Custom {
            node_type: "preorder".into(),
            value: Some("PRE-ORDER GT6: VELOCITY UNLEASHED".into()),
            style: Some(serde_json::json!({
                "badge": "LAUNCH DAY FOUNDER'S EDITION",
                "title": "PRE-ORDER GT6: VELOCITY UNLEASHED",
                "bonuses": [
                    "Exclusive Neon Obsidian Supercar Livery (Day One Access)",
                    "VIP Season Grid Pass (All 6 DLC Districts Included)",
                    "500,000 Velocity In-Game Credits",
                    "Forged Titanium Aerodynamic Wheel & Rim Set",
                    "Early Access Beta Weekend (72-Hour Head Start)"
                ],
                "button_text": "⚡ PRE-ORDER NOW — $69.99"
            })),
        })
        .add_content(ContentBlock::Heading { level: 2, text: "VIP Closed Beta Driver Registration".into() })
        .add_content(ContentBlock::Form {
            fields: vec![
                FormField { field_type: "input_text".into(),     label: "Driver VIP Call-Sign".into(),       placeholder: Some("e.g. ApexPredator99".into()) },
                FormField { field_type: "input_email".into(),    label: "Driver License Email".into(),      placeholder: Some("pilot@velocity.com".into()) },
                FormField { field_type: "input_select".into(),   label: "Primary Racing Platform".into(),   placeholder: Some("PlayStation 5 Pro / PC Direct Drive / Xbox Series X".into()) },
                FormField { field_type: "input_checkbox".into(), label: "Opt-in to Closed VIP Beta Weekend".into(), placeholder: None },
            ],
        })
        .add_content(ContentBlock::Custom {
            node_type: "button".into(),
            value: Some("⏮ Return to Cover Reveal".into()),
            style: Some(serde_json::json!({ "action": "navigate", "target": "page_001" })),
        });

    let mut features = DynamicFeatures::default();
    features.has_ai = true;
    features.has_forms = true;
    features.has_3d = true;
    features.has_audio = true;
    features.has_video = true;

    let bytes = match builder
        .with_features(features)
        .add_page(p1)
        .add_page(p2)
        .add_page(p3)
        .build()
    {
        Ok(b) => b,
        Err(e) => { eprintln!("Build failed: {e}"); process::exit(1); }
    };

    if let Some(parent) = out.parent() {
        if !parent.as_os_str().is_empty() { fs::create_dir_all(parent).ok(); }
    }
    if let Err(e) = fs::write(&out, &bytes) {
        eprintln!("Write failed: {e}"); process::exit(1);
    }
    println!("Written : {} ({} bytes)", out.display(), bytes.len());

    println!();
    println!("Validating GT6 Living Document...");
    let report = Validator::validate_bytes(&bytes);
    println!("Result  : {:?}", report.result);
    println!("Fatal   : {}", report.fatal_count);
    println!("Warnings: {}", report.warning_count);
    if !report.is_valid() {
        eprintln!("Validation FAILED — this is a bug.");
        process::exit(3);
    }
    println!("✓ GT6: Velocity Unleashed (.ldocx) is 100% VALID.");
    println!();
    println!("Open in browser: http://127.0.0.1:8080/");
    println!("Then click 'Open .ldocx' and select: {}", out.display());
}

