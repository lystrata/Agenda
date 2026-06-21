const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('DateTime Parsing and UI Integration', () => {
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

  test('Natural language date/time parsing reflects correctly in Grid and Properties Panel', async () => {
    // 1. Focus the grid and navigate to the bottom
    await window.locator('#grid-container').focus();
    
    // Press ArrowDown a few times to get to a clear spot
    await window.keyboard.press('ArrowDown');
    await window.keyboard.press('ArrowDown');
    
    // 2. Press Enter to create a new item
    await window.keyboard.press('Enter');

    // 3. The new item should be in edit mode automatically. Type the text.
    const editInput = window.locator('td.active-cell input');
    await expect(editInput).toBeVisible();
    await editInput.fill('Refresh certs for John every tuesday at 2 PM');
    await window.keyboard.press('Enter'); // Confirm edit

    // Wait a brief moment for the background parser to assign categories
    await window.waitForTimeout(500);

    // Get today's date for entry date verification
    const todayStr = new Date().toISOString().split('T')[0];

    // 4. Verify Grid Display
    // The active cell should be the text cell of the new row.
    const activeRow = window.locator('tr.active-cell, td.active-cell').locator('..');
    
    // Column 0: Text
    await expect(activeRow.locator('td').nth(0)).toContainText('Refresh certs for John every tuesday at 2 PM');
    // Column 1: Assignee (Should be "John")
    await expect(activeRow.locator('td').nth(1)).toHaveText('John');
    
    // Column 2: Due Date (Should contain the parsed date AND time, "14:00")
    // Because dates change relative to the week, we check for "14:00" explicitly
    const dueText = await activeRow.locator('td').nth(2).textContent();
    expect(dueText).toContain('14:00');
    expect(dueText).toMatch(/^\d{4}-\d{2}-\d{2} 14:00$/);

    // Column 3: Entry Date (Should be today's date)
    await expect(activeRow.locator('td').nth(3)).toHaveText(todayStr);

    // 5. Open Properties Panel (F6)
    await window.keyboard.press('F6');
    const propertiesPanel = window.locator('#properties-panel');
    await expect(propertiesPanel).not.toHaveClass(/hidden/);

    // 6. Verify Properties Panel Inputs
    await expect(window.locator('#prop-item-text')).toHaveValue('Refresh certs for John every tuesday at 2 PM');
    await expect(window.locator('#prop-assignee')).toHaveValue('John');
    await expect(window.locator('#prop-due')).toHaveValue(dueText);
    await expect(window.locator('#prop-entry')).toHaveValue(todayStr);

    // 7. Edit the Date in Properties Panel manually
    const newManualDate = '2030-10-31 16:30';
    await window.locator('#prop-due').fill(newManualDate);
    
    // Close panel
    await window.keyboard.press('Escape');

    // 8. Verify Grid updated with manual edit
    await expect(activeRow.locator('td').nth(2)).toHaveText(newManualDate);
  });

  test('Advanced natural language time/date expressions parse correctly', async () => {
    await window.locator('#grid-container').focus();
    
    // An array of complex test cases based on classic Agenda capabilities
    const testCases = [
      {
        input: 'Call Mary tomorrow at 3:15 PM about the budget',
        expectedTime: '15:15'
      },
      {
        input: 'Schedule quarterly review for two weeks from last Tuesday',
        // chrono-node handles this well, but the exact date depends on current date.
        // We will just verify it matched *some* date by checking if the due date column is not blank.
        expectedNonEmpty: true
      },
      {
        input: 'Dinner with clients next Friday at 7 PM',
        expectedTime: '19:00'
      }
    ];

    for (const tc of testCases) {
      await window.keyboard.press('ArrowDown');
      await window.keyboard.press('Enter');
      
      const editInput = window.locator('td.active-cell input');
      await expect(editInput).toBeVisible();
      await editInput.fill(tc.input);
      await window.keyboard.press('Enter');
      
      await window.waitForTimeout(400); // Give background DB time to assign
      
      const activeRow = window.locator('tr.active-cell, td.active-cell').locator('..');
      const dueText = await activeRow.locator('td').nth(2).textContent();
      
      if (tc.expectedTime) {
        expect(dueText).toContain(tc.expectedTime);
      }
      if (tc.expectedMonth) {
        expect(dueText).toContain(tc.expectedMonth);
      }
      if (tc.expectedNonEmpty) {
        expect(dueText.trim().length).toBeGreaterThan(5);
      }
    }
  });
});
