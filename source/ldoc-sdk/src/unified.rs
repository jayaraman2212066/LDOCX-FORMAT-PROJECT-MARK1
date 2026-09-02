use std::collections::HashMap;
use std::sync::Arc;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum FileFormat {
    Svg,
    Obj,
    Stl,
    Pdf,
    Docx,
    Pptx,
    Glb,
    Usd,
    Generic,
}

// ── Mesh Data Structures ──────────────────────────────────────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Vertex {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Normal {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TextureCoord {
    pub u: f32,
    pub v: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Face {
    pub vertices: Vec<usize>,      // indices into vertex array
    pub normals: Option<Vec<usize>>,   // indices into normal array
    pub textures: Option<Vec<usize>>,  // indices into texture coord array
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Mesh {
    pub vertices: Vec<Vertex>,
    pub normals: Vec<Normal>,
    pub textures: Vec<TextureCoord>,
    pub faces: Vec<Face>,
    pub name: String,
}

impl Mesh {
    pub fn vertex_count(&self) -> usize { self.vertices.len() }
    pub fn face_count(&self) -> usize { self.faces.len() }
    pub fn has_normals(&self) -> bool { !self.normals.is_empty() }
    pub fn has_textures(&self) -> bool { !self.textures.is_empty() }
}

// ── SVG Data Structures ───────────────────────────────────────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SvgDocument {
    pub content: String,  // Full SVG XML as string
    pub width: Option<String>,
    pub height: Option<String>,
    pub viewbox: Option<String>,
}

// ── STL Data Structures ───────────────────────────────────────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct StlSolid {
    pub mesh: Mesh,
    pub is_binary: bool,
}

