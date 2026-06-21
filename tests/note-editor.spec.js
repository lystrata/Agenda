const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('F5 Note Editor', () => {
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

  test('F5 opens the Note Editor and populates the Item note', async () => {
    await window.locator('#grid-container').focus();

    // Verify first row is active on 'text' column
    const activeCell = window.locator('td.active-cell');
    await expect(activeCell).toHaveText('▼ Finish project proposal');

    // Press F5
    await window.keyboard.press('F5');

    // Panel should open
    const panel = window.locator('#properties-panel');
    await expect(panel).not.toHaveClass(/hidden/);

    // Textarea should contain the dummy note for the first row's Item
    const textarea = panel.locator('textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue('Need to research Q3 numbers before drafting.');
  });

  test('F5 on Assignee cell opens a different note', async () => {
    await window.locator('#grid-container').focus();

    // Move to Assignee column
    await window.keyboard.press('ArrowRight');
    
    // Press F5
    await window.keyboard.press('F5');

    const panel = window.locator('#properties-panel');
    const textarea = panel.locator('textarea');
    
    // Should have John's specific note
    await expect(textarea).toHaveValue('John is the lead dev.');
    
    // Change John's note
    await textarea.fill('John is on vacation next week.');
    await window.keyboard.press('Escape'); // Save and close
    
    // Move back to Item column
    await window.keyboard.press('ArrowLeft');
    await window.keyboard.press('F5');
    
    // Item note should still be the original, NOT John's note
    await expect(textarea).toHaveValue('Need to research Q3 numbers before drafting.');
  });

  test('Escape saves the note and closes the panel', async () => {
    await window.locator('#grid-container').focus();
    await window.keyboard.press('F5');

    const panel = window.locator('#properties-panel');
    const textarea = panel.locator('textarea');
    
    // Type new note
    await textarea.fill('Updated note content.');
    
    // Press Escape
    await window.keyboard.press('Escape');

    // Panel should close
    await expect(panel).toHaveClass(/hidden/);

    // Press F5 again to verify the note was saved
    await window.keyboard.press('F5');
    await expect(panel).not.toHaveClass(/hidden/);
    await expect(textarea).toHaveValue('Updated note content.');
  });
});
