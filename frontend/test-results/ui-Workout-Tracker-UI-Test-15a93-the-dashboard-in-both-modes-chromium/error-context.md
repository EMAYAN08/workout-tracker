# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui.spec.js >> Workout Tracker UI Tests >> should render the dashboard in both modes
- Location: tests\ui.spec.js:9:3

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
  4  | test.describe("Workout Tracker UI Tests", () => {
  5  |   test.beforeEach(async ({ page }) => {
> 6  |     await page.goto("/");
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  7  |   });
  8  | 
  9  |   test("should render the dashboard in both modes", async ({ page }) => {
  10 |     await expect(page.getByRole("button", { name: "Workout", exact: true })).toBeVisible();
  11 |     await expect(page.getByRole("button", { name: "Routines", exact: true })).toBeVisible();
  12 |   });
  13 | 
  14 |   test("should be able to search and add an exercise to a workout", async ({ page }) => {
  15 |     await page.getByRole("button", { name: "Start Empty Workout" }).click();
  16 |     await expect(page.getByRole("button", { name: "Finish", exact: true })).toBeVisible();
  17 |     
  18 |     // Open search
  19 |     await page.getByRole("button", { name: "Add Exercise" }).click();
  20 |     
  21 |     // Check search UI
  22 |     const searchInput = page.locator("input[placeholder=\"Search exercise...\"]");
  23 |     await expect(searchInput).toBeVisible();
  24 |     
  25 |     // Wait and find the X button to close search
  26 |     await page.locator(".lucide-x").first().click();
  27 |     
  28 |     // Cancel workout to cleanup
  29 |     await page.getByRole("button", { name: "Cancel" }).click();
  30 |   });
  31 | 
  32 |   test("should navigate to Custom Exercises and verify UI", async ({ page }) => {
  33 |     await page.getByRole("button", { name: "Exercises", exact: true }).click();
  34 |     await expect(page.getByRole("heading", { name: "Custom", exact: true })).toBeVisible();
  35 |   });
  36 | });
  37 | 
  38 | 
```