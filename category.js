// Category Data is dynamically pulled from window.App.db.categories
let categoryExpandedState = {}; // id -> boolean

function syncCategoryData() {
  const flatData = [];
  
  function walk(parentId, depth) {
    const children = Object.values(window.App.db.categories).filter(c => c.parentId === parentId);
    // Sort by name for consistency
    children.sort((a, b) => a.name.localeCompare(b.name));
    
    children.forEach(c => {
      const expanded = categoryExpandedState[c.id] !== undefined ? categoryExpandedState[c.id] : true;
      categoryExpandedState[c.id] = expanded; // save it
      
      flatData.push({ id: c.id, name: c.name, depth, expanded, node: c });
      
      // We always add children to flatData, but getVisibleCategories will hide them if parent is not expanded
      walk(c.id, depth + 1);
    });
  }
  
  walk(null, 0);
  return flatData;
}

let activeCategoryIndex = 0;
const categoryTreeElement = document.getElementById('category-tree');

// Make sidebar focusable
document.getElementById('category-sidebar').tabIndex = -1;

window.getActiveCategoryData = function() {
  const visibleCategories = getVisibleCategories();
  return visibleCategories[activeCategoryIndex] ? visibleCategories[activeCategoryIndex].node : null;
};

function getVisibleCategories() {
  const visible = [];
  let hideDepth = -1;
  
  const flatData = syncCategoryData();
  
  for (let i = 0; i < flatData.length; i++) {
    const item = flatData[i];
    const node = item.node;
    
    // Filter out deleted categories
    if (node.deleted) continue;
    
    // If we are currently hiding children because a parent is collapsed
    if (hideDepth !== -1) {
      if (item.depth > hideDepth) {
        continue; // Skip child
      } else {
        hideDepth = -1; // We reached a sibling or higher, stop hiding
      }
    }
    
    visible.push({ index: i, node, expanded: item.expanded, depth: item.depth });
    
    // If this node is collapsed, hide all subsequent nodes with greater depth
    if (!item.expanded) {
      hideDepth = item.depth;
    }
  }
  
  return visible;
}

function renderCategoryTree() {
  categoryTreeElement.innerHTML = '';
  const visibleCategories = getVisibleCategories();
  
  if (activeCategoryIndex >= visibleCategories.length) {
    activeCategoryIndex = visibleCategories.length - 1;
  }
  if (activeCategoryIndex < 0) activeCategoryIndex = 0;
  
  visibleCategories.forEach((item, visibleIdx) => {
    const div = document.createElement('div');
    div.dataset.visibleIdx = visibleIdx;
    div.textContent = item.node.name;
    div.style.paddingLeft = `${item.depth * 15}px`;
    div.style.paddingTop = '4px';
    div.style.paddingBottom = '4px';
    div.style.cursor = 'pointer';
    div.style.userSelect = 'none';
    
    const flatData = syncCategoryData();
    const nextNode = flatData[item.index + 1];
    const hasChildren = nextNode && nextNode.depth > item.depth;
    
    // We use innerHTML to wrap the toggle icon so we can detect clicks on it
    let prefix = '';
    if (hasChildren) {
      prefix = `<span class="toggle-icon" style="display:inline-block; width:20px; text-align:center;">${item.expanded ? '▼' : '▶'}</span>`;
    } else {
      prefix = `<span style="display:inline-block; width:20px; text-align:center;">•</span>`;
    }
    
    div.innerHTML = prefix + escapeHtml(item.node.name);
    
    if (visibleIdx === activeCategoryIndex) {
      div.classList.add('active-cell');
    }
    
    categoryTreeElement.appendChild(div);
  });
}

// Simple HTML escaping to prevent XSS since we are using innerHTML
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// EVENT DELEGATION
categoryTreeElement.addEventListener('click', (e) => {
  const div = e.target.closest('div');
  if (!div || !div.dataset.visibleIdx) return;
  e.stopPropagation();
  
  const targetIdx = parseInt(div.dataset.visibleIdx, 10);
  activeCategoryIndex = targetIdx;
  
  // If the toggle icon was clicked, toggle expansion
  if (e.target.classList.contains('toggle-icon')) {
    const visibleCategories = getVisibleCategories();
    const currentItem = visibleCategories[activeCategoryIndex];
    if (currentItem) {
      categoryExpandedState[currentItem.node.id] = !currentItem.expanded;
    }
  }
  
  renderCategoryTree();
  if (typeof window.refreshPropertiesPanel === 'function') window.refreshPropertiesPanel('category');
  document.getElementById('category-sidebar').focus();
});

