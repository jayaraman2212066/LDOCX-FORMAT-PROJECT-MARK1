// LDOC Studio HTTP Server
// Raw TCP pre-filter: WebSocket upgrades handled inline, HTTP forwarded to tiny_http.
// Persistent storage: %APPDATA%\LDOC Studio\docs\
// Form submission: %APPDATA%\LDOC Studio\form-data\

use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;

use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

use crate::api::LdocApi;

// ── Shutdown handle ───────────────────────────────────────────────────────────

pub struct ShutdownHandle;

// ── Persistent storage ────────────────────────────────────────────────────────

fn appdata_dir() -> PathBuf {
    let base = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            std::env::var("HOME")
                .map(|h| PathBuf::from(h).join(".config"))
                .unwrap_or_else(|_| PathBuf::from("."))
        });
    base.join("LDOC Studio")
}

fn docs_dir() -> PathBuf { appdata_dir().join("docs") }
fn form_data_dir() -> PathBuf { appdata_dir().join("form-data") }
fn index_path() -> PathBuf { appdata_dir().join("index.json") }

fn ensure_dirs() {
    let _ = std::fs::create_dir_all(docs_dir());
    let _ = std::fs::create_dir_all(form_data_dir());
}

fn safe_id(id: &str) -> bool {
    id.len() <= 64 && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
}

fn persist_document(id: &str, data: &[u8]) {
    if !safe_id(id) { return; }
    ensure_dirs();
    let _ = std::fs::write(docs_dir().join(format!("{}.ldocx", id)), data);
    update_index();
}

fn delete_persisted(id: &str) {
    if !safe_id(id) { return; }
    let _ = std::fs::remove_file(docs_dir().join(format!("{}.ldocx", id)));
    let _ = std::fs::remove_file(docs_dir().join(format!("{}.ldoc", id)));
    update_index();
}

fn update_index() {
    let mut ids: Vec<String> = vec![];
    if let Ok(entries) = std::fs::read_dir(docs_dir()) {
        for entry in entries.flatten() {
            let name = entry.file_name();
            let s = name.to_string_lossy().to_string();
            if s.ends_with(".ldocx") {
                ids.push(s.trim_end_matches(".ldocx").to_string());
            } else if s.ends_with(".ldoc") {
                ids.push(s.trim_end_matches(".ldoc").to_string());
            }
        }
    }
    let _ = std::fs::write(index_path(), serde_json::to_vec_pretty(&ids).unwrap_or_default());
}

pub fn load_persisted(api: &LdocApi) {
    ensure_dirs();
    let Ok(entries) = std::fs::read_dir(docs_dir()) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        let ext = path.extension().and_then(|e| e.to_str());
        if ext != Some("ldocx") && ext != Some("ldoc") { continue; }
        let id = path.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
        if !safe_id(&id) { continue; }
        let Ok(data) = std::fs::read(&path) else { continue };
        let _ = api.create_document_with_id(id, data);
    }
}

// ── Form persistence ──────────────────────────────────────────────────────────

fn persist_form_response(doc_id: &str, form_id: &str, data: &serde_json::Value) {
    if !safe_id(doc_id) || !safe_id(form_id) { return; }
    ensure_dirs();
    let dir = form_data_dir().join(doc_id);
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join(format!("{}.json", form_id));
    let mut existing: Vec<serde_json::Value> = std::fs::read(&path)
        .ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
    existing.push(data.clone());
    let _ = std::fs::write(path, serde_json::to_vec_pretty(&existing).unwrap_or_default());
}

// ── SHA-1 + base64 (for WebSocket handshake) ─────────────────────────────────

