const { chromium } = require("@playwright/test");

(async () => {
  console.log("Launching browser for auth test...");
  const browser = await chromium.launch();
  
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  
  // Wait for the app to load
  await page.goto("http://localhost:5173");
  await page.waitForTimeout(1500);
  
  console.log("Taking login screen screenshot...");
  await page.screenshot({ path: "auth_login_screen.png" });
  
  // Fill in the form
  await page.fill('input[type="text"]', 'TestUser99');
  await page.fill('input[type="password"]', 'password123');
  
  console.log("Submitting login form...");
  await page.click('button[type="submit"]');
  
  // Wait for the Dashboard/Home to load
  await page.waitForTimeout(2000);
  
  console.log("Taking authenticated home screenshot...");
  await page.screenshot({ path: "auth_home_screen.png" });

  // Navigate to Dashboard to see the username and logout button
  await page.click('text=Profile');
  await page.waitForTimeout(1000);
  
  console.log("Taking profile screenshot...");
  await page.screenshot({ path: "auth_profile_screen.png" });

  // Logout
  await page.click('text=Logout');
  await page.waitForTimeout(1000);

  console.log("Taking logout screenshot...");
  await page.screenshot({ path: "auth_logged_out.png" });
  
  await browser.close();
  console.log("Auth test complete!");
})();
