import { test, expect } from '@playwright/test';
import { mockGraphql, blockThirdParty } from './support/gql';
import { clearAuth } from './support/auth';

test.describe('Auth', () => {
  test.beforeEach(async ({ page }) => {
    await blockThirdParty(page);
    await mockGraphql(page, {});
    await clearAuth(page);
  });

  test('signed-out visit to home redirects to login with the form', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log me in' })).toBeVisible();
  });

  test('shows required + invalid email validation', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Log me in' }).click();
    await expect(page.getByText('Email is required')).toBeVisible();

    await page.getByLabel('Email').fill('not-an-email');
    await page.getByRole('button', { name: 'Log me in' }).click();
    await expect(page.getByText('Enter a valid email')).toBeVisible();
  });

  test('links to forgot-password and register', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL(/forgot-password/);

    await page.goto('/login');
    await page.getByRole('link', { name: 'Create one' }).click();
    await expect(page).toHaveURL(/register/);
  });
});
