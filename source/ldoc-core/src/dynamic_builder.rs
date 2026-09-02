// Dynamic LDOC Document Builder
// Allows runtime creation of LDOC documents with flexible content, pages, and features

use uuid::Uuid;
use chrono::Utc;
use serde_json::json;
use crate::{
    LdocError, SPEC_MAJOR, SPEC_MINOR, SPEC_PATCH,
    header::LdocHeader,
    container::LdocZipWriter,
    manifest::{Manifest, FeaturesBlock},
    metadata::Metadata,
    security::{HashesFile, SignaturesFile, sha256_hex},
    assets::{AssetIndex, AssetEntry},
    pages::{PageIndex, PageEntry, PageContent, PageLayout, ContentNode},
    plugins::PluginIndex,
};

pub struct DynamicPage {
    pub id: String,
    pub title: String,
    pub number: u32,
    pub content: Vec<ContentBlock>,
}

pub enum ContentBlock {
    Heading { level: u8, text: String },
    Paragraph { text: String },
    List { items: Vec<String> },
    CodeBlock { code: String, language: String },
    Quote { text: String },
    Image { asset_id: String, alt_text: String },
    Audio { asset_id: String, label: String },
    Video { asset_id: String, label: String },
    Table { headers: Vec<String>, rows: Vec<Vec<String>> },
    Form { fields: Vec<FormField> },
    AiBlock { prompt: String },
    Custom { node_type: String, value: Option<String>, style: Option<serde_json::Value> },
}

pub struct FormField {
    pub field_type: String,
    pub label: String,
    pub placeholder: Option<String>,
}

pub struct DynamicDocumentBuilder {
    id: String,
    title: String,
    language: String,
    author: String,
    subtitle: Option<String>,
    description: Option<String>,
    pages: Vec<DynamicPage>,
    features: DynamicFeatures,
    assets: Vec<(String, Vec<u8>)>,
    now: String,
}

pub struct DynamicFeatures {
    pub has_scripts: bool,
    pub has_ai: bool,
    pub has_plugins: bool,
    pub has_encryption: bool,
    pub has_digital_signature: bool,
    pub has_annotations: bool,
    pub has_collaboration: bool,
    pub has_cloud_sync: bool,
    pub has_3d: bool,
    pub has_video: bool,
    pub has_audio: bool,
    pub has_forms: bool,
    pub has_version_history: bool,
    pub readonly: bool,
}

impl Default for DynamicFeatures {
    fn default() -> Self {
        Self {
            has_scripts: false,
            has_ai: false,
            has_plugins: false,
            has_encryption: false,
            has_digital_signature: false,
            has_annotations: false,
            has_collaboration: false,
            has_cloud_sync: false,
            has_3d: false,
            has_video: false,
            has_audio: false,
            has_forms: false,
            has_version_history: false,
            readonly: false,
        }
    }
}

