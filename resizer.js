// Sidebar Resizer Logic
document.addEventListener('DOMContentLoaded', () => {
  const categorySidebar = document.getElementById('category-sidebar');
  const propertiesPanel = document.getElementById('properties-panel');
  const resizerLeft = document.getElementById('resizer-left');
  const resizerRight = document.getElementById('resizer-right');

  // We want to handle the visibility of the resizers based on the sidebars' visibility
  // To do this reliably, we'll set up a MutationObserver to watch for class changes on the sidebars.
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.id === 'category-sidebar') {
          if (target.classList.contains('hidden')) {
            resizerLeft.classList.add('hidden');
          } else {
            resizerLeft.classList.remove('hidden');
          }
        } else if (target.id === 'properties-panel') {
          if (target.classList.contains('hidden')) {
            resizerRight.classList.add('hidden');
          } else {
            resizerRight.classList.remove('hidden');
          }
        }
      }
    });
  });

  observer.observe(categorySidebar, { attributes: true });
  observer.observe(propertiesPanel, { attributes: true });

  // Make sure initial state is correct
  if (!categorySidebar.classList.contains('hidden')) resizerLeft.classList.remove('hidden');
  if (!propertiesPanel.classList.contains('hidden')) resizerRight.classList.remove('hidden');

  // Reusable resizer setup
  function setupResizer(resizer, sidebar, isLeft) {
    let isResizing = false;
    let startX, startWidth;

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = parseInt(document.defaultView.getComputedStyle(sidebar).width, 10);
      resizer.classList.add('resizing');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none'; // Prevent text selection
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      let newWidth;
      if (isLeft) {
        newWidth = startWidth + (e.clientX - startX);
      } else {
        newWidth = startWidth - (e.clientX - startX);
      }
      
      // Enforce min and max widths
      if (newWidth < 150) newWidth = 150;
      if (newWidth > 600) newWidth = 600;
      
      sidebar.style.width = `${newWidth}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizer.classList.remove('resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  setupResizer(resizerLeft, categorySidebar, true);
  setupResizer(resizerRight, propertiesPanel, false);

  // Column Resizer Logic for native CSS resize: horizontal
  const colResizeObserver = new ResizeObserver(() => {
    const agendaGrid = document.getElementById('agenda-grid');
    if (!agendaGrid) return;

    const gridHead = document.getElementById('grid-head');
    const matrixHead = document.getElementById('matrix-head');
    const activeHead = (matrixHead && !matrixHead.classList.contains('hidden')) ? matrixHead : gridHead;
    
    if (!activeHead) return;
    
    const headers = activeHead.querySelectorAll('.col-header');
    if (headers.length === 0) return;
    
    let newCols = [];
    let hasCustomWidth = false;
    
    headers.forEach((th, i) => {
      if (th.style.width) {
        newCols.push(th.style.width);
        hasCustomWidth = true;
      } else {
        if (activeHead === gridHead) {
          newCols.push(i === 0 ? 'minmax(200px, 4fr)' : 'minmax(100px, 2fr)');
        } else {
          newCols.push('minmax(150px, 1fr)');
        }
      }
    });
    
    // Only override gridTemplateColumns if at least one header was manually resized
    if (hasCustomWidth || activeHead === matrixHead) {
      agendaGrid.style.gridTemplateColumns = newCols.join(' ');
    } else {
      // Revert to CSS default
      agendaGrid.style.gridTemplateColumns = '';
    }
  });

  // Since headers can be dynamically regenerated, we need a MutationObserver to attach the ResizeObserver
  const gridHeadObserver = new MutationObserver(() => {
    document.querySelectorAll('.col-header').forEach(th => {
      colResizeObserver.observe(th);
    });
  });
  
  const gridHead = document.getElementById('grid-head');
  const matrixHead = document.getElementById('matrix-head');
  if (gridHead) gridHeadObserver.observe(gridHead, { childList: true, subtree: true });
  if (matrixHead) gridHeadObserver.observe(matrixHead, { childList: true, subtree: true });
  
  // Initial attach
  document.querySelectorAll('.col-header').forEach(th => colResizeObserver.observe(th));
});
