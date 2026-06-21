// F8 View Manager Logic

let activeViewIndex = 0;

window.openViewManager = function() {
  const modal = document.getElementById('view-manager-modal');
  const listContainer = document.getElementById('view-list');
  
  if (!modal || !listContainer) return;
  
  // Fetch views from database
  const availableViews = window.App.db.views;
  
  if (!modal || !listContainer) return;
  
  // Show modal
  modal.showModal();
  
  // Determine current view from header
  const viewTitle = document.getElementById('view-title');
  if (viewTitle) {
    const currentView = viewTitle.textContent;
    const idx = availableViews.indexOf(currentView);
    if (idx !== -1) {
      activeViewIndex = idx;
    }
  }
  
  const renderList = () => {
    listContainer.innerHTML = '';
    availableViews.forEach((view, idx) => {
      const li = document.createElement('li');
      li.textContent = view.name;
      li.dataset.viewId = view.id;
      if (idx === activeViewIndex) {
        li.classList.add('selected');
      }
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        activeViewIndex = idx;
        renderList();
      });
      li.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        activeViewIndex = idx;
        selectActiveView();
      });
      listContainer.appendChild(li);
    });
  };
  
  renderList();
  
  const handleModalClick = (e) => {
    if (e.target === modal) {
      closeModal();
    }
  };
  modal.addEventListener('click', handleModalClick);
  
  // Create View Logic
  const newViewNameInput = document.getElementById('new-view-name');
  const newViewLayoutSelect = document.getElementById('new-view-layout');
  const newViewSectionSelect = document.getElementById('new-view-section');
  const newViewColSectionSelect = document.getElementById('new-view-col-section');
  const btnCreateView = document.getElementById('btn-create-view');
  
  if (newViewSectionSelect) {
    newViewSectionSelect.innerHTML = '<option value="">No Sections (Flat)</option>';
    if (newViewColSectionSelect) {
      newViewColSectionSelect.innerHTML = '<option value="">Select Column Axis...</option>';
    }
    
    // Find all root categories and populate dropdown
    const rootCats = Object.values(window.App.db.categories)
      .filter(c => c.parentId === null)
      .sort((a, b) => a.name.localeCompare(b.name));
      
    rootCats.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = 'Group by ' + cat.name;
      newViewSectionSelect.appendChild(option);
      
      if (newViewColSectionSelect) {
        const colOption = document.createElement('option');
        colOption.value = cat.id;
        colOption.textContent = 'Cols by ' + cat.name;
        newViewColSectionSelect.appendChild(colOption);
      }
    });
  }
  
  if (newViewLayoutSelect && newViewColSectionSelect) {
    newViewLayoutSelect.onchange = () => {
      if (newViewLayoutSelect.value === 'matrix') {
        newViewColSectionSelect.classList.remove('hidden');
      } else {
        newViewColSectionSelect.classList.add('hidden');
      }
    };
  }
  
  const createNewView = () => {
    const name = newViewNameInput.value.trim();
    
    const layout = newViewLayoutSelect ? newViewLayoutSelect.value : 'outliner';
    const sectionCatId = newViewSectionSelect.value || null;
    let colSectionCatId = (layout === 'matrix' && newViewColSectionSelect) ? newViewColSectionSelect.value : null;
    
    // Auto-select column category if not chosen and switching to matrix
    if (layout === 'matrix' && !colSectionCatId) {
      if (window.App.db.categories['root-status']) {
        colSectionCatId = 'root-status';
      }
    }
    
    if (!name) {
      // If name is blank, update the currently selected view in the list
      const activeView = availableViews[activeViewIndex];
      if (activeView) {
        activeView.layout = layout;
        activeView.sectionCategoryId = sectionCatId;
        activeView.columnCategoryId = colSectionCatId;
        renderList();
        selectActiveView();
        closeModal();
      }
      return;
    }
    
    const newView = window.App.db.addView(name, sectionCatId, false, layout, colSectionCatId);
    
    // Select the new view automatically
    activeViewIndex = availableViews.length - 1;
    newViewNameInput.value = '';
    
    renderList();
    selectActiveView();
  };
  
  btnCreateView.onclick = createNewView;
  
  const triggerCreateOnEnter = (e) => {
    if (e.key === 'Enter') {
      e.stopPropagation(); // prevent modal from catching it
      createNewView();
    }
  };
  
  newViewNameInput.onkeydown = triggerCreateOnEnter;
  if (newViewLayoutSelect) newViewLayoutSelect.addEventListener('keydown', triggerCreateOnEnter);
  if (newViewSectionSelect) newViewSectionSelect.addEventListener('keydown', triggerCreateOnEnter);
  if (newViewColSectionSelect) newViewColSectionSelect.addEventListener('keydown', triggerCreateOnEnter);
  
  // Create a keyboard handler specific to the modal
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (activeViewIndex < availableViews.length - 1) {
        activeViewIndex++;
        renderList();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (activeViewIndex > 0) {
        activeViewIndex--;
        renderList();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      selectActiveView();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    }
  };
  
  const selectActiveView = () => {
    const selectedView = availableViews[activeViewIndex];
    if (viewTitle) {
      viewTitle.textContent = selectedView.name;
    }
    window.App.activeViewId = selectedView.id;
    if (typeof window.renderGrid === 'function') {
      window.window.App.activeRowIndex = 0; // reset selection
      window.renderGrid();
    }
    closeModal();
  };
  
  const closeModal = () => {
    modal.close();
    window.removeEventListener('keydown', handleKeyDown, true);
    document.getElementById('grid-container').focus();
  };
  
  // Use capturing phase so we intercept before fkeys.js or grid.js
  window.addEventListener('keydown', handleKeyDown, true);
};
