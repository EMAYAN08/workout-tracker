const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto("http://localhost:5173");
  await page.waitForTimeout(1000);
  
  // Make sure we are on login
  console.log("On login page:", await page.isVisible('text=Sign in or create an account'));
  
  // Click refresh
  await page.click('button[title="Refresh App"]');
  await page.waitForTimeout(2000);
  
  console.log("After refresh, on login page:", await page.isVisible('text=Sign in or create an account'));
  console.log("After refresh, on home page:", await page.isVisible('text=Lifetime Stats') || await page.isVisible('text=Profile'));
  
  await browser.close();
})();
