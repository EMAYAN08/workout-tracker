const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto("http://localhost:5173");
  await page.waitForTimeout(1000);
  
  // Login
  await page.fill('input[type="text"]', 'Emayan');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:has-text("Enter")');
  await page.waitForTimeout(2000);
  
  console.log("On home page after login:", await page.isVisible('text=Profile'));
  
  // Logout
  await page.click('text=Profile');
  await page.waitForTimeout(1000);
  await page.click('text=Logout');
  await page.waitForTimeout(1000);
  
  console.log("On login page after logout:", await page.isVisible('text=Sign in or create an account'));
  
  // Click refresh
  await page.click('button[title="Refresh App"]');
  await page.waitForTimeout(2000);
  
  console.log("After refresh, on login page:", await page.isVisible('text=Sign in or create an account'));
  console.log("After refresh, on home page:", await page.isVisible('text=Lifetime Stats') || await page.isVisible('text=Profile'));
  
  await browser.close();
})();
