import { describe, expect, it } from 'vitest';
import { appConfig, buildNav } from './app-config';

describe('buildNav', () => {
  it('shows only the common tail to a user with no partner role', () => {
    const nav = buildNav([]);
    expect(nav.map((i) => i.label)).toEqual(appConfig.nav.map((i) => i.label));
    expect(nav.some((i) => i.to === '/wallet')).toBe(false);
    expect(nav.some((i) => i.label === 'Club Admin')).toBe(false);
  });

  it('never puts the host application in the sidebar', () => {
    expect(buildNav([]).some((i) => i.to === '/become-host')).toBe(false);
    const host = buildNav(['HOST']);
    expect(host.some((i) => i.to === '/become-host')).toBe(false);
    expect(host.find((i) => i.label === 'Host')?.children?.map((c) => c.label)).toEqual(['Dashboard', 'Your Pods']);
  });

  it('handles null / undefined roles as no partner roles', () => {
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
