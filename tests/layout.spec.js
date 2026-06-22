const { test, expect, _electron: electron } = require('@playwright/test');

test.describe('Layout Constraints', () => {
  let electronApp;
  let page;

  test.beforeAll(async () => {
    // Launch Electron app directly from the compiled Applications folder
    electronApp = await electron.launch({
      executablePath: '/Users/rohn/Applications/Lotus Agenda.app/Contents/MacOS/Lotus Agenda'
    });
    page = await electronApp.firstWindow();
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('View Manager inputs should not overflow the modal in compiled app', async () => {
    // Give the app a moment to render its initial state
    await page.waitForTimeout(1000);
    
    // Press F8 to open View Manager modal
    await page.keyboard.press('F8');
    
    // Wait for the modal to be visible
    const modal = page.locator('#view-manager-modal');
    await expect(modal).toBeVisible();
    
    // Wait a brief moment for any layout to settle
    await page.waitForTimeout(500);
    
    // Get the bounding box of the modal content
    const modalContent = page.locator('#view-manager-modal .modal-content');
    const modalBox = await modalContent.boundingBox();
    expect(modalBox).not.toBeNull();
    
    // Check elements inside "Edit or Create View" section
    const newViewName = page.locator('#new-view-name');
    const btnCreateView = page.locator('#btn-create-view');
    
    const nameBox = await newViewName.boundingBox();
    const btnBox = await btnCreateView.boundingBox();
    
    expect(nameBox).not.toBeNull();
    expect(btnBox).not.toBeNull();
    
    // Assert that the right edge of the inputs does not exceed the right edge of the modal
    // Add a tiny tolerance for borders (e.g. 5px)
    expect(nameBox.x + nameBox.width).toBeLessThanOrEqual(modalBox.x + modalBox.width + 5);
    expect(btnBox.x + btnBox.width).toBeLessThanOrEqual(modalBox.x + modalBox.width + 5);
    
    console.log(`[Compiled App] Modal Width: ${modalBox.width}, Right Edge: ${modalBox.x + modalBox.width}`);
    console.log(`[Compiled App] Input Right Edge: ${nameBox.x + nameBox.width}`);
    console.log(`[Compiled App] Button Right Edge: ${btnBox.x + btnBox.width}`);
  });
});
