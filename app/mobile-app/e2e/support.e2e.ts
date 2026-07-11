import { by, device, element, expect, waitFor } from 'detox';

/**
 * Support hub: account drawer → Support → live tools (SOS / Callback / Feedback /
 * Tickets / FAQs). Mirrors mWeb's /support hub and its tool pages.
 */
describe('Support hub', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('Scenario 1: opens the Support hub from the account drawer', async () => {
    await waitFor(element(by.id('account-button')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('account-button')).tap();
    await element(by.id('sidebar-item-Support')).tap();
    await waitFor(element(by.id('support-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('Scenario 2: opens the SOS tool and returns', async () => {
    await element(by.id('account-button')).tap();
    await element(by.id('sidebar-item-Support')).tap();
    await waitFor(element(by.id('support-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('support-more-sos')).tap();
    await waitFor(element(by.id('sos-screen')))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.id('sos-send'))).toBeVisible();
  });

  it('Scenario 3: opens the FAQs reader from the account drawer', async () => {
    // FAQs live in the account drawer, not the support hub (the hub is now a
    // FAQ-forward help center whose topics deep-link into this same reader).
    await element(by.id('account-button')).tap();
    await element(by.id('sidebar-item-Faqs')).tap();
    await waitFor(element(by.id('faqs-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });
});
