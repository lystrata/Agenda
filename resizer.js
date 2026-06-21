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
});
