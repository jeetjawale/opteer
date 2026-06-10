import { Page, expect } from '@playwright/test';

export async function loginViaUI(page: Page) {
  // Authentication is now bypassed locally, just go to dashboard
  await page.goto('/dashboard');
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}
