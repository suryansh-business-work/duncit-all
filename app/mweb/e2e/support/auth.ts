import type { Page } from '@playwright/test';

/** Skip the boot splash overlay so it never intercepts clicks in tests. */
async function skipSplash(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('duncit_splash_shown', '1');
  });
}

/** Seed a session token so `RequireAuth` lets authed routes render. */
export async function seedAuth(page: Page): Promise<void> {
  await skipSplash(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('token', 'e2e-token');
    window.localStorage.setItem('duncit_duid', 'e2e-duid');
  });
}

/** Ensure the app boots signed-out (auth screens). */
export async function clearAuth(page: Page): Promise<void> {
  await skipSplash(page);
  await page.addInitScript(() => {
    window.localStorage.removeItem('token');
  });
}
