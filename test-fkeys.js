/**
 * Automated Test Harness for F-Key Routing & Behaviors
 * 
 * You can run this from the browser console using `window.runFKeyTests()`
 * This will programmatically simulate clicks on the bottom footer buttons,
 * and verify that the expected UI panels open without throwing errors.
 */

window.runFKeyTests = async function() {
  console.log("🚀 Starting F-Key Test Harness...");
  const errors = [];
  const passes = [];

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper to assert conditions
  const assert = (condition, successMsg, failMsg) => {
    if (condition) {
      console.log("✅ " + successMsg);
      passes.push(successMsg);
    } else {
      console.error("❌ " + failMsg);
      errors.push(failMsg);
    }
  };

  // Ensure app is loaded
  if (!document.getElementById('fkey-toolbar')) {
    console.error("❌ Test harness failed to find the fkey-toolbar.");
    return;
  }

  // Helper to simulate a click
  const clickFKey = (key) => {
    const btn = Array.from(document.querySelectorAll('.fkey-btn')).find(b => b.textContent.includes(key));
    if (btn) {
      console.log(`\n🖱️ Simulating click on [${key}] button...`);
      btn.click();
    } else {
      console.warn(`⚠️ Button for ${key} not found.`);
    }
  };

  // Helper to simulate a keyboard press
  const pressFKey = (key) => {
    console.log(`\n⌨️ Simulating keyboard press [${key}]...`);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: key }));
  };

  try {
    // ----------------------------------------------------
    // TEST 1: F10 Menu Button Click Bug
    // ----------------------------------------------------
    console.log("\n--- TEST 1: F10 Button Menu Fix ---");
    // Ensure menu is closed first
    if (typeof window.exitCommandMode === 'function') window.exitCommandMode();
    await wait(100);
    
    clickFKey('F10');
    await wait(100);
    const cmdBar = document.getElementById('command-bar');
    assert(cmdBar && !cmdBar.classList.contains('hidden'), "F10 Menu opened successfully and stayed open.", "F10 Menu immediately closed or failed to open.");
    
    // Close it to reset
    if (typeof window.exitCommandMode === 'function') window.exitCommandMode();
    await wait(100);

    // ----------------------------------------------------
    // TEST 2: Grid Section Header F5/F6 Safety
    // ----------------------------------------------------
    console.log("\n--- TEST 2: F5/F6 Safety on Grid Section Headers ---");
    // Force focus on grid and fake an activeRowIndex pointing to a section header
    const gridContainer = document.getElementById('grid-container');
    gridContainer.focus();
    
    // We mock activeRowIndex to 0, which is usually a section header (e.g. UNASSIGNED) if grouping is active
    // Alternatively, we just test clicking F6 and see if it throws an error
    pressFKey('F6');
    await wait(100);
    
    const propPanel = document.getElementById('properties-panel');
    const panelTitle = document.getElementById('panel-title');
    assert(!propPanel.classList.contains('hidden'), "Properties Panel opened safely.", "Properties Panel failed to open.");
    assert(panelTitle.textContent.includes("Properties") || panelTitle.textContent.includes("Object Properties"), "Properties Panel title set safely.", "Properties Panel title is wrong.");
    
    // Close F6
    pressFKey('F6');
    await wait(100);

    // ----------------------------------------------------
    // TEST 3: Category Manager F6 Properties
    // ----------------------------------------------------
    console.log("\n--- TEST 3: Category F6 Properties ---");
    // Open Category Manager
    pressFKey('F9');
    await wait(100);
    
    const catSidebar = document.getElementById('category-sidebar');
    assert(!catSidebar.classList.contains('hidden'), "Category Sidebar opened (F9).", "Category Sidebar failed to open.");
    
    // Force focus into category sidebar
    catSidebar.focus();
    await wait(100);
    
    // Press F6 while Category Sidebar is active
    pressFKey('F6');
    await wait(100);
    
    assert(!propPanel.classList.contains('hidden'), "Category Properties Panel opened.", "Category Properties Panel failed to open.");
    assert(panelTitle.textContent === "Category Properties (F6)", "Category Properties Panel title is correct.", "Category Properties Panel title is wrong: " + panelTitle.textContent);
    
    // Check if category name input is present
    const catNameInput = document.getElementById('prop-cat-name');
    assert(catNameInput !== null, "Category Name input found in properties panel.", "Category Name input is missing.");
    
    // Close F6
    pressFKey('F6');
    await wait(100);

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log("\n=================================");
    console.log(`🏁 TEST SUITE COMPLETE`);
    console.log(`✅ Passed: ${passes.length}`);
    if (errors.length > 0) {
      console.log(`❌ Failed: ${errors.length}`);
      console.log("Errors:");
      errors.forEach(e => console.error(e));
    } else {
      console.log(`🎉 All tests passed beautifully!`);
    }
    console.log("=================================");

  } catch (err) {
    console.error("💥 Test Harness crashed due to a JS Exception:", err);
  }
};