fn sha1_digest(data: &[u8]) -> [u8; 20] {
    let mut h: [u32; 5] = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
    let bit_len = (data.len() as u64) * 8;
    let mut msg = data.to_vec();
    msg.push(0x80);
    while msg.len() % 64 != 56 { msg.push(0); }
    msg.extend_from_slice(&bit_len.to_be_bytes());
    for chunk in msg.chunks(64) {
        let mut w = [0u32; 80];
        for i in 0..16 {
            w[i] = u32::from_be_bytes([chunk[i*4], chunk[i*4+1], chunk[i*4+2], chunk[i*4+3]]);
        }
        for i in 16..80 {
            w[i] = (w[i-3] ^ w[i-8] ^ w[i-14] ^ w[i-16]).rotate_left(1);
        }
        let (mut a, mut b, mut c, mut d, mut e) = (h[0], h[1], h[2], h[3], h[4]);
        for i in 0..80 {
            let (f, k) = match i {
                0..=19  => ((b & c) | ((!b) & d), 0x5A827999u32),
                20..=39 => (b ^ c ^ d,             0x6ED9EBA1u32),
                40..=59 => ((b & c) | (b & d) | (c & d), 0x8F1BBCDCu32),
                _       => (b ^ c ^ d,             0xCA62C1D6u32),
            };
            let temp = a.rotate_left(5).wrapping_add(f).wrapping_add(e).wrapping_add(k).wrapping_add(w[i]);
            e = d; d = c; c = b.rotate_left(30); b = a; a = temp;
        }
        h[0] = h[0].wrapping_add(a); h[1] = h[1].wrapping_add(b);
        h[2] = h[2].wrapping_add(c); h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e);
    }
    let mut out = [0u8; 20];
    for (i, &v) in h.iter().enumerate() { out[i*4..i*4+4].copy_from_slice(&v.to_be_bytes()); }
    out
}

fn base64_encode(data: &[u8]) -> String {
    const C: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = if chunk.len() > 1 { chunk[1] as usize } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as usize } else { 0 };
        out.push(C[b0 >> 2] as char);
        out.push(C[((b0 & 3) << 4) | (b1 >> 4)] as char);
        if chunk.len() > 1 { out.push(C[((b1 & 0xf) << 2) | (b2 >> 6)] as char); } else { out.push('='); }
        if chunk.len() > 2 { out.push(C[b2 & 0x3f] as char); } else { out.push('='); }
    }
    out
}

fn ws_accept_key(key: &str) -> String {
    let combined = format!("{}258EAFA5-E914-47DA-95CA-C5AB0DC85B11", key);
    base64_encode(&sha1_digest(combined.as_bytes()))
}

// ── WebSocket frame helpers ───────────────────────────────────────────────────

type WsClients = Arc<Mutex<Vec<TcpStream>>>;

fn ws_send_text(stream: &mut TcpStream, msg: &str) {
    let data = msg.as_bytes();
    let mut frame = vec![0x81u8];
    if data.len() < 126 {
        frame.push(data.len() as u8);
    } else if data.len() < 65536 {
        frame.push(126);
        frame.extend_from_slice(&(data.len() as u16).to_be_bytes());
    } else {
        frame.push(127);
        frame.extend_from_slice(&(data.len() as u64).to_be_bytes());
    }
    frame.extend_from_slice(data);
    let _ = stream.write_all(&frame);
}

fn broadcast_ws(clients: &WsClients, msg: &str) {
    let mut guard = clients.lock().unwrap();
    guard.retain_mut(|s| { ws_send_text(s, msg); true });
}

