import { test, expect } from './support/coverage';
import { mockGraphql } from './support/gql';
import { seedAuth, clearAuth } from './support/auth';
import { bootFixtures, ME_NO_ACCESS } from './support/data';

test.describe('App shell + auth', () => {
  test('signed-out visit to a protected route redirects to login', async ({ page }) => {
    await mockGraphql(page, {});
    await clearAuth(page);
    await page.goto('/payment-logs');
    await expect(page).toHaveURL(/\/login/);
  });

  test('authed dashboard renders the welcome + role chip', async ({ page }) => {
    await mockGraphql(page, bootFixtures());
    await seedAuth(page);
    await page.goto('/');
    await expect(page.getByText(/Welcome back/)).toBeVisible();
    await expect(page.getByText('FINANCE MANAGER')).toBeVisible();
  });

  test('a user without the finance role is bounced to login (denied)', async ({ page }) => {
    await mockGraphql(page, bootFixtures({ SessionMe: ME_NO_ACCESS, DashboardMe: ME_NO_ACCESS }));
    await seedAuth(page);
    await page.goto('/');
    await expect(page).toHaveURL(/denied=1/);
  });
});
