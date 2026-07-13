import type { Page } from '@playwright/test';

const TOKEN_KEY = 'crm_token';

/** Seed a session token so `RequireAuth` lets authed routes render. */
export async function seedAuth(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    globalThis.localStorage.setItem(key, 'e2e-token');
  }, TOKEN_KEY);
}

/** Ensure the app boots signed-out (login screen). */
export async function clearAuth(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    globalThis.localStorage.removeItem(key);
  }, TOKEN_KEY);
}
