import { test, expect } from './support/coverage';
import { mockGraphql } from './support/gql';
import { seedAuth, clearAuth } from './support/auth';
import { bootFixtures, ME_NO_ACCESS } from './support/data';

test.describe('App shell + auth', () => {
  test('signed-out visit to a protected route redirects to login', async ({ page }) => {
    await mockGraphql(page, {});
    await clearAuth(page);
    await page.goto('/venue-leads');
    await expect(page).toHaveURL(/\/login/);
  });

  test('authed dashboard renders without redirecting away', async ({ page }) => {
    await mockGraphql(page, bootFixtures());
    await seedAuth(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/localhost:2107\/$/);
    await expect(page).not.toHaveURL(/login/);
  });

  test('a user without the CRM role is bounced to login (denied)', async ({ page }) => {
    await mockGraphql(page, bootFixtures({ SessionMe: ME_NO_ACCESS, DashboardMe: ME_NO_ACCESS }));
    await seedAuth(page);
    await page.goto('/');
    await expect(page).toHaveURL(/denied=1/);
  });
});
