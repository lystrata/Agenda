import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  
  await page.goto('file://' + process.cwd() + '/index.html');
  
  // Open menu and switch
  await page.keyboard.press('/');
  await page.keyboard.press('v');
  await page.keyboard.press('m');
  await page.waitForTimeout(500);
  
  console.log('Errors found:', errors.length);
  errors.forEach(e => console.log('ERROR:', e));
  
  await browser.close();
})();
