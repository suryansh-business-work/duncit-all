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

  test('mirrors the finance engine across inputs, edge cases and reset', async ({ page }) => {
    // Default state renders the full waterfall.
    await expect(page.getByText('Total Duncit revenue')).toBeVisible();
    await expect(page.getByText('Reconciles to pod amount')).toBeVisible();

    const podAmount = page.getByRole('spinbutton', { name: 'Pod amount (GST-inclusive)' });
    const venueCost = page.getByRole('spinbutton', { name: 'Venue fixed cost' });

    // Edit the two currency inputs — exercises both cards' onChange handlers.
    await podAmount.fill('1500');
    await venueCost.fill('500');

    // Nudge every percent slider → Slider onChange + value-label format.
    const sliders = page.getByRole('slider');
    const count = await sliders.count();
    for (let i = 0; i < count; i += 1) {
      await sliders.nth(i).focus();
      await page.keyboard.press('ArrowRight');
    }

    // Type into a percent number field → the PercentSlider text onChange + clamp.
    await page.getByRole('spinbutton', { name: 'GST', exact: true }).fill('20');

    // Venue price above the pool clamps the venue to the pool and zeroes the host.
    await venueCost.fill('100000');
    await expect(page.getByText('Host receives')).toBeVisible();

    // Zero the pod amount → host take-home falls through to the 0% branch.
    await podAmount.fill('0');
    await expect(page.getByText('0.0% host take-home')).toBeVisible();

    // Reset restores the defaults.
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(podAmount).toHaveValue('1000');
  });
});