impl DynamicDocumentBuilder {
    pub fn new(title: &str, language: &str, author: &str) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            title: title.to_string(),
            language: language.to_string(),
            author: author.to_string(),
            subtitle: None,
            description: None,
            pages: Vec::new(),
            features: DynamicFeatures::default(),
            assets: Vec::new(),
            now: Utc::now().to_rfc3339(),
        }
    }

    pub fn with_subtitle(mut self, subtitle: &str) -> Self {
        self.subtitle = Some(subtitle.to_string());
        self
    }

    pub fn with_description(mut self, description: &str) -> Self {
        self.description = Some(description.to_string());
        self
    }

    pub fn with_features(mut self, features: DynamicFeatures) -> Self {
        self.features = features;
        self
    }

    pub fn add_page(mut self, page: DynamicPage) -> Self {
        self.pages.push(page);
        self
    }

    pub fn add_asset(mut self, asset_id: String, data: Vec<u8>) -> Self {
        self.assets.push((asset_id, data));
        self
    }

    pub fn build(self) -> Result<Vec<u8>, LdocError> {
        if self.pages.is_empty() {
            return Err(LdocError::ManifestFieldInvalid(
                "pages".into(),
                "Document must have at least one page".into(),
            ));
        }

        let spec = crate::SPEC_VERSION;
        let id = &self.id;
        let now = &self.now;

        // ── manifest.json ─────────────────────────────────────────────────────
        let mut manifest = Manifest::new_document(
            id,
            &self.title,
            &self.language,
            self.pages.len() as u32,
            spec,
            now,
        );
        if let Some(subtitle) = &self.subtitle {
            manifest.document.subtitle = Some(subtitle.clone());
        }
        manifest.features = FeaturesBlock {
            has_scripts: self.features.has_scripts,
            has_ai: self.features.has_ai,
            has_plugins: self.features.has_plugins,
            has_encryption: self.features.has_encryption,
            has_digital_signature: self.features.has_digital_signature,
            has_annotations: self.features.has_annotations,
            has_collaboration: self.features.has_collaboration,
            has_cloud_sync: self.features.has_cloud_sync,
            has_3d: self.features.has_3d,
            has_video: self.features.has_video,
            has_audio: self.features.has_audio,
            has_forms: self.features.has_forms,
            has_version_history: self.features.has_version_history,
            readonly: self.features.readonly,
        };
        let manifest_bytes = manifest.to_bytes()?;

        // ── metadata/metadata.json ────────────────────────────────────────────
        let mut metadata = Metadata::new_document(id, &self.title, &self.language, spec, now, &self.author);
        if let Some(subtitle) = &self.subtitle {
            metadata.document.subtitle = Some(subtitle.clone());
        }
        if let Some(description) = &self.description {
            metadata.document.description = Some(description.clone());
        }
        let metadata_bytes = metadata.to_bytes()?;

        // ── pages/index.json ──────────────────────────────────────────────────
        let mut page_entries = Vec::new();
        for (idx, page) in self.pages.iter().enumerate() {
            page_entries.push(PageEntry {
                id: page.id.clone(),
                path: format!("pages/page_{:03}", idx + 1),
                title: Some(page.title.clone()),
                number: page.number,
                visible: true,
                page_type: "content".into(),
                parent_id: None,
                children: vec![],
            });
        }
        let page_index = PageIndex {
            schema_version: "1.0.0".into(),
            page_count: self.pages.len() as u32,
            pages: page_entries,
        };
        let page_index_bytes = page_index.to_bytes()?;

        // ── Build page content and layouts ────────────────────────────────────
        let mut page_content_bytes_map = Vec::new();
        let mut page_layout_bytes_map = Vec::new();

        for (idx, page) in self.pages.iter().enumerate() {
            let layout = PageLayout::a4_portrait(&page.id);
            let layout_bytes = layout.to_bytes()?;
            page_layout_bytes_map.push((format!("pages/page_{:03}/layout.json", idx + 1), layout_bytes));

            let root = self.build_content_tree(page)?;
            let content = PageContent {
                schema_version: "1.0.0".into(),
                page_id: page.id.clone(),
                root,
            };
            let content_bytes = content.to_bytes()?;
            page_content_bytes_map.push((format!("pages/page_{:03}/content.json", idx + 1), content_bytes));
        }

        // ── assets/index.json ─────────────────────────────────────────────────
        let mut asset_index = AssetIndex::new();
        for (asset_id, data) in &self.assets {
            let hash = sha256_hex(data);
            let filename = format!("{}.bin", &hash[..32]);
            let path = format!("assets/binary/{}", filename);
            asset_index.assets.push(AssetEntry {
                id: asset_id.clone(),
                asset_type: "binary".into(),
                subtype: "generic".into(),
                path: path.clone(),
                original_name: Some(format!("{}.bin", asset_id)),
                size_bytes: data.len() as u64,
                width: None,
                height: None,
                duration_ms: None,
                checksum: format!("sha256:{}", hash),
                mime_type: "application/octet-stream".into(),
                created_at: now.clone(),
                alt_text: None,
                license_ref: None,
                tags: vec![],
            });
        }
        let asset_index_bytes = asset_index.to_bytes()?;

        // ── plugins/index.json ────────────────────────────────────────────────
        let plugin_index = PluginIndex::new();
        let plugin_index_bytes = plugin_index.to_bytes()?;

        // ── ai/index.json (if AI is enabled) ───────────────────────────────────
        let ai_index_bytes = if self.features.has_ai {
            let ai_index = serde_json::json!({
                "schema_version": "1.0.0",
                "providers": [],
                "blocks": []
            });
            serde_json::to_vec_pretty(&ai_index).map_err(LdocError::Json)?
        } else {
            Vec::new()
        };

        // ── security/signatures.json ──────────────────────────────────────────
        let sigs = SignaturesFile::empty();
        let sigs_bytes = sigs.to_bytes()?;

        // ── security/hashes.json ──────────────────────────────────────────────
        let mut hashes = HashesFile::new(now);
        hashes.add("manifest.json", &manifest_bytes);
        hashes.add("metadata/metadata.json", &metadata_bytes);
        hashes.add("pages/index.json", &page_index_bytes);

        for (path, bytes) in &page_layout_bytes_map {
            hashes.add(path, bytes);
        }
        for (path, bytes) in &page_content_bytes_map {
            hashes.add(path, bytes);
        }

        hashes.add("assets/index.json", &asset_index_bytes);
        hashes.add("plugins/index.json", &plugin_index_bytes);
        if self.features.has_ai && !ai_index_bytes.is_empty() {
            hashes.add("ai/index.json", &ai_index_bytes);
        }
        hashes.add("security/signatures.json", &sigs_bytes);

        for (_asset_id, data) in &self.assets {
            let hash = sha256_hex(data);
            let filename = format!("{}.bin", &hash[..32]);
            let path = format!("assets/binary/{}", filename);
            hashes.add(&path, data);
        }

        let hashes_bytes = hashes.to_bytes()?;

        // ── Binary header ─────────────────────────────────────────────────────
        let feature_flags = manifest.features.to_feature_flags();
        let epoch = u32::try_from(Utc::now().timestamp()).unwrap_or(u32::MAX);
        let uuid_parsed = uuid::Uuid::parse_str(id)
            .map_err(|e| LdocError::ManifestFieldInvalid("id".into(), e.to_string()))?;
        let uuid_prefix: [u8; 16] = *uuid_parsed.as_bytes();
        let header = LdocHeader::new(SPEC_MAJOR, SPEC_MINOR, SPEC_PATCH, feature_flags, 0, epoch, uuid_prefix);
        let header_bytes = header.to_bytes();

        // ── Assemble ZIP ──────────────────────────────────────────────────────
        let mut writer = LdocZipWriter::new();
        writer.add_entry("manifest.json", &manifest_bytes)?;
        writer.add_entry("metadata/metadata.json", &metadata_bytes)?;
        writer.add_entry("pages/index.json", &page_index_bytes)?;

        for (path, bytes) in page_layout_bytes_map {
            writer.add_entry(&path, &bytes)?;
        }
        for (path, bytes) in page_content_bytes_map {
            writer.add_entry(&path, &bytes)?;
        }

        writer.add_entry("assets/index.json", &asset_index_bytes)?;
        writer.add_entry("plugins/index.json", &plugin_index_bytes)?;
        if self.features.has_ai && !ai_index_bytes.is_empty() {
            writer.add_entry("ai/index.json", &ai_index_bytes)?;
        }
        writer.add_entry("security/signatures.json", &sigs_bytes)?;
        writer.add_entry("security/hashes.json", &hashes_bytes)?;

        for (_asset_id, data) in &self.assets {
            let hash = sha256_hex(data);
            let filename = format!("{}.bin", &hash[..32]);
            let path = format!("assets/binary/{}", filename);
            writer.add_entry(&path, data)?;
        }

        writer.finish(&header_bytes)
    }

    fn build_content_tree(&self, page: &DynamicPage) -> Result<ContentNode, LdocError> {
        let mut root = ContentNode::container(&format!("{}-root", page.id));

        for (idx, block) in page.content.iter().enumerate() {
            let node_id = format!("{}-block-{}", page.id, idx);
            let node = self.build_content_node(&node_id, block)?;
            root.children.push(node);
        }

        Ok(root)
    }

    fn build_content_node(&self, id: &str, block: &ContentBlock) -> Result<ContentNode, LdocError> {
        match block {
            ContentBlock::Heading { level, text } => {
                Ok(ContentNode::heading(id, *level, text))
            }
            ContentBlock::Paragraph { text } => {
                Ok(ContentNode::paragraph(id, text))
            }
            ContentBlock::List { items } => {
                let mut list = ContentNode::container(id);
                list.node_type = "list".into();
                for (i, item) in items.iter().enumerate() {
                    let mut li = ContentNode::container(&format!("{}-item-{}", id, i));
                    li.node_type = "list_item".into();
                    li.children.push(ContentNode::paragraph(&format!("{}-item-{}-p", id, i), item));
                    list.children.push(li);
                }
                Ok(list)
            }
            ContentBlock::CodeBlock { code, language } => {
                let mut node = ContentNode::container(id);
                node.node_type = "code_block".into();
                node.value = Some(code.clone());
                node.style = Some(json!({ "language": language }));
                Ok(node)
            }
            ContentBlock::Quote { text } => {
                let mut node = ContentNode::container(id);
                node.node_type = "quote".into();
                node.children.push(ContentNode::paragraph(&format!("{}-text", id), text));
                Ok(node)
            }
            ContentBlock::Image { asset_id, alt_text } => {
                let mut node = ContentNode::container(id);
                node.node_type = "image".into();
                node.asset_id = Some(asset_id.clone());
                node.aria = Some(json!({ "alt": alt_text }));
                Ok(node)
            }
            ContentBlock::Audio { asset_id, label } => {
                let mut node = ContentNode::container(id);
                node.node_type = "audio".into();
                node.asset_id = Some(asset_id.clone());
                node.aria = Some(json!({ "label": label }));
                Ok(node)
            }
            ContentBlock::Video { asset_id, label } => {
                let mut node = ContentNode::container(id);
                node.node_type = "video".into();
                node.asset_id = Some(asset_id.clone());
                node.aria = Some(json!({ "label": label }));
                Ok(node)
            }
            ContentBlock::Table { headers, rows } => {
                let mut table = ContentNode::container(id);
                table.node_type = "table".into();

                let mut hrow = ContentNode::container(&format!("{}-header", id));
                hrow.node_type = "table_row".into();
                for (i, h) in headers.iter().enumerate() {
                    let mut cell = ContentNode::container(&format!("{}-hcell-{}", id, i));
                    cell.node_type = "table_cell".into();
                    cell.children.push(ContentNode::paragraph(&format!("{}-hcell-{}-p", id, i), h));
                    hrow.children.push(cell);
                }
                table.children.push(hrow);

                for (r, row) in rows.iter().enumerate() {
                    let mut tr = ContentNode::container(&format!("{}-row-{}", id, r));
                    tr.node_type = "table_row".into();
                    for (c, val) in row.iter().enumerate() {
                        let mut cell = ContentNode::container(&format!("{}-cell-{}-{}", id, r, c));
                        cell.node_type = "table_cell".into();
                        cell.children.push(ContentNode::paragraph(&format!("{}-cell-{}-{}-p", id, r, c), val));
                        tr.children.push(cell);
                    }
                    table.children.push(tr);
                }
                Ok(table)
            }
            ContentBlock::Form { fields } => {
                let mut form = ContentNode::container(id);
                form.node_type = "form".into();
                for (i, field) in fields.iter().enumerate() {
                    let mut input = ContentNode::container(&format!("{}-field-{}", id, i));
                    input.node_type = field.field_type.clone();
                    let mut aria = json!({ "label": &field.label });
                    if let Some(placeholder) = &field.placeholder {
                        aria["placeholder"] = json!(placeholder);
                    }
                    input.value = Some(field.label.clone());
                    input.aria = Some(aria);
                    form.children.push(input);
                }
                Ok(form)
            }
            ContentBlock::AiBlock { prompt } => {
                let mut node = ContentNode::container(id);
                node.node_type = "ai_block".into();
                node.value = Some(prompt.clone());
                node.style = Some(json!({ "model": "default", "mode": "prompt" }));
                Ok(node)
            }
            ContentBlock::Custom { node_type, value, style } => {
                let mut node = ContentNode::container(id);
                node.node_type = node_type.clone();
                if let Some(v) = value {
                    node.value = Some(v.clone());
                }
                if let Some(s) = style {
                    node.style = Some(s.clone());
                }
                Ok(node)
            }
        }
    }
}

impl DynamicPage {
    pub fn new(title: &str, number: u32) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            title: title.to_string(),
            number,
            content: Vec::new(),
        }
    }

    pub fn add_content(mut self, block: ContentBlock) -> Self {
        self.content.push(block);
        self
    }
}
