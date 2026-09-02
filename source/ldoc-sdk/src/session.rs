// LDOC SDK — Session API
// Wraps ldoc-runtime's DocumentLoader + InteractiveSession.

use ldoc_runtime::{DocumentLoader, InteractiveSession, NavigationAction};
use crate::error::SdkError;

/// An active interactive session over a loaded LDOC document.
pub struct LdocSession {
    inner: InteractiveSession,
}

impl LdocSession {
    /// Open a session from raw bytes.
    pub fn from_bytes(data: &[u8]) -> Result<Self, SdkError> {
        let doc = DocumentLoader::load_from_bytes(data)?;
        Ok(Self { inner: InteractiveSession::new(doc) })
    }

    /// Open a session from a file path.
    pub fn from_file(path: &str) -> Result<Self, SdkError> {
        let data = std::fs::read(path)?;
        Self::from_bytes(&data)
    }

    pub fn page_count(&self) -> usize { self.inner.page_count() }
    pub fn has_next(&self)  -> bool   { self.inner.has_next() }
    pub fn has_prev(&self)  -> bool   { self.inner.has_prev() }

    pub fn open_entry(&self) -> Result<String, SdkError> {
        Ok(self.inner.open_entry()?.title.clone())
    }

    pub fn next_page(&self) -> Result<String, SdkError> {
        Ok(self.inner.next_page()?.title.clone())
    }

    pub fn prev_page(&self) -> Result<String, SdkError> {
        Ok(self.inner.prev_page()?.title.clone())
    }

    pub fn goto_page(&self, number: u32) -> Result<String, SdkError> {
        Ok(self.inner.goto_page(number)?.title.clone())
    }

    pub fn current_page_title(&self) -> Result<String, SdkError> {
        Ok(self.inner.current_page()?.title.clone())
    }

    pub fn set_field(&self, field_id: &str, value: &str) -> Result<(), SdkError> {
        Ok(self.inner.set_field(field_id, value)?)
    }

    pub fn get_field(&self, field_id: &str) -> Option<String> {
        self.inner.get_field(field_id)
    }

    pub fn submit_form(&self, form_id: &str) -> Result<(), SdkError> {
        Ok(self.inner.submit_form(form_id)?)
    }

    pub fn handle_click(&self, element_id: &str, action: Option<&str>) -> Result<NavigationAction, SdkError> {
        Ok(self.inner.handle_click(element_id, action)?)
    }

    pub fn set_state(&self, key: &str, value: &str) -> Result<(), SdkError> {
        Ok(self.inner.set_state(key, value)?)
    }

    pub fn get_state(&self, key: &str) -> Option<String> {
        self.inner.get_state(key)
    }

    pub fn unload(self) {
        self.inner.unload();
    }
}
