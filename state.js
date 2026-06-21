// Centralized Application State Manager

class AppStateManager {
  constructor() {
    this.db = null; // Will hold AgendaDatabase
    this.activeViewId = null;
    this.activeRowIndex = 0;
    this.clipboard = null;
    this.filters = {
      text: '',
      assignee: '',
      showDone: false
    };
    this.collapsedSections = new Set();
  }

  init(databaseInstance) {
    this.db = databaseInstance;
    // Set default view to the first available view if not set
    if (!this.activeViewId && this.db.views.length > 0) {
      this.activeViewId = this.db.views[0].id;
    }
  }

  getActiveView() {
    if (!this.db) return null;
    return this.db.views.find(v => v.id === this.activeViewId) || this.db.views[0];
  }

  setActiveView(viewId) {
    this.activeViewId = viewId;
    this.activeRowIndex = 0;
  }

  getActiveRowIndex() {
    return this.activeRowIndex;
  }

  setActiveRowIndex(index) {
    this.activeRowIndex = Math.max(0, index);
  }

  getFilters() {
    return this.filters;
  }

  setFilters(newFilters) {
    this.filters = { ...this.filters, ...newFilters };
  }

  getCollapsedSections() {
    return this.collapsedSections;
  }

  toggleSectionCollapse(sectionId) {
    if (this.collapsedSections.has(sectionId)) {
      this.collapsedSections.delete(sectionId);
    } else {
      this.collapsedSections.add(sectionId);
    }
  }
}

// Export as a global singleton for the vanilla JS environment
window.App = new AppStateManager();
