// LDOC Runtime — ldoc-view binary
// Interactive terminal viewer for .ldocx files.
// Usage: ldoc-view <file.ldocx>

use std::{
    io::{self, BufRead, Write},
    process,
};

use ldoc_runtime::{DocumentLoader, InteractiveSession};
use ldoc_core::pages::ContentNode;

fn main() {
    let args: Vec<String> = std::env::args().collect();

    if args.len() < 2 || args[1] == "--help" || args[1] == "-h" {
        print_usage();
        process::exit(0);
    }

    let path = &args[1];
    let doc = match DocumentLoader::load_from_file(path) {
        Ok(d) => d,
        Err(e) => { eprintln!("Failed to load '{}': {}", path, e); process::exit(1); }
    };

    let session = InteractiveSession::new(doc);
    session.open_entry().unwrap_or_else(|e| {
        eprintln!("Cannot open entry page: {}", e);
        process::exit(1);
    });

    loop {
        let page = match session.current_page() {
            Ok(p) => p,
            Err(e) => { eprintln!("Error: {}", e); break; }
        };

        render_page(
            page,
            session.current_index() + 1,
            session.page_count(),
            &session.document.context.metadata().title,
        );

        // Show active state summary if any fields set
        let keys = session.state.session_keys();
        let field_keys: Vec<_> = keys.iter().filter(|k| k.starts_with("field.")).collect();
        if !field_keys.is_empty() {
            println!("State: {} field(s) set", field_keys.len());
        }

        let has_next = session.has_next();
        let has_prev = session.has_prev();
        print!("\n[");
        if has_prev { print!("p=prev "); }
        if has_next { print!("n=next "); }
        print!("<num>=jump  s=state  q=quit]: ");
        io::stdout().flush().ok();

        let mut input = String::new();
        if io::stdin().lock().read_line(&mut input).is_err() { break; }
        let input = input.trim();

        match input {
            "q" | "Q" => break,
            "n" | "N" => {
                if let Err(_) = session.next_page() {
                    println!("Already on last page.");
                }
            }
            "p" | "P" => {
                if let Err(_) = session.prev_page() {
                    println!("Already on first page.");
                }
            }
            "s" | "S" => {
                print_state(&session);
            }
            s => {
                if let Ok(num) = s.parse::<u32>() {
                    if session.goto_page(num).is_err() {
                        println!("Page {} not found.", num);
                    }
                } else if !s.is_empty() {
                    println!("Unknown command: '{}'", s);
                }
            }
        }
    }

    session.unload();
    println!("Exiting viewer. Events fired: {}", session.event_count());
}

fn print_usage() {
    println!("ldoc-view — LDOC Interactive Terminal Viewer");
    println!();
    println!("Usage: ldoc-view <file.ldocx>");
    println!();
    println!("Navigation:");
    println!("  n        Next page");
    println!("  p        Previous page");
    println!("  <num>    Jump to page number");
    println!("  q        Quit");
}

// ── Rendering ─────────────────────────────────────────────────────────────────

fn print_state(session: &InteractiveSession) {
    let keys = session.state.session_keys();
    if keys.is_empty() {
        println!("  (no session state)");
        return;
    }
    println!("  Session state ({} keys):", keys.len());
    let mut sorted = keys.clone();
    sorted.sort();
    for k in &sorted {
        if let Some(v) = session.get_state(k) {
            println!("    {} = {}", k, v);
        }
    }
}

fn render_page(page: &ldoc_runtime::page_manager::LoadedPage, current: usize, total: usize, doc_title: &str) {
    let bar  = "=".repeat(60);
    let thin = "-".repeat(60);

    println!("\n{}", bar);
    println!(" {} | Page {}/{}", doc_title, current, total);
    println!("{}", thin);
    println!(" {}", page.title);
    println!("{}", bar);
    println!();

    render_node(&page.content.root, 0);

    println!();
    println!("{}", thin);
    if let Some(layout) = &page.layout {
        println!(" Layout: {}x{}{} | {} col(s) | {}",
            layout.width as u32, layout.height as u32, layout.unit,
            layout.columns, layout.orientation);
    }
}

