use std::collections::HashMap;
use std::io::{Read, Seek};
use std::path::{Path, PathBuf};

use zip::ZipArchive;

use crate::plugin_runtime::{
    error::PluginRuntimeError,
    lifecycle::LifecycleRegistry,
    manifest::PluginManifest,
    sandbox::{SandboxConfig, SandboxManager},
    types::{LoadStrategy, PluginId, TrustLevel},
    validator::{PluginValidator, ValidatorConfig},
};

// ── BundleContents ────────────────────────────────────────────────────────────

/// Raw contents extracted from a `.ldocplugin` ZIP bundle.
pub struct BundleContents {
    pub manifest_bytes: Vec<u8>,
    /// All files in the bundle keyed by their bundle-relative path.
    pub files: HashMap<String, Vec<u8>>,
}

impl BundleContents {
    /// Extract all entries from a ZIP archive into memory.
    pub fn from_zip<R: Read + Seek>(reader: R) -> Result<Self, PluginRuntimeError> {
        let mut archive = ZipArchive::new(reader)?;
        let mut files: HashMap<String, Vec<u8>> = HashMap::new();

        for i in 0..archive.len() {
            let mut entry = archive.by_index(i)?;
            if entry.is_dir() {
                continue;
            }
            let name = entry.name().to_owned();
            let mut buf = Vec::with_capacity(entry.size() as usize);
            entry.read_to_end(&mut buf)?;
            files.insert(name, buf);
        }

        let manifest_bytes = files
            .get("manifest.json")
            .cloned()
            .ok_or_else(|| PluginRuntimeError::InvalidBundle {
                reason: "manifest.json not found in bundle".into(),
            })?;

        Ok(Self { manifest_bytes, files })
    }

    /// Extract from a file path on disk.
    pub fn from_path(path: &Path) -> Result<Self, PluginRuntimeError> {
        if !path.exists() {
            return Err(PluginRuntimeError::BundleNotFound {
                path: path.display().to_string(),
            });
        }
        let file = std::fs::File::open(path)?;
        Self::from_zip(std::io::BufReader::new(file))
    }
}

// ── LoadedPlugin ──────────────────────────────────────────────────────────────

/// Metadata retained after a plugin bundle has been loaded.
#[derive(Debug, Clone)]
pub struct LoadedPlugin {
    pub plugin_id:   PluginId,
    pub version:     String,
    pub trust_level: TrustLevel,
    pub bundle_path: PathBuf,
    pub manifest:    PluginManifest,
}

// ── PluginLoader ──────────────────────────────────────────────────────────────

pub struct PluginLoader {
    validator:  PluginValidator,
    loaded:     HashMap<PluginId, LoadedPlugin>,
}

impl PluginLoader {
    pub fn new(validator_config: ValidatorConfig) -> Self {
        Self {
            validator: PluginValidator::new(validator_config),
            loaded:    HashMap::new(),
        }
    }

    /// Full load pipeline:
    /// 1. Extract bundle from `path`
    /// 2. Validate manifest + integrity
    /// 3. Register in lifecycle (Discovered → Validated → Installed → Loaded)
    /// 4. Create sandbox
    /// 5. Record LoadedPlugin
    pub fn load(
        &mut self,
        path: &Path,
        lifecycle: &mut LifecycleRegistry,
        sandbox_mgr: &mut SandboxManager,
    ) -> Result<PluginId, PluginRuntimeError> {
        // 1. Extract bundle.
        let bundle = BundleContents::from_path(path)?;

        // 2. Validate.
        let (plugin_id, trust_level) =
            self.validator.validate_strict(&bundle.manifest_bytes, &bundle.files)?;

        // Guard: already loaded?
        if self.loaded.contains_key(&plugin_id) {
            let existing = &self.loaded[&plugin_id];
            return Err(PluginRuntimeError::AlreadyInstalled {
                plugin_id: plugin_id.clone(),
                version:   existing.version.clone(),
            });
        }

        // 3. Parse manifest (already validated — safe to unwrap).
        let manifest = PluginManifest::from_json(&bundle.manifest_bytes)?;
        let version  = manifest.version.clone();

        // 4. Lifecycle: Discovered → Validated → Installed → Loaded.
        lifecycle.register(plugin_id.clone());
        {
            let lc = lifecycle.get_mut(&plugin_id).unwrap();
            lc.validate()?;
            lc.install()?;
            lc.mark_loaded()?;
        }

        // 5. Sandbox: get WASM bytes and create sandbox.
        let wasm_path = &manifest.entry_points.wasm;
        let wasm_bytes = bundle.files.get(wasm_path).cloned().unwrap_or_default();
        let sandbox_cfg = SandboxConfig::for_trust_level(trust_level);
        sandbox_mgr.create(plugin_id.clone(), &wasm_bytes, sandbox_cfg)?;

        // 6. Record.
        self.loaded.insert(
            plugin_id.clone(),
            LoadedPlugin {
                plugin_id:   plugin_id.clone(),
                version,
                trust_level,
                bundle_path: path.to_path_buf(),
                manifest,
            },
        );

        Ok(plugin_id)
    }