fn handle_ws_connection(mut stream: TcpStream, clients: WsClients) {
    // Send connected event immediately
    ws_send_text(&mut stream, r#"{"event":"connected"}"#);
    let stream_clone = stream.try_clone().ok();
    if let Some(sc) = stream_clone {
        clients.lock().unwrap().push(sc);
    }
    stream.set_read_timeout(Some(std::time::Duration::from_secs(120))).ok();
    let mut buf = [0u8; 4096];
    loop {
        match stream.read(&mut buf) {
            Ok(0) | Err(_) => break,
            Ok(n) if n >= 2 => {
                let opcode = buf[0] & 0x0f;
                if opcode == 8 { break; }
                if opcode == 9 { let _ = stream.write_all(&[0x8A, 0x00]); }
            }
            _ => {}
        }
    }
    let peer = stream.peer_addr().ok();
    clients.lock().unwrap().retain(|s| s.peer_addr().ok() != peer);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

fn cors_headers() -> Vec<Header> {
    vec![
        Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap(),
        Header::from_bytes("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS").unwrap(),
        Header::from_bytes("Access-Control-Allow-Headers", "Content-Type").unwrap(),
    ]
}

fn json_response(status: u16, body: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let data = body.as_bytes().to_vec();
    let len = data.len();
    let mut headers = cors_headers();
    headers.push(Header::from_bytes("Content-Type", "application/json").unwrap());
    Response::new(StatusCode(status), headers, std::io::Cursor::new(data), Some(len), None)
}

fn binary_response(status: u16, data: Vec<u8>, ct: &str, disp: Option<&str>) -> Response<std::io::Cursor<Vec<u8>>> {
    let len = data.len();
    let mut headers = cors_headers();
    headers.push(Header::from_bytes("Content-Type", ct).unwrap());
    if let Some(d) = disp { headers.push(Header::from_bytes("Content-Disposition", d).unwrap()); }
    Response::new(StatusCode(status), headers, std::io::Cursor::new(data), Some(len), None)
}

fn read_body(req: &mut Request) -> Vec<u8> {
    let mut body = Vec::new();
    let _ = req.as_reader().read_to_end(&mut body);
    body
}

fn serve_static(viewer_dir: &str, path: &str) -> Option<Response<std::io::Cursor<Vec<u8>>>> {
    let clean: String = path.chars().filter(|&c| c != '\0').collect();
    let clean = clean.trim_start_matches('/');
    let clean = if clean == "viewer" {
        "index.html".to_string()
    } else if let Some(rest) = clean.strip_prefix("viewer/") {
        rest.to_string()
    } else {
        clean.to_string()
    };
    if clean.contains("..") { return None; }
    let file_path = if clean.is_empty() || clean == "index.html" {
        PathBuf::from(viewer_dir).join("index.html")
    } else {
        PathBuf::from(viewer_dir).join(clean)
    };
    let data = std::fs::read(&file_path).ok()?;
    let mime = match file_path.extension().and_then(|e| e.to_str()) {
        Some("html") => "text/html; charset=utf-8",
        Some("js")   => "application/javascript",
        Some("css")  => "text/css",
        Some("png")  => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("svg")  => "image/svg+xml",
        Some("ico")  => "image/x-icon",
        _            => "application/octet-stream",
    };
    Some(binary_response(200, data, mime, None))
}

// ── Route dispatcher ──────────────────────────────────────────────────────────

fn handle_request(
    req: &mut Request,
    api: &Arc<LdocApi>,
    viewer_dir: &str,
    ws_clients: &WsClients,
) -> Response<std::io::Cursor<Vec<u8>>> {
    let method = req.method().clone();
    let url = req.url().to_string();
    let path = url.split('?').next().unwrap_or("").to_string();

    if method == Method::Options {
        return json_response(204, "");
    }

    // /ws handled by raw TCP pre-filter; tiny_http sees it as a normal request
    if path == "/ws" {
        return json_response(400, r#"{"error":"WebSocket upgrade required"}"#);
    }

    // POST /documents
    if method == Method::Post && path == "/documents" {
        let body = read_body(req);
        if body.is_empty() { return json_response(400, r#"{"error":"Empty body"}"#); }
        match api.create_document(body.clone()) {
            Ok(id) => {
                persist_document(&id, &body);
                broadcast_ws(ws_clients, &format!(r#"{{"event":"document_loaded","id":"{}"}}"#, id));
                json_response(201, &format!(r#"{{"id":"{}"}}"#, id))
            }
            Err(e) => json_response(400, &format!(r#"{{"error":"{}"}}"#, e)),
        }
    }

    // POST /documents/build
    else if method == Method::Post && path == "/documents/build" {
        let body = read_body(req);
        match api.build_document(&body) {
            Ok(id) => {
                if let Ok(bytes) = api.export_document(&id) { persist_document(&id, &bytes); }
                broadcast_ws(ws_clients, &format!(r#"{{"event":"document_loaded","id":"{}"}}"#, id));
                json_response(200, &format!(r#"{{"id":"{}"}}"#, id))
            }
            Err(e) => json_response(400, &format!(r#"{{"error":"{}"}}"#, e)),
        }
    }

    // POST /ai/chat
    else if method == Method::Post && path == "/ai/chat" {
        let body = read_body(req);
        match serde_json::from_slice::<serde_json::Value>(&body) {
            Ok(v) => {
                let provider = v["provider"].as_str().unwrap_or("gemini");
                let api_key = v["api_key"].as_str().unwrap_or("");
                let model = v["model"].as_str().unwrap_or("");
                let prompt = v["prompt"].as_str().unwrap_or("");
                let system = v["system"].as_str().unwrap_or(
                    "You are an intelligent AI assistant for LDOCX living documents. Guide the user accurately, helpfully, and explain document content, forms, interactive features, and live internet data sources."
                );
                let context = v["context"].as_str().unwrap_or("");

                match handle_ai_chat(provider, api_key, model, prompt, system, context) {
                    Ok(text) => json_response(200, &serde_json::json!({
                        "status": "ok",
                        "answer": text,
                        "provider": provider
                    }).to_string()),
                    Err(err) => json_response(400, &serde_json::json!({
                        "status": "error",
                        "error": err
                    }).to_string()),
                }
            }
            Err(e) => json_response(400, &format!(r#"{{"error":"Invalid JSON: {}"}}"#, e)),
        }
    }

    // POST /ai/validate-sources
    else if method == Method::Post && path == "/ai/validate-sources" {
        let body = read_body(req);
        match serde_json::from_slice::<serde_json::Value>(&body) {
            Ok(v) => {
                let urls: Vec<String> = v["urls"].as_array()
                    .map(|a| a.iter().filter_map(|s| s.as_str().map(|s| s.to_string())).collect())
                    .unwrap_or_default();
                let results = validate_live_sources(&urls);
                json_response(200, &serde_json::json!({
                    "status": "ok",
                    "sources": results
                }).to_string())
            }
            Err(e) => json_response(400, &format!(r#"{{"error":"Invalid JSON: {}"}}"#, e)),
        }
    }

    // GET /documents
    else if method == Method::Get && path == "/documents" {
        json_response(200, &serde_json::to_string(&api.list_documents()).unwrap_or_default())
    }

    // /documents/:id/...
    else if path.starts_with("/documents/") {
        let parts: Vec<&str> = path.trim_start_matches('/').split('/').collect();
        match (method.clone(), parts.as_slice()) {
            (Method::Get, ["documents", id]) => {
                match api.get_document(id) {
                    Ok(doc) => json_response(200, &serde_json::to_string(&doc).unwrap_or_default()),
                    Err(_)  => json_response(404, r#"{"error":"Not found"}"#),
                }
            }
            (Method::Get, ["documents", id, "pages"]) => {
                match api.get_pages(id) {
                    Ok(p) => json_response(200, &serde_json::to_string(&p).unwrap_or_default()),
                    Err(_) => json_response(404, r#"{"error":"Not found"}"#),
                }
            }
            (Method::Get, ["documents", id, "pages", num, "content"]) => {
                let n: u32 = num.parse().unwrap_or(0);
                match api.get_page_content(id, n) {
                    Ok(json) => {
                        let data = json.into_bytes();
                        let len = data.len();
                        let mut headers = cors_headers();
                        headers.push(Header::from_bytes("Content-Type", "application/json").unwrap());
                        Response::new(StatusCode(200), headers, std::io::Cursor::new(data), Some(len), None)
                    }
                    Err(_) => json_response(404, r#"{"error":"Page not found"}"#),
                }
            }
            (Method::Get, ["documents", id, "assets", asset_id]) => {
                match api.get_asset(id, asset_id) {
                    Ok((mime, bytes)) => binary_response(200, bytes, &mime, None),
                    Err(_) => json_response(404, r#"{"error":"Asset not found"}"#),
                }
            }
            (Method::Get, ["documents", id, "export"]) => {
                match api.export_document(id) {
                    Ok(bytes) => {
                        let disp = format!("attachment; filename=\"{}.ldocx\"", id);
                        binary_response(200, bytes, "application/octet-stream", Some(&disp))
                    }
                    Err(_) => json_response(404, r#"{"error":"Not found"}"#),
                }
            }
            (Method::Get, ["documents", id, "download"]) => {
                match api.export_document(id) {
                    Ok(bytes) => {
                        let disp = format!("attachment; filename=\"{}.ldocx\"", id);
                        binary_response(200, bytes, "application/octet-stream", Some(&disp))
                    }
                    Err(_) => json_response(404, r#"{"error":"Not found"}"#),
                }
            }
            (Method::Get, ["documents", id, "properties"]) => {
                match api.get_properties(id) {
                    Ok(props) => json_response(200, &serde_json::to_string(&props).unwrap_or_default()),
                    Err(_) => json_response(404, r#"{"error":"Not found"}"#),
                }
            }
            (Method::Put, ["documents", id, "properties"]) => {
                let body = read_body(req);
                match serde_json::from_slice::<serde_json::Value>(&body) {
                    Ok(patch) => match api.update_properties(id, patch) {
                        Ok(_) => json_response(200, r#"{"ok":true}"#),
                        Err(_) => json_response(404, r#"{"error":"Not found"}"#),
                    },
                    Err(_) => json_response(400, r#"{"error":"Invalid JSON"}"#),
                }
            }
            (Method::Get, ["documents", id, "versions"]) => {
                match api.list_versions(id) {
                    Ok(v) => json_response(200, &serde_json::to_string(&v).unwrap_or_default()),
                    Err(_) => json_response(404, r#"{"error":"Not found"}"#),
                }
            }
            (Method::Post, ["documents", id, "restore"]) => {
                let body = read_body(req);
                let version_index = if body.is_empty() {
                    0usize
                } else {
                    match serde_json::from_slice::<serde_json::Value>(&body) {
                        Ok(v) => v.get("version_index").and_then(|n| n.as_u64()).unwrap_or(0) as usize,
                        Err(_) => 0usize,
                    }
                };
                match api.restore_version(id, version_index) {
                    Ok(snapshot) => json_response(200, &serde_json::to_string(&snapshot).unwrap_or_default()),
                    Err(_) => json_response(404, r#"{"error":"Version not found"}"#),
                }
            }
            (Method::Post, ["documents", id, "validate"]) => {
                match api.validate_document(id) {
                    Ok(v) => json_response(200, &serde_json::to_string(&v).unwrap_or_default()),
                    Err(_) => json_response(404, r#"{"error":"Not found"}"#),
                }
            }
            (Method::Post, ["documents", doc_id, "forms", form_id, "submit"]) => {
                let body = read_body(req);
                if body.len() > 1_048_576 { return json_response(413, r#"{"error":"Payload too large"}"#); }
                match serde_json::from_slice::<serde_json::Value>(&body) {
                    Ok(data) => {
                        if api.get_document(doc_id).is_err() {
                            return json_response(404, r#"{"error":"Document not found"}"#);
                        }
                        persist_form_response(doc_id, form_id, &data);
                        broadcast_ws(ws_clients, &format!(
                            r#"{{"event":"form_submitted","doc_id":"{}","form_id":"{}"}}"#, doc_id, form_id
                        ));
                        json_response(200, r#"{"ok":true,"message":"Form submitted successfully"}"#)
                    }
                    Err(_) => json_response(400, r#"{"error":"Invalid JSON"}"#),
                }
            }
            (Method::Delete, ["documents", id]) => {
                if api.delete_document(id) {
                    delete_persisted(id);
                    broadcast_ws(ws_clients, &format!(r#"{{"event":"document_deleted","id":"{}"}}"#, id));
                    json_response(200, r#"{"ok":true}"#)
                } else {
                    json_response(404, r#"{"error":"Not found"}"#)
                }
            }
            _ => json_response(404, r#"{"error":"Not found"}"#),
        }
    }

    // Static files
    else if method == Method::Get {
        let file_path = if path == "/creator" { "creator.html" } else { &path };
        serve_static(viewer_dir, file_path)
            .or_else(|| serve_static(viewer_dir, "index.html"))
            .unwrap_or_else(|| json_response(404, r#"{"error":"Not found"}"#))
    }

    else {
        json_response(405, r#"{"error":"Method not allowed"}"#)
    }
}

// ── Raw TCP pre-filter: splits WS upgrades from HTTP on the same port ─────────

fn is_ws_upgrade(buf: &[u8]) -> bool {
    let s = String::from_utf8_lossy(buf).to_lowercase();
    s.contains("upgrade: websocket")
}

fn extract_ws_key(buf: &[u8]) -> Option<String> {
    let s = String::from_utf8_lossy(buf);
    s.lines()
        .find(|l| l.to_lowercase().starts_with("sec-websocket-key:"))
        .and_then(|l| l.splitn(2, ':').nth(1))
        .map(|s| s.trim().to_string())
}

fn start_raw_listener(
    addr: &str,
    api: Arc<LdocApi>,
    viewer_dir: String,
    ws_clients: WsClients,
) -> Result<SocketAddr, String> {
    let listener = TcpListener::bind(addr).map_err(|e| e.to_string())?;
    let bound = listener.local_addr().map_err(|e| e.to_string())?;

    // tiny_http server bound to a different OS-assigned port for HTTP processing
    let http_server = Server::http("127.0.0.1:0").map_err(|e| e.to_string())?;
    let http_addr = http_server.server_addr().to_ip()
        .ok_or("Cannot get HTTP server address")?;

    // HTTP dispatch thread
    {
        let api = api.clone();
        let ws = ws_clients.clone();
        let vd = viewer_dir.clone();
        thread::spawn(move || {
            for mut req in http_server.incoming_requests() {
                let api = api.clone();
                let ws = ws.clone();
                let vd = vd.clone();
                thread::spawn(move || {
                    let resp = handle_request(&mut req, &api, &vd, &ws);
                    let _ = req.respond(resp);
                });
            }
        });
    }

    // Raw TCP accept loop
    thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            let ws_clients = ws_clients.clone();
            let http_addr = http_addr;
            thread::spawn(move || {
                let mut stream = stream;
                stream.set_read_timeout(Some(std::time::Duration::from_secs(5))).ok();

                // Peek at the first bytes to detect WS upgrade
                let mut buf = [0u8; 2048];
                let n = match stream.read(&mut buf) {
                    Ok(n) if n > 0 => n,
                    _ => return,
                };
                stream.set_read_timeout(None).ok();

                if is_ws_upgrade(&buf[..n]) {
                    // Handle WebSocket upgrade inline
                    match extract_ws_key(&buf[..n]) {
                        Some(key) => {
                            let accept = ws_accept_key(&key);
                            let resp = format!(
                                "HTTP/1.1 101 Switching Protocols\r\n\
                                 Upgrade: websocket\r\n\
                                 Connection: Upgrade\r\n\
                                 Sec-WebSocket-Accept: {}\r\n\r\n",
                                accept
                            );
                            if stream.write_all(resp.as_bytes()).is_ok() {
                                handle_ws_connection(stream, ws_clients);
                            }
                        }
                        None => {
                            let _ = stream.write_all(
                                b"HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n"
                            );
                        }
                    }
                } else {
                    // Forward to tiny_http by proxying the connection
                    // Connect to the internal HTTP server and relay
                    match TcpStream::connect(http_addr) {
                        Ok(mut backend) => {
                            // Send the already-read bytes first
                            if backend.write_all(&buf[..n]).is_err() { return; }
                            // Bidirectional relay
                            let mut stream2 = stream.try_clone().ok();
                            let mut backend2 = backend.try_clone().ok();
                            if let (Some(mut s2), Some(mut b2)) = (stream2.take(), backend2.take()) {
                                thread::spawn(move || {
                                    let mut buf = [0u8; 8192];
                                    loop {
                                        match b2.read(&mut buf) {
                                            Ok(0) | Err(_) => break,
                                            Ok(n) => { if s2.write_all(&buf[..n]).is_err() { break; } }
                                        }
                                    }
                                });
                            }
                            let mut buf = [0u8; 8192];
                            loop {
                                match stream.read(&mut buf) {
                                    Ok(0) | Err(_) => break,
                                    Ok(n) => { if backend.write_all(&buf[..n]).is_err() { break; } }
                                }
                            }
                        }
                        Err(_) => {}
                    }
                }
            });
        }
    });

    Ok(bound)
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Start server on a specific address. Used by tests and server_main.
pub fn start_server_on(addr: &str) -> (SocketAddr, ShutdownHandle) {
    let api = Arc::new(LdocApi::new());
    let ws_clients: WsClients = Arc::new(Mutex::new(Vec::new()));
    load_persisted(&api);
    let bound = start_raw_listener(addr, api, ".".to_string(), ws_clients)
        .expect("Failed to start server");
    (bound, ShutdownHandle)
}

/// Start server with viewer directory. Used by the production launcher.
pub fn try_start_server(
    addr: &str,
    viewer_dir: Option<String>,
) -> Result<(SocketAddr, ShutdownHandle), String> {
    let api = Arc::new(LdocApi::new());
    let ws_clients: WsClients = Arc::new(Mutex::new(Vec::new()));
    load_persisted(&api);
    let vd = viewer_dir.unwrap_or_else(|| ".".to_string());
    let bound = start_raw_listener(addr, api, vd, ws_clients)?;
    Ok((bound, ShutdownHandle))
}

// ── AI Chat & Live Source Validation Helpers ─────────────────────────────────

fn handle_ai_chat(
    provider: &str,
    api_key: &str,
    model: &str,
    prompt: &str,
    system: &str,
    context: &str,
) -> Result<String, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;

    let p_lower = provider.to_lowercase();
    let is_gemini = p_lower.contains("gemini") || api_key.starts_with("AIza");
    let is_openai = p_lower.contains("openai") || api_key.starts_with("sk-");
    let is_ollama = p_lower.contains("ollama");

    if is_gemini && !api_key.trim().is_empty() {
        let raw_m = model.trim();
        let primary_model = if raw_m.is_empty() || raw_m.contains("2.0") || raw_m.contains("1.5") {
            "gemini-3.5-flash-lite"
        } else {
            raw_m
        };

        let mut candidate_models = vec![primary_model];
        for fallback in &["gemini-3.5-flash-lite", "gemini-3.7-flash", "gemini-3.1-pro-preview", "gemini-2.5-flash"] {
            if !candidate_models.contains(fallback) {
                candidate_models.push(fallback);
            }
        }

        let user_content = format!("Document Context:\n{}\n\nUser Question:\n{}", context.trim(), prompt.trim());
        let payload = serde_json::json!({
            "systemInstruction": {
                "parts": [{ "text": system }]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{ "text": user_content }]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 2048
            }
        });

        let mut last_err = String::new();
        for m in candidate_models {
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
                m, api_key.trim()
            );

            match client.post(&url).json(&payload).send() {
                Ok(resp) => {
                    let status = resp.status();
                    if status.is_success() {
                        if let Ok(json_resp) = resp.json::<serde_json::Value>() {
                            if let Some(text) = json_resp["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                                return Ok(text.to_string());
                            }
                        }
                    } else {
                        let err_text = resp.text().unwrap_or_default();
                        last_err = format!("Model '{}' returned HTTP {}: {}", m, status, err_text);
                        // If 503 Service Unavailable, 404 Not Found, or 429 Rate Limit, retry with next candidate model
                        if status.as_u16() == 503 || status.as_u16() == 404 || status.as_u16() == 429 {
                            std::thread::sleep(std::time::Duration::from_millis(150));
                            continue;
                        } else {
                            return Err(last_err);
                        }
                    }
                }
                Err(e) => {
                    last_err = format!("Request failed: {}", e);
                }
            }
        }
        return Err(if last_err.is_empty() { "Gemini API unavailable".to_string() } else { last_err });
    }

    if is_openai && !api_key.trim().is_empty() {
        let selected_model = if model.is_empty() { "gpt-4o-mini" } else { model };
        let url = "https://api.openai.com/v1/chat/completions";
        let user_content = format!("Document Context:\n{}\n\nUser Question:\n{}", context.trim(), prompt.trim());
        let payload = serde_json::json!({
            "model": selected_model,
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": user_content }
            ],
            "temperature": 0.3
        });

        let resp = client.post(url)
            .header("Authorization", format!("Bearer {}", api_key.trim()))
            .json(&payload)
            .send()
            .map_err(|e| format!("OpenAI API request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let err_text = resp.text().unwrap_or_default();
            return Err(format!("OpenAI API returned HTTP {}: {}", status, err_text));
        }

        let json_resp: serde_json::Value = resp.json().map_err(|e| format!("Failed to parse OpenAI response: {}", e))?;
        if let Some(text) = json_resp["choices"][0]["message"]["content"].as_str() {
            return Ok(text.to_string());
        }
        return Err("OpenAI response was empty".to_string());
    }

    if is_ollama {
        let endpoint = std::env::var("OLLAMA_ENDPOINT").unwrap_or_else(|_| "http://127.0.0.1:11434".to_string());
        let selected_model = if model.is_empty() { "mistral" } else { model };
        let url = format!("{}/api/generate", endpoint.trim_end_matches('/'));
        let user_content = format!("System:\n{}\n\nDocument Context:\n{}\n\nQuestion:\n{}", system, context.trim(), prompt.trim());
        let payload = serde_json::json!({
            "model": selected_model,
            "prompt": user_content,
            "stream": false,
            "options": { "temperature": 0.3 }
        });

        let resp = client.post(&url)
            .json(&payload)
            .send()
            .map_err(|e| format!("Ollama request failed: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("Ollama returned HTTP {}", resp.status()));
        }

        let json_resp: serde_json::Value = resp.json().map_err(|e| format!("Failed to parse Ollama response: {}", e))?;
        if let Some(text) = json_resp["response"].as_str() {
            return Ok(text.to_string());
        }
        return Err("Ollama response was empty".to_string());
    }

    if !context.is_empty() {
        let q_lower = prompt.to_lowercase();
        if q_lower.contains("guide") || q_lower.contains("what is") || q_lower.contains("explain") || q_lower.contains("overview") {
            let first_lines = context.lines().take(8).collect::<Vec<_>>().join("\n");
            return Ok(format!("### Document Guidance\n\n{}\n\n💡 Tip: To enable deep live AI responses, enter your Gemini or OpenAI API key in AI Settings.", first_lines));
        }
        if q_lower.contains("summary") || q_lower.contains("summarize") {
            let first_lines = context.lines().take(6).collect::<Vec<_>>().join("\n");
            return Ok(format!("### Document Summary\n\n{}\n\n(Configure an AI API Key in settings for full conversational inference)", first_lines));
        }
        let first_lines = context.lines().take(4).collect::<Vec<_>>().join("\n");
        return Ok(format!("Analysis for \"{}\":\n\n{}\n\n(Enter a Gemini or OpenAI API Key in AI Settings for live LLM responses)", prompt, first_lines));
    }

    Err("No AI API Key provided. Please enter a valid Gemini API key (or OpenAI / Ollama) in AI Settings.".to_string())
}

fn validate_live_sources(urls: &[String]) -> Vec<serde_json::Value> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .unwrap_or_default();

    let mut results = Vec::new();
    for url in urls {
        let trimmed = url.trim();
        if trimmed.is_empty() || (!trimmed.starts_with("http://") && !trimmed.starts_with("https://")) {
            continue;
        }

        let start = std::time::Instant::now();
        let head_res = client.head(trimmed).send();
        let elapsed_ms = start.elapsed().as_millis() as u64;

        match head_res {
            Ok(resp) => {
                let status = resp.status().as_u16();
                let is_ok = resp.status().is_success() || resp.status().is_redirection();
                let last_mod = resp.headers().get("last-modified")
                    .and_then(|v| v.to_str().ok())
                    .map(|s| s.to_string());
                let etag = resp.headers().get("etag")
                    .and_then(|v| v.to_str().ok())
                    .map(|s| s.to_string());
                let content_type = resp.headers().get("content-type")
                    .and_then(|v| v.to_str().ok())
                    .map(|s| s.to_string());

                results.push(serde_json::json!({
                    "url": trimmed,
                    "reachable": is_ok,
                    "status_code": status,
                    "latency_ms": elapsed_ms,
                    "last_modified": last_mod,
                    "etag": etag,
                    "content_type": content_type,
                    "validated_at": chrono::Utc::now().to_rfc3339()
                }));
            }
            Err(err) => {
                results.push(serde_json::json!({
                    "url": trimmed,
                    "reachable": false,
                    "status_code": 0,
                    "latency_ms": elapsed_ms,
                    "error": err.to_string(),
                    "validated_at": chrono::Utc::now().to_rfc3339()
                }));
            }
        }
    }
    results
}
