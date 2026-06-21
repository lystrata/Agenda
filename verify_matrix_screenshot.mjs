import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('file://' + process.cwd() + '/index.html');
  
  // Set viewport so screenshot is large
  await page.setViewportSize({ width: 800, height: 600 });
  
  // Open menu and switch
  await page.keyboard.press('/');
  await page.keyboard.press('v');
  await page.keyboard.press('m');
  await page.waitForTimeout(500);
  
  // Save screenshot
  const screenshotPath = path.join(process.env.HOME, '.gemini/antigravity/brain/b21ab91a-e865-411f-8624-f6c237103990/scratch/matrix_view_test.png');
  await page.screenshot({ path: screenshotPath });
  
  console.log('Screenshot saved to', screenshotPath);
  
  await browser.close();
})();
