// F7 View Filters Logic

window.App.filters = {
  text: '',
  assignee: '',
  showDone: false // if false, hide items where done=true
};

window.openFiltersPanel = function() {
  const modal = document.getElementById('filter-modal');
  if (!modal) return;
  
  // Populate form with current state
  const textInput = document.getElementById('filter-text');
  const assigneeInput = document.getElementById('filter-assignee');
  const showDoneInput = document.getElementById('filter-show-done');
  
  textInput.value = window.App.filters.text;
  assigneeInput.value = window.App.filters.assignee;
  showDoneInput.checked = window.App.filters.showDone;
  
  // Show modal
  modal.showModal();
  textInput.focus();
  textInput.select();
  
  // Create a keyboard handler specific to the modal
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      applyFilters();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    }
  };
  
  // Click outside to close
  const handleModalClick = (e) => {
    if (e.target === modal) {
      closeModal();
    }
  };
  modal.addEventListener('click', handleModalClick);
  
  const applyFilters = () => {
    window.App.filters.text = textInput.value.toLowerCase().trim();
    window.App.filters.assignee = assigneeInput.value.toLowerCase().trim();
    window.App.filters.showDone = showDoneInput.checked;
    
    closeModal();
    
    // Trigger grid re-render to apply the filters globally
    if (typeof window.renderGrid === 'function') {
      window.window.App.activeRowIndex = 0; // reset active row since count may change
      window.renderGrid();
    }
  };
  
  const closeModal = () => {
    modal.close();
    window.removeEventListener('keydown', handleKeyDown, true);
    document.getElementById('grid-container').focus();
  };
  
  // Use capturing phase so we intercept before fkeys.js or grid.js
  window.addEventListener('keydown', handleKeyDown, true);
};
