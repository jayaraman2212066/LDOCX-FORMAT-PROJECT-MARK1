// LDOC Server Integration Tests — in-process, no binary spawning.
// Each test calls start_server_on("127.0.0.1:0") which binds on a free OS port,
// runs the server on a background thread, and returns a ShutdownHandle that
// stops the server when dropped at end of test.

use std::io::{Read, Write};
use std::net::TcpStream;
use std::time::Duration;
use ldoc_sdk::server::start_server_on;

// ── helpers ───────────────────────────────────────────────────────────────────

fn make_ldoc_bytes() -> Vec<u8> {
    ldoc_core::builder::DocumentBuilder::new("Server Test", "en", "Tester")
        .build()
        .expect("builder failed")
}

fn http(addr: &str, raw: &str) -> String {
    let mut stream = TcpStream::connect(addr).expect("connect failed");
    stream.set_read_timeout(Some(Duration::from_secs(2))).unwrap();
    stream.write_all(raw.as_bytes()).expect("write failed");
    let mut buf = Vec::new();
    let _ = stream.read_to_end(&mut buf);
    String::from_utf8_lossy(&buf).into_owned()
}

fn post_document(addr: &str, body: &[u8]) -> String {
    let header = format!(
        "POST /documents HTTP/1.1\r\nHost: {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        addr, body.len()
    );
    let mut stream = TcpStream::connect(addr).expect("connect failed");
    stream.set_read_timeout(Some(Duration::from_secs(2))).unwrap();
    stream.write_all(header.as_bytes()).unwrap();
    stream.write_all(body).unwrap();
    let mut buf = Vec::new();
    let _ = stream.read_to_end(&mut buf);
    String::from_utf8_lossy(&buf).into_owned()
}

fn body(response: &str) -> &str {
    if let Some(pos) = response.find("\r\n\r\n") { &response[pos + 4..] } else { response }
}

fn status_code(response: &str) -> u16 {
    response.lines().next()
        .and_then(|l| l.split_whitespace().nth(1))
        .and_then(|s| s.parse().ok())
        .unwrap_or(0)
}

fn json_field<'a>(json: &'a str, key: &str) -> Option<&'a str> {
    let needle = format!("\"{}\":\"", key);
    let start = json.find(&needle)? + needle.len();
    let end = json[start..].find('"')? + start;
    Some(&json[start..end])
}

// ── REST tests ────────────────────────────────────────────────────────────────

#[test]
fn test_post_invalid_bytes_returns_400() {
    let (addr, _h) = start_server_on("127.0.0.1:0");
    let resp = post_document(&addr.to_string(), b"not an ldoc file");
    assert_eq!(status_code(&resp), 400, "expected 400, got: {}", resp);
    assert!(body(&resp).contains("error"), "expected error field");
}

#[test]
fn test_post_empty_bytes_returns_400() {
    let (addr, _h) = start_server_on("127.0.0.1:0");
    let resp = post_document(&addr.to_string(), b"");
    assert_eq!(status_code(&resp), 400, "expected 400, got: {}", resp);
}

#[test]
fn test_post_valid_ldoc_returns_201_with_id() {
    let (addr, _h) = start_server_on("127.0.0.1:0");
    let bytes = make_ldoc_bytes();
    let resp = post_document(&addr.to_string(), &bytes);
    assert_eq!(status_code(&resp), 201, "expected 201, got: {}", resp);
    assert!(body(&resp).contains("\"id\""), "expected id field in: {}", body(&resp));
}

#[test]
fn test_get_nonexistent_document_returns_404() {
    let (addr, _h) = start_server_on("127.0.0.1:0");
    let a = addr.to_string();
    let resp = http(&a, &format!(
        "GET /documents/nonexistent HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n", a
    ));
    assert_eq!(status_code(&resp), 404, "expected 404, got: {}", resp);
}

#[test]
fn test_get_document_after_post() {
    let (addr, _h) = start_server_on("127.0.0.1:0");
    let a = addr.to_string();
    let bytes = make_ldoc_bytes();
    let post_resp = post_document(&a, &bytes);
    assert_eq!(status_code(&post_resp), 201);
    let id = json_field(body(&post_resp), "id").expect("no id in response");
    let get_resp = http(&a, &format!(
        "GET /documents/{} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n", id, a
    ));
    assert_eq!(status_code(&get_resp), 200, "expected 200, got: {}", get_resp);
    assert!(body(&get_resp).contains("\"id\""), "expected id in: {}", body(&get_resp));
}

