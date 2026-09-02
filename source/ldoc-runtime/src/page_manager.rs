// LDOC Runtime — Page Manager
// Navigation over loaded pages: open, next, previous, first, last, by ID, by number.

use std::sync::Arc;
use parking_lot::RwLock;
use crate::error::{RuntimeError, RuntimeResult};
use ldoc_core::pages::{PageContent, PageLayout};

/// A fully loaded page with content and optional layout.
#[derive(Debug, Clone)]
pub struct LoadedPage {
    pub id: String,
    pub title: String,
    pub number: u32,
    pub visible: bool,
    pub page_type: String,
    pub parent_id: Option<String>,
    pub children: Vec<String>,
    pub content: PageContent,
    pub layout: Option<PageLayout>,
}

/// Summary of a page (for listing without full content).
#[derive(Debug, Clone)]
pub struct PageSummary {
    pub id: String,
    pub title: String,
    pub number: u32,
    pub visible: bool,
    pub page_type: String,
    pub parent_id: Option<String>,
    pub children: Vec<String>,
}

impl From<&LoadedPage> for PageSummary {
    fn from(p: &LoadedPage) -> Self {
        PageSummary {
            id: p.id.clone(),
            title: p.title.clone(),
            number: p.number,
            visible: p.visible,
            page_type: p.page_type.clone(),
            parent_id: p.parent_id.clone(),
            children: p.children.clone(),
        }
    }
}

/// Page manager — owns all loaded pages and tracks the current position.
pub struct PageManager {
    pages: Vec<LoadedPage>,
    current_index: Arc<RwLock<usize>>,
    entry_page_id: String,
}

impl PageManager {
    /// Create a new page manager.
    ///
    /// `entry_page_id` is the page that should be opened first (from the manifest).
    /// If it is empty or not found, the first page is used.
    pub fn new(pages: Vec<LoadedPage>, entry_page_id: String) -> Self {
        let initial = if entry_page_id.is_empty() {
            0
        } else {
            pages.iter().position(|p| p.id == entry_page_id).unwrap_or(0)
        };

        Self {
            pages,
            current_index: Arc::new(RwLock::new(initial)),
            entry_page_id,
        }
    }

    // ── Counts ────────────────────────────────────────────────────────────────

    pub fn page_count(&self) -> usize {
        self.pages.len()
    }

    pub fn current_number(&self) -> u32 {
        let idx = *self.current_index.read();
        self.pages.get(idx).map(|p| p.number).unwrap_or(0)
    }

    pub fn current_index(&self) -> usize {
        *self.current_index.read()
    }

    // ── Current page ──────────────────────────────────────────────────────────

