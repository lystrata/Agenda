const { _electron: electron } = require('@playwright/test');

(async () => {
  console.log("Launching Electron App...");
  const electronApp = await electron.launch({
    executablePath: '/Users/rohn/Applications/Lotus Agenda.app/Contents/MacOS/Lotus Agenda'
  });

  const window = await electronApp.firstWindow();
  console.log("Waiting for modal shortcut...");
  await window.keyboard.press('F8');
  
  const modal = window.locator('#view-manager-modal');
  await modal.waitFor({ state: 'visible' });
  await window.waitForTimeout(100);

  const modalContent = window.locator('#view-manager-modal .modal-content');
  const modalBox = await modalContent.boundingBox();
  
  const newViewName = window.locator('#new-view-name');
  const btnCreateView = window.locator('#btn-create-view');
  
  const nameBox = await newViewName.boundingBox();
  const btnBox = await btnCreateView.boundingBox();
  
  console.log(`Modal Width: ${modalBox.width}, Right Edge: ${modalBox.x + modalBox.width}`);
  console.log(`Input Right Edge: ${nameBox.x + nameBox.width}`);
  console.log(`Button Right Edge: ${btnBox.x + btnBox.width}`);

  await window.screenshot({ path: 'scratch/compiled_app_test.png' });
  await electronApp.close();
  console.log("Test passed!");
})();
