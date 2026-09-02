// Module 11 — LDOC Page & Content Model Specification

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashSet;
use crate::LdocError;

// ── Page Index ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageIndex {
    pub schema_version: String,
    pub page_count: u32,
    pub pages: Vec<PageEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageEntry {
    pub id: String,
    pub path: String,
    pub title: Option<String>,
    pub number: u32,
    pub visible: bool,
    #[serde(rename = "type")]
    pub page_type: String,
    pub parent_id: Option<String>,
    pub children: Vec<String>,
}

impl PageIndex {
    pub fn from_bytes(data: &[u8]) -> Result<Self, LdocError> {
        serde_json::from_slice(data).map_err(|e| LdocError::MetadataParseError(e.to_string()))
    }

    pub fn to_bytes(&self) -> Result<Vec<u8>, LdocError> {
        serde_json::to_vec_pretty(self).map_err(LdocError::Json)
    }

    pub fn validate(&self, manifest_page_count: u32) -> Result<Vec<String>, LdocError> {
        let mut warnings = Vec::new();

        if self.page_count != manifest_page_count {
            return Err(LdocError::ManifestFieldInvalid(
                "page_count".into(),
                format!("index says {}, manifest says {}", self.page_count, manifest_page_count),
            ));
        }

        for page in &self.pages {
            // Validate page directory naming convention
            let dir_name = page.path.split('/').last().unwrap_or("");
            if !dir_name.starts_with("page_") {
                warnings.push(format!("Page '{}' does not follow page_NNN naming convention", page.path));
            }
        }

        Ok(warnings)
    }
}

