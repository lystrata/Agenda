const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('Universal Function Keys (F1-F10)', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    electronApp = await electron.launch({ args: ['.'] });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('F5 opens the Note Editor panel', async () => {
    const propertiesPanel = window.locator('#properties-panel');
    await expect(propertiesPanel).toHaveClass(/hidden/);

    await window.keyboard.press('F5');
    await expect(propertiesPanel).not.toHaveClass(/hidden/);
    
    const panelTitle = window.locator('#panel-title');
    await expect(panelTitle).toHaveText('Note Editor');
  });

  test('F6 toggles the Object Properties panel', async () => {
    const propertiesPanel = window.locator('#properties-panel');
    
    // Press F6 to open
    await window.keyboard.press('F6');
    await expect(propertiesPanel).not.toHaveClass(/hidden/);
    
    const panelTitle = window.locator('#panel-title');
    await expect(panelTitle).toHaveText('Object Properties (F6)');
    
    // Press F6 to close
    await window.keyboard.press('F6');
    await expect(propertiesPanel).toHaveClass(/hidden/);
  });

  test('F9 toggles the Category Manager sidebar', async () => {
    const categorySidebar = window.locator('#category-sidebar');
    await expect(categorySidebar).toHaveClass(/hidden/);

    // Press F9 to open
    await window.keyboard.press('F9');
    await expect(categorySidebar).not.toHaveClass(/hidden/);
    
    // Press F9 to close
    await window.keyboard.press('F9');
    await expect(categorySidebar).toHaveClass(/hidden/);
  });
});
