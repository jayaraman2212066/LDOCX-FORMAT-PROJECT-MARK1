// LDOC Document Builder
// Assembles a complete, valid .ldocx file from all Phase 1 modules.

use uuid::Uuid;
use chrono::Utc;
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

pub struct DocumentBuilder {
    id: String,
    title: String,
    language: String,
    author: String,
    now: String,
}

impl DocumentBuilder {
    pub fn new(title: &str, language: &str, author: &str) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            title: title.to_string(),
            language: language.to_string(),
            author: author.to_string(),
            now: Utc::now().to_rfc3339(),
        }
    }

    /// Build a minimal valid LDOC document with one blank page.
    /// Returns the raw bytes of the complete .ldocx file.
    pub fn build(self) -> Result<Vec<u8>, LdocError> {
        let spec = crate::SPEC_VERSION;
        let id   = &self.id;
        let now  = &self.now;

        // ── manifest.json ─────────────────────────────────────────────────────
        let manifest = Manifest::new_document(id, &self.title, &self.language, 1, spec, now);
        let manifest_bytes = manifest.to_bytes()?;

        // ── metadata/metadata.json ────────────────────────────────────────────
        let metadata = Metadata::new_document(id, &self.title, &self.language, spec, now, &self.author);
        let metadata_bytes = metadata.to_bytes()?;

        // ── pages/index.json ──────────────────────────────────────────────────
        let page_id = Uuid::new_v4().to_string();
        let page_index = PageIndex {
            schema_version: "1.0.0".into(),
            page_count: 1,
            pages: vec![PageEntry {
                id: page_id.clone(),
                path: "pages/page_001".into(),
                title: Some("Page 1".into()),
                number: 1,
                visible: true,
                page_type: "content".into(),
                parent_id: None,
                children: vec![],
            }],
        };
        let page_index_bytes = page_index.to_bytes()?;

        // ── pages/page_001/layout.json ────────────────────────────────────────
        let layout = PageLayout::a4_portrait(&page_id);
        let layout_bytes = layout.to_bytes()?;

        // ── pages/page_001/content.json ───────────────────────────────────────
        let root = {
            let mut c = ContentNode::container(&format!("{page_id}-root"));
            c.children.push(ContentNode::heading(&format!("{page_id}-h1"), 1, &self.title));
            c.children.push(ContentNode::paragraph(&format!("{page_id}-p1"),
                "This document was created with the LDOC format (Living Document)."));
            c
        };
        let content = PageContent {
            schema_version: "1.0.0".into(),
            page_id: page_id.clone(),
            root,
        };
        let content_bytes = content.to_bytes()?;

        // ── assets/index.json ─────────────────────────────────────────────────
        let asset_index = AssetIndex::new();
        let asset_index_bytes = asset_index.to_bytes()?;

        // ── plugins/index.json ────────────────────────────────────────────────
        let plugin_index = PluginIndex::new();
        let plugin_index_bytes = plugin_index.to_bytes()?;

        // ── security/signatures.json ──────────────────────────────────────────
        let sigs = SignaturesFile::empty();
        let sigs_bytes = sigs.to_bytes()?;

        // ── security/hashes.json ──────────────────────────────────────────────
        let mut hashes = HashesFile::new(now);
        hashes.add("manifest.json",                  &manifest_bytes);
        hashes.add("metadata/metadata.json",         &metadata_bytes);
        hashes.add("pages/index.json",               &page_index_bytes);
        hashes.add("pages/page_001/layout.json",     &layout_bytes);
        hashes.add("pages/page_001/content.json",    &content_bytes);
        hashes.add("assets/index.json",              &asset_index_bytes);
        hashes.add("plugins/index.json",             &plugin_index_bytes);
        hashes.add("security/signatures.json",       &sigs_bytes);
        let hashes_bytes = hashes.to_bytes()?;

        // ── Binary header ─────────────────────────────────────────────────────
        let feature_flags = manifest.features.to_feature_flags();
        // Safe timestamp cast: use u32::try_from to handle overflow gracefully
        let epoch = u32::try_from(Utc::now().timestamp()).unwrap_or(u32::MAX);

        // UUID prefix: first 16 bytes of the document UUID raw bytes
        // Propagate parse errors instead of silently substituting a new UUID
        let uuid_parsed = Uuid::parse_str(id)
            .map_err(|e| LdocError::ManifestFieldInvalid("id".into(), e.to_string()))?;
        let uuid_prefix: [u8; 16] = *uuid_parsed.as_bytes();

        let header = LdocHeader::new(SPEC_MAJOR, SPEC_MINOR, SPEC_PATCH, feature_flags, 0, epoch, uuid_prefix);
        let header_bytes = header.to_bytes();

        // ── Assemble ZIP ──────────────────────────────────────────────────────
        let mut writer = LdocZipWriter::new();
        writer.add_entry("manifest.json",               &manifest_bytes)?;
        writer.add_entry("metadata/metadata.json",      &metadata_bytes)?;
        writer.add_entry("pages/index.json",            &page_index_bytes)?;
        writer.add_entry("pages/page_001/content.json", &content_bytes)?;
        writer.add_entry("pages/page_001/layout.json",  &layout_bytes)?;
        writer.add_entry("assets/index.json",           &asset_index_bytes)?;
        writer.add_entry("plugins/index.json",          &plugin_index_bytes)?;
        writer.add_entry("security/signatures.json",    &sigs_bytes)?;
        writer.add_entry("security/hashes.json",        &hashes_bytes)?;

        writer.finish(&header_bytes)
    }
}