categoryTreeElement.addEventListener('dblclick', (e) => {
  const div = e.target.closest('div');
  if (!div || !div.dataset.visibleIdx || div.querySelector('input')) return;
  e.stopPropagation();
  activeCategoryIndex = parseInt(div.dataset.visibleIdx, 10);
  renderCategoryTree();
  triggerCategoryEdit();
});

function triggerCategoryEdit() {
  const visibleCategories = getVisibleCategories();
  if (visibleCategories.length === 0) return;
  
  const currentItem = visibleCategories[activeCategoryIndex];
  const divElements = categoryTreeElement.children;
  const targetDiv = divElements[activeCategoryIndex];
  
  if (!targetDiv) return;
  
  const originalText = currentItem.node.name;
  
  // Replace text with an input
  targetDiv.innerHTML = '';
  // Preserve spacing
  targetDiv.style.paddingLeft = `${currentItem.depth * 15}px`;
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = originalText;
  input.style.width = '150px';
  input.style.background = 'var(--bg)';
  input.style.color = 'var(--text)';
  input.style.border = '1px solid var(--border-focus)';
  input.style.outline = 'none';
  
  targetDiv.appendChild(input);
  input.focus();
  input.select();
  
  const finishEdit = () => {
    const newName = input.value.trim();
    if (newName && newName !== originalText) {
      currentItem.node.name = newName;
      // In a real app we'd call db.updateCategory(id, {name})
    }
    renderCategoryTree();
    document.getElementById('category-sidebar').focus();
  };
  
  input.addEventListener('blur', finishEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      input.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      input.value = originalText; // Cancel
      input.blur();
    } else {
      e.stopPropagation(); // Prevent sidebar from catching keys
    }
  });
}

// Global accessor to open category manager
window.openCategoryManager = function() {
  document.getElementById('category-sidebar').classList.remove('hidden');
  renderCategoryTree();
  document.getElementById('category-sidebar').focus();
};

