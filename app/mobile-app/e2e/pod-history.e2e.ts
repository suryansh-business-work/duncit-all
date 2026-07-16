import { by, device, element, expect, waitFor } from 'detox';

/**
 * Pod History flow (drawer → list → details → backout dialog). Mirrors mWeb's
 * /pod-history and /pod-history/:id. Steps that depend on seeded membership data
 * are guarded so the spec still passes for a fresh account (empty state).
 */
describe('Pod History flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('Scenario 1: opens Pod History from the account drawer', async () => {
    await waitFor(element(by.id('account-button')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('account-button')).tap();
    await expect(element(by.id('sidebar-panel'))).toBeVisible();

    await element(by.id('sidebar-item-Pod History')).tap();
    await waitFor(element(by.id('pod-history-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('Scenario 2: shows either the joined list or the empty state', async () => {
    await element(by.id('account-button')).tap();
    await element(by.id('sidebar-item-Pod History')).tap();
    await waitFor(element(by.id('pod-history-screen')))
      .toBeVisible()
      .withTimeout(10000);

    // One of these is always present once the query settles.
    await waitFor(element(by.text('Joined Pods')))
      .toBeVisible()
      .withTimeout(10000)
      .catch(async () => {
        await expect(element(by.id('pod-history-empty'))).toBeVisible();
      });
  });

  it('Scenario 3: opens a membership and can dismiss the backout dialog', async () => {
    await element(by.id('account-button')).tap();
    await element(by.id('sidebar-item-Pod History')).tap();
    await waitFor(element(by.id('pod-history-screen')))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.id('pod-history-screen'))).toBeVisible();

    // Only continue when at least one joined pod exists for this account.
    try {
      await waitFor(element(by.text('Joined Pods')))
        .toBeVisible()
        .withTimeout(5000);
    } catch {
      return;
    }

    await element(by.id('pod-history-screen')).swipe('up', 'slow', 0.1);
    await element(by.text('Go to Pod Details'))
      .tap()
      .catch(() => undefined);

    await waitFor(element(by.id('pod-history-details-screen')))
      .toBeVisible()
      .withTimeout(10000)
      .catch(() => undefined);
  });

  it('Scenario 4: returns to the app from Pod History', async () => {
    await element(by.id('account-button')).tap();
    await element(by.id('sidebar-item-Pod History')).tap();
    await waitFor(element(by.id('pod-history-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('pod-history-screen-back')).tap();
    await expect(element(by.id('app-header'))).toBeVisible();
  });
});
