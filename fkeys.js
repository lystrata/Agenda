const propertiesPanel = document.getElementById('properties-panel');
const panelTitle = document.getElementById('panel-title');
const panelContent = document.getElementById('panel-content');
const categorySidebar = document.getElementById('category-sidebar');

window.addEventListener('keydown', (e) => {
  if (window.commandModeActive) return; // Don't intercept if menu is open

  if (/^F([1-9]|10)$/.test(e.key)) {
    e.preventDefault();

    switch (e.key) {
      case 'F1':
        alert("F1: Help Menu");
        break;
      case 'F2':
        if (typeof window.triggerGridEdit === 'function') {
          window.triggerGridEdit();
        }
        break;
      case 'F3':
        // Cut / Pick up item
        if (typeof window.cutActiveRow === 'function') {
          window.cutActiveRow();
        } else {
          alert("F3: Cut (Not Loaded)");
        }
        break;
      case 'F4':
        // Paste / Drop item
        if (typeof window.pasteRows === 'function') {
          window.pasteRows();
        } else {
          alert("F4: Paste (Not Loaded)");
        }
        break;
      case 'F5':
        // Toggle Note Editor
        if (!propertiesPanel.classList.contains('hidden') && panelTitle.textContent === "Note Editor") {
          // If open, save and close
          const textarea = panelContent.querySelector('textarea');
          if (textarea && typeof window.updateActiveCellNote === 'function') {
            window.updateActiveCellNote(textarea.value);
          }
          propertiesPanel.classList.add('hidden');
          document.getElementById('resizer-right')?.classList.add('hidden');
          document.getElementById('grid-container').focus();
        } else {
          // Open Note Editor
          if (document.activeElement && categorySidebar.contains(document.activeElement)) {
            // Category focused
            propertiesPanel.classList.remove('hidden');
            document.getElementById('resizer-right')?.classList.remove('hidden');
            panelTitle.textContent = "Category Notes";
            panelContent.innerHTML = "<p style='padding:10px'>Notes are not available for categories.</p>";
            return;
          }
          
          const activeNoteText = typeof window.getActiveCellNote === 'function' ? window.getActiveCellNote() : '';
          
          propertiesPanel.classList.remove('hidden');
          document.getElementById('resizer-right')?.classList.remove('hidden');
          panelTitle.textContent = "Note Editor";
          
          const textarea = document.createElement('textarea');
          textarea.style.width = '100%';
          textarea.style.height = '100%';
          textarea.style.background = 'var(--bg-main)';
          textarea.style.color = 'var(--text-main)';
          textarea.style.border = 'none';
          textarea.style.resize = 'none';
          textarea.style.padding = '8px';
          textarea.style.outline = 'none';
          textarea.value = activeNoteText;
          
          textarea.addEventListener('keydown', (evt) => {
            if (evt.key === 'Escape') {
              evt.preventDefault();
              evt.stopPropagation();
              if (typeof window.updateActiveCellNote === 'function') {
                window.updateActiveCellNote(textarea.value);
              }
              propertiesPanel.classList.add('hidden');
              document.getElementById('resizer-right')?.classList.add('hidden');
              document.getElementById('grid-container').focus();
            }
          });
          
          panelContent.innerHTML = '';
          panelContent.appendChild(textarea);
          textarea.focus();
        }
        break;
      case 'F6':
        // Toggle Object Properties
        if (!propertiesPanel.classList.contains('hidden') && (panelTitle.textContent === "Object Properties (F6)" || panelTitle.textContent === "Category Properties (F6)")) {
          propertiesPanel.classList.add('hidden');
          document.getElementById('resizer-right')?.classList.add('hidden');
          document.getElementById('grid-container').focus();
        } else {
          if (typeof window.openPropertiesPanel === 'function') {
            const mode = (document.activeElement && categorySidebar.contains(document.activeElement) || document.activeElement === categorySidebar) ? 'category' : 'item';
            window.openPropertiesPanel(mode, true);
          } else {
            propertiesPanel.classList.remove('hidden');
            document.getElementById('resizer-right')?.classList.remove('hidden');
            panelTitle.textContent = "Item Properties";
            panelContent.innerHTML = "<p>Properties logic not loaded.</p>";
          }
        }
        break;
      case 'F7':
        // Show View Filters Modal
        if (typeof window.openFiltersPanel === 'function') {
          window.openFiltersPanel();
        } else {
          alert("F7: View Filters (Not Loaded)");
        }
        break;
      case 'F8':
        if (typeof window.openViewManager === 'function') {
          window.openViewManager();
        } else {
          alert("F8: Switch View Modal (Not Loaded)");
        }
        break;
      case 'F9':
        // Toggle Category Manager
        if (!categorySidebar.classList.contains('hidden')) {
          categorySidebar.classList.add('hidden');
          document.getElementById('grid-container').focus();
        } else {
          if (typeof window.openCategoryManager === 'function') {
            window.openCategoryManager();
          } else {
            categorySidebar.classList.remove('hidden');
          }
        }
        break;
      case 'F10':
        e.preventDefault();
        if (typeof App.openCommandMenu === 'function') {
          App.openCommandMenu();
        }
        break;
    }
  }
});