document.getElementById('category-sidebar').addEventListener('keydown', (e) => {
  const visibleCategories = getVisibleCategories();
  
  if (e.key === 'Escape' || e.key === 'F9') {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('category-sidebar').classList.add('hidden');
    document.getElementById('grid-container').focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    e.stopPropagation();
    if (activeCategoryIndex > 0) {
      activeCategoryIndex--;
      renderCategoryTree();
      if (typeof window.refreshPropertiesPanel === 'function') window.refreshPropertiesPanel('category');
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    e.stopPropagation();
    if (activeCategoryIndex < visibleCategories.length - 1) {
      activeCategoryIndex++;
      renderCategoryTree();
      if (typeof window.refreshPropertiesPanel === 'function') window.refreshPropertiesPanel('category');
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    e.stopPropagation();
    const currentItem = visibleCategories[activeCategoryIndex];
    if (currentItem.expanded) {
      categoryExpandedState[currentItem.node.id] = false;
      renderCategoryTree();
    }
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    e.stopPropagation();
    const currentItem = visibleCategories[activeCategoryIndex];
    if (!currentItem.expanded) {
      categoryExpandedState[currentItem.node.id] = true;
      renderCategoryTree();
    }
  } else if (e.key === 'm' || e.key === 'M') {
    e.preventDefault();
    e.stopPropagation();
    const currentItem = visibleCategories[activeCategoryIndex];
    if (!currentItem) return;
    
    // Build a dynamic modal dialog with a dropdown
    const dialog = document.createElement('dialog');
    dialog.style.padding = '20px';
    dialog.style.background = 'var(--bg)';
    dialog.style.color = 'var(--text)';
    dialog.style.border = '1px solid var(--border)';
    dialog.style.borderRadius = '4px';
    dialog.style.minWidth = '300px';
    
    const label = document.createElement('label');
    label.textContent = `Merge '${currentItem.node.name}' into:`;
    label.style.display = 'block';
    label.style.marginBottom = '10px';
    
    const select = document.createElement('select');
    select.style.width = '100%';
    select.style.marginBottom = '15px';
    select.style.padding = '5px';
    
    // Populate select with all categories except self and deleted
    const allCats = Object.values(window.App.db.categories)
      .filter(c => !c.deleted && c.id !== currentItem.node.id)
      .sort((a, b) => a.name.localeCompare(b.name));
      
    for (const c of allCats) {
      const option = document.createElement('option');
      option.value = c.id;
      option.textContent = c.name;
      select.appendChild(option);
    }
    
    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.justifyContent = 'flex-end';
    btnContainer.style.gap = '10px';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => { dialog.close(); dialog.remove(); document.getElementById('category-sidebar').focus(); };
    
    const mergeBtn = document.createElement('button');
    mergeBtn.textContent = 'Merge';
    mergeBtn.onclick = () => {
      const targetId = select.value;
      if (!targetId) return;
      const targetCat = window.App.db.categories[targetId];
      if (confirm(`Are you sure you want to merge '${currentItem.node.name}' into '${targetCat.name}'?`)) {
        window.App.db.mergeCategory(currentItem.node.id, targetId);
        renderCategoryTree();
        
        const newVisibles = getVisibleCategories();
        const targetIdx = newVisibles.findIndex(c => c.node.id === targetId);
        if (targetIdx !== -1) {
          activeCategoryIndex = targetIdx;
          renderCategoryTree();
        }
        if (typeof window.refreshPropertiesPanel === 'function') window.refreshPropertiesPanel('category');
        if (typeof window.App.grid.render === 'function') window.App.grid.render();
      }
      dialog.close();
      dialog.remove();
      document.getElementById('category-sidebar').focus();
    };
    
    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(mergeBtn);
    
    dialog.appendChild(label);
    dialog.appendChild(select);
    dialog.appendChild(btnContainer);
    
    document.body.appendChild(dialog);
    dialog.showModal();
    select.focus();
    
    dialog.addEventListener('keydown', (de) => {
      de.stopPropagation();
      if (de.key === 'Escape') {
        cancelBtn.click();
      } else if (de.key === 'Enter') {
        mergeBtn.click();
      }
    });
  } else if (e.key === 'F2') {
    e.preventDefault();
    e.stopPropagation();
    triggerCategoryEdit();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    const currentItem = visibleCategories[activeCategoryIndex];
    if (!currentItem) return;
    
    const isChild = e.shiftKey;
    const parentId = isChild ? currentItem.node.id : currentItem.node.parentId;
    
    const newId = 'cat-' + Date.now();
    window.App.db.addCategory(newId, 'New Category', parentId);
    
    if (isChild) {
      categoryExpandedState[currentItem.node.id] = true;
    }
    
    renderCategoryTree();
    
    const newVisibles = getVisibleCategories();
    const newIdx = newVisibles.findIndex(c => c.node.id === newId);
    if (newIdx !== -1) {
      activeCategoryIndex = newIdx;
      renderCategoryTree();
      setTimeout(triggerCategoryEdit, 10);
    }
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    e.stopPropagation();
    const currentItem = visibleCategories[activeCategoryIndex];
    if (!currentItem) return;
    
    const idToDelete = currentItem.node.id;
    window.App.db.softDeleteCategory(idToDelete);
    renderCategoryTree();
  } else if (e.key === 'Tab') {
    e.preventDefault();
    e.stopPropagation();
    const currentItem = visibleCategories[activeCategoryIndex];
    if (!currentItem) return;
    
    if (e.shiftKey) {
      if (currentItem.node.parentId) {
        const parentNode = window.App.db.categories[currentItem.node.parentId];
        if (parentNode) {
          currentItem.node.parentId = parentNode.parentId;
          renderCategoryTree();
        }
      }
    } else {
      const siblings = Object.values(window.App.db.categories).filter(c => c.parentId === currentItem.node.parentId);
      siblings.sort((a, b) => a.name.localeCompare(b.name));
      const idx = siblings.findIndex(c => c.id === currentItem.node.id);
      if (idx > 0) {
        const prevSibling = siblings[idx - 1];
        currentItem.node.parentId = prevSibling.id;
        categoryExpandedState[prevSibling.id] = true;
        renderCategoryTree();
      }
    }
  }
});

window.renderCategoryTree = renderCategoryTree;
