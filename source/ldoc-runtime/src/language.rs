// LDOC Runtime — Language Service
// Locale loading, translation, direction handling, and fallback logic

use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use crate::error::{RuntimeError, RuntimeResult};

/// Text direction
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TextDirection {
    LTR,
    RTL,
}

impl std::fmt::Display for TextDirection {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

/// Language metadata
#[derive(Debug, Clone)]
pub struct LanguageMetadata {
    pub code: String,
    pub name: String,
    pub native_name: String,
    pub direction: TextDirection,
    pub region: String,
}

/// Translation entry
#[derive(Debug, Clone)]
pub struct Translation {
    pub key: String,
    pub value: String,
    pub context: Option<String>,
}

/// Language definition
#[derive(Debug, Clone)]
pub struct Language {
    pub metadata: LanguageMetadata,
    pub translations: HashMap<String, String>,
    pub created_at: u64,
}

impl Language {
    /// Create new language
    pub fn new(metadata: LanguageMetadata) -> Self {
        let created_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Self {
            metadata,
            translations: HashMap::new(),
            created_at,
        }
    }

    /// Add translation
    pub fn add_translation(&mut self, key: String, value: String) {
        self.translations.insert(key, value);
    }

    /// Get translation
    pub fn get_translation(&self, key: &str) -> Option<String> {
        self.translations.get(key).cloned()
    }

    /// Get translation with fallback
    pub fn get_translation_or(&self, key: &str, fallback: String) -> String {
        self.translations.get(key).cloned().unwrap_or(fallback)
    }

    /// Get translation count
    pub fn translation_count(&self) -> usize {
        self.translations.len()
    }

    /// Get direction
    pub fn direction(&self) -> TextDirection {
        self.metadata.direction
    }
}

/// Language service
pub struct LanguageService {
    languages: Arc<RwLock<HashMap<String, Language>>>,
    current_language: Arc<RwLock<Option<String>>>,
    fallback_language: Arc<RwLock<Option<String>>>,
}

impl LanguageService {
    /// Create new language service
    pub fn new() -> Self {
        Self {
            languages: Arc::new(RwLock::new(HashMap::new())),
            current_language: Arc::new(RwLock::new(None)),
            fallback_language: Arc::new(RwLock::new(None)),
        }
    }

    /// Register language
    pub fn register_language(&self, language: Language) -> RuntimeResult<()> {
        let code = language.metadata.code.clone();
        let mut languages = self.languages.write();
        
        if languages.contains_key(&code) {
            return Err(RuntimeError::LanguageError(
                format!("Language already registered: {}", code)
            ));
        }

        languages.insert(code, language);
        Ok(())
    }

    /// Unregister language
    pub fn unregister_language(&self, code: &str) -> RuntimeResult<()> {
        let mut languages = self.languages.write();
        languages.remove(code)
            .ok_or_else(|| RuntimeError::LanguageError(format!("Language not found: {}", code)))?;
        Ok(())
    }

    /// Get language
    pub fn get_language(&self, code: &str) -> RuntimeResult<Language> {
        self.languages.read()
            .get(code)
            .cloned()
            .ok_or_else(|| RuntimeError::LanguageError(format!("Language not found: {}", code)))
    }

    /// Set current language
    pub fn set_current_language(&self, code: String) -> RuntimeResult<()> {
        let languages = self.languages.read();
        if !languages.contains_key(&code) {
            return Err(RuntimeError::LanguageError(format!("Language not found: {}", code)));
        }
        drop(languages);

        *self.current_language.write() = Some(code);
        Ok(())
    }

    /// Get current language
    pub fn current_language(&self) -> RuntimeResult<Option<Language>> {
        let current_code = self.current_language.read().clone();
        if let Some(code) = current_code {
            Ok(Some(self.get_language(&code)?))
        } else {
            Ok(None)
        }
    }

    /// Set fallback language
    pub fn set_fallback_language(&self, code: String) -> RuntimeResult<()> {
        let languages = self.languages.read();
        if !languages.contains_key(&code) {
            return Err(RuntimeError::LanguageError(format!("Language not found: {}", code)));
        }
        drop(languages);

        *self.fallback_language.write() = Some(code);
        Ok(())
    }

    /// Get fallback language
    pub fn fallback_language(&self) -> RuntimeResult<Option<Language>> {
        let fallback_code = self.fallback_language.read().clone();
        if let Some(code) = fallback_code {
            Ok(Some(self.get_language(&code)?))
        } else {
            Ok(None)
        }
    }

    /// Translate key
    pub fn translate(&self, key: &str) -> RuntimeResult<Option<String>> {
        // Try current language
        if let Some(language) = self.current_language()? {
            if let Some(translation) = language.get_translation(key) {
                return Ok(Some(translation));
            }
        }

        // Try fallback language
        if let Some(language) = self.fallback_language()? {
            if let Some(translation) = language.get_translation(key) {
                return Ok(Some(translation));
            }
        }

        Ok(None)
    }

    /// Translate with fallback
    pub fn translate_or(&self, key: &str, fallback: String) -> RuntimeResult<String> {
        Ok(self.translate(key)?.unwrap_or(fallback))
    }

    /// Get current direction
    pub fn current_direction(&self) -> RuntimeResult<Option<TextDirection>> {
        if let Some(language) = self.current_language()? {
            Ok(Some(language.direction()))
        } else {
            Ok(None)
        }
    }

    /// List all languages
    pub fn list_languages(&self) -> Vec<LanguageMetadata> {
        self.languages.read()
            .values()
            .map(|l| l.metadata.clone())
            .collect()
    }

