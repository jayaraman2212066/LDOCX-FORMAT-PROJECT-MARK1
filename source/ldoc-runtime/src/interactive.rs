// LDOC Runtime — Interactive Session
// Wires LoadedDocument + StateManager + EventDispatcher for interactive viewing.
//
// Event flow: User action → dispatch() → listeners → state update → UI

use std::sync::Arc;
use crate::error::{RuntimeError, RuntimeResult};
use crate::loader::LoadedDocument;
use crate::page_manager::LoadedPage;
use crate::state::StateManager;
use crate::dispatcher::EventDispatcher;
use crate::events::{Event, EventType, EventPriority};

/// An active interactive session over a loaded document.
pub struct InteractiveSession {
    pub document: Arc<LoadedDocument>,
    pub state: Arc<StateManager>,
    pub dispatcher: Arc<EventDispatcher>,
}

impl InteractiveSession {
    /// Create a new session from a loaded document.
    /// Fires DocumentLoaded then DocumentReady events.
    pub fn new(document: LoadedDocument) -> Self {
        let document = Arc::new(document);
        let state = Arc::new(StateManager::new(20));
        let dispatcher = Arc::new(EventDispatcher::new(500));

        let session = Self { document, state, dispatcher };

        // Fire load sequence
        session.fire(EventType::DocumentLoaded, "session", "Document loaded");
        session.fire(EventType::DocumentReady,  "session", "Document ready");

        session
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    /// Open the entry page and fire PageEnter.
    pub fn open_entry(&self) -> RuntimeResult<&LoadedPage> {
        let pm = &self.document.page_manager;
        let page = pm.open_entry().or_else(|_| pm.first())?;
        self.on_page_enter(page);
        Ok(page)
    }

    /// Navigate to the next page.
    pub fn next_page(&self) -> RuntimeResult<&LoadedPage> {
        let pm = &self.document.page_manager;
        self.fire_page_exit();
        let page = pm.next()?;
        self.on_page_enter(page);
        Ok(page)
    }

    /// Navigate to the previous page.
    pub fn prev_page(&self) -> RuntimeResult<&LoadedPage> {
        let pm = &self.document.page_manager;
        self.fire_page_exit();
        let page = pm.previous()?;
        self.on_page_enter(page);
        Ok(page)
    }

    /// Jump to a page by 1-based number.
    pub fn goto_page(&self, number: u32) -> RuntimeResult<&LoadedPage> {
        let pm = &self.document.page_manager;
        self.fire_page_exit();
        let page = pm.open_by_number(number)?;
        self.on_page_enter(page);
        Ok(page)
    }

    /// Get the current page without navigation.
    pub fn current_page(&self) -> RuntimeResult<&LoadedPage> {
        self.document.page_manager.current_page()
    }

    pub fn has_next(&self) -> bool     { self.document.page_manager.has_next() }
    pub fn has_prev(&self) -> bool     { self.document.page_manager.has_previous() }
    pub fn current_index(&self) -> usize { self.document.page_manager.current_index() }
    pub fn page_count(&self) -> usize  { self.document.page_manager.page_count() }

    // ── Form interaction ──────────────────────────────────────────────────────

    /// Record a form field value into session state and fire FormInput.
    pub fn set_field(&self, field_id: &str, value: &str) -> RuntimeResult<()> {
        self.state.set_session(
            format!("field.{}", field_id),
            value.to_string(),
        )?;
        self.dispatcher.dispatch(
            Event::new(EventType::FormInput, EventPriority::Normal,
                "form".into(), format!("{}={}", field_id, value))
            .with_payload(format!("{{\"field\":\"{}\",\"value\":\"{}\"}}", field_id, value))
        )?;
        Ok(())
    }

    /// Get a form field value from session state.
    pub fn get_field(&self, field_id: &str) -> Option<String> {
        self.state.get_session(&format!("field.{}", field_id)).ok().flatten()
    }

    /// Submit a form — fires FormSubmit, stores submission in state.
    pub fn submit_form(&self, form_id: &str) -> RuntimeResult<()> {
        self.state.set_session(
            format!("form.{}.submitted", form_id),
            "true".into(),
        )?;
        self.dispatcher.dispatch(
            Event::new(EventType::FormSubmit, EventPriority::High,
                "form".into(), format!("Form {} submitted", form_id))
            .with_payload(format!("{{\"form_id\":\"{}\"}}", form_id))
        )?;
        Ok(())
    }

    // ── Button / declared actions ─────────────────────────────────────────────

    /// Handle a button click. Interprets declared action from style.action field.
    /// Returns a NavigationAction if the button triggers navigation.
    pub fn handle_click(&self, element_id: &str, action: Option<&str>) -> RuntimeResult<NavigationAction> {
        self.dispatcher.dispatch(
            Event::new(EventType::ElementClick, EventPriority::Normal,
                "ui".into(), format!("Click: {}", element_id))
            .with_payload(format!("{{\"id\":\"{}\"}}", element_id))
        )?;

        match action {
            Some("navigate:next")     => Ok(NavigationAction::Next),
            Some("navigate:previous") => Ok(NavigationAction::Previous),
            Some(s) if s.starts_with("navigate:page:") => {
                let num = s.trim_start_matches("navigate:page:")
                    .parse::<u32>()
                    .map_err(|_| RuntimeError::Other(format!("Invalid page number in action: {}", s)))?;
                Ok(NavigationAction::ToPage(num))
            }
            _ => Ok(NavigationAction::None),
        }
    }

    // ── State helpers ─────────────────────────────────────────────────────────

    /// Set arbitrary session state.
    pub fn set_state(&self, key: &str, value: &str) -> RuntimeResult<()> {
        self.state.set_session(key.into(), value.into())?;
        self.dispatcher.dispatch(
            Event::new(EventType::StateChanged, EventPriority::Low,
                "state".into(), format!("{}={}", key, value))
        )?;
        Ok(())
    }

    /// Get session state value.
    pub fn get_state(&self, key: &str) -> Option<String> {
        self.state.get_session(key).ok().flatten()
    }

    /// Snapshot current session state.
    pub fn snapshot(&self, id: &str) -> RuntimeResult<()> {
        self.state.create_snapshot(id.into())?;
        Ok(())
    }

    // ── Unload ────────────────────────────────────────────────────────────────

    /// Unload the session — fires DocumentUnloaded.
    pub fn unload(&self) {
        self.fire_page_exit();
        self.fire(EventType::DocumentUnloaded, "session", "Document unloaded");
    }

    /// Event count in history (for testing/inspection).
    pub fn event_count(&self) -> usize {
        self.dispatcher.history().len()
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    fn fire(&self, event_type: EventType, source: &str, message: &str) {
        let _ = self.dispatcher.dispatch(
            Event::new(event_type, EventPriority::Normal, source.into(), message.into())
        );
    }

    fn on_page_enter(&self, page: &LoadedPage) {
        let _ = self.state.set_session(
            "current_page_id".into(), page.id.clone()
        );
        let _ = self.state.set_session(
            "current_page_number".into(), page.number.to_string()
        );
        self.dispatcher.dispatch(
            Event::new(EventType::PageEnter, EventPriority::Normal,
                "navigation".into(), format!("Entered page: {}", page.title))
            .with_payload(format!("{{\"id\":\"{}\",\"number\":{}}}", page.id, page.number))
        ).ok();
    }

    fn fire_page_exit(&self) {
        if let Ok(page) = self.document.page_manager.current_page() {
            self.dispatcher.dispatch(
                Event::new(EventType::PageExit, EventPriority::Normal,
                    "navigation".into(), format!("Exiting page: {}", page.title))
                .with_payload(format!("{{\"id\":\"{}\",\"number\":{}}}", page.id, page.number))
            ).ok();
        }
    }
}

/// Result of a button click action.
#[derive(Debug, PartialEq)]
pub enum NavigationAction {
    None,
    Next,
    Previous,
    ToPage(u32),
}

#[cfg(test)]
mod tests {
    use super::*;
    use ldoc_core::DocumentBuilder;

    fn make_session() -> InteractiveSession {
        let bytes = DocumentBuilder::new("Test", "en", "Author")
            .build().expect("build");
        let doc = crate::loader::DocumentLoader::load_from_bytes(&bytes)
            .expect("load");
        InteractiveSession::new(doc)
    }

    #[test]
    fn test_session_creation() {
        let s = make_session();
        assert!(s.page_count() >= 1);
    }

    #[test]
    fn test_document_loaded_events_fired() {
        let s = make_session();
        let history = s.dispatcher.history();
        let types: Vec<&EventType> = history.iter().map(|e| &e.event_type).collect();
        assert!(types.contains(&&EventType::DocumentLoaded));
        assert!(types.contains(&&EventType::DocumentReady));
    }

    #[test]
    fn test_open_entry_fires_page_enter() {
        let s = make_session();
        s.open_entry().unwrap();
        let events = s.dispatcher.events_by_type(&EventType::PageEnter);
        assert_eq!(events.len(), 1);
    }

    #[test]
    fn test_open_entry_sets_state() {
        let s = make_session();
        s.open_entry().unwrap();
        assert!(s.get_state("current_page_number").is_some());
    }

    #[test]
    fn test_set_field_stores_value() {
        let s = make_session();
        s.set_field("name", "Alice").unwrap();
        assert_eq!(s.get_field("name"), Some("Alice".into()));
    }

    #[test]
    fn test_set_field_fires_form_input() {
        let s = make_session();
        s.set_field("email", "a@b.com").unwrap();
        let events = s.dispatcher.events_by_type(&EventType::FormInput);
        assert_eq!(events.len(), 1);
    }

    #[test]
    fn test_submit_form_fires_event() {
        let s = make_session();
        s.submit_form("contact").unwrap();
        let events = s.dispatcher.events_by_type(&EventType::FormSubmit);
        assert_eq!(events.len(), 1);
    }

    #[test]
    fn test_submit_form_sets_state() {
        let s = make_session();
        s.submit_form("contact").unwrap();
        assert_eq!(s.get_state("form.contact.submitted"), Some("true".into()));
    }

    #[test]
    fn test_handle_click_next() {
        let s = make_session();
        let action = s.handle_click("btn-next", Some("navigate:next")).unwrap();
        assert_eq!(action, NavigationAction::Next);
    }

    #[test]
    fn test_handle_click_prev() {
        let s = make_session();
        let action = s.handle_click("btn-prev", Some("navigate:previous")).unwrap();
        assert_eq!(action, NavigationAction::Previous);
    }

    #[test]
    fn test_handle_click_to_page() {
        let s = make_session();
        let action = s.handle_click("btn-p3", Some("navigate:page:3")).unwrap();
        assert_eq!(action, NavigationAction::ToPage(3));
    }

    #[test]
    fn test_handle_click_none() {
        let s = make_session();
        let action = s.handle_click("btn-ok", None).unwrap();
        assert_eq!(action, NavigationAction::None);
    }

    #[test]
    fn test_handle_click_fires_event() {
        let s = make_session();
        s.handle_click("btn", None).unwrap();
        let events = s.dispatcher.events_by_type(&EventType::ElementClick);
        assert_eq!(events.len(), 1);
    }

    #[test]
    fn test_set_state_fires_event() {
        let s = make_session();
        s.set_state("theme", "dark").unwrap();
        let events = s.dispatcher.events_by_type(&EventType::StateChanged);
        assert_eq!(events.len(), 1);
    }

    #[test]
    fn test_state_persists_across_pages() {
        let s = make_session();
        s.set_state("user", "bob").unwrap();
        // Even after navigation attempt, state persists
        let _ = s.next_page(); // may fail if only 1 page — that's fine
        assert_eq!(s.get_state("user"), Some("bob".into()));
    }

    #[test]
    fn test_unload_fires_event() {
        let s = make_session();
        s.open_entry().unwrap();
        s.unload();
        let events = s.dispatcher.events_by_type(&EventType::DocumentUnloaded);
        assert_eq!(events.len(), 1);
    }

    #[test]
    fn test_snapshot() {
        let s = make_session();
        s.set_state("key", "val").unwrap();
        s.snapshot("snap1").unwrap();
        assert_eq!(s.state.snapshot_count(), 1);
    }
}
