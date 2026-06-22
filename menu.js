// Cascading Command Menu Logic
const menuStructure = {
  name: 'Main',
  options: [
    {
      label: 'File', key: 'f', submenu: {
        name: 'File', options: [
          { label: 'Open', key: 'o', action: 'file-open' },
          { label: 'Save', key: 's', action: 'file-save' },
          { label: 'Import MD', key: 'i', action: 'file-import-md' },
          { label: 'Export MD', key: 'x', action: 'file-export-md' },
          { label: 'Exit', key: 'e', action: 'file-exit' }
        ]
      }
    },
    {
      label: 'View', key: 'v', submenu: {
        name: 'View', options: [
          { label: 'Add Column', key: 'a', action: 'view-add-col' },
          { label: 'Delete Column', key: 'd', action: 'view-del-col' },
          { label: 'Outliner Layout', key: 'o', action: 'view-layout-outliner' },
          { label: 'Matrix Layout', key: 'm', action: 'view-layout-matrix' },
          { label: 'Toggle Theme', key: 't', action: 'view-theme' }
        ]
      }
    },
    {
      label: 'Item', key: 'i', submenu: {
        name: 'Item', options: [
          { label: 'Add', key: 'a', action: 'item-add' },
          { label: 'Delete', key: 'd', action: 'item-del' },
          { label: 'Empty Trash', key: 'e', action: 'item-empty-trash' }
        ]
      }
    }
  ]
};

let commandModeActive = false;
let currentMenuPath = [];
let currentSubmenu = null;

const commandBar = document.getElementById('command-bar');
const menuBreadcrumbs = document.getElementById('menu-breadcrumbs');
const menuOptionsList = document.getElementById('menu-options');

function renderMenu() {
  if (!commandModeActive) {
    commandBar.hidePopover();
    return;
  }
  
  commandBar.showPopover();
  
  // Breadcrumbs
  menuBreadcrumbs.textContent = '/' + currentMenuPath.map(m => m.name).join(' > ');
  
  // Options
  menuOptionsList.innerHTML = '';
  currentSubmenu.options.forEach(opt => {
    const li = document.createElement('li');
    // Simple rendering: underline the hotkey letter
    const lowerLabel = opt.label.toLowerCase();
    const keyIdx = lowerLabel.indexOf(opt.key);
    if (keyIdx !== -1) {
      li.innerHTML = `${opt.label.substring(0, keyIdx)}<span class="hotkey">${opt.label[keyIdx]}</span>${opt.label.substring(keyIdx + 1)}`;
    } else {
      li.textContent = opt.label;
    }
    
    // Mouse hover to expand submenu
    li.addEventListener('mouseenter', () => {
      // clear any currently selected siblings visually
      Array.from(menuOptionsList.children).forEach(child => child.classList.remove('selected'));
      li.classList.add('selected');
      // If we hover over an item with a submenu, maybe don't auto-open unless we want hover-to-open
      // Standard Lotus Agenda didn't have mice, but modern menubars hover-to-open submenus.
      // Let's keep it simple: click to execute/open.
    });

    // Mouse click to select
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      handleMenuKeystroke(opt.key);
    });

    menuOptionsList.appendChild(li);
  });
}

// Initialize Theme
document.addEventListener('DOMContentLoaded', () => {
  const theme = localStorage.getItem('lotus-theme');
  if (theme === 'light') {
    document.documentElement.classList.add('light-theme');
  }
});

function handleMenuKeystroke(key) {
  const opt = currentSubmenu.options.find(o => o.key === key.toLowerCase());
  if (opt) {
    if (opt.submenu) {
      currentMenuPath.push(opt.submenu);
      currentSubmenu = opt.submenu;
      renderMenu();
    } else if (opt.action) {
      console.log('Action triggered:', opt.action);
      exitCommandMode();
      executeAction(opt.action);
    }
  }
}