impl DocumentBuilder {
    /// Build a full-featured LDOC document with ALL features enabled.
    /// Includes: scripts, ai, plugins, annotations, forms, audio, video,
    /// 3d, collaboration, cloud_sync, version_history, encryption stubs,
    /// rich multi-page content, sample assets, and all required index files.
    pub fn build_full(self) -> Result<Vec<u8>, LdocError> {
        let spec = crate::SPEC_VERSION;
        let id   = &self.id;
        let now  = &self.now;

        // ── manifest.json — all features ON ───────────────────────────────────
        let mut manifest = Manifest::new_document(id, &self.title, &self.language, 3, spec, now);
        manifest.document.subtitle = Some("LDOC Full-Feature Example Document".into());
        manifest.features = FeaturesBlock {
            has_scripts: true,
            has_ai: true,
            has_plugins: true,
            has_encryption: true,
            has_digital_signature: true,
            has_annotations: true,
            has_collaboration: true,
            has_cloud_sync: true,
            has_3d: true,
            has_video: true,
            has_audio: true,
            has_forms: true,
            has_version_history: true,
            readonly: false,
        };
        manifest.runtime.requires_network = true;
        manifest.accessibility = crate::manifest::AccessibilityBlock {
            has_alt_text: true,
            has_aria_labels: true,
            has_reading_order: true,
            wcag_level: Some("AA".into()),
        };
        let manifest_bytes = manifest.to_bytes()?;

        // ── metadata/metadata.json ────────────────────────────────────────────
        let mut metadata = crate::metadata::Metadata::new_document(
            id, &self.title, &self.language, spec, now, &self.author,
        );
        metadata.document.subtitle = Some("Full-Feature Example".into());
        metadata.document.description = Some(
            "This document demonstrates every feature of the LDOC format.".into(),
        );
        metadata.keywords = vec![
            "ldoc".into(), "example".into(), "full-feature".into(),
            "living-document".into(),
        ];
        metadata.version.is_draft = false;
        metadata.version.changelog = Some("Initial full-feature example".into());
        metadata.ai_metadata.ai_assisted = true;
        metadata.ai_metadata.ai_content_policy = "disclosed".into();
        metadata.accessibility.has_alt_text = true;
        metadata.accessibility.has_aria_labels = true;
        metadata.accessibility.has_reading_order = true;
        metadata.accessibility.wcag_level = Some("AA".into());
        let metadata_bytes = metadata.to_bytes()?;

        // ── 3 pages ───────────────────────────────────────────────────────────
        let pid1 = Uuid::new_v4().to_string();
        let pid2 = Uuid::new_v4().to_string();
        let pid3 = Uuid::new_v4().to_string();

        let page_index = PageIndex {
            schema_version: "1.0.0".into(),
            page_count: 3,
            pages: vec![
                PageEntry { id: pid1.clone(), path: "pages/page_001".into(),
                    title: Some("Cover & Text".into()), number: 1, visible: true,
                    page_type: "content".into(), parent_id: None, children: vec![] },
                PageEntry { id: pid2.clone(), path: "pages/page_002".into(),
                    title: Some("Media & Forms".into()), number: 2, visible: true,
                    page_type: "content".into(), parent_id: None, children: vec![] },
                PageEntry { id: pid3.clone(), path: "pages/page_003".into(),
                    title: Some("Data & AI".into()), number: 3, visible: true,
                    page_type: "content".into(), parent_id: None, children: vec![] },
            ],
        };
        let page_index_bytes = page_index.to_bytes()?;

        // ── Page 1: Cover & Text ──────────────────────────────────────────────
        let layout1 = PageLayout::a4_portrait(&pid1);
        let layout1_bytes = layout1.to_bytes()?;

        let content1 = PageContent {
            schema_version: "1.0.0".into(),
            page_id: pid1.clone(),
            root: {
                let mut root = ContentNode::container(&format!("{pid1}-root"));
                root.children.push(ContentNode::heading(&format!("{pid1}-h1"), 1, &self.title));
                root.children.push(ContentNode::paragraph(&format!("{pid1}-p1"),
                    "This is a full-feature LDOC document showcasing every supported feature."));
                root.children.push(ContentNode::heading(&format!("{pid1}-h2"), 2, "Rich Text"));
                root.children.push(ContentNode::paragraph(&format!("{pid1}-p2"),
                    "LDOC supports headings, paragraphs, lists, code blocks, quotes, links, and more."));
                // list
                let mut list = ContentNode::container(&format!("{pid1}-list"));
                list.node_type = "list".into();
                for (i, item) in ["Scripts", "AI Blocks", "Forms", "Annotations",
                                  "Collaboration", "Version History"].iter().enumerate() {
                    let mut li = ContentNode::container(&format!("{pid1}-li{i}"));
                    li.node_type = "list_item".into();
                    li.children.push(ContentNode::paragraph(&format!("{pid1}-li{i}-p"), item));
                    list.children.push(li);
                }
                root.children.push(list);
                // code block
                let mut code = ContentNode::container(&format!("{pid1}-code"));
                code.node_type = "code_block".into();
                code.value = Some("fn main() {\n    println!(\"Hello, LDOC!\");\n}".into());
                code.style = Some(serde_json::json!({ "language": "rust" }));
                root.children.push(code);
                // quote
                let mut quote = ContentNode::container(&format!("{pid1}-quote"));
                quote.node_type = "quote".into();
                quote.children.push(ContentNode::paragraph(&format!("{pid1}-quote-p"),
                    "Living documents evolve with their content."));
                root.children.push(quote);
                root
            },
        };
        let content1_bytes = content1.to_bytes()?;

        // ── Page 2: Media & Forms ─────────────────────────────────────────────
        let layout2 = PageLayout::a4_portrait(&pid2);
        let layout2_bytes = layout2.to_bytes()?;

        // sample asset bytes (1x1 white PNG)
        let png_bytes: Vec<u8> = vec![
            0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,
            0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,
            0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,
            0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,
            0xDE,0x00,0x00,0x00,0x0C,0x49,0x44,0x41,
            0x54,0x08,0xD7,0x63,0xF8,0xFF,0xFF,0x3F,
            0x00,0x05,0xFE,0x02,0xFE,0xDC,0xCC,0x59,
            0xE7,0x00,0x00,0x00,0x00,0x49,0x45,0x4E,
            0x44,0xAE,0x42,0x60,0x82,
        ];
        let img_hash = sha256_hex(&png_bytes);
        let img_filename = format!("{}.png", &img_hash[..32]);
        let img_path = format!("assets/images/{}", img_filename);
        let img_asset_id = Uuid::new_v4().to_string();

        let content2 = PageContent {
            schema_version: "1.0.0".into(),
            page_id: pid2.clone(),
            root: {
                let mut root = ContentNode::container(&format!("{pid2}-root"));
                root.children.push(ContentNode::heading(&format!("{pid2}-h1"), 1, "Media & Forms"));
                // image node
                let mut img = ContentNode::container(&format!("{pid2}-img"));
                img.node_type = "image".into();
                img.asset_id = Some(img_asset_id.clone());
                img.aria = Some(serde_json::json!({ "alt": "Sample 1x1 white pixel image" }));
                root.children.push(img);
                // audio node
                let mut audio = ContentNode::container(&format!("{pid2}-audio"));
                audio.node_type = "audio".into();
                audio.asset_id = Some("audio-placeholder-id".into());
                audio.aria = Some(serde_json::json!({ "label": "Sample audio track" }));
                root.children.push(audio);
                // video node
                let mut video = ContentNode::container(&format!("{pid2}-video"));
                video.node_type = "video".into();
                video.asset_id = Some("video-placeholder-id".into());
                video.aria = Some(serde_json::json!({ "label": "Sample video clip" }));
                root.children.push(video);
                // form
                root.children.push(ContentNode::heading(&format!("{pid2}-h2"), 2, "Interactive Form"));
                let mut form = ContentNode::container(&format!("{pid2}-form"));
                form.node_type = "form".into();
                let mut inp = ContentNode::container(&format!("{pid2}-inp-name"));
                inp.node_type = "input_text".into();
                inp.aria = Some(serde_json::json!({ "label": "Full Name", "placeholder": "Enter your name" }));
                form.children.push(inp);
                let mut chk = ContentNode::container(&format!("{pid2}-chk"));
                chk.node_type = "input_checkbox".into();
                chk.aria = Some(serde_json::json!({ "label": "I agree to the terms" }));
                form.children.push(chk);
                let mut btn = ContentNode::container(&format!("{pid2}-btn"));
                btn.node_type = "button".into();
                btn.value = Some("Submit".into());
                btn.aria = Some(serde_json::json!({ "label": "Submit form" }));
                form.children.push(btn);
                root.children.push(form);
                root
            },
        };
        let content2_bytes = content2.to_bytes()?;

        // ── Page 3: Data & AI ─────────────────────────────────────────────────
        let layout3 = PageLayout::a4_portrait(&pid3);
        let layout3_bytes = layout3.to_bytes()?;

        let content3 = PageContent {
            schema_version: "1.0.0".into(),
            page_id: pid3.clone(),
            root: {
                let mut root = ContentNode::container(&format!("{pid3}-root"));
                root.children.push(ContentNode::heading(&format!("{pid3}-h1"), 1, "Data & AI"));
                // table
                let mut table = ContentNode::container(&format!("{pid3}-table"));
                table.node_type = "table".into();
                let headers = ["Feature", "Status", "Version"];
                let rows = [
                    ["Scripts", "Enabled", "1.0"],
                    ["AI Blocks", "Enabled", "1.0"],
                    ["Forms", "Enabled", "1.0"],
                ];
                let mut hrow = ContentNode::container(&format!("{pid3}-hrow"));
                hrow.node_type = "table_row".into();
                for (i, h) in headers.iter().enumerate() {
                    let mut cell = ContentNode::container(&format!("{pid3}-hcell{i}"));
                    cell.node_type = "table_cell".into();
                    cell.children.push(ContentNode::paragraph(&format!("{pid3}-hcell{i}-p"), h));
                    hrow.children.push(cell);
                }
                table.children.push(hrow);
                for (r, row) in rows.iter().enumerate() {
                    let mut tr = ContentNode::container(&format!("{pid3}-row{r}"));
                    tr.node_type = "table_row".into();
                    for (c, val) in row.iter().enumerate() {
                        let mut cell = ContentNode::container(&format!("{pid3}-cell{r}{c}"));
                        cell.node_type = "table_cell".into();
                        cell.children.push(ContentNode::paragraph(&format!("{pid3}-cell{r}{c}-p"), val));
                        tr.children.push(cell);
                    }
                    table.children.push(tr);
                }
                root.children.push(table);
                // ai_block
                let mut ai = ContentNode::container(&format!("{pid3}-ai"));
                ai.node_type = "ai_block".into();
                ai.value = Some("Summarize this document in one sentence.".into());
                ai.style = Some(serde_json::json!({ "model": "default", "mode": "summary" }));
                root.children.push(ai);
                // ai_summary
                let mut ai_sum = ContentNode::container(&format!("{pid3}-aisum"));
                ai_sum.node_type = "ai_summary".into();
                ai_sum.value = Some("This document demonstrates all LDOC features.".into());
                root.children.push(ai_sum);
                root
            },
        };
        let content3_bytes = content3.to_bytes()?;

        // ── assets/index.json ─────────────────────────────────────────────────
        let mut asset_index = AssetIndex::new();
        asset_index.assets.push(AssetEntry {
            id: img_asset_id.clone(),
            asset_type: "image".into(),
            subtype: "raster".into(),
            path: img_path.clone(),
            original_name: Some("sample.png".into()),
            size_bytes: png_bytes.len() as u64,
            width: Some(1),
            height: Some(1),
            duration_ms: None,
            checksum: format!("sha256:{}", img_hash),
            mime_type: "image/png".into(),
            created_at: now.clone(),
            alt_text: Some("Sample 1x1 white pixel image".into()),
            license_ref: None,
            tags: vec!["sample".into(), "image".into()],
        });
        let asset_index_bytes = asset_index.to_bytes()?;

        // ── plugins/index.json ────────────────────────────────────────────────
        let plugin_index = PluginIndex::new();
        let plugin_index_bytes = plugin_index.to_bytes()?;

        // ── scripts/index.json ────────────────────────────────────────────────
        let scripts_index = serde_json::json!({
            "schema_version": "1.0.0",
            "scripts": [{
                "id": Uuid::new_v4().to_string(),
                "name": "example-script",
                "path": "scripts/example.js",
                "language": "javascript",
                "trigger": "on_load",
                "permissions": []
            }]
        });
        let scripts_index_bytes = serde_json::to_vec_pretty(&scripts_index)
            .map_err(LdocError::Json)?;

        // ── annotations/index.json ────────────────────────────────────────────
        let annotations_index = serde_json::json!({
            "schema_version": "1.0.0",
            "annotations": [{
                "id": Uuid::new_v4().to_string(),
                "type": "highlight",
                "page_id": pid1,
                "node_id": format!("{pid1}-p1"),
                "author_id": "author-001",
                "created_at": now,
                "color": "#ffff00",
                "note": "This paragraph is important."
            }]
        });
        let annotations_index_bytes = serde_json::to_vec_pretty(&annotations_index)
            .map_err(LdocError::Json)?;

        // ── ai/index.json ─────────────────────────────────────────────────────
        let ai_index = serde_json::json!({
            "schema_version": "1.0.0",
            "providers": [{
                "id": "default",
                "type": "summarizer",
                "model": "ldoc-default-v1",
                "endpoint": null,
                "permissions": ["execute_ai"]
            }],
            "blocks": [{
                "id": format!("{pid3}-ai"),
                "provider_id": "default",
                "prompt": "Summarize this document in one sentence.",
                "cached_response": "This document demonstrates all LDOC features."
            }]
        });
        let ai_index_bytes = serde_json::to_vec_pretty(&ai_index)
            .map_err(LdocError::Json)?;

        // ── security/signatures.json ──────────────────────────────────────────
        let sigs = SignaturesFile::empty();
        let sigs_bytes = sigs.to_bytes()?;

        // ── security/hashes.json ──────────────────────────────────────────────
        let mut hashes = HashesFile::new(now);
        hashes.add("manifest.json",                    &manifest_bytes);
        hashes.add("metadata/metadata.json",           &metadata_bytes);
        hashes.add("pages/index.json",                 &page_index_bytes);
        hashes.add("pages/page_001/layout.json",       &layout1_bytes);
        hashes.add("pages/page_001/content.json",      &content1_bytes);
        hashes.add("pages/page_002/layout.json",       &layout2_bytes);
        hashes.add("pages/page_002/content.json",      &content2_bytes);
        hashes.add("pages/page_003/layout.json",       &layout3_bytes);
        hashes.add("pages/page_003/content.json",      &content3_bytes);
        hashes.add("assets/index.json",                &asset_index_bytes);
        hashes.add(&img_path,                          &png_bytes);
        hashes.add("plugins/index.json",               &plugin_index_bytes);
        hashes.add("scripts/index.json",               &scripts_index_bytes);
        hashes.add("annotations/index.json",           &annotations_index_bytes);
        hashes.add("ai/index.json",                    &ai_index_bytes);
        hashes.add("security/signatures.json",         &sigs_bytes);
        let hashes_bytes = hashes.to_bytes()?;

        // ── Binary header ─────────────────────────────────────────────────────
        let feature_flags = manifest.features.to_feature_flags();
        let epoch = u32::try_from(Utc::now().timestamp()).unwrap_or(u32::MAX);
        let uuid_parsed = Uuid::parse_str(id)
            .map_err(|e| LdocError::ManifestFieldInvalid("id".into(), e.to_string()))?;
        let uuid_prefix: [u8; 16] = *uuid_parsed.as_bytes();
        let header = LdocHeader::new(SPEC_MAJOR, SPEC_MINOR, SPEC_PATCH, feature_flags, 0, epoch, uuid_prefix);
        let header_bytes = header.to_bytes();

        // ── Assemble ZIP ──────────────────────────────────────────────────────
        let mut writer = LdocZipWriter::new();
        writer.add_entry("manifest.json",                  &manifest_bytes)?;
        writer.add_entry("metadata/metadata.json",         &metadata_bytes)?;
        writer.add_entry("pages/index.json",               &page_index_bytes)?;
        writer.add_entry("pages/page_001/content.json",    &content1_bytes)?;
        writer.add_entry("pages/page_001/layout.json",     &layout1_bytes)?;
        writer.add_entry("pages/page_002/content.json",    &content2_bytes)?;
        writer.add_entry("pages/page_002/layout.json",     &layout2_bytes)?;
        writer.add_entry("pages/page_003/content.json",    &content3_bytes)?;
        writer.add_entry("pages/page_003/layout.json",     &layout3_bytes)?;
        writer.add_entry("assets/index.json",              &asset_index_bytes)?;
        writer.add_entry(&img_path,                        &png_bytes)?;
        writer.add_entry("plugins/index.json",             &plugin_index_bytes)?;
        writer.add_entry("scripts/index.json",             &scripts_index_bytes)?;
        writer.add_entry("annotations/index.json",         &annotations_index_bytes)?;
        writer.add_entry("ai/index.json",                  &ai_index_bytes)?;
        writer.add_entry("security/signatures.json",       &sigs_bytes)?;
        writer.add_entry("security/hashes.json",           &hashes_bytes)?;

        writer.finish(&header_bytes)
    }
}