// ── Format State Union ────────────────────────────────────────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum FormatState {
    Mesh(Mesh),
    Svg(SvgDocument),
    Stl(StlSolid),
    Raw(Vec<u8>),
    Json(serde_json::Value),
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ShellAction {
    New,
    Open,
    Save,
    SaveAs,
    Duplicate,
    Delete,
    Export,
    VersionHistory,
    Undo,
    Redo,
    Autosave,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ShellState {
    pub actions: Vec<ShellAction>,
}

impl ShellState {
    pub fn new(actions: Vec<ShellAction>) -> Self {
        Self { actions }
    }
}

impl Default for ShellAction {
    fn default() -> Self { Self::New }
}

impl Default for ShellState {
    fn default() -> Self {
        Self::new(vec![
            ShellAction::New,
            ShellAction::Open,
            ShellAction::Save,
            ShellAction::SaveAs,
            ShellAction::Duplicate,
            ShellAction::Delete,
            ShellAction::Export,
            ShellAction::VersionHistory,
            ShellAction::Undo,
            ShellAction::Redo,
            ShellAction::Autosave,
        ])
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FormatField {
    pub name: String,
    pub value: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FormatProperties {
    pub kind: FileFormat,
    pub fields: Vec<FormatField>,
    pub capabilities: Vec<String>,
    pub template_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MetadataSchema;

impl MetadataSchema {
    pub fn base_schema() -> Vec<String> {
        vec![
            "name".to_string(),
            "type".to_string(),
            "created_at".to_string(),
            "updated_at".to_string(),
            "size".to_string(),
            "author".to_string(),
            "tags".to_string(),
            "version".to_string(),
        ]
    }
}

pub trait DocumentFormatAdapter: Send + Sync {
    fn kind(&self) -> FileFormat;
    fn get_properties(&self) -> FormatProperties;
    fn create_new(&self) -> Result<serde_json::Value, String>;
    fn parse(&self, bytes: &[u8]) -> Result<FormatState, String>;
    fn render(&self, bytes: &[u8]) -> Result<serde_json::Value, String>;
    fn edit(&self, bytes: &[u8], patch: &serde_json::Value) -> Result<Vec<u8>, String>;
    fn serialize(&self, state: &serde_json::Value) -> Result<Vec<u8>, String>;
    fn format_state_to_bytes(&self, state: &FormatState) -> Result<Vec<u8>, String>;
    fn shell_actions(&self) -> Vec<ShellAction> {
        ShellState::default().actions
    }
}

pub struct DocumentFormatRegistry {
    adapters: HashMap<String, Arc<dyn DocumentFormatAdapter>>,
}

impl DocumentFormatRegistry {
    pub fn new() -> Self {
        Self {
            adapters: HashMap::new(),
        }
    }

    pub fn register<T: DocumentFormatAdapter + 'static>(&mut self, name: &str, adapter: T) {
        self.adapters.insert(name.to_string(), Arc::new(adapter));
    }

    pub fn register_arc(&mut self, name: &str, adapter: Arc<dyn DocumentFormatAdapter>) {
        self.adapters.insert(name.to_string(), adapter);
    }

    pub fn has(&self, name: &str) -> bool {
        self.adapters.contains_key(name)
    }

    pub fn get(&self, name: &str) -> Option<Arc<dyn DocumentFormatAdapter>> {
        self.adapters.get(name).cloned()
    }

    pub fn list_formats(&self) -> Vec<String> {
        let mut keys: Vec<String> = self.adapters.keys().cloned().collect();
        keys.sort();
        keys
    }

    pub fn register_default_phase1(&mut self) {
        self.register("svg", SvgAdapter::new());
        self.register("obj", ObjAdapter::new());
        self.register("stl", StlAdapter::new());
        self.register("pdf", PdfAdapter::new());
        self.register("docx", DocxAdapter::new());
    }
}

impl Default for DocumentFormatRegistry {
    fn default() -> Self {
        let mut registry = Self::new();
        registry.register_default_phase1();
        registry
    }
}

#[derive(Clone, Debug, Default)]
pub struct SvgAdapter;
#[derive(Clone, Debug, Default)]
pub struct ObjAdapter;
#[derive(Clone, Debug, Default)]
pub struct StlAdapter;
#[derive(Clone, Debug, Default)]
pub struct PdfAdapter;
#[derive(Clone, Debug, Default)]
pub struct DocxAdapter;

macro_rules! adapter_props {
    ($kind:expr, $template:expr, $fields:expr, $caps:expr) => {
        FormatProperties {
            kind: $kind,
            fields: $fields,
            capabilities: $caps,
            template_name: $template.to_string(),
        }
    };
}

impl SvgAdapter {
    pub fn new() -> Self { Self }
}

impl DocumentFormatAdapter for SvgAdapter {
    fn kind(&self) -> FileFormat { FileFormat::Svg }
    fn get_properties(&self) -> FormatProperties {
        adapter_props!(
            FileFormat::Svg,
            "blank-canvas",
            vec![
                FormatField { name: "node_count".into(), value: "0".into() },
                FormatField { name: "animation_duration".into(), value: "0s".into() },
                FormatField { name: "has_script".into(), value: "false".into() },
            ],
            vec!["viewer".into(), "editor".into(), "creator".into(), "crud".into()]
        )
    }
    fn create_new(&self) -> Result<serde_json::Value, String> {
        // Create a minimal SVG template
        let svg_content = r#"<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="white"/>
  <circle cx="400" cy="300" r="50" fill="blue"/>
</svg>"#;
        Ok(serde_json::json!({
            "template": "blank-canvas",
            "kind": "svg",
            "content": svg_content
        }))
    }
    fn parse(&self, bytes: &[u8]) -> Result<FormatState, String> {
        let content = String::from_utf8(bytes.to_vec())
            .map_err(|e| format!("Invalid UTF-8 in SVG: {}", e))?;
        
        // Extract width, height, viewBox from SVG root element
        let width = extract_svg_attr(&content, "width");
        let height = extract_svg_attr(&content, "height");
        let viewbox = extract_svg_attr(&content, "viewBox");
        
        Ok(FormatState::Svg(SvgDocument {
            content,
            width,
            height,
            viewbox,
        }))
    }
    fn render(&self, bytes: &[u8]) -> Result<serde_json::Value, String> {
        let content = String::from_utf8(bytes.to_vec())
            .map_err(|e| format!("Invalid SVG UTF-8: {}", e))?;
        Ok(serde_json::json!({
            "render": "svg-preview",
            "status": "ok",
            "content": content
        }))
    }
    fn edit(&self, _bytes: &[u8], patch: &serde_json::Value) -> Result<Vec<u8>, String> {
        Ok(serde_json::to_vec(patch).map_err(|e| e.to_string())?)
    }
    fn serialize(&self, state: &serde_json::Value) -> Result<Vec<u8>, String> {
        Ok(serde_json::to_vec(state).map_err(|e| e.to_string())?)
    }
    fn format_state_to_bytes(&self, state: &FormatState) -> Result<Vec<u8>, String> {
        match state {
            FormatState::Svg(doc) => Ok(doc.content.as_bytes().to_vec()),
            _ => Err("Expected SvgDocument state".to_string()),
        }
    }
}

impl ObjAdapter {
    pub fn new() -> Self { Self }
}

impl DocumentFormatAdapter for ObjAdapter {
    fn kind(&self) -> FileFormat { FileFormat::Obj }
    fn get_properties(&self) -> FormatProperties {
        adapter_props!(
            FileFormat::Obj,
            "primitive-cube",
            vec![
                FormatField { name: "vertex_count".into(), value: "0".into() },
                FormatField { name: "face_count".into(), value: "0".into() },
                FormatField { name: "has_uvs".into(), value: "false".into() },
            ],
            vec!["viewer".into(), "editor".into(), "creator".into(), "crud".into()]
        )
    }
    fn create_new(&self) -> Result<serde_json::Value, String> {
        // Create a primitive cube
        let cube_mesh = create_cube_mesh();
        Ok(serde_json::json!({
            "template": "primitive-cube",
            "kind": "obj",
            "mesh": serde_json::to_value(&cube_mesh).unwrap()
        }))
    }
    fn parse(&self, bytes: &[u8]) -> Result<FormatState, String> {
        let content = String::from_utf8(bytes.to_vec())
            .map_err(|e| format!("Invalid UTF-8 in OBJ: {}", e))?;
        
        let mesh = parse_obj(&content)?;
        Ok(FormatState::Mesh(mesh))
    }
    fn render(&self, bytes: &[u8]) -> Result<serde_json::Value, String> {
        let mesh = match self.parse(bytes) {
            Ok(FormatState::Mesh(m)) => m,
            _ => return Err("Failed to parse OBJ".to_string()),
        };
        Ok(serde_json::json!({
            "render": "obj-mesh",
            "status": "ok",
            "vertex_count": mesh.vertex_count(),
            "face_count": mesh.face_count(),
            "has_normals": mesh.has_normals(),
            "has_textures": mesh.has_textures(),
        }))
    }
    fn edit(&self, _bytes: &[u8], patch: &serde_json::Value) -> Result<Vec<u8>, String> {
        Ok(serde_json::to_vec(patch).map_err(|e| e.to_string())?)
    }
    fn serialize(&self, state: &serde_json::Value) -> Result<Vec<u8>, String> {
        Ok(serde_json::to_vec(state).map_err(|e| e.to_string())?)
    }
    fn format_state_to_bytes(&self, state: &FormatState) -> Result<Vec<u8>, String> {
        match state {
            FormatState::Mesh(mesh) => serialize_obj(mesh),
            _ => Err("Expected Mesh state".to_string()),
        }
    }
}

impl StlAdapter {
    pub fn new() -> Self { Self }
}

impl DocumentFormatAdapter for StlAdapter {
    fn kind(&self) -> FileFormat { FileFormat::Stl }
    fn get_properties(&self) -> FormatProperties {
        adapter_props!(
            FileFormat::Stl,
            "primitive-solid",
            vec![
                FormatField { name: "triangle_count".into(), value: "0".into() },
                FormatField { name: "manifold_status".into(), value: "unknown".into() },
                FormatField { name: "bounding_box".into(), value: "0,0,0".into() },
            ],
            vec!["viewer".into(), "editor".into(), "creator".into(), "crud".into()]
        )
    }
    fn create_new(&self) -> Result<serde_json::Value, String> {
        // Create a primitive sphere as STL
        let sphere_mesh = create_cube_mesh();  // Use cube as placeholder for now
        Ok(serde_json::json!({
            "template": "primitive-solid",
            "kind": "stl",
            "mesh": serde_json::to_value(&sphere_mesh).unwrap()
        }))
    }
    fn parse(&self, bytes: &[u8]) -> Result<FormatState, String> {
        // Try to parse as binary STL first, then ASCII
        match parse_stl_binary(bytes) {
            Ok(mesh) => {
                return Ok(FormatState::Stl(StlSolid {
                    mesh,
                    is_binary: true,
                }))
            }
            Err(_) => {
                // Try ASCII
                let content = String::from_utf8(bytes.to_vec())
                    .map_err(|e| format!("Invalid UTF-8 in STL: {}", e))?;
                let mesh = parse_stl_ascii(&content)?;
                return Ok(FormatState::Stl(StlSolid {
                    mesh,
                    is_binary: false,
                }));
            }
        }
    }
    fn render(&self, bytes: &[u8]) -> Result<serde_json::Value, String> {
        let stl = match self.parse(bytes) {
            Ok(FormatState::Stl(s)) => s,
            _ => return Err("Failed to parse STL".to_string()),
        };
        Ok(serde_json::json!({
            "render": "stl-solid",
            "status": "ok",
            "triangle_count": stl.mesh.face_count(),
            "vertex_count": stl.mesh.vertex_count(),
            "is_binary": stl.is_binary,
        }))
    }
    fn edit(&self, _bytes: &[u8], patch: &serde_json::Value) -> Result<Vec<u8>, String> {
        Ok(serde_json::to_vec(patch).map_err(|e| e.to_string())?)
    }
    fn serialize(&self, state: &serde_json::Value) -> Result<Vec<u8>, String> {
        Ok(serde_json::to_vec(state).map_err(|e| e.to_string())?)
    }
    fn format_state_to_bytes(&self, state: &FormatState) -> Result<Vec<u8>, String> {
        match state {
            FormatState::Stl(stl) => serialize_stl_binary(&stl.mesh),
            _ => Err("Expected Stl state".to_string()),
        }
    }
}

impl PdfAdapter {
    pub fn new() -> Self { Self }
}

impl DocumentFormatAdapter for PdfAdapter {
    fn kind(&self) -> FileFormat { FileFormat::Pdf }
    fn get_properties(&self) -> FormatProperties {
        adapter_props!(
            FileFormat::Pdf,
            "blank-page",
            vec![
                FormatField { name: "page_count".into(), value: "0".into() },
                FormatField { name: "form_field_count".into(), value: "0".into() },
                FormatField { name: "embedded_3d".into(), value: "false".into() },
            ],
            vec!["viewer".into(), "editor".into(), "creator".into(), "crud".into()]
        )
    }
    fn create_new(&self) -> Result<serde_json::Value, String> {
        Ok(serde_json::json!({ "template": "blank-page", "kind": "pdf" }))
    }
    fn parse(&self, bytes: &[u8]) -> Result<FormatState, String> {
        Ok(FormatState::Raw(bytes.to_vec()))
    }
    fn render(&self, _bytes: &[u8]) -> Result<serde_json::Value, String> {
        Ok(serde_json::json!({ "render": "pdf-page", "status": "ok" }))
    }
    fn edit(&self, _bytes: &[u8], patch: &serde_json::Value) -> Result<Vec<u8>, String> {
        Ok(serde_json::to_vec(patch).map_err(|e| e.to_string())?)
    }
    fn serialize(&self, state: &serde_json::Value) -> Result<Vec<u8>, String> {
        Ok(serde_json::to_vec(state).map_err(|e| e.to_string())?)
    }
    fn format_state_to_bytes(&self, state: &FormatState) -> Result<Vec<u8>, String> {
        match state {
            FormatState::Raw(bytes) => Ok(bytes.clone()),
            _ => Err("Expected Raw state".to_string()),
        }
    }
}

impl DocxAdapter {
    pub fn new() -> Self { Self }
}

impl DocumentFormatAdapter for DocxAdapter {
    fn kind(&self) -> FileFormat { FileFormat::Docx }
    fn get_properties(&self) -> FormatProperties {
        adapter_props!(
            FileFormat::Docx,
            "blank-letterhead",
            vec![
                FormatField { name: "word_count".into(), value: "0".into() },
                FormatField { name: "embedded_object_count".into(), value: "0".into() },
                FormatField { name: "track_changes".into(), value: "off".into() },
            ],
            vec!["viewer".into(), "editor".into(), "creator".into(), "crud".into()]
        )
    }
    fn create_new(&self) -> Result<serde_json::Value, String> {
        Ok(serde_json::json!({ "template": "blank-letterhead", "kind": "docx" }))
    }
    fn parse(&self, bytes: &[u8]) -> Result<FormatState, String> {
        Ok(FormatState::Raw(bytes.to_vec()))
    }
    fn render(&self, _bytes: &[u8]) -> Result<serde_json::Value, String> {
        Ok(serde_json::json!({ "render": "docx-page", "status": "ok" }))
    }
    fn edit(&self, _bytes: &[u8], patch: &serde_json::Value) -> Result<Vec<u8>, String> {
        Ok(serde_json::to_vec(patch).map_err(|e| e.to_string())?)
    }
    fn serialize(&self, state: &serde_json::Value) -> Result<Vec<u8>, String> {
        Ok(serde_json::to_vec(state).map_err(|e| e.to_string())?)
    }
    fn format_state_to_bytes(&self, state: &FormatState) -> Result<Vec<u8>, String> {
        match state {
            FormatState::Raw(bytes) => Ok(bytes.clone()),
            _ => Err("Expected Raw state".to_string()),
        }
    }
}

// ── Parser Helper Functions ───────────────────────────────────────────────────

/// Extract an attribute value from an SVG element tag
fn extract_svg_attr(content: &str, attr_name: &str) -> Option<String> {
    if let Some(pos) = content.find(&format!(r#"{}="#, attr_name)) {
        let start = pos + attr_name.len() + 2;
        if let Some(end) = content[start..].find('"') {
            return Some(content[start..start + end].to_string());
        }
    }
    None
}

/// Create a unit cube mesh
pub fn create_cube_mesh() -> Mesh {
    #[rustfmt::skip]
    let vertices = vec![
        Vertex { x: -1.0, y: -1.0, z: 1.0 },
        Vertex { x: 1.0, y: -1.0, z: 1.0 },
        Vertex { x: 1.0, y: 1.0, z: 1.0 },
        Vertex { x: -1.0, y: 1.0, z: 1.0 },
        Vertex { x: -1.0, y: -1.0, z: -1.0 },
        Vertex { x: -1.0, y: 1.0, z: -1.0 },
        Vertex { x: 1.0, y: 1.0, z: -1.0 },
        Vertex { x: 1.0, y: -1.0, z: -1.0 },
    ];

    #[rustfmt::skip]
    let faces = vec![
        Face { vertices: vec![0, 1, 2], normals: None, textures: None },
        Face { vertices: vec![0, 2, 3], normals: None, textures: None },
        Face { vertices: vec![4, 5, 6], normals: None, textures: None },
        Face { vertices: vec![4, 6, 7], normals: None, textures: None },
        Face { vertices: vec![0, 3, 5], normals: None, textures: None },
        Face { vertices: vec![0, 5, 4], normals: None, textures: None },
        Face { vertices: vec![1, 7, 6], normals: None, textures: None },
        Face { vertices: vec![1, 6, 2], normals: None, textures: None },
        Face { vertices: vec![3, 2, 6], normals: None, textures: None },
        Face { vertices: vec![3, 6, 5], normals: None, textures: None },
        Face { vertices: vec![0, 4, 7], normals: None, textures: None },
        Face { vertices: vec![0, 7, 1], normals: None, textures: None },
    ];

    Mesh {
        vertices,
        normals: vec![],
        textures: vec![],
        faces,
        name: "cube".to_string(),
    }
}

/// Parse OBJ format
pub fn parse_obj(content: &str) -> Result<Mesh, String> {
    let mut vertices = Vec::new();
    let mut normals = Vec::new();
    let mut textures = Vec::new();
    let mut faces = Vec::new();

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }

        match parts[0] {
            "v" if parts.len() >= 4 => {
                let x = parts[1].parse::<f32>().unwrap_or(0.0);
                let y = parts[2].parse::<f32>().unwrap_or(0.0);
                let z = parts[3].parse::<f32>().unwrap_or(0.0);
                vertices.push(Vertex { x, y, z });
            }
            "vn" if parts.len() >= 4 => {
                let x = parts[1].parse::<f32>().unwrap_or(0.0);
                let y = parts[2].parse::<f32>().unwrap_or(0.0);
                let z = parts[3].parse::<f32>().unwrap_or(0.0);
                normals.push(Normal { x, y, z });
            }
            "vt" if parts.len() >= 3 => {
                let u = parts[1].parse::<f32>().unwrap_or(0.0);
                let v = parts[2].parse::<f32>().unwrap_or(0.0);
                textures.push(TextureCoord { u, v });
            }
            "f" if parts.len() >= 4 => {
                let mut face_vertices = Vec::new();
                let mut face_normals: Vec<usize> = Vec::new();
                let mut face_textures: Vec<usize> = Vec::new();

                for i in 1..parts.len() {
                    let indices: Vec<&str> = parts[i].split('/').collect();
                    if let Ok(v_idx) = indices[0].parse::<usize>() {
                        if v_idx > 0 && v_idx <= vertices.len() {
                            face_vertices.push(v_idx - 1);
                        }
                    }
                }

                if !face_vertices.is_empty() {
                    faces.push(Face {
                        vertices: face_vertices,
                        normals: None,
                        textures: None,
                    });
                }
            }
            _ => {}
        }
    }

    if vertices.is_empty() {
        return Err("No vertices found in OBJ".to_string());
    }

    Ok(Mesh {
        vertices,
        normals,
        textures,
        faces,
        name: "imported_obj".to_string(),
    })
}

/// Serialize mesh to OBJ format
pub fn serialize_obj(mesh: &Mesh) -> Result<Vec<u8>, String> {
    let mut output = String::new();
    output.push_str("# Generated OBJ\n");

    for v in &mesh.vertices {
        output.push_str(&format!("v {} {} {}\n", v.x, v.y, v.z));
    }

    output.push_str("\n");
    for face in &mesh.faces {
        output.push_str("f");
        for v_idx in &face.vertices {
            output.push(' ');
            output.push_str(&(v_idx + 1).to_string());
        }
        output.push('\n');
    }

    Ok(output.into_bytes())
}

/// Parse binary STL format
pub fn parse_stl_binary(bytes: &[u8]) -> Result<Mesh, String> {
    if bytes.len() < 84 {
        return Err("STL file too small".to_string());
    }

    let tri_count = u32::from_le_bytes([bytes[80], bytes[81], bytes[82], bytes[83]]) as usize;
    let expected_len = 84 + tri_count * 50;
    if bytes.len() < expected_len {
        return Err("STL file truncated".to_string());
    }

    let mut vertices = Vec::new();
    let mut faces = Vec::new();
    let mut offset = 84;

    for _ in 0..tri_count {
        if offset + 50 > bytes.len() {
            break;
        }

        offset += 12;

        let v1 = read_f32_le(&bytes[offset..offset + 4]);
        let v2 = read_f32_le(&bytes[offset + 4..offset + 8]);
        let v3 = read_f32_le(&bytes[offset + 8..offset + 12]);
        offset += 12;

        let v4 = read_f32_le(&bytes[offset..offset + 4]);
        let v5 = read_f32_le(&bytes[offset + 4..offset + 8]);
        let v6 = read_f32_le(&bytes[offset + 8..offset + 12]);
        offset += 12;

        let v7 = read_f32_le(&bytes[offset..offset + 4]);
        let v8 = read_f32_le(&bytes[offset + 4..offset + 8]);
        let v9 = read_f32_le(&bytes[offset + 8..offset + 12]);
        offset += 12;

        offset += 2;

        let idx1 = vertices.len();
        vertices.push(Vertex { x: v1, y: v2, z: v3 });
        let idx2 = vertices.len();
        vertices.push(Vertex { x: v4, y: v5, z: v6 });
        let idx3 = vertices.len();
        vertices.push(Vertex { x: v7, y: v8, z: v9 });

        faces.push(Face {
            vertices: vec![idx1, idx2, idx3],
            normals: None,
            textures: None,
        });
    }

    Ok(Mesh {
        vertices,
        normals: vec![],
        textures: vec![],
        faces,
        name: "imported_stl".to_string(),
    })
}

/// Parse ASCII STL format
pub fn parse_stl_ascii(content: &str) -> Result<Mesh, String> {
    let mut vertices = Vec::new();
    let mut faces = Vec::new();
    let mut current_tri = Vec::new();

    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("vertex") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 4 {
                let x = parts[1].parse::<f32>().unwrap_or(0.0);
                let y = parts[2].parse::<f32>().unwrap_or(0.0);
                let z = parts[3].parse::<f32>().unwrap_or(0.0);
                current_tri.push(vertices.len());
                vertices.push(Vertex { x, y, z });
            }
        } else if line.starts_with("endfacet") {
            if current_tri.len() == 3 {
                faces.push(Face {
                    vertices: current_tri.clone(),
                    normals: None,
                    textures: None,
                });
            }
            current_tri.clear();
        }
    }

    Ok(Mesh {
        vertices,
        normals: vec![],
        textures: vec![],
        faces,
        name: "imported_stl".to_string(),
    })
}

/// Serialize mesh to binary STL format
pub fn serialize_stl_binary(mesh: &Mesh) -> Result<Vec<u8>, String> {
    let mut output = Vec::new();

    let header = b"LDOC Generated STL File                                                        ";
    output.extend_from_slice(header);
    output.extend_from_slice(&(mesh.faces.len() as u32).to_le_bytes());

    for face in &mesh.faces {
        if face.vertices.len() >= 3 {
            let v1 = &mesh.vertices[face.vertices[0]];
            let v2 = &mesh.vertices[face.vertices[1]];
            let v3 = &mesh.vertices[face.vertices[2]];

            let nx = (v2.y - v1.y) * (v3.z - v1.z) - (v2.z - v1.z) * (v3.y - v1.y);
            let ny = (v2.z - v1.z) * (v3.x - v1.x) - (v2.x - v1.x) * (v3.z - v1.z);
            let nz = (v2.x - v1.x) * (v3.y - v1.y) - (v2.y - v1.y) * (v3.x - v1.x);

            output.extend_from_slice(&nx.to_le_bytes());
            output.extend_from_slice(&ny.to_le_bytes());
            output.extend_from_slice(&nz.to_le_bytes());

            output.extend_from_slice(&v1.x.to_le_bytes());
            output.extend_from_slice(&v1.y.to_le_bytes());
            output.extend_from_slice(&v1.z.to_le_bytes());

            output.extend_from_slice(&v2.x.to_le_bytes());
            output.extend_from_slice(&v2.y.to_le_bytes());
            output.extend_from_slice(&v2.z.to_le_bytes());

            output.extend_from_slice(&v3.x.to_le_bytes());
            output.extend_from_slice(&v3.y.to_le_bytes());
            output.extend_from_slice(&v3.z.to_le_bytes());

            output.extend_from_slice(&[0u8, 0u8]);
        }
    }

    Ok(output)
}

/// Read a 32-bit float in little-endian byte order
fn read_f32_le(bytes: &[u8]) -> f32 {
    if bytes.len() < 4 {
        return 0.0;
    }
    f32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]])
}
