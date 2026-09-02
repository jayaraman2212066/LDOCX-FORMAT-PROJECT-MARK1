// LDOC Runtime — Theme Service
// Theme loading, switching, token management, and system detection

use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use crate::error::{RuntimeError, RuntimeResult};

/// Theme mode
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ThemeMode {
    Light,
    Dark,
    Auto,
}

impl std::fmt::Display for ThemeMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

/// Theme token
#[derive(Debug, Clone, PartialEq)]
pub struct ThemeToken {
    pub name: String,
    pub value: String,
    pub category: String,
}

/// Theme definition
#[derive(Debug, Clone)]
pub struct Theme {
    pub id: String,
    pub name: String,
    pub mode: ThemeMode,
    pub tokens: HashMap<String, ThemeToken>,
    pub created_at: u64,
}

impl Theme {
    /// Create new theme
    pub fn new(id: String, name: String, mode: ThemeMode) -> Self {
        let created_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Self {
            id,
            name,
            mode,
            tokens: HashMap::new(),
            created_at,
        }
    }

    /// Add token
    pub fn add_token(&mut self, token: ThemeToken) {
        self.tokens.insert(token.name.clone(), token);
    }

    /// Get token
    pub fn get_token(&self, name: &str) -> Option<ThemeToken> {
        self.tokens.get(name).cloned()
    }

    /// Get tokens by category
    pub fn tokens_by_category(&self, category: &str) -> Vec<ThemeToken> {
        self.tokens.values()
            .filter(|t| t.category == category)
            .cloned()
            .collect()
    }

    /// Get token count
    pub fn token_count(&self) -> usize {
        self.tokens.len()
    }
}

/// Theme service
pub struct ThemeService {
    themes: Arc<RwLock<HashMap<String, Theme>>>,
    current_theme: Arc<RwLock<Option<String>>>,
    system_mode: Arc<RwLock<ThemeMode>>,
}

impl ThemeService {
    /// Create new theme service
    pub fn new() -> Self {
        Self {
            themes: Arc::new(RwLock::new(HashMap::new())),
            current_theme: Arc::new(RwLock::new(None)),
            system_mode: Arc::new(RwLock::new(ThemeMode::Light)),
        }
    }

    /// Register theme
    pub fn register_theme(&self, theme: Theme) -> RuntimeResult<()> {
        let id = theme.id.clone();
        let mut themes = self.themes.write();
        
        if themes.contains_key(&id) {
            return Err(RuntimeError::ThemeError(
                format!("Theme already registered: {}", id)
            ));
        }

        themes.insert(id, theme);
        Ok(())
    }

    /// Unregister theme
    pub fn unregister_theme(&self, id: &str) -> RuntimeResult<()> {
        let mut themes = self.themes.write();
        themes.remove(id)
            .ok_or_else(|| RuntimeError::ThemeError(format!("Theme not found: {}", id)))?;
        Ok(())
    }

    /// Get theme
    pub fn get_theme(&self, id: &str) -> RuntimeResult<Theme> {
        self.themes.read()
            .get(id)
            .cloned()
            .ok_or_else(|| RuntimeError::ThemeError(format!("Theme not found: {}", id)))
    }

    /// Set current theme
    pub fn set_current_theme(&self, id: String) -> RuntimeResult<()> {
        let themes = self.themes.read();
        if !themes.contains_key(&id) {
            return Err(RuntimeError::ThemeError(format!("Theme not found: {}", id)));
        }
        drop(themes);

        *self.current_theme.write() = Some(id);
        Ok(())
    }

    /// Get current theme
    pub fn current_theme(&self) -> RuntimeResult<Option<Theme>> {
        let current_id = self.current_theme.read().clone();
        if let Some(id) = current_id {
            Ok(Some(self.get_theme(&id)?))
        } else {
            Ok(None)
        }
    }

    /// Set system mode
    pub fn set_system_mode(&self, mode: ThemeMode) -> RuntimeResult<()> {
        *self.system_mode.write() = mode;
        Ok(())
    }

    /// Get system mode
    pub fn system_mode(&self) -> ThemeMode {
        *self.system_mode.read()
    }

    /// Get effective mode
    pub fn effective_mode(&self) -> RuntimeResult<ThemeMode> {
        if let Some(theme) = self.current_theme()? {
            if theme.mode == ThemeMode::Auto {
                Ok(self.system_mode())
            } else {
                Ok(theme.mode)
            }
        } else {
            Ok(self.system_mode())
        }
    }

    /// List all themes
    pub fn list_themes(&self) -> Vec<Theme> {
        self.themes.read().values().cloned().collect()
    }

    /// Get theme count
    pub fn theme_count(&self) -> usize {
        self.themes.read().len()
    }

    /// Get themes by mode
    pub fn themes_by_mode(&self, mode: ThemeMode) -> Vec<Theme> {
        self.themes.read()
            .values()
            .filter(|t| t.mode == mode || t.mode == ThemeMode::Auto)
            .cloned()
            .collect()
    }

    /// Get token from current theme
    pub fn get_token(&self, name: &str) -> RuntimeResult<Option<ThemeToken>> {
        if let Some(theme) = self.current_theme()? {
            Ok(theme.get_token(name))
        } else {
            Ok(None)
        }
    }

