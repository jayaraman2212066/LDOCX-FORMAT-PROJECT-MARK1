use ldoc_sdk::{DocumentFormatAdapter, DocumentFormatRegistry, FileFormat, MetadataSchema, ShellAction, ShellState};

#[test]
fn registry_registers_phase1_formats() {
    let mut registry = DocumentFormatRegistry::new();
    registry.register_default_phase1();

    assert!(registry.has("svg"));
    assert!(registry.has("obj"));
    assert!(registry.has("stl"));
    assert!(registry.has("pdf"));
}

#[test]
fn adapter_exposes_common_contract() {
    let mut registry = DocumentFormatRegistry::new();
    registry.register_default_phase1();

    let adapter = registry.get("pdf").expect("pdf adapter exists");
    let props = adapter.get_properties();
    assert_eq!(props.kind, FileFormat::Pdf);
    assert!(!props.fields.is_empty());

    let shell = adapter.shell_actions();
    assert!(shell.iter().any(|a| matches!(a, ShellAction::Open | ShellAction::Save | ShellAction::Export)));
}

#[test]
fn common_metadata_schema_has_standard_fields() {
    let schema = MetadataSchema::base_schema();
    let as_str = schema.iter().map(|s| s.as_str()).collect::<Vec<_>>();
    assert!(as_str.contains(&"name"));
    assert!(as_str.contains(&"type"));
    assert!(as_str.contains(&"created_at"));
    assert!(as_str.contains(&"updated_at"));
}

#[test]
fn shell_state_exposes_unified_actions() {
    let state = ShellState::default();
    assert!(state.actions.contains(&ShellAction::New));
    assert!(state.actions.contains(&ShellAction::Open));
    assert!(state.actions.contains(&ShellAction::Save));
    assert!(state.actions.contains(&ShellAction::Export));
}

#[test]
fn api_can_store_and_update_properties() {
    let api = ldoc_sdk::api::LdocApi::new();
    let bytes = ldoc_sdk::LdocDocument::create("Props Doc", "en", "Ada").unwrap();
    let id = api.create_document(bytes).unwrap();
    api.update_properties(&id, serde_json::json!({"author":"Ada","tags":["demo"]})).unwrap();
    let props = api.get_properties(&id).unwrap();
    assert_eq!(props["author"], "Ada");
    assert_eq!(props["tags"][0], "demo");
}

#[test]
fn api_tracks_version_history() {
    let api = ldoc_sdk::api::LdocApi::new();
    let bytes = ldoc_sdk::LdocDocument::create("Versioned Doc", "en", "Ada").unwrap();
    let id = api.create_document(bytes).unwrap();
    api.update_properties(&id, serde_json::json!({"status":"draft"})).unwrap();
    let versions = api.list_versions(&id).unwrap();
    assert!(!versions.is_empty());
    assert!(versions[0].get("timestamp").is_some());
}
