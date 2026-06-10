import { test as base, expect } from '@playwright/test';

// Extend the base test to capture page errors and console errors
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: Error[] = [];

    page.on('pageerror', (error) => {
      errors.push(error);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore specific expected errors if necessary, but generally fail on console.error
        if (!text.includes('Failed to load resource: net::ERR_BLOCKED_BY_CLIENT')) {
          errors.push(new Error(`Console Error: ${text}`));
        }
      }
    });

    await use(page);

    // Fail the test if any errors were captured during its execution
    if (errors.length > 0) {
      const errorMessages = errors.map((e) => e.message).join('\n');
      throw new Error(`Test failed due to browser errors:\n${errorMessages}`);
    }
  },
});

export { expect } from '@playwright/test';