// ── Layout ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageLayout {
    pub schema_version: String,
    pub page_id: String,
    pub width: f64,
    pub height: f64,
    pub unit: String,
    pub dpi: u32,
    pub orientation: String,
    pub margin: Margin,
    pub columns: u32,
    pub column_gap: Option<f64>,
    pub background: Option<Background>,
    pub flow: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Margin {
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
    pub left: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Background {
    #[serde(rename = "type")]
    pub bg_type: String,
    pub value: String,
}

impl PageLayout {
    pub fn from_bytes(data: &[u8]) -> Result<Self, LdocError> {
        serde_json::from_slice(data).map_err(|e| LdocError::MetadataParseError(e.to_string()))
    }

    pub fn to_bytes(&self) -> Result<Vec<u8>, LdocError> {
        serde_json::to_vec_pretty(self).map_err(LdocError::Json)
    }

    /// A4 portrait at 96 DPI.
    pub fn a4_portrait(page_id: &str) -> Self {
        Self {
            schema_version: "1.0.0".into(),
            page_id: page_id.to_string(),
            width: 794.0,
            height: 1123.0,
            unit: "px".into(),
            dpi: 96,
            orientation: "portrait".into(),
            margin: Margin { top: 72.0, right: 72.0, bottom: 72.0, left: 72.0 },
            columns: 1,
            column_gap: None,
            background: Some(Background { bg_type: "color".into(), value: "#ffffff".into() }),
            flow: "block".into(),
        }
    }
}

// ── Content Node Tree ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageContent {
    pub schema_version: String,
    pub page_id: String,
    pub root: ContentNode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentNode {
    pub id: String,
    #[serde(rename = "type")]
    pub node_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub level: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub asset_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub script_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub style: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub layout: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aria: Option<Value>,
    pub visible: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locale_overrides: Option<Value>,
    pub children: Vec<ContentNode>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub _reserved: Option<Value>,
}

impl ContentNode {
    pub fn container(id: &str) -> Self {
        Self::new(id, "container")
    }

    pub fn heading(id: &str, level: u8, text: &str) -> Self {
        let text_node = Self {
            id: format!("{id}-text"),
            node_type: "text".into(),
            value: Some(text.to_string()),
            level: None,
            asset_id: None, script_id: None, style: None, layout: None,
            aria: None, visible: Some(true), locale_overrides: None,
            children: vec![], _reserved: None,
        };
        Self {
            id: id.to_string(),
            node_type: "heading".into(),
            value: None,
            level: Some(level),
            asset_id: None, script_id: None, style: None, layout: None,
            aria: Some(serde_json::json!({ "role": "heading", "level": level })),
            visible: Some(true), locale_overrides: None,
            children: vec![text_node], _reserved: None,
        }
    }

    pub fn paragraph(id: &str, text: &str) -> Self {
        let text_node = Self {
            id: format!("{id}-text"),
            node_type: "text".into(),
            value: Some(text.to_string()),
            level: None,
            asset_id: None, script_id: None, style: None, layout: None,
            aria: None, visible: Some(true), locale_overrides: None,
            children: vec![], _reserved: None,
        };
        Self {
            id: id.to_string(),
            node_type: "paragraph".into(),
            value: None, level: None, asset_id: None, script_id: None,
            style: None, layout: None, aria: None, visible: Some(true),
            locale_overrides: None, children: vec![text_node], _reserved: None,
        }
    }

    fn new(id: &str, node_type: &str) -> Self {
        Self {
            id: id.to_string(),
            node_type: node_type.to_string(),
            value: None, level: None, asset_id: None, script_id: None,
            style: None, layout: None, aria: None, visible: Some(true),
            locale_overrides: None, children: vec![], _reserved: None,
        }
    }
}

impl PageContent {
    pub fn from_bytes(data: &[u8]) -> Result<Self, LdocError> {
        serde_json::from_slice(data).map_err(|e| LdocError::MetadataParseError(e.to_string()))
    }

    pub fn to_bytes(&self) -> Result<Vec<u8>, LdocError> {
        serde_json::to_vec_pretty(self).map_err(LdocError::Json)
    }

    /// Validate content tree: unique node IDs, required fields, etc.
    pub fn validate(&self) -> Result<Vec<String>, LdocError> {
        let mut warnings = Vec::new();
        let mut seen_ids = HashSet::new();
        validate_node(&self.root, &mut seen_ids, &mut warnings)?;
        Ok(warnings)
    }
}

fn validate_node(
    node: &ContentNode,
    seen_ids: &mut HashSet<String>,
    warnings: &mut Vec<String>,
) -> Result<(), LdocError> {
    if !seen_ids.insert(node.id.clone()) {
        return Err(LdocError::DuplicateNodeId(node.id.clone()));
    }

    // Image nodes must have asset_id or web/data src
    if node.node_type == "image" && node.asset_id.is_none() {
        let has_src = node.style.as_ref()
            .and_then(|s| s.get("src").or_else(|| s.get("url")))
            .and_then(|v| v.as_str())
            .map(|s| !s.is_empty())
            .unwrap_or(false);
        if !has_src {
            return Err(LdocError::ManifestFieldInvalid(
                "node.asset_id".into(),
                format!("image node '{}' is missing asset_id", node.id),
            ));
        }
    }

    // Interactive nodes should have ARIA label
    let interactive = ["button", "input_text", "input_checkbox", "input_radio",
                       "input_select", "input_date", "input_file", "toggle", "slider"];
    if interactive.contains(&node.node_type.as_str()) {
        if node.aria.is_none() {
            warnings.push(format!("Interactive node '{}' ({}) is missing aria label", node.id, node.node_type));
        }
    }

    for child in &node.children {
        validate_node(child, seen_ids, warnings)?;
    }
    Ok(())
}

/// Known node types from Module 11 §6.
pub const KNOWN_NODE_TYPES: &[&str] = &[
    // Layout
    "container", "row", "column", "grid", "page_break", "section",
    // Text
    "heading", "paragraph", "text", "link", "code", "code_block",
    "quote", "list", "list_item", "footnote", "footnote_def",
    // Media
    "image", "vector", "audio", "video", "model_3d", "animation",
    // Data
    "table", "table_row", "table_cell", "chart",
    // Interactive
    "form", "input_text", "input_textarea", "input_number", "input_checkbox",
    "input_radio", "input_select", "input_date", "input_file",
    "button", "toggle", "slider",
    // AI
    "ai_block", "ai_summary", "ai_qa", "ai_translate",
    // Structural
    "toc", "index", "bibliography", "citation", "metadata_display",
];

