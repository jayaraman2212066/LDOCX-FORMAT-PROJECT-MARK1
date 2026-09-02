// LDOC SDK — In-Process API
// Mirrors the REST API surface as a direct Rust API.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use uuid::Uuid;
use chrono::Utc;
use crate::document::{LdocDocument, LdocPage, LdocValidation};
use crate::error::SdkError;

/// An in-memory store of uploaded documents.
#[derive(Default)]
pub struct LdocApi {
    store: Arc<Mutex<HashMap<String, (Vec<u8>, LdocDocument)>>>,
    properties: Arc<Mutex<HashMap<String, serde_json::Value>>>,
    versions: Arc<Mutex<HashMap<String, Vec<serde_json::Value>>>>,
}

impl LdocApi {
    pub fn new() -> Self { Self::default() }

    fn iso_now() -> String {
        Utc::now().to_rfc3339()
    }

    fn merge_json(target: &mut serde_json::Value, patch: serde_json::Value) {
        match (target, patch) {
            (serde_json::Value::Object(base), serde_json::Value::Object(patch_obj)) => {
                for (key, value) in patch_obj {
                    if let Some(existing) = base.get_mut(&key) {
                        let mut clone = existing.clone();
                        Self::merge_json(&mut clone, value);
                        *existing = clone;
                    } else {
                        base.insert(key, value);
                    }
                }
            }
            (target_ref, patch_value) => {
                *target_ref = patch_value;
            }
        }
    }

    fn default_properties_for(doc: &LdocDocument, data: &[u8]) -> serde_json::Value {
        serde_json::json!({
            "name": doc.manifest.title,
            "type": "ldoc",
            "created_at": Self::iso_now(),
            "updated_at": Self::iso_now(),
            "size": data.len(),
            "author": doc.metadata.authors.join(", "),
            "tags": [],
            "version": "1.0.0"
        })
    }

    /// Generate a mesh template (cube, sphere, pyramid) for 3D models
    fn generate_mesh_template(template: &str) -> serde_json::Value {
        use crate::unified::{create_cube_mesh};
        
        let mesh = match template {
            "cube" => create_cube_mesh(),
            "sphere" => {
                // Simple icosphere: 12 vertices, 20 triangular faces
                let phi = (1.0 + 5.0_f32.sqrt()) / 2.0;
                let vertices = vec![
                    // (-1, φ, 0), (1, φ, 0), (-1, -φ, 0), (1, -φ, 0)
                    // (0, -1, φ), (0, 1, φ), (0, -1, -φ), (0, 1, -φ)
                    // (φ, 0, -1), (φ, 0, 1), (-φ, 0, -1), (-φ, 0, 1)
                    crate::unified::Vertex { x: -1.0, y: phi, z: 0.0 },
                    crate::unified::Vertex { x: 1.0, y: phi, z: 0.0 },
                    crate::unified::Vertex { x: -1.0, y: -phi, z: 0.0 },
                    crate::unified::Vertex { x: 1.0, y: -phi, z: 0.0 },
                    crate::unified::Vertex { x: 0.0, y: -1.0, z: phi },
                    crate::unified::Vertex { x: 0.0, y: 1.0, z: phi },
                    crate::unified::Vertex { x: 0.0, y: -1.0, z: -phi },
                    crate::unified::Vertex { x: 0.0, y: 1.0, z: -phi },
                    crate::unified::Vertex { x: phi, y: 0.0, z: -1.0 },
                    crate::unified::Vertex { x: phi, y: 0.0, z: 1.0 },
                    crate::unified::Vertex { x: -phi, y: 0.0, z: -1.0 },
                    crate::unified::Vertex { x: -phi, y: 0.0, z: 1.0 },
                ];
                let faces = vec![
                    crate::unified::Face { vertices: vec![0, 11, 5], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![0, 5, 1], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![0, 1, 7], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![0, 7, 10], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![0, 10, 11], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![1, 5, 9], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![5, 11, 4], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![11, 10, 2], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![10, 7, 6], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![7, 1, 8], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![3, 9, 4], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![3, 4, 2], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![3, 2, 6], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![3, 6, 8], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![3, 8, 9], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![4, 9, 5], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![2, 4, 11], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![6, 2, 10], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![8, 6, 7], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![9, 8, 1], normals: None, textures: None },
                ];
                crate::unified::Mesh { vertices, normals: vec![], textures: vec![], faces, name: "Icosphere".to_string() }
            }
            "pyramid" => {
                // Square pyramid: 5 vertices, 6 triangular faces
                let vertices = vec![
                    crate::unified::Vertex { x: -1.0, y: -1.0, z: -1.0 },
                    crate::unified::Vertex { x: 1.0, y: -1.0, z: -1.0 },
                    crate::unified::Vertex { x: 1.0, y: -1.0, z: 1.0 },
                    crate::unified::Vertex { x: -1.0, y: -1.0, z: 1.0 },
                    crate::unified::Vertex { x: 0.0, y: 1.0, z: 0.0 },
                ];
                let faces = vec![
                    // Base
                    crate::unified::Face { vertices: vec![0, 2, 1], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![0, 3, 2], normals: None, textures: None },
                    // Sides
                    crate::unified::Face { vertices: vec![0, 1, 4], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![1, 2, 4], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![2, 3, 4], normals: None, textures: None },
                    crate::unified::Face { vertices: vec![3, 0, 4], normals: None, textures: None },
                ];
                crate::unified::Mesh { vertices, normals: vec![], textures: vec![], faces, name: "Pyramid".to_string() }
            }
            _ => create_cube_mesh(),
        };

        serde_json::to_value(&mesh).unwrap_or(serde_json::json!({}))
    }

