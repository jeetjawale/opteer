import { Page, expect } from '@playwright/test';

// Use a deterministic test user for E2E
export const TEST_USER = {
  email: 'playwright-test@example.com',
  password: 'TestPassword123!',
};

/**
 * Helper to log in a user.
 */
export async function loginUser(page: Page) {
  await page.goto('/login');
  
  // Wait for load
  await page.waitForSelector('input[type="email"]');
  
  // Fill credentials
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Expect navigation to dashboard
  await expect(page).toHaveURL(/\/applications/);
  
  // Wait for dashboard to fully load (e.g. applications table or empty state)
  await expect(page.locator('text=Dashboard')).toBeVisible();
}