fn render_node(node: &ContentNode, depth: usize) {
    if node.visible == Some(false) { return; }

    let indent = "  ".repeat(depth);

    match node.node_type.as_str() {
        "container" | "section" | "row" | "column" | "grid" => {
            for child in &node.children { render_node(child, depth); }
        }
        "heading" => {
            let level = node.level.unwrap_or(1);
            let text  = collect_text(node);
            let prefix = "#".repeat(level as usize);
            println!("{}{} {}", indent, prefix, text);
            println!();
        }
        "paragraph" => {
            let text = collect_text(node);
            if !text.is_empty() {
                println!("{}{}", indent, wrap_text(&text, 58usize.saturating_sub(depth * 2)));
                println!();
            }
        }
        "text" => {
            if let Some(v) = &node.value { print!("{}", v); }
        }
        "code" | "code_block" => {
            let text = node.value.as_deref()
                .or_else(|| node.children.first().and_then(|c| c.value.as_deref()))
                .unwrap_or("");
            println!("{}```", indent);
            for line in text.lines() { println!("{}{}", indent, line); }
            println!("{}```", indent);
            println!();
        }
        "quote" => {
            let text = collect_text(node);
            for line in text.lines() { println!("{}| {}", indent, line); }
            println!();
        }
        "list" => {
            for (i, child) in node.children.iter().enumerate() {
                let text = collect_text(child);
                if child.node_type == "list_item" {
                    println!("{} {}. {}", indent, i + 1, text);
                } else {
                    println!("{} * {}", indent, text);
                }
            }
            println!();
        }
        "list_item" => {
            println!("{} * {}", indent, collect_text(node));
        }
        "table" => {
            render_table(node, &indent);
            println!();
        }
        "form" => {
            println!("{}[FORM]", indent);
            for child in &node.children { render_node(child, depth + 1); }
            println!();
        }
        "input_text" | "input_textarea" | "input_number" | "input_date" | "input_file" => {
            let label = node.value.as_deref().unwrap_or(node.node_type.as_str());
            println!("{}| {} [________]", indent, label);
        }
        "input_checkbox" => {
            println!("{}| [ ] {}", indent, node.value.as_deref().unwrap_or("Checkbox"));
        }
        "input_radio" => {
            println!("{}| ( ) {}", indent, node.value.as_deref().unwrap_or("Option"));
        }
        "input_select" => {
            println!("{}| {} [v]", indent, node.value.as_deref().unwrap_or("Select"));
        }
        "button" => {
            let label = collect_text(node);
            println!("{}[ {} ]", indent, if label.is_empty() { "Button".into() } else { label });
        }
        "toggle" => {
            println!("{}| [OFF] {}", indent, node.value.as_deref().unwrap_or("Toggle"));
        }
        "slider" => {
            println!("{}| |----o----| {}", indent, node.value.as_deref().unwrap_or("Slider"));
        }
        "image" => {
            let alt   = node.aria.as_ref()
                .and_then(|a| a.get("alt").or_else(|| a.get("label")))
                .and_then(|v| v.as_str()).unwrap_or("image");
            let asset = node.asset_id.as_deref().unwrap_or("?");
            println!("{}[IMAGE: {} (asset: {})]", indent, alt, asset);
            println!();
        }
        "audio" => {
            let label = node.aria.as_ref()
                .and_then(|a| a.get("label").or_else(|| a.get("alt")))
                .and_then(|v| v.as_str()).unwrap_or("audio");
            println!("{}[AUDIO: {} (asset: {})]", indent, label, node.asset_id.as_deref().unwrap_or("?"));
        }
        "video" => {
            let label = node.aria.as_ref()
                .and_then(|a| a.get("label").or_else(|| a.get("alt")))
                .and_then(|v| v.as_str()).unwrap_or("video");
            println!("{}[VIDEO: {} (asset: {})]", indent, label, node.asset_id.as_deref().unwrap_or("?"));
        }
        "model_3d" => println!("{}[3D MODEL: asset={}]", indent, node.asset_id.as_deref().unwrap_or("?")),
        "link" => {
            let text = collect_text(node);
            let href = node.value.as_deref().unwrap_or("#");
            print!("{}{} ({})", indent, text, href);
        }
        "page_break" => println!("{}- - - - - - - - - - - - - - - - - - - -", indent),
        "toc"        => println!("{}[TABLE OF CONTENTS]", indent),
        "footnote" | "footnote_def" => println!("{}^ {}", indent, collect_text(node)),
        "ai_block" | "ai_summary" | "ai_qa" | "ai_translate" => {
            println!("{}[AI: {}]", indent, node.node_type);
            for child in &node.children { render_node(child, depth + 1); }
        }
        "chart"            => println!("{}[CHART]", indent),
        "metadata_display" => println!("{}[METADATA]", indent),
        _ => {
            for child in &node.children { render_node(child, depth); }
        }
    }
}

fn collect_text(node: &ContentNode) -> String {
    let mut parts = Vec::new();
    if let Some(v) = &node.value { parts.push(v.clone()); }
    for child in &node.children {
        let t = collect_text(child);
        if !t.is_empty() { parts.push(t); }
    }
    parts.join(" ")
}

fn wrap_text(text: &str, width: usize) -> String {
    if width == 0 || text.len() <= width { return text.to_string(); }
    let mut result = String::new();
    let mut line_len = 0usize;
    for word in text.split_whitespace() {
        if line_len > 0 && line_len + 1 + word.len() > width {
            result.push('\n');
            line_len = 0;
        } else if line_len > 0 {
            result.push(' ');
            line_len += 1;
        }
        result.push_str(word);
        line_len += word.len();
    }
    result
}

fn render_table(node: &ContentNode, indent: &str) {
    let rows: Vec<Vec<String>> = node.children.iter()
        .filter(|r| r.node_type == "table_row")
        .map(|row| {
            row.children.iter()
                .filter(|c| c.node_type == "table_cell")
                .map(|cell| collect_text(cell))
                .collect()
        })
        .collect();

    if rows.is_empty() { return; }

    let cols = rows.iter().map(|r| r.len()).max().unwrap_or(0);
    let mut widths = vec![0usize; cols];
    for row in &rows {
        for (i, cell) in row.iter().enumerate() {
            widths[i] = widths[i].max(cell.len());
        }
    }

    let sep: String = widths.iter().map(|w| "-".repeat(w + 2)).collect::<Vec<_>>().join("+");
    println!("{}{}", indent, sep);
    for (ri, row) in rows.iter().enumerate() {
        let cells: String = (0..cols).map(|i| {
            let cell = row.get(i).map(|s| s.as_str()).unwrap_or("");
            format!(" {:width$} ", cell, width = widths[i])
        }).collect::<Vec<_>>().join("|");
        println!("{}{}", indent, cells);
        if ri == 0 { println!("{}{}", indent, sep); }
    }
    println!("{}{}", indent, sep);
}