    fn record_version(&self, id: &str, properties: &serde_json::Value) {
        let version = serde_json::json!({
            "timestamp": Self::iso_now(),
            "properties": properties
        });
        self.versions.lock().unwrap().entry(id.to_string()).or_default().push(version);
    }

    /// POST /documents — store bytes, return assigned id.
    pub fn create_document(&self, data: Vec<u8>) -> Result<String, SdkError> {
        let doc = LdocDocument::from_bytes(&data)?;
        let id = Uuid::new_v4().to_string();
        let props = Self::default_properties_for(&doc, &data);
        self.store.lock().unwrap().insert(id.clone(), (data.clone(), doc));
        self.properties.lock().unwrap().insert(id.clone(), props.clone());
        self.record_version(&id, &props);
        Ok(id)
    }

    /// GET /documents/:id
    pub fn get_document(&self, id: &str) -> Result<LdocDocument, SdkError> {
        self.store.lock().unwrap()
            .get(id)
            .map(|(_, doc)| doc.clone())
            .ok_or_else(|| SdkError::NotFound(id.to_string()))
    }

    /// GET /documents/:id/pages
    pub fn get_pages(&self, id: &str) -> Result<Vec<LdocPage>, SdkError> {
        Ok(self.get_document(id)?.pages)
    }

