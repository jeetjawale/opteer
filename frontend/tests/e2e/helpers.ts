import { Page, expect } from '@playwright/test';

export async function loginViaUI(page: Page) {
  // Authentication is now bypassed locally, just go to dashboard
  await page.goto('/dashboard');
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}

export async function configureApiKey(page: Page) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("No GEMINI_API_KEY or OPENAI_API_KEY found in process.env. E2E tests may fail during LLM calls.");
  }
  
  await page.goto('/settings');
  await page.waitForURL('**/settings', { timeout: 15000 });
  
  // Choose the right provider based on which key is available
  if (process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    await page.locator('select').first().selectOption('openai');
  } else {
    await page.locator('select').first().selectOption('gemini');
  }
  
  // Fill the API key
  await page.fill('input[type="password"]', apiKey || "dummy_key");
  
  // Click Save Credentials
  await page.locator('button', { hasText: 'Save Credentials' }).first().click();
  
  // It reloads the page on success, so wait for that
  await page.waitForTimeout(2000);
}