async function executeAction(action) {
  if (action === 'file-open') {
    if (window.electronAPI && window.electronAPI.openFile) {
      const data = await window.electronAPI.openFile();
      if (data) {
        const success = window.App.db.deserialize(data);
        if (success) {
          if (window.App.db.views.length > 0) {
            window.App.activeViewId = window.App.db.views[0].id;
          }
          if (typeof window.renderGrid === 'function') window.renderGrid();
          if (typeof window.renderCategoryTree === 'function') window.renderCategoryTree();
        } else {
          alert('Failed to load file. The file may be corrupt or invalid.');
        }
      }
    } else {
      alert('File Open is only available in the desktop app.');
    }
  } else if (action === 'file-save') {
    if (window.electronAPI && window.electronAPI.saveFile) {
      const data = window.App.db.serialize();
      const success = await window.electronAPI.saveFile(data);
      if (success) {
        console.log('File saved successfully.');
      }
    } else {
      alert('File Save is only available in the desktop app.');
    }
  } else if (action === 'item-del') {
    const visibleRows = window.getVisibleRows ? window.getVisibleRows() : [];
    const activeItem = visibleRows[window.App.activeRowIndex];
    if (activeItem && !activeItem.isSectionHeader) {
      window.App.db.softDeleteItem(activeItem.index);
      if (typeof window.renderGrid === 'function') window.renderGrid();
      if (typeof window.updateFocus === 'function') window.updateFocus();
    }
  } else if (action === 'item-empty-trash') {
    window.App.db.emptyTrash();
    if (typeof window.renderGrid === 'function') window.renderGrid();
    if (typeof window.renderCategoryTree === 'function') window.renderCategoryTree();
  } else if (action === 'view-theme') {
    document.documentElement.classList.toggle('light-theme');
    const isLight = document.documentElement.classList.contains('light-theme');
    localStorage.setItem('lotus-theme', isLight ? 'light' : 'dark');
  } else if (action === 'view-layout-outliner' || action === 'view-layout-matrix') {
    const activeView = window.App.db.views.find(v => v.id === window.App.activeViewId);
    if (activeView) {
      const newLayout = action === 'view-layout-outliner' ? 'outliner' : 'matrix';
      activeView.layout = newLayout;
      // Need a default column and row grouping if switching to matrix and none is set
      if (newLayout === 'matrix') {
        if (!activeView.sectionCategoryId) {
          // If no row category is set, default to 'Who' for a better matrix experience
          if (window.App.db.categories['root-who']) {
            activeView.sectionCategoryId = 'root-who';
          }
        }
        if (!activeView.columnCategoryId) {
          // Default columns to 'Status' if not set
          if (window.App.db.categories['root-status']) {
            activeView.columnCategoryId = 'root-status';
          }
        }
      }
      if (typeof window.renderGrid === 'function') window.renderGrid();
    }
  } else if (action === 'file-import-md') {
    if (window.electronAPI && window.electronAPI.importMarkdown) {
      const data = await window.electronAPI.importMarkdown();
      if (data) {
        if (typeof AgendaMarkdownParser === 'undefined') {
          console.error("AgendaMarkdownParser is not loaded.");
          return;
        }
        // Clear current db and parse
        window.App.db = new AgendaDatabase();
        const success = AgendaMarkdownParser.parse(window.App.db, data);
        if (success) {
          if (window.App.db.views.length > 0) {
            window.App.activeViewId = window.App.db.views[0].id;
          }
          if (typeof window.renderGrid === 'function') window.renderGrid();
          if (typeof window.renderCategoryTree === 'function') window.renderCategoryTree();
        } else {
          alert('Failed to import markdown file.');
        }
      }
    } else {
      alert('Markdown Import is only available in the desktop app.');
    }
  } else if (action === 'file-export-md') {
    if (window.electronAPI && window.electronAPI.exportMarkdown) {
      if (typeof AgendaMarkdownParser === 'undefined') {
        console.error("AgendaMarkdownParser is not loaded.");
        return;
      }
      const data = AgendaMarkdownParser.serialize(window.App.db);
      const success = await window.electronAPI.exportMarkdown(data);
      if (success) {
        console.log('Markdown exported successfully.');
      }
    } else {
      alert('Markdown Export is only available in the desktop app.');
    }
  } else if (action === 'file-exit') {
    if (window.electronAPI && window.electronAPI.quitApp) {
      window.electronAPI.quitApp();
    } else {
      alert('Exit is only available in the desktop app.');
    }
  }
}

function exitCommandMode() {
  if (!commandModeActive) return;
  commandModeActive = false;
  currentMenuPath = [];
  currentSubmenu = null;
  renderMenu();
  
  // Return focus to grid
  const gridContainer = document.getElementById('grid-container');
  if (gridContainer) gridContainer.focus();
}

commandBar.addEventListener('beforetoggle', (e) => {
  if (e.newState === 'closed' && commandModeActive) {
    exitCommandMode();
  }
});

App.openCommandMenu = function() {
  if (commandModeActive) return;
  commandModeActive = true;
  currentSubmenu = menuStructure;
  currentMenuPath = [menuStructure];
  renderMenu();
};

document.addEventListener('keydown', (e) => {
  if (!commandModeActive) {
    if (e.key === '/' || e.key === 'F10') {
      e.preventDefault();
      App.openCommandMenu();
    }
    return;
  }
  if (commandModeActive) {
    if (e.key === 'Escape') {
      e.preventDefault();
      exitCommandMode();
    } else if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
      e.preventDefault();
      handleMenuKeystroke(e.key);
    }
  }
});

// Click on the upper bar to open the menu
document.getElementById('view-header').addEventListener('click', () => {
  App.openCommandMenu();
});
document.getElementById('view-header').addEventListener('dblclick', (e) => {
  e.preventDefault();
  App.openCommandMenu();
});