    /// Get language count
    pub fn language_count(&self) -> usize {
        self.languages.read().len()
    }

    /// Get languages by direction
    pub fn languages_by_direction(&self, direction: TextDirection) -> Vec<LanguageMetadata> {
        self.languages.read()
            .values()
            .filter(|l| l.direction() == direction)
            .map(|l| l.metadata.clone())
            .collect()
    }

    /// Get languages by region
    pub fn languages_by_region(&self, region: &str) -> Vec<LanguageMetadata> {
        self.languages.read()
            .values()
            .filter(|l| l.metadata.region == region)
            .map(|l| l.metadata.clone())
            .collect()
    }

    /// Get translation count for language
    pub fn translation_count(&self, code: &str) -> RuntimeResult<usize> {
        Ok(self.get_language(code)?.translation_count())
    }
}

impl Default for LanguageService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_english() -> Language {
        let metadata = LanguageMetadata {
            code: "en".to_string(),
            name: "English".to_string(),
            native_name: "English".to_string(),
            direction: TextDirection::LTR,
            region: "US".to_string(),
        };
        Language::new(metadata)
    }

    fn create_arabic() -> Language {
        let metadata = LanguageMetadata {
            code: "ar".to_string(),
            name: "Arabic".to_string(),
            native_name: "العربية".to_string(),
            direction: TextDirection::RTL,
            region: "SA".to_string(),
        };
        Language::new(metadata)
    }

    #[test]
    fn test_language_creation() {
        let lang = create_english();
        assert_eq!(lang.metadata.code, "en");
        assert_eq!(lang.direction(), TextDirection::LTR);
    }

    #[test]
    fn test_language_translations() {
        let mut lang = create_english();
        lang.add_translation("hello".to_string(), "Hello".to_string());
        assert_eq!(lang.get_translation("hello"), Some("Hello".to_string()));
    }

    #[test]
    fn test_language_service_creation() {
        let service = LanguageService::new();
        assert_eq!(service.language_count(), 0);
    }

    #[test]
    fn test_register_language() {
        let service = LanguageService::new();
        let lang = create_english();
        assert!(service.register_language(lang).is_ok());
        assert_eq!(service.language_count(), 1);
    }

    #[test]
    fn test_get_language() {
        let service = LanguageService::new();
        let lang = create_english();
        service.register_language(lang).unwrap();
        let retrieved = service.get_language("en").unwrap();
        assert_eq!(retrieved.metadata.code, "en");
    }

    #[test]
    fn test_set_current_language() {
        let service = LanguageService::new();
        let lang = create_english();
        service.register_language(lang).unwrap();
        assert!(service.set_current_language("en".to_string()).is_ok());
        let current = service.current_language().unwrap();
        assert_eq!(current.unwrap().metadata.code, "en");
    }

    #[test]
    fn test_translate() {
        let service = LanguageService::new();
        let mut lang = create_english();
        lang.add_translation("hello".to_string(), "Hello".to_string());
        service.register_language(lang).unwrap();
        service.set_current_language("en".to_string()).unwrap();
        let translation = service.translate("hello").unwrap();
        assert_eq!(translation, Some("Hello".to_string()));
    }

    #[test]
    fn test_translate_fallback() {
        let service = LanguageService::new();
        let mut en = create_english();
        en.add_translation("hello".to_string(), "Hello".to_string());
        let ar = create_arabic();
        
        service.register_language(en).unwrap();
        service.register_language(ar).unwrap();
        service.set_current_language("ar".to_string()).unwrap();
        service.set_fallback_language("en".to_string()).unwrap();
        
        let translation = service.translate("hello").unwrap();
        assert_eq!(translation, Some("Hello".to_string()));
    }

    #[test]
    fn test_current_direction() {
        let service = LanguageService::new();
        let lang = create_english();
        service.register_language(lang).unwrap();
        service.set_current_language("en".to_string()).unwrap();
        let direction = service.current_direction().unwrap();
        assert_eq!(direction, Some(TextDirection::LTR));
    }

    #[test]
    fn test_list_languages() {
        let service = LanguageService::new();
        let en = create_english();
        let ar = create_arabic();
        service.register_language(en).unwrap();
        service.register_language(ar).unwrap();
        assert_eq!(service.list_languages().len(), 2);
    }

    #[test]
    fn test_languages_by_direction() {
        let service = LanguageService::new();
        let en = create_english();
        let ar = create_arabic();
        service.register_language(en).unwrap();
        service.register_language(ar).unwrap();
        
        let ltr = service.languages_by_direction(TextDirection::LTR);
        let rtl = service.languages_by_direction(TextDirection::RTL);
        
        assert_eq!(ltr.len(), 1);
        assert_eq!(rtl.len(), 1);
    }

    #[test]
    fn test_languages_by_region() {
        let service = LanguageService::new();
        let en = create_english();
        let ar = create_arabic();
        service.register_language(en).unwrap();
        service.register_language(ar).unwrap();
        
        let us = service.languages_by_region("US");
        let sa = service.languages_by_region("SA");
        
        assert_eq!(us.len(), 1);
        assert_eq!(sa.len(), 1);
    }

    #[test]
    fn test_translation_count() {
        let service = LanguageService::new();
        let mut lang = create_english();
        lang.add_translation("hello".to_string(), "Hello".to_string());
        lang.add_translation("goodbye".to_string(), "Goodbye".to_string());
        service.register_language(lang).unwrap();
        
        let count = service.translation_count("en").unwrap();
        assert_eq!(count, 2);
    }
}
