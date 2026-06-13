import { test, expect } from './support/coverage';
import { mockGraphql } from './support/gql';
import { seedAuth } from './support/auth';
import { bootFixtures } from './support/data';

test.describe('Pod profit calculator', () => {
  test.beforeEach(async ({ page }) => {
    await mockGraphql(page, bootFixtures());
    await seedAuth(page);
    await page.goto('/calculators/pod-profit');
    await expect(page.getByText('Pod Profit Calculator')).toBeVisible();
  });

  test('edits inputs, adds/removes products, hits the zero-margin path and resets', async ({
    page,
  }) => {
    await expect(page.getByText(/No products added/)).toBeVisible();

    // Nudge every percent slider → exercises each onChange + clamp helper.
    const sliders = page.getByRole('slider');
    const count = await sliders.count();
    for (let i = 0; i < count; i += 1) {
      await sliders.nth(i).focus();
      await page.keyboard.press('ArrowRight');
    }

    // Add two products → product rows; editing one with two present exercises
    // the "leave the other product unchanged" map branch.
    await page.getByRole('button', { name: 'Add product' }).click();
    await page.getByRole('button', { name: 'Add product' }).click();
    await expect(page.getByText('Product 2')).toBeVisible();
    await page.getByRole('textbox', { name: 'Name' }).first().fill('Sticker pack');
    await page.getByRole('spinbutton', { name: 'Price' }).first().fill('200');
    await page.getByRole('slider').last().focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText(/Product revenue/)).toBeVisible();

    // Zero the pod cost, then remove both products so revenue denominator is 0 →
    // the margin falls through to the 0% branch.
    const podCost = page.getByRole('spinbutton', { name: 'Pod cost (gross)' });
    await podCost.fill('0');
    await page.getByRole('button', { name: 'remove product' }).first().click();
    await page.getByRole('button', { name: 'remove product' }).click();
    await expect(page.getByText(/No products added/)).toBeVisible();
    await expect(page.getByText('0.0% margin')).toBeVisible();

    // Reset restores the defaults.
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(podCost).toHaveValue('1000');
  });
});
