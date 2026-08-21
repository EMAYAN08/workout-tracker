# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: custom_exercises.spec.js >> Custom Exercises Flow >> should create, edit, and delete a custom exercise
- Location: tests\custom_exercises.spec.js:10:3

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
  4  | test.describe("Custom Exercises Flow", () => {
  5  |   test.beforeEach(async ({ page }) => {
> 6  |     await page.goto("/");
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  7  |     await page.getByRole("button", { name: "Exercises", exact: true }).click();
  8  |   });
  9  | 
  10 |   test("should create, edit, and delete a custom exercise", async ({ page }) => {
  11 |     await page.getByRole("button", { name: "Create" }).click();
  12 |     await page.getByPlaceholder("e.g. Hex Bar Deadlift").fill("Playwright Exercise");
  13 |     await page.getByRole("button", { name: "Save Custom Exercise" }).click();
  14 |     
  15 |     await expect(page.locator("text=Playwright Exercise").first()).toBeVisible();
  16 |     
  17 |     // Wait for render
  18 |     await page.waitForTimeout(500);
  19 |     // Find the edit button inside the card for Playwright Exercise
  20 |     await page.locator(".text-blue-500").first().click();
  21 |     
  22 |     await page.getByPlaceholder("e.g. Hex Bar Deadlift").fill("Edited Playwright Exercise");
  23 |     await page.getByRole("button", { name: "Update Custom Exercise" }).click();
  24 |     
  25 |     await expect(page.locator("text=Edited Playwright Exercise").first()).toBeVisible();
  26 |     
  27 |     // Delete - button with red color
  28 |     await page.locator(".text-red-500").first().click();
  29 |     
  30 |     // Wait for deletion API
  31 |     await page.waitForTimeout(500);
  32 |     await expect(page.locator("text=Edited Playwright Exercise")).toHaveCount(0);
  33 |   });
  34 | });
  35 | 
  36 | 
```