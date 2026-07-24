import { describe, expect, it } from 'vitest';
import {
  PROFILE_GRID,
  REFERRAL_TILE,
  SHOP_ITEMS,
  buildEarningsItems,
  buildManageItems,
} from '../profileSections';

describe('profileSections', () => {
  it('exposes exactly four quick-action tiles pointing at real routes', () => {
    expect(PROFILE_GRID).toHaveLength(4);
    expect(PROFILE_GRID.map((t) => t.label)).toEqual([
      'Pod History',
      'Help & Support',
      'Earn with Duncit',
      'Pod Ideas',
    ]);
    expect(PROFILE_GRID.map((t) => t.to)).toEqual([
      '/pod-history',
      '/support',
      '/earn',
      '/pod-ideas',
    ]);
    expect(PROFILE_GRID.every((t) => t.label && t.caption)).toBe(true);
  });

  it('the referral tile points at /referral without a hardcoded amount', () => {
    expect(REFERRAL_TILE.to).toBe('/referral');
    expect(REFERRAL_TILE.caption).not.toMatch(/\d/);
  });

  it('builds the manage list (account rows only) without Pod Plans by default', () => {
    const labels = buildManageItems(false).map((i) => i.label);
    expect(labels).toEqual(['Manage Account', 'Saved Items', 'Verification', 'FAQs']);
  });

  it('inserts Pod Plans before FAQs when the flag is on', () => {
    const labels = buildManageItems(true).map((i) => i.label);
    expect(labels).toEqual([
      'Manage Account',
      'Saved Items',
      'Verification',
      'Pod Plans',
      'FAQs',
    ]);
  });

  it('exposes the Shop e-commerce section as its own list of real routes', () => {
    expect(SHOP_ITEMS.map((i) => i.label)).toEqual([
      'Pod Shop',
      'My Product Order History',
      'Address Book',
      'Cart',
    ]);
    expect(SHOP_ITEMS.map((i) => i.to)).toEqual(['/shop', '/orders', '/address-book', '/cart']);
  });

  it('shows an Earnings > Withdrawal row only for partner roles (empty for consumers)', () => {
    expect(buildEarningsItems([])).toEqual([]);
    expect(buildEarningsItems(['USER'])).toEqual([]);
    const host = buildEarningsItems(['HOST']);
    expect(host.map((i) => i.label)).toEqual(['Withdrawal']);
    expect(host[0]?.to).toBe('/host/wallet');
    expect(buildEarningsItems(['VENUE_OWNER'])).toHaveLength(1);
    expect(buildEarningsItems(['CLUB_ADMIN'])).toHaveLength(1);
    expect(buildEarningsItems(['ECOMM_MANAGER'])).toHaveLength(1);
  });

  it('every route is absolute', () => {
    const all = [
      ...PROFILE_GRID,
      REFERRAL_TILE,
      ...buildManageItems(true),
      ...buildEarningsItems(['HOST']),
      ...SHOP_ITEMS,
    ];
    expect(all.every((t) => t.to.startsWith('/'))).toBe(true);
  });
});