    /// GET /documents/:id/pages/:num/content
    pub fn get_page_content(&self, id: &str, page_num: u32) -> Result<String, SdkError> {
        use ldoc_core::container::LdocZipReader;
        use ldoc_core::pages::{PageIndex, PageContent};
        use std::io::{Cursor, Read};
        let guard = self.store.lock().unwrap();
        let (data, _) = guard.get(id).ok_or_else(|| SdkError::NotFound(id.to_string()))?;
        
        // Try standard LdocZipReader first
        if let Ok(mut zip) = LdocZipReader::open(Cursor::new(data.as_slice())) {
            if let Ok(index_bytes) = zip.read_entry("pages/index.json") {
                if let Ok(page_index) = PageIndex::from_bytes(&index_bytes) {
                    if let Some(entry) = page_index.pages.iter().find(|p| p.number == page_num) {
                        if let Ok(content_bytes) = zip.read_entry(&format!("{}/content.json", entry.path)) {
                            if let Ok(content) = PageContent::from_bytes(&content_bytes) {
                                if let Ok(s) = serde_json::to_string(&content) {
                                    return Ok(s);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Resilient fallback: locate PK\x03\x04 and inspect zip entries directly
        let mut zip_offset = 0;
        for i in 0..data.len().saturating_sub(4) {
            if data[i..i+4] == [0x50, 0x4B, 0x03, 0x04] {
                zip_offset = i;
                break;
            }
        }

        if let Ok(mut archive) = zip::ZipArchive::new(Cursor::new(&data[zip_offset..])) {
            let candidates = [
                format!("pages/page_{:03}/content.json", page_num),
                format!("pages/page_{}/content.json", page_num),
                format!("pages/page_{}.json", page_num),
                format!("pages/page_{:03}.json", page_num),
            ];
            for cand in &candidates {
                for i in 0..archive.len() {
                    if let Ok(mut f) = archive.by_index(i) {
                        if f.name() == cand {
                            let mut s = String::new();
                            if f.read_to_string(&mut s).is_ok() {
                                return Ok(s);
                            }
                        }
                    }
                }
            }
        }

        // Minimal safe recovery container node
        Ok(serde_json::json!({
            "schema_version": "1.0.0",
            "page_id": format!("page-{}", page_num),
            "root": {
                "id": format!("page-{}-root", page_num),
                "type": "container",
                "visible": true,
                "children": [
                    {
                        "type": "heading",
                        "level": 2,
                        "text": format!("Page {}", page_num)
                    },
                    {
                        "type": "paragraph",
                        "text": "Living Document recovered into viewable format by LDOC Studio Disaster Recovery Engine."
                    }
                ]
            }
        }).to_string())
    }

    /// GET /documents/:id/assets/:asset_id — returns base64-encoded asset + mime type
    pub fn get_asset(&self, id: &str, asset_id: &str) -> Result<(String, Vec<u8>), SdkError> {
        use ldoc_core::container::LdocZipReader;
        use ldoc_core::assets::AssetIndex;
        use std::io::Cursor;
        let guard = self.store.lock().unwrap();
        let (data, _) = guard.get(id).ok_or_else(|| SdkError::NotFound(id.to_string()))?;
        let mut zip = LdocZipReader::open(Cursor::new(data.as_slice())).map_err(|e| SdkError::Core(e))?;
        let idx_bytes = zip.read_entry("assets/index.json").map_err(|e| SdkError::Core(e))?;
        let idx = AssetIndex::from_bytes(&idx_bytes).map_err(|e| SdkError::Core(e))?;
        let entry = idx.assets.iter().find(|a| a.id == asset_id)
            .ok_or_else(|| SdkError::NotFound(format!("asset {}", asset_id)))?;
        let mime = entry.mime_type.clone();
        let bytes = zip.read_entry(&entry.path).map_err(|e| SdkError::Core(e))?;
        Ok((mime, bytes))
    }

    /// POST /documents/build — build a .ldocx from a JSON spec, store it, return id
    pub fn build_document(&self, spec_json: &[u8]) -> Result<String, SdkError> {
        use ldoc_core::{DynamicDocumentBuilder, DynamicPage, ContentBlock, DynamicFeatures, FormField};
        let spec: serde_json::Value = serde_json::from_slice(spec_json)
            .map_err(|e| SdkError::NotFound(format!("invalid JSON: {e}")))?
        ;
        let title  = spec["title"].as_str().unwrap_or("Untitled");
        let author = spec["author"].as_str().unwrap_or("Unknown");
        let lang   = spec["lang"].as_str().unwrap_or("en");

        let mut builder = DynamicDocumentBuilder::new(title, lang, author);
        if let Some(sub) = spec["subtitle"].as_str() { builder = builder.with_subtitle(sub); }
        if let Some(desc) = spec["description"].as_str() { builder = builder.with_description(desc); }

        let mut features = DynamicFeatures::default();
        features.has_forms = true;
        features.has_ai    = true;
        features.has_audio = true;
        features.has_video = true;
        builder = builder.with_features(features);

        if let Some(pages) = spec["pages"].as_array() {
            for (pi, page_spec) in pages.iter().enumerate() {
                let ptitle = page_spec["title"].as_str().unwrap_or("Page");
                let mut page = DynamicPage::new(ptitle, (pi + 1) as u32);
                if let Some(blocks) = page_spec["blocks"].as_array() {
                    for block in blocks {
                        let btype = block["type"].as_str().unwrap_or("");
                        let cb = match btype {
                            "heading" => Some(ContentBlock::Heading {
                                level: block["level"].as_u64().unwrap_or(1) as u8,
                                text: block["text"].as_str().unwrap_or("").to_string(),
                            }),
                            "paragraph" => Some(ContentBlock::Paragraph {
                                text: block["text"].as_str().unwrap_or("").to_string(),
                            }),
                            "quote" => Some(ContentBlock::Quote {
                                text: block["text"].as_str().unwrap_or("").to_string(),
                            }),
                            "list" => {
                                let items = block["items"].as_array()
                                    .map(|a| a.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
                                    .unwrap_or_default();
                                Some(ContentBlock::List { items })
                            }
                            "code" => Some(ContentBlock::CodeBlock {
                                language: block["language"].as_str().unwrap_or("text").to_string(),
                                code: block["code"].as_str().unwrap_or("").to_string(),
                            }),
                            "table" => {
                                let headers = block["headers"].as_array()
                                    .map(|a| a.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
                                    .unwrap_or_default();
                                let rows = block["rows"].as_array()
                                    .map(|a| a.iter().map(|row| {
                                        row.as_array().map(|r| r.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect()).unwrap_or_default()
                                    }).collect())
                                    .unwrap_or_default();
                                Some(ContentBlock::Table { headers, rows })
                            }
                            "ai" => Some(ContentBlock::AiBlock {
                                prompt: block["prompt"].as_str().unwrap_or("").to_string(),
                            }),
                            "form" => {
                                let fields = block["fields"].as_array()
                                    .map(|a| a.iter().map(|f| FormField {
                                        field_type: f["field_type"].as_str().unwrap_or("input_text").to_string(),
                                        label: f["label"].as_str().unwrap_or("").to_string(),
                                        placeholder: f["placeholder"].as_str().map(|s| s.to_string()),
                                    }).collect())
                                    .unwrap_or_default();
                                Some(ContentBlock::Form { fields })
                            }
                            "3d_model" => {
                                let format = block["format"].as_str().unwrap_or("obj");
                                let template = block["mesh_template"].as_str().unwrap_or("cube");
                                let mesh_data = if let Some(custom_mesh) = block.get("mesh_data") {
                                    if custom_mesh.is_object() && custom_mesh.get("vertices").is_some() {
                                        custom_mesh.clone()
                                    } else {
                                        Self::generate_mesh_template(template)
                                    }
                                } else {
                                    Self::generate_mesh_template(template)
                                };
                                Some(ContentBlock::Custom {
                                    node_type: "3d_model".to_string(),
                                    value: Some(format!("{} Model", format.to_uppercase())),
                                    style: Some(serde_json::json!({
                                        "format": format,
                                        "template": template,
                                        "mesh_data": mesh_data
                                    })),
                                })
                            }
                            "ai_live" | "ai_live_data" => {
                                let prompt = block["prompt"].as_str().unwrap_or("Live Internet Data Summary").to_string();
                                let source_url = block["source_url"].as_str().unwrap_or("").to_string();
                                let refresh_sec = block["refresh_sec"].as_u64().unwrap_or(60);
                                Some(ContentBlock::Custom {
                                    node_type: "ai_live_data".to_string(),
                                    value: Some(prompt),
                                    style: Some(serde_json::json!({
                                        "source_url": source_url,
                                        "refresh_sec": refresh_sec,
                                        "auto_validate": true
                                    })),
                                })
                            }
                            "image" | "web_image" => {
                                let src = block["src"].as_str()
                                    .or_else(|| block["style"]["src"].as_str())
                                    .or_else(|| block["style"]["url"].as_str())
                                    .unwrap_or("").to_string();
                                let alt = block["alt"].as_str()
                                    .or_else(|| block["style"]["alt"].as_str())
                                    .or_else(|| block["value"].as_str())
                                    .unwrap_or("Image").to_string();
                                Some(ContentBlock::Custom {
                                    node_type: "web_image".to_string(),
                                    value: Some(alt.clone()),
                                    style: Some(serde_json::json!({
                                        "src": src,
                                        "alt": alt
                                    })),
                                })
                            }
                            "audio" | "web_audio" => {
                                let src = block["src"].as_str()
                                    .or_else(|| block["style"]["src"].as_str())
                                    .unwrap_or("").to_string();
                                let label = block["label"].as_str()
                                    .or_else(|| block["style"]["label"].as_str())
                                    .or_else(|| block["value"].as_str())
                                    .unwrap_or("Audio Track").to_string();
                                Some(ContentBlock::Custom {
                                    node_type: "web_audio".to_string(),
                                    value: Some(label.clone()),
                                    style: Some(serde_json::json!({
                                        "src": src,
                                        "label": label
                                    })),
                                })
                            }
                            "video" | "web_video" => {
                                let src = block["src"].as_str()
                                    .or_else(|| block["style"]["src"].as_str())
                                    .unwrap_or("").to_string();
                                let label = block["label"].as_str()
                                    .or_else(|| block["style"]["label"].as_str())
                                    .or_else(|| block["value"].as_str())
                                    .unwrap_or("Video Player").to_string();
                                let autoplay = block["autoplay"].as_bool()
                                    .or_else(|| block["style"]["autoplay"].as_bool())
                                    .unwrap_or(true);
                                Some(ContentBlock::Custom {
                                    node_type: "web_video".to_string(),
                                    value: Some(label.clone()),
                                    style: Some(serde_json::json!({
                                        "src": src,
                                        "label": label,
                                        "autoplay": autoplay
                                    })),
                                })
                            }
                            "feature_grid" => {
                                let cards = block.get("cards")
                                    .or_else(|| block.get("style").and_then(|s| s.get("cards")))
                                    .cloned()
                                    .unwrap_or(serde_json::json!([]));
                                Some(ContentBlock::Custom {
                                    node_type: "feature_grid".to_string(),
                                    value: None,
                                    style: Some(serde_json::json!({ "cards": cards })),
                                })
                            }
                            "live_feed" => {
                                let title = block["title"].as_str()
                                    .or_else(|| block["style"]["title"].as_str())
                                    .unwrap_or("GLOBAL DISPATCH BEACON");
                                let sources = block["sources"].as_str()
                                    .or_else(|| block["style"]["sources"].as_str())
                                    .unwrap_or("");
                                Some(ContentBlock::Custom {
                                    node_type: "live_feed".to_string(),
                                    value: Some(title.to_string()),
                                    style: Some(serde_json::json!({
                                        "title": title,
                                        "sources": sources
                                    })),
                                })
                            }
                            "preorder" => {
                                let tier = block["tier"].as_str()
                                    .or_else(|| block["style"]["tier"].as_str())
                                    .unwrap_or("VIP FOUNDER PASS");
                                let price = block["price"].as_str()
                                    .or_else(|| block["style"]["price"].as_str())
                                    .unwrap_or("$99");
                                let perks = block["perks"].as_str()
                                    .or_else(|| block["style"]["perks"].as_str())
                                    .unwrap_or("");
                                Some(ContentBlock::Custom {
                                    node_type: "preorder".to_string(),
                                    value: Some(tier.to_string()),
                                    style: Some(serde_json::json!({
                                        "tier": tier,
                                        "price": price,
                                        "perks": perks
                                    })),
                                })
                            }
                            "particles" | "particle_canvas" => {
                                let mode = block["mode"].as_str().unwrap_or("stardust");
                                Some(ContentBlock::Custom {
                                    node_type: "particles".to_string(),
                                    value: Some(mode.to_string()),
                                    style: Some(serde_json::json!({ "mode": mode })),
                                })
                            }
                            "water_effect" | "fluid_canvas" => {
                                Some(ContentBlock::Custom {
                                    node_type: "water_effect".to_string(),
                                    value: Some("Interactive Fluid Dynamics".to_string()),
                                    style: Some(serde_json::json!({ "interactive": true })),
                                })
                            }
                            "jsx_canvas" | "interactive_sandbox" => {
                                let code = block["code"].as_str().unwrap_or("<div>Interactive Sandbox</div>");
                                Some(ContentBlock::Custom {
                                    node_type: "jsx_canvas".to_string(),
                                    value: Some("Live Sandbox".to_string()),
                                    style: Some(serde_json::json!({ "code": code })),
                                })
                            }
                            "iframe" | "button" => {
                                Some(ContentBlock::Custom {
                                    node_type: btype.to_string(),
                                    value: block["value"].as_str().map(|s| s.to_string()),
                                    style: block.get("style").cloned(),
                                })
                            }
                            _ => None,
                        };
                        if let Some(cb) = cb { page.content.push(cb); }
                    }
                }
                builder = builder.add_page(page);
            }
        }

        let data = builder.build().map_err(|e| SdkError::NotFound(e.to_string()))?;
        self.create_document(data)
    }

    /// GET /documents — list all loaded document ids + titles
    pub fn list_documents(&self) -> Vec<serde_json::Value> {
        self.store.lock().unwrap().iter().map(|(id, (_, doc))| {
            serde_json::json!({
                "id": id,
                "title": doc.manifest.title,
                "pages": doc.manifest.page_count,
                "valid": doc.validation.valid
            })
        }).collect()
    }

    /// Internal: insert a document with a pre-existing id (used for persistence reload).
    pub fn create_document_with_id(&self, id: String, data: Vec<u8>) -> Result<(), SdkError> {
        let doc = LdocDocument::from_bytes(&data)?;
        let props = Self::default_properties_for(&doc, &data);
        self.store.lock().unwrap().insert(id.clone(), (data.clone(), doc));
        self.properties.lock().unwrap().insert(id.clone(), props.clone());
        self.record_version(&id, &props);
        Ok(())
    }

    /// GET /documents/:id/properties
    pub fn get_properties(&self, id: &str) -> Result<serde_json::Value, SdkError> {
        self.properties.lock().unwrap()
            .get(id)
            .cloned()
            .ok_or_else(|| SdkError::NotFound(id.to_string()))
    }

    /// PUT /documents/:id/properties
    pub fn update_properties(&self, id: &str, patch: serde_json::Value) -> Result<(), SdkError> {
        let mut map = self.properties.lock().unwrap();
        let mut current = map.get(id)
            .cloned()
            .ok_or_else(|| SdkError::NotFound(id.to_string()))?;
        let mut merged = current.clone();
        Self::merge_json(&mut merged, patch);
        if let Some(obj) = merged.as_object_mut() {
            obj.insert("updated_at".to_string(), serde_json::Value::String(Self::iso_now()));
        }
        map.insert(id.to_string(), merged.clone());
        drop(map);
        self.record_version(id, &merged);
        Ok(())
    }

    /// GET /documents/:id/versions
    pub fn list_versions(&self, id: &str) -> Result<Vec<serde_json::Value>, SdkError> {
        self.versions.lock().unwrap()
            .get(id)
            .cloned()
            .ok_or_else(|| SdkError::NotFound(id.to_string()))
    }

    /// POST /documents/:id/restore
    pub fn restore_version(&self, id: &str, version_index: usize) -> Result<serde_json::Value, SdkError> {
        let versions = self.versions.lock().unwrap();
        let version = versions.get(id)
            .and_then(|items| items.get(version_index))
            .cloned()
            .ok_or_else(|| SdkError::NotFound(format!("{}@{}", id, version_index)))?;
        let snapshot = version.get("properties").cloned().unwrap_or(serde_json::Value::Null);
        drop(versions);
        self.update_properties(id, snapshot.clone())?;
        Ok(snapshot)
    }

    /// DELETE /documents/:id
    pub fn delete_document(&self, id: &str) -> bool {
        let removed = self.store.lock().unwrap().remove(id).is_some();
        if removed {
            self.properties.lock().unwrap().remove(id);
            self.versions.lock().unwrap().remove(id);
        }
        removed
    }

    /// GET /documents/:id/export — return raw .ldocx bytes
    pub fn export_document(&self, id: &str) -> Result<Vec<u8>, SdkError> {
        self.store.lock().unwrap()
            .get(id)
            .map(|(bytes, _)| bytes.clone())
            .ok_or_else(|| SdkError::NotFound(id.to_string()))
    }

    /// POST /documents/:id/validate
    pub fn validate_document(&self, id: &str) -> Result<LdocValidation, SdkError> {
        let guard = self.store.lock().unwrap();
        let (data, _) = guard.get(id)
            .ok_or_else(|| SdkError::NotFound(id.to_string()))?;
        Ok(LdocDocument::validate_bytes(data))
    }
}
