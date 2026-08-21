# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workout.spec.js >> Workout Flow >> should complete a full workout flow
- Location: tests\workout.spec.js:9:3

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
  4  | test.describe("Workout Flow", () => {
  5  |   test.beforeEach(async ({ page }) => {
> 6  |     await page.goto("/");
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  7  |   });
  8  | 
  9  |   test("should complete a full workout flow", async ({ page }) => {
  10 |     await page.getByRole("button", { name: "Start Empty Workout" }).click();
  11 |     await expect(page.getByRole("button", { name: "Finish", exact: true })).toBeVisible();
  12 | 
  13 |     await page.getByRole("button", { name: "Add Exercise" }).click();
  14 |     
  15 |     const searchInput = page.locator("input[placeholder=\"Search exercise...\"]");
  16 |     await expect(searchInput).toBeVisible();
  17 |     await searchInput.fill("My Playwright Squat");
  18 |     
  19 |     await page.waitForTimeout(500);
  20 |     // There should be an Add Custom Exercise button because it doesn"t exist in API
  21 |     await page.getByRole("button", { name: "Add Custom Exercise" }).click();
  22 |     
  23 |     // Check if exercise was added to workout
  24 |     await expect(page.locator("text=My Playwright Squat").first()).toBeVisible();
  25 |     
  26 |     // Add a set
  27 |     await page.getByRole("button", { name: "New Set" }).click();
  28 |     
  29 |     // Finish the workout
  30 |     await page.getByRole("button", { name: "Finish", exact: true }).click();
  31 |     
  32 |     await expect(page.getByRole("button", { name: "Start Empty Workout" })).toBeVisible();
  33 |   });
  34 | });
  35 | 
  36 | 
```