    /// Unload a plugin: destroy sandbox, advance lifecycle to Unloaded, remove record.
    pub fn unload(
        &mut self,
        plugin_id: &PluginId,
        lifecycle: &mut LifecycleRegistry,
        sandbox_mgr: &mut SandboxManager,
    ) -> Result<(), PluginRuntimeError> {
        if !self.loaded.contains_key(plugin_id) {
            return Err(PluginRuntimeError::NotInstalled { plugin_id: plugin_id.clone() });
        }
        sandbox_mgr.destroy(plugin_id);
        if let Some(lc) = lifecycle.get_mut(plugin_id) {
            // Best-effort unload — ignore invalid transition if already unloaded.
            let _ = lc.unload();
        }
        self.loaded.remove(plugin_id);
        Ok(())
    }

    pub fn get(&self, plugin_id: &PluginId) -> Option<&LoadedPlugin> {
        self.loaded.get(plugin_id)
    }

    pub fn is_loaded(&self, plugin_id: &PluginId) -> bool {
        self.loaded.contains_key(plugin_id)
    }

    pub fn loaded_ids(&self) -> impl Iterator<Item = &PluginId> {
        self.loaded.keys()
    }

    pub fn len(&self) -> usize {
        self.loaded.len()
    }

    pub fn is_empty(&self) -> bool {
        self.loaded.is_empty()
    }
}

// ── LoadQueue ─────────────────────────────────────────────────────────────────

/// Ordered queue of bundle paths waiting to be loaded, partitioned by strategy.
#[derive(Debug, Default)]
pub struct LoadQueue {
    eager:      Vec<PathBuf>,
    lazy:       Vec<PathBuf>,
    background: Vec<PathBuf>,
}

impl LoadQueue {
    pub fn enqueue(&mut self, path: PathBuf, strategy: LoadStrategy) {
        match strategy {
            LoadStrategy::Eager      => self.eager.push(path),
            LoadStrategy::Lazy       => self.lazy.push(path),
            LoadStrategy::Background => self.background.push(path),
        }
    }

    /// Drain all Eager paths — these must be loaded before boot completes.
    pub fn drain_eager(&mut self) -> Vec<PathBuf> {
        std::mem::take(&mut self.eager)
    }

    /// Drain all Lazy paths — loaded on first use.
    pub fn drain_lazy(&mut self) -> Vec<PathBuf> {
        std::mem::take(&mut self.lazy)
    }

    /// Drain all Background paths — loaded after boot on a background thread.
    pub fn drain_background(&mut self) -> Vec<PathBuf> {
        std::mem::take(&mut self.background)
    }

    pub fn total_pending(&self) -> usize {
        self.eager.len() + self.lazy.len() + self.background.len()
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn load_queue_partitions_by_strategy() {
        let mut q = LoadQueue::default();
        q.enqueue(PathBuf::from("a.ldocplugin"), LoadStrategy::Eager);
        q.enqueue(PathBuf::from("b.ldocplugin"), LoadStrategy::Lazy);
        q.enqueue(PathBuf::from("c.ldocplugin"), LoadStrategy::Background);
        q.enqueue(PathBuf::from("d.ldocplugin"), LoadStrategy::Eager);
        assert_eq!(q.total_pending(), 4);
        let eager = q.drain_eager();
        assert_eq!(eager.len(), 2);
        assert_eq!(q.total_pending(), 2);
    }

    #[test]
    fn bundle_not_found_error() {
        let result = BundleContents::from_path(Path::new("nonexistent.ldocplugin"));
        assert!(matches!(result, Err(PluginRuntimeError::BundleNotFound { .. })));
    }

    #[test]
    fn loader_reports_not_installed_on_unload() {
        let mut loader = PluginLoader::new(ValidatorConfig::default());
        let mut lifecycle = LifecycleRegistry::new();
        let mut sandbox_mgr = SandboxManager::new();
        let err = loader.unload(
            &PluginId::from("com.example.missing"),
            &mut lifecycle,
            &mut sandbox_mgr,
        );
        assert!(matches!(err, Err(PluginRuntimeError::NotInstalled { .. })));
    }
}

