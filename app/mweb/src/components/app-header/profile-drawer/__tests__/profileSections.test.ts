import { describe, expect, it } from 'vitest';
import { PROFILE_GRID, REFERRAL_TILE, buildManageItems } from '../profileSections';

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

  it('builds the manage list without Pod Plans by default', () => {
    const labels = buildManageItems(false).map((i) => i.label);
    expect(labels).toEqual([
      'Manage Account',
      'Pod Shop',
      'My Product Order History',
      'Saved Items',
      'Verification',
      'FAQs',
    ]);
  });

  it('inserts Pod Plans before FAQs when the flag is on', () => {
    const labels = buildManageItems(true).map((i) => i.label);
    expect(labels).toEqual([
      'Manage Account',
      'Pod Shop',
      'My Product Order History',
      'Saved Items',
      'Verification',
      'Pod Plans',
      'FAQs',
    ]);
  });

  it('every route is absolute', () => {
    const all = [...PROFILE_GRID, REFERRAL_TILE, ...buildManageItems(true)];
    expect(all.every((t) => t.to.startsWith('/'))).toBe(true);
  });
});