    pub fn current_page(&self) -> RuntimeResult<&LoadedPage> {
        let idx = *self.current_index.read();
        self.pages.get(idx)
            .ok_or_else(|| RuntimeError::PageError("No current page".into()))
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    /// Open the entry page (as declared in the manifest).
    pub fn open_entry(&self) -> RuntimeResult<&LoadedPage> {
        self.open_by_id(&self.entry_page_id.clone())
            .or_else(|_| self.first())
    }

    /// Open the first page.
    pub fn first(&self) -> RuntimeResult<&LoadedPage> {
        if self.pages.is_empty() {
            return Err(RuntimeError::PageError("Document has no pages".into()));
        }
        *self.current_index.write() = 0;
        Ok(&self.pages[0])
    }

    /// Open the last page.
    pub fn last(&self) -> RuntimeResult<&LoadedPage> {
        if self.pages.is_empty() {
            return Err(RuntimeError::PageError("Document has no pages".into()));
        }
        let last = self.pages.len() - 1;
        *self.current_index.write() = last;
        Ok(&self.pages[last])
    }

    /// Advance to the next page. Returns error if already on the last page.
    pub fn next(&self) -> RuntimeResult<&LoadedPage> {
        let idx = *self.current_index.read();
        let next = idx + 1;
        if next >= self.pages.len() {
            return Err(RuntimeError::PageError("Already on the last page".into()));
        }
        *self.current_index.write() = next;
        Ok(&self.pages[next])
    }

    /// Go back to the previous page. Returns error if already on the first page.
    pub fn previous(&self) -> RuntimeResult<&LoadedPage> {
        let idx = *self.current_index.read();
        if idx == 0 {
            return Err(RuntimeError::PageError("Already on the first page".into()));
        }
        let prev = idx - 1;
        *self.current_index.write() = prev;
        Ok(&self.pages[prev])
    }

    /// Open a page by its ID.
    pub fn open_by_id(&self, id: &str) -> RuntimeResult<&LoadedPage> {
        let pos = self.pages.iter().position(|p| p.id == id)
            .ok_or_else(|| RuntimeError::PageError(format!("Page not found: {}", id)))?;
        *self.current_index.write() = pos;
        Ok(&self.pages[pos])
    }

    /// Open a page by its 1-based page number.
    pub fn open_by_number(&self, number: u32) -> RuntimeResult<&LoadedPage> {
        let pos = self.pages.iter().position(|p| p.number == number)
            .ok_or_else(|| RuntimeError::PageError(format!("Page number not found: {}", number)))?;
        *self.current_index.write() = pos;
        Ok(&self.pages[pos])
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    /// Get a page by ID without changing the current position.
    pub fn get_by_id(&self, id: &str) -> RuntimeResult<&LoadedPage> {
        self.pages.iter().find(|p| p.id == id)
            .ok_or_else(|| RuntimeError::PageError(format!("Page not found: {}", id)))
    }

    /// List summaries of all pages.
    pub fn list_pages(&self) -> Vec<PageSummary> {
        self.pages.iter().map(PageSummary::from).collect()
    }

    /// List summaries of visible pages only.
    pub fn list_visible_pages(&self) -> Vec<PageSummary> {
        self.pages.iter().filter(|p| p.visible).map(PageSummary::from).collect()
    }

    /// List summaries of top-level pages (no parent).
    pub fn list_root_pages(&self) -> Vec<PageSummary> {
        self.pages.iter()
            .filter(|p| p.parent_id.is_none())
            .map(PageSummary::from)
            .collect()
    }

    /// Get children of a page by parent ID.
    pub fn children_of(&self, parent_id: &str) -> Vec<PageSummary> {
        self.pages.iter()
            .filter(|p| p.parent_id.as_deref() == Some(parent_id))
            .map(PageSummary::from)
            .collect()
    }

    /// Check whether there is a next page.
    pub fn has_next(&self) -> bool {
        *self.current_index.read() + 1 < self.pages.len()
    }

    /// Check whether there is a previous page.
    pub fn has_previous(&self) -> bool {
        *self.current_index.read() > 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ldoc_core::pages::{PageContent, ContentNode};

    fn make_page(id: &str, number: u32) -> LoadedPage {
        let root = ContentNode::container(&format!("{}-root", id));
        LoadedPage {
            id: id.to_string(),
            title: format!("Page {}", number),
            number,
            visible: true,
            page_type: "standard".to_string(),
            parent_id: None,
            children: vec![],
            content: PageContent {
                schema_version: "1.0.0".to_string(),
                page_id: id.to_string(),
                root,
            },
            layout: None,
        }
    }

    fn three_page_manager() -> PageManager {
        let pages = vec![
            make_page("p1", 1),
            make_page("p2", 2),
            make_page("p3", 3),
        ];
        PageManager::new(pages, "p1".to_string())
    }

    #[test]
    fn test_page_count() {
        let pm = three_page_manager();
        assert_eq!(pm.page_count(), 3);
    }

    #[test]
    fn test_entry_page() {
        let pm = three_page_manager();
        let page = pm.open_entry().unwrap();
        assert_eq!(page.id, "p1");
    }

    #[test]
    fn test_first_page() {
        let pm = three_page_manager();
        let page = pm.first().unwrap();
        assert_eq!(page.id, "p1");
    }

    #[test]
    fn test_last_page() {
        let pm = three_page_manager();
        let page = pm.last().unwrap();
        assert_eq!(page.id, "p3");
    }

    #[test]
    fn test_next_page() {
        let pm = three_page_manager();
        pm.first().unwrap();
        let page = pm.next().unwrap();
        assert_eq!(page.id, "p2");
    }

    #[test]
    fn test_previous_page() {
        let pm = three_page_manager();
        pm.last().unwrap();
        let page = pm.previous().unwrap();
        assert_eq!(page.id, "p2");
    }

    #[test]
    fn test_next_at_end_errors() {
        let pm = three_page_manager();
        pm.last().unwrap();
        assert!(pm.next().is_err());
    }

    #[test]
    fn test_previous_at_start_errors() {
        let pm = three_page_manager();
        pm.first().unwrap();
        assert!(pm.previous().is_err());
    }

    #[test]
    fn test_open_by_id() {
        let pm = three_page_manager();
        let page = pm.open_by_id("p2").unwrap();
        assert_eq!(page.id, "p2");
        assert_eq!(pm.current_index(), 1);
    }

    #[test]
    fn test_open_by_id_not_found() {
        let pm = three_page_manager();
        assert!(pm.open_by_id("nonexistent").is_err());
    }

    #[test]
    fn test_open_by_number() {
        let pm = three_page_manager();
        let page = pm.open_by_number(3).unwrap();
        assert_eq!(page.id, "p3");
    }

    #[test]
    fn test_open_by_number_not_found() {
        let pm = three_page_manager();
        assert!(pm.open_by_number(99).is_err());
    }

    #[test]
    fn test_list_pages() {
        let pm = three_page_manager();
        let list = pm.list_pages();
        assert_eq!(list.len(), 3);
    }

    #[test]
    fn test_list_visible_pages() {
        let mut pages = vec![make_page("p1", 1), make_page("p2", 2)];
        pages[1].visible = false;
        let pm = PageManager::new(pages, "p1".to_string());
        assert_eq!(pm.list_visible_pages().len(), 1);
    }

    #[test]
    fn test_has_next_and_previous() {
        let pm = three_page_manager();
        pm.first().unwrap();
        assert!(pm.has_next());
        assert!(!pm.has_previous());
        pm.last().unwrap();
        assert!(!pm.has_next());
        assert!(pm.has_previous());
    }

    #[test]
    fn test_current_number() {
        let pm = three_page_manager();
        pm.open_by_id("p2").unwrap();
        assert_eq!(pm.current_number(), 2);
    }

    #[test]
    fn test_empty_manager_errors() {
        let pm = PageManager::new(vec![], String::new());
        assert!(pm.first().is_err());
        assert!(pm.last().is_err());
        assert!(pm.next().is_err());
        assert!(pm.previous().is_err());
    }

    #[test]
    fn test_get_by_id_no_navigation() {
        let pm = three_page_manager();
        pm.first().unwrap();
        let page = pm.get_by_id("p3").unwrap();
        assert_eq!(page.id, "p3");
        // current position unchanged
        assert_eq!(pm.current_index(), 0);
    }

    #[test]
    fn test_children_of() {
        let mut pages = vec![make_page("parent", 1), make_page("child", 2)];
        pages[1].parent_id = Some("parent".to_string());
        let pm = PageManager::new(pages, "parent".to_string());
        let children = pm.children_of("parent");
        assert_eq!(children.len(), 1);
        assert_eq!(children[0].id, "child");
    }
}
