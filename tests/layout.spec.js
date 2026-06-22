const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Layout Constraints', () => {
  test('View Manager inputs should not overflow the modal', async ({ page }) => {
    // Open local index.html directly
    const filePath = path.resolve(__dirname, '../index.html');
    await page.goto(`file://${filePath}`);
    
    // Press F8 to open View Manager modal
    await page.keyboard.press('F8');
    
    // Wait for the modal to be visible
    const modal = page.locator('#view-manager-modal');
    await expect(modal).toBeVisible();
    
    // Wait a brief moment for any layout to settle
    await page.waitForTimeout(100);
    
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
    
    // Assert that the button is positioned below or alongside without breaking out horizontally
    console.log(`Modal Width: ${modalBox.width}, Right Edge: ${modalBox.x + modalBox.width}`);
    console.log(`Input Right Edge: ${nameBox.x + nameBox.width}`);
    console.log(`Button Right Edge: ${btnBox.x + btnBox.width}`);
  });
});
