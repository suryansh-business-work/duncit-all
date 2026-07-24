import { describe, expect, it } from 'vitest';
import { appConfig, buildNav } from './app-config';

describe('buildNav', () => {
  it('returns the base nav (no Wallet / Club Admin) for a user with no earning roles', () => {
    const nav = buildNav([]);
    expect(nav).toBe(appConfig.nav);
    expect(nav.some((i) => i.to === '/wallet')).toBe(false);
    expect(nav.some((i) => i.label === 'Club Admin')).toBe(false);
  });

  it('handles null / undefined roles as no earning roles', () => {
    expect(buildNav(null).some((i) => i.to === '/wallet')).toBe(false);
    expect(buildNav(undefined).some((i) => i.to === '/wallet')).toBe(false);
  });

  it('adds a Wallet entry for each earning role, before FAQs', () => {
    for (const role of ['HOST', 'VENUE_OWNER', 'ECOMM_MANAGER']) {
      const nav = buildNav([role]);
      const walletIndex = nav.findIndex((i) => i.to === '/wallet');
      const faqIndex = nav.findIndex((i) => i.to === '/faqs');
      expect(walletIndex).toBeGreaterThanOrEqual(0);
      expect(walletIndex).toBeLessThan(faqIndex);
    }
  });

  it('adds both Club Admin tools and Wallet for a club admin', () => {
    const nav = buildNav(['CLUB_ADMIN']);
    const labels = nav.map((i) => i.label);
    expect(labels).toContain('Club Admin');
    expect(labels).toContain('Wallet');
    const faqIndex = nav.findIndex((i) => i.to === '/faqs');
    expect(nav.findIndex((i) => i.label === 'Club Admin')).toBeLessThan(faqIndex);
    expect(nav.findIndex((i) => i.to === '/wallet')).toBeLessThan(faqIndex);
  });
});
