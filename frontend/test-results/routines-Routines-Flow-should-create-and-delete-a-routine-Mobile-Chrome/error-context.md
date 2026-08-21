# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: routines.spec.js >> Routines Flow >> should create and delete a routine
- Location: tests\routines.spec.js:10:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1  | 
  2  | import { test, expect } from "@playwright/test";
  3  | 
  4  | test.describe("Routines Flow", () => {
  5  |   test.beforeEach(async ({ page }) => {
> 6  |     await page.goto("/");
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  7  |     await page.getByRole("button", { name: "Routines", exact: true }).click();
  8  |   });
  9  | 
  10 |   test("should create and delete a routine", async ({ page }) => {
  11 |     // Dismiss any alerts automatically
  12 |     page.on("dialog", dialog => dialog.accept());
  13 |     
  14 |     await page.getByRole("button", { name: "New Routine" }).click();
  15 |     
  16 |     // Fill routine name
  17 |     await page.getByPlaceholder("e.g. Push Day, Full Body").fill("My Test Routine");
  18 |     
  19 |     // Add exercise
  20 |     await page.getByRole("button", { name: "Add Exercise" }).click();
  21 |     const searchInput = page.locator("input[placeholder=\"Search exercise...\"]");
  22 |     await searchInput.fill("Squat");
  23 |     
  24 |     // Add custom exercise from search overlay
  25 |     await page.getByRole("button", { name: "Add Custom Exercise" }).click();
  26 |     
  27 |     // Wait a bit
  28 |     await page.waitForTimeout(500);
  29 | 
  30 |     // Save routine
  31 |     await page.getByRole("button", { name: "Save", exact: true }).click();
  32 |     
  33 |     // Check it appears in list
  34 |     await expect(page.locator("text=My Test Routine").first()).toBeVisible();
  35 |   });
  36 | });
  37 | 
  38 | 
```