#[test]
fn test_get_pages_after_post() {
    let (addr, _h) = start_server_on("127.0.0.1:0");
    let a = addr.to_string();
    let bytes = make_ldoc_bytes();
    let post_resp = post_document(&a, &bytes);
    let id = json_field(body(&post_resp), "id").expect("no id");
    let resp = http(&a, &format!(
        "GET /documents/{}/pages HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n", id, a
    ));
    assert_eq!(status_code(&resp), 200, "expected 200, got: {}", resp);
    assert!(body(&resp).starts_with('['), "expected JSON array");
}

#[test]
fn test_validate_after_post() {
    let (addr, _h) = start_server_on("127.0.0.1:0");
    let a = addr.to_string();
    let bytes = make_ldoc_bytes();
    let post_resp = post_document(&a, &bytes);
    let id = json_field(body(&post_resp), "id").expect("no id");
    let resp = http(&a, &format!(
        "POST /documents/{}/validate HTTP/1.1\r\nHost: {}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
        id, a
    ));
    assert_eq!(status_code(&resp), 200, "expected 200, got: {}", resp);
    assert!(body(&resp).contains("\"valid\""), "expected valid field");
}

#[test]
fn test_properties_and_versions_routes_work() {
    let (addr, _h) = start_server_on("127.0.0.1:0");
    let a = addr.to_string();
    let bytes = make_ldoc_bytes();
    let post_resp = post_document(&a, &bytes);
    let id = json_field(body(&post_resp), "id").expect("no id");

    let props = http(&a, &format!(
        "GET /documents/{}/properties HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n",
        id, a
    ));
    assert_eq!(status_code(&props), 200, "expected 200, got: {}", props);
    assert!(body(&props).contains("\"name\""), "expected properties payload: {}", body(&props));

    let versions = http(&a, &format!(
        "GET /documents/{}/versions HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n",
        id, a
    ));
    assert_eq!(status_code(&versions), 200, "expected 200, got: {}", versions);
    assert!(body(&versions).starts_with('['), "expected versions array: {}", body(&versions));
}

#[test]
fn test_unknown_route_returns_404() {
    let (addr, _h) = start_server_on("127.0.0.1:0");
    let a = addr.to_string();
    let resp = http(&a, &format!(
        "GET /unknown HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n", a
    ));
    assert_eq!(status_code(&resp), 404);
}

// ── WebSocket tests ───────────────────────────────────────────────────────────

fn ws_connect(addr: &str) -> (TcpStream, String) {
    let key = "dGhlIHNhbXBsZSBub25jZQ==";
    let request = format!(
        "GET /ws HTTP/1.1\r\nHost: {}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {}\r\nSec-WebSocket-Version: 13\r\n\r\n",
        addr, key
    );
    let mut stream = TcpStream::connect(addr).expect("connect failed");
    stream.set_read_timeout(Some(Duration::from_secs(2))).unwrap();
    stream.write_all(request.as_bytes()).unwrap();
    let mut buf = [0u8; 1024];
    let n = stream.read(&mut buf).unwrap_or(0);
    let response = String::from_utf8_lossy(&buf[..n]).into_owned();
    (stream, response)
}

#[test]
fn test_ws_upgrade_returns_101() {
    let (addr, _h) = start_server_on("127.0.0.1:0");
    let (_stream, resp) = ws_connect(&addr.to_string());
    assert!(resp.starts_with("HTTP/1.1 101"), "expected 101, got: {}", resp);
}

#[test]
fn test_ws_upgrade_contains_accept_header() {
    let (addr, _h) = start_server_on("127.0.0.1:0");
    let (_stream, resp) = ws_connect(&addr.to_string());
    assert!(resp.contains("Sec-WebSocket-Accept:"), "expected accept header in: {}", resp);
}

#[test]
fn test_ws_missing_key_returns_400() {
    let (addr, _h) = start_server_on("127.0.0.1:0");
    let a = addr.to_string();
    let request = format!(
        "GET /ws HTTP/1.1\r\nHost: {}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n", a
    );
    let resp = http(&a, &request);
    assert_eq!(status_code(&resp), 400, "expected 400, got: {}", resp);
}

#[test]
fn test_ws_receives_connected_event() {
    let (addr, _h) = start_server_on("127.0.0.1:0");
    let (mut stream, handshake) = ws_connect(&addr.to_string());
    assert!(handshake.contains("101"), "handshake failed: {}", handshake);
    let mut frame_buf = [0u8; 256];
    let n = stream.read(&mut frame_buf).unwrap_or(0);
    assert!(n > 2, "expected at least a frame header");
    assert_eq!(frame_buf[0], 0x81, "expected text frame");
    let payload_len = (frame_buf[1] & 0x7F) as usize;
    assert!(payload_len > 0, "expected non-empty payload");
    let payload = std::str::from_utf8(&frame_buf[2..2 + payload_len]).unwrap_or("");
    assert!(payload.contains("connected"), "expected 'connected' in: {}", payload);
}
