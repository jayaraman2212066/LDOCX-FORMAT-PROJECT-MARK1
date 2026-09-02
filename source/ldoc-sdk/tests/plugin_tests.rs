// LDOC SDK — Plugin Integration Tests

use ldoc_sdk::{LdocPluginManager, minimal_manifest};

fn mgr() -> LdocPluginManager { LdocPluginManager::new() }

// ── Load / count / list ───────────────────────────────────────────────────────

#[test]
fn test_load_plugin() {
    let m = mgr();
    m.load(minimal_manifest("tool1", vec![])).unwrap();
    assert_eq!(m.count(), 1);
}

#[test]
fn test_list_ids() {
    let m = mgr();
    m.load(minimal_manifest("a", vec![])).unwrap();
    m.load(minimal_manifest("b", vec![])).unwrap();
    let ids = m.list_ids();
    assert!(ids.contains(&"a".to_string()));
    assert!(ids.contains(&"b".to_string()));
}

#[test]
fn test_duplicate_load_fails() {
    let m = mgr();
    m.load(minimal_manifest("dup", vec![])).unwrap();
    assert!(m.load(minimal_manifest("dup", vec![])).is_err());
}

// ── Call / sandbox ────────────────────────────────────────────────────────────

#[test]
fn test_call_unknown_method_ok() {
    let m = mgr();
    m.load(minimal_manifest("c1", vec![])).unwrap();
    assert!(m.call("c1", "ping", vec![]).is_ok());
}

#[test]
fn test_call_undeclared_permission_denied() {
    let m = mgr();
    m.load(minimal_manifest("c2", vec![])).unwrap();
    assert!(m.call("c2", "network_get", vec![]).is_err());
}

#[test]
fn test_call_declared_permission_allowed() {
    let m = mgr();
    m.load(minimal_manifest("c3", vec!["network_read"])).unwrap();
    assert!(m.call("c3", "network_get", vec!["url".into()]).is_ok());
}

#[test]
fn test_call_filesystem_write_without_permission() {
    let m = mgr();
    m.load(minimal_manifest("c4", vec!["filesystem_read"])).unwrap();
    assert!(m.call("c4", "fs_write", vec!["path".into()]).is_err());
}

#[test]
fn test_call_filesystem_read_with_permission() {
    let m = mgr();
    m.load(minimal_manifest("c5", vec!["filesystem_read"])).unwrap();
    assert!(m.call("c5", "fs_read", vec!["path".into()]).is_ok());
}

#[test]
fn test_call_ai_with_permission() {
    let m = mgr();
    m.load(minimal_manifest("c6", vec!["execute_ai"])).unwrap();
    assert!(m.call("c6", "ai_execute", vec!["prompt".into()]).is_ok());
}

#[test]
fn test_call_ai_without_permission() {
    let m = mgr();
    m.load(minimal_manifest("c7", vec![])).unwrap();
    assert!(m.call("c7", "ai_execute", vec![]).is_err());
}

#[test]
fn test_call_nonexistent_plugin() {
    let m = mgr();
    assert!(m.call("ghost", "ping", vec![]).is_err());
}

#[test]
fn test_call_returns_result() {
    let m = mgr();
    m.load(minimal_manifest("c8", vec![])).unwrap();
    let result = m.call("c8", "ping", vec!["hello".into()]).unwrap();
    assert!(result.contains("ping"));
}

// ── Unload ────────────────────────────────────────────────────────────────────

#[test]
fn test_unload_plugin() {
    let m = mgr();
    m.load(minimal_manifest("u1", vec![])).unwrap();
    m.unload("u1").unwrap();
    assert_eq!(m.count(), 0);
}

#[test]
fn test_unload_nonexistent_fails() {
    let m = mgr();
    assert!(m.unload("ghost").is_err());
}

#[test]
fn test_unload_all() {
    let m = mgr();
    m.load(minimal_manifest("x1", vec![])).unwrap();
    m.load(minimal_manifest("x2", vec![])).unwrap();
    m.unload_all();
    assert_eq!(m.count(), 0);
}

#[test]
fn test_call_after_unload_fails() {
    let m = mgr();
    m.load(minimal_manifest("u2", vec![])).unwrap();
    m.unload("u2").unwrap();
    assert!(m.call("u2", "ping", vec![]).is_err());
}

// ── Multiple permissions ──────────────────────────────────────────────────────

#[test]
fn test_multiple_permissions() {
    let m = mgr();
    m.load(minimal_manifest("mp", vec!["network_read", "filesystem_read", "execute_ai"])).unwrap();
    assert!(m.call("mp", "network_get", vec![]).is_ok());
    assert!(m.call("mp", "fs_read", vec![]).is_ok());
    assert!(m.call("mp", "ai_execute", vec![]).is_ok());
    assert!(m.call("mp", "fs_write", vec![]).is_err());
}

// ── Invalid manifest ──────────────────────────────────────────────────────────

#[test]
fn test_invalid_plugin_type_rejected() {
    let mut manifest = minimal_manifest("bad", vec![]);
    manifest.plugin_type = "not_a_real_type".into();
    let m = mgr();
    assert!(m.load(manifest).is_err());
}
