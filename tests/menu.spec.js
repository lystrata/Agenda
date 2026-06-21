const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('Cascading Command Menu (/)', () => {
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

  test('pressing / opens the command menu', async () => {
    const commandBar = window.locator('#command-bar');
    await expect(commandBar).toHaveClass(/hidden/);

    await window.keyboard.press('/');
    await expect(commandBar).not.toHaveClass(/hidden/);
    
    // Breadcrumbs should show Main
    const breadcrumbs = window.locator('#menu-breadcrumbs');
    await expect(breadcrumbs).toHaveText('/Main');
    
    // Options should include File, View, Item
    const options = window.locator('#menu-options li');
    await expect(options).toHaveCount(3);
  });

  test('pressing v navigates to View submenu', async () => {
    await window.keyboard.press('/');
    await window.keyboard.press('v');
    
    const breadcrumbs = window.locator('#menu-breadcrumbs');
    await expect(breadcrumbs).toHaveText('/Main > View');
    
    const options = window.locator('#menu-options li');
    await expect(options).toContainText(['Add Column', 'Delete Column', 'Switch View']);
  });

  test('pressing Escape closes the command menu', async () => {
    await window.keyboard.press('/');
    const commandBar = window.locator('#command-bar');
    await expect(commandBar).not.toHaveClass(/hidden/);
    
    await window.keyboard.press('Escape');
    await expect(commandBar).toHaveClass(/hidden/);
  });
});
