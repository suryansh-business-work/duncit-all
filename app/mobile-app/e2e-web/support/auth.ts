import type { Page } from '@playwright/test';

/** Seed the persisted auth token (secure-storage maps to localStorage on web)
 * so the auth store hydrates signed-in and the app shows the Home tabs. */
export async function seedAuth(page: Page): Promise<void> {
  await page.addInitScript(() => {
    globalThis.localStorage.setItem('duncit.auth.token', 'e2e-token');
  });
}

/** Ensure the app boots signed-out (auth screens). */
export async function clearAuth(page: Page): Promise<void> {
  await page.addInitScript(() => {
    globalThis.localStorage.removeItem('duncit.auth.token');
  });
}
