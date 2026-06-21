// Properties Panel Logic (F6)

let currentSaveCallback = null;
let currentPropertyMode = null;

window.refreshPropertiesPanel = function(mode = null) {
  const propertiesPanel = document.getElementById('properties-panel');
  if (propertiesPanel && !propertiesPanel.classList.contains('hidden')) {
    if (currentSaveCallback) currentSaveCallback();
    window.openPropertiesPanel(mode || currentPropertyMode, false);
  }
};

window.openPropertiesPanel = function(mode, stealFocus = true) {
  const propertiesPanel = document.getElementById('properties-panel');
  const panelTitle = document.getElementById('panel-title');
  const panelContent = document.getElementById('panel-content');
  const categorySidebar = document.getElementById('category-sidebar');
  
  if (currentSaveCallback) currentSaveCallback();
  currentSaveCallback = null;
  currentPropertyMode = mode;
  
  if (mode === 'category') {
    // CATEGORY PROPERTIES
    const cat = typeof window.getActiveCategoryData === 'function' ? window.getActiveCategoryData() : null;
    console.log("refreshPropertiesPanel", "mode:", mode, "cat:", cat, "activeCategoryIndex:", window.activeCategoryIndex);
    if (!cat) return;
    
    panelTitle.textContent = "Category Properties (F6)";
    propertiesPanel.classList.remove('hidden');
    document.getElementById('resizer-right')?.classList.remove('hidden');
    
    // Gather categories for dropdown to prevent cyclic parenting
    const descendants = window.App.db.getDescendants(cat.id);
    const allCategories = Object.values(window.App.db.categories)
      .filter(c => c.id !== cat.id && !descendants.includes(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));
      
    let parentOptions = `<option value="">(None - Root Level)</option>`;
    allCategories.forEach(c => {
      const selected = c.id === cat.parentId ? 'selected' : '';
      parentOptions += `<option value="${c.id}" ${selected}>${c.name}</option>`;
    });

    panelContent.innerHTML = `
      <div class="property-form">
        <div class="property-group">
          <label>Category Name</label>
          <input type="text" id="prop-cat-name" tabindex="1" value="${cat.name}" />
        </div>
        <div class="property-group">
          <label>Category ID (Internal)</label>
          <input type="text" readonly value="${cat.id}" />
        </div>
        <div class="property-group">
          <label>Parent Category</label>
          <select id="prop-cat-parent" tabindex="2">
            ${parentOptions}
          </select>
        </div>
        <div class="property-group checkbox-group">
          <input type="checkbox" id="prop-cat-exclusive" tabindex="3" ${cat.exclusive ? 'checked' : ''} />
          <label for="prop-cat-exclusive">Mutually Exclusive Children</label>
        </div>
        <div style="margin-top: 16px; font-size: 0.85rem; opacity: 0.7;">Press Escape to close</div>
      </div>
    `;
    
    const catNameInput = document.getElementById('prop-cat-name');
    const catParentSelect = document.getElementById('prop-cat-parent');
    const catExclusiveInput = document.getElementById('prop-cat-exclusive');
    
    currentSaveCallback = () => {
      window.App.db.updateCategory(cat.id, {
        name: catNameInput.value,
        parentId: catParentSelect.value || null,
        exclusive: catExclusiveInput.checked
      });
      if (typeof window.renderCategoryTree === 'function') window.renderCategoryTree();
    };
    
    const autoSave = () => {
      if (currentSaveCallback) currentSaveCallback();
    };
    
    catNameInput.addEventListener('change', autoSave);
    catParentSelect.addEventListener('change', autoSave);
    catExclusiveInput.addEventListener('change', autoSave);
    
    const closePanel = () => {
      autoSave();
      currentSaveCallback = null;
      propertiesPanel.classList.add('hidden');
      document.getElementById('resizer-right')?.classList.add('hidden');
      document.getElementById('category-sidebar').focus();
    };
    
    const propForm = panelContent.querySelector('.property-form');
    propForm.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
      }
    });
    
    if (stealFocus) setTimeout(() => catNameInput.focus(), 10);
    return;
  }
  
  // ITEM PROPERTIES
  const activeRow = window.getActiveRowData();
  if (!activeRow || activeRow.isSectionHeader) {
    // Might be a section header
    panelTitle.textContent = "Properties (F6)";
    propertiesPanel.classList.remove('hidden');
    document.getElementById('resizer-right')?.classList.remove('hidden');
    panelContent.innerHTML = "<p style='padding:10px'>Properties are only available for individual items, not section headers.</p>";
    return;
  }

  panelTitle.textContent = "Object Properties (F6)";
  propertiesPanel.classList.remove('hidden');
  document.getElementById('resizer-right')?.classList.remove('hidden');
  
  // Build the form
  panelContent.innerHTML = `
    <div class="property-form">
      <div class="property-group">
        <label>Item Text</label>
        <textarea id="prop-item-text" rows="3" tabindex="1">${activeRow.text}</textarea>
      </div>
      <div class="property-group">
        <label>Assignee</label>
        <input type="text" id="prop-assignee" tabindex="2" />
      </div>
      <div class="property-group">
        <label>Due Date</label>
        <input type="text" id="prop-due" tabindex="3" />
      </div>
      <div class="property-group">
        <label>Entry Date (Read-Only)</label>
        <input type="text" id="prop-entry" readonly value="${activeRow.entryDate || activeRow.entry || ''}" />
      </div>
      <div class="property-group checkbox-group">
        <input type="checkbox" id="prop-done" tabindex="4" ${activeRow.done ? 'checked' : ''} />
        <label for="prop-done">Done / Completed</label>
      </div>
      <div style="margin-top: 16px; font-size: 0.85rem; opacity: 0.7;">Press Escape to close</div>
    </div>
  `;

  const itemTextInput = document.getElementById('prop-item-text');
  const assigneeInput = document.getElementById('prop-assignee');
  const dueInput = document.getElementById('prop-due');
  const doneInput = document.getElementById('prop-done');

  const rowAssignee = window.App.db.getCategoryAssignmentName(activeRow, 'root-who') || activeRow.assignee || '';
  const rowDue = window.App.db.getCategoryAssignmentName(activeRow, 'root-when') || activeRow.due || '';
  
  assigneeInput.value = rowAssignee;
  dueInput.value = rowDue;

  currentSaveCallback = () => {
    let changed = false;
    if (itemTextInput.value !== activeRow.text) {
      window.App.db.updateItem(activeRow.id, { text: itemTextInput.value });
      changed = true;
    }
    
    if (assigneeInput.value && assigneeInput.value !== rowAssignee) {
      let catId = 'who-' + assigneeInput.value.toLowerCase().replace(/\s+/g, '-');
      if (!window.App.db.categories[catId]) {
        window.App.db.addCategory(catId, assigneeInput.value, 'root-who');
      }
      window.App.db.assignCategory(activeRow, catId);
      changed = true;
    }
    
    if (dueInput.value && dueInput.value !== rowDue) {
      let parsed = typeof parseDate === 'function' ? parseDate(dueInput.value) : dueInput.value;
      if (!parsed) parsed = dueInput.value;
      let catId = 'date-' + parsed;
      if (!window.App.db.categories[catId]) {
        window.App.db.addCategory(catId, parsed, 'root-when', { indexed: false });
      }
      window.App.db.assignCategory(activeRow, catId);
      changed = true;
    }
    
    if (doneInput.checked !== !!activeRow.done) {
      window.App.db.updateItem(activeRow.id, { done: doneInput.checked });
      changed = true;
    }
    
    if (changed && typeof window.renderGrid === 'function') {
      window.renderGrid();
    }
  };
  
  const autoSave = () => {
    if (currentSaveCallback) currentSaveCallback();
  };

  itemTextInput.addEventListener('change', autoSave);
  assigneeInput.addEventListener('change', autoSave);
  dueInput.addEventListener('change', autoSave);
  doneInput.addEventListener('change', autoSave);

  const closePanel = () => {
    autoSave();
    currentSaveCallback = null;
    propertiesPanel.classList.add('hidden');
    document.getElementById('grid-container').focus();
  };

  const propForm = panelContent.querySelector('.property-form');
  propForm.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closePanel();
    }
  });

  if (stealFocus) itemTextInput.focus();
};