    /// Get tokens by category from current theme
    pub fn tokens_by_category(&self, category: &str) -> RuntimeResult<Vec<ThemeToken>> {
        if let Some(theme) = self.current_theme()? {
            Ok(theme.tokens_by_category(category))
        } else {
            Ok(Vec::new())
        }
    }
}

impl Default for ThemeService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_theme_creation() {
        let theme = Theme::new("light".to_string(), "Light Theme".to_string(), ThemeMode::Light);
        assert_eq!(theme.id, "light");
        assert_eq!(theme.mode, ThemeMode::Light);
    }

    #[test]
    fn test_theme_tokens() {
        let mut theme = Theme::new("light".to_string(), "Light Theme".to_string(), ThemeMode::Light);
        let token = ThemeToken {
            name: "primary".to_string(),
            value: "#000000".to_string(),
            category: "color".to_string(),
        };
        theme.add_token(token.clone());
        assert_eq!(theme.get_token("primary"), Some(token));
    }

    #[test]
    fn test_theme_service_creation() {
        let service = ThemeService::new();
        assert_eq!(service.theme_count(), 0);
    }

    #[test]
    fn test_register_theme() {
        let service = ThemeService::new();
        let theme = Theme::new("light".to_string(), "Light Theme".to_string(), ThemeMode::Light);
        assert!(service.register_theme(theme).is_ok());
        assert_eq!(service.theme_count(), 1);
    }

    #[test]
    fn test_get_theme() {
        let service = ThemeService::new();
        let theme = Theme::new("light".to_string(), "Light Theme".to_string(), ThemeMode::Light);
        service.register_theme(theme).unwrap();
        let retrieved = service.get_theme("light").unwrap();
        assert_eq!(retrieved.id, "light");
    }

    #[test]
    fn test_set_current_theme() {
        let service = ThemeService::new();
        let theme = Theme::new("light".to_string(), "Light Theme".to_string(), ThemeMode::Light);
        service.register_theme(theme).unwrap();
        assert!(service.set_current_theme("light".to_string()).is_ok());
        let current = service.current_theme().unwrap();
        assert_eq!(current.unwrap().id, "light");
    }

    #[test]
    fn test_system_mode() {
        let service = ThemeService::new();
        service.set_system_mode(ThemeMode::Dark).unwrap();
        assert_eq!(service.system_mode(), ThemeMode::Dark);
    }

    #[test]
    fn test_effective_mode() {
        let service = ThemeService::new();
        let theme = Theme::new("light".to_string(), "Light Theme".to_string(), ThemeMode::Light);
        service.register_theme(theme).unwrap();
        service.set_current_theme("light".to_string()).unwrap();
        assert_eq!(service.effective_mode().unwrap(), ThemeMode::Light);
    }

    #[test]
    fn test_auto_mode() {
        let service = ThemeService::new();
        let theme = Theme::new("auto".to_string(), "Auto Theme".to_string(), ThemeMode::Auto);
        service.register_theme(theme).unwrap();
        service.set_current_theme("auto".to_string()).unwrap();
        service.set_system_mode(ThemeMode::Dark).unwrap();
        assert_eq!(service.effective_mode().unwrap(), ThemeMode::Dark);
    }

    #[test]
    fn test_list_themes() {
        let service = ThemeService::new();
        let light = Theme::new("light".to_string(), "Light".to_string(), ThemeMode::Light);
        let dark = Theme::new("dark".to_string(), "Dark".to_string(), ThemeMode::Dark);
        service.register_theme(light).unwrap();
        service.register_theme(dark).unwrap();
        assert_eq!(service.list_themes().len(), 2);
    }

    #[test]
    fn test_themes_by_mode() {
        let service = ThemeService::new();
        let light = Theme::new("light".to_string(), "Light".to_string(), ThemeMode::Light);
        let dark = Theme::new("dark".to_string(), "Dark".to_string(), ThemeMode::Dark);
        service.register_theme(light).unwrap();
        service.register_theme(dark).unwrap();
        let light_themes = service.themes_by_mode(ThemeMode::Light);
        assert_eq!(light_themes.len(), 1);
    }

    #[test]
    fn test_get_token_from_theme() {
        let service = ThemeService::new();
        let mut theme = Theme::new("light".to_string(), "Light".to_string(), ThemeMode::Light);
        let token = ThemeToken {
            name: "primary".to_string(),
            value: "#000000".to_string(),
            category: "color".to_string(),
        };
        theme.add_token(token);
        service.register_theme(theme).unwrap();
        service.set_current_theme("light".to_string()).unwrap();
        let retrieved = service.get_token("primary").unwrap();
        assert_eq!(retrieved.unwrap().value, "#000000");
    }

    #[test]
    fn test_tokens_by_category() {
        let service = ThemeService::new();
        let mut theme = Theme::new("light".to_string(), "Light".to_string(), ThemeMode::Light);
        theme.add_token(ThemeToken {
            name: "primary".to_string(),
            value: "#000000".to_string(),
            category: "color".to_string(),
        });
        theme.add_token(ThemeToken {
            name: "secondary".to_string(),
            value: "#ffffff".to_string(),
            category: "color".to_string(),
        });
        service.register_theme(theme).unwrap();
        service.set_current_theme("light".to_string()).unwrap();
        let colors = service.tokens_by_category("color").unwrap();
        assert_eq!(colors.len(), 2);
    }
}
