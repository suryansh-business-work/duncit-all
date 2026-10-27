import { describe, expect, it } from 'vitest';
import { MWEB_FALLBACK_FLAT } from '../i18n/fallback';
import { STUDIO_LABEL_KEY, availableModes, resolveMode, studioSwitchPath } from '../studio-mode';

/** mWeb twin of the native studio-mode test (rule 27) — the two files hold the
 * same rules, so the E-commerce studio cannot go dark on one app only. */
describe('studio-mode', () => {
  it('lists the modes a user qualifies for (always USER)', () => {
    expect(availableModes([]).map((o) => o.mode)).toEqual(['USER']);
    expect(availableModes(['HOST']).map((o) => o.mode)).toEqual(['USER', 'HOST']);
    expect(availableModes(['HOST', 'VENUE_OWNER', 'ECOMM_MANAGER']).map((o) => o.mode)).toEqual([
      'USER',
      'HOST',
      'VENUE',
      'ECOMM',
    ]);
  });


  it('drops the E-commerce studio while the product system flag is off', () => {
    const roles = ['HOST', 'VENUE_OWNER', 'ECOMM_MANAGER'];
    expect(availableModes(roles, { products: false }).map((o) => o.mode)).toEqual([
      'USER',
      'HOST',
      'VENUE',
    ]);
    // Absent options and an explicit `true` both mean "products are on", so a
    // caller with no reason to know about products behaves as it always did.
    expect(availableModes(roles, {}).map((o) => o.mode)).toContain('ECOMM');
    expect(availableModes(roles, { products: true }).map((o) => o.mode)).toContain('ECOMM');
  });

  it('falls a persisted ECOMM mode back to USER once products are switched off', () => {
    expect(resolveMode('ECOMM', ['ECOMM_MANAGER'], { products: false })).toBe('USER');
    expect(resolveMode('ECOMM', ['ECOMM_MANAGER'], { products: true })).toBe('ECOMM');
    // Only the product studio is affected — the other partner modes stand.
    expect(resolveMode('HOST', ['HOST'], { products: false })).toBe('HOST');
  });

  it('lands a role switch on the role’s Studio page, and User mode on Home', () => {
    expect(studioSwitchPath('HOST', null)).toBe('/host/options');
    expect(studioSwitchPath('VENUE', undefined)).toBe('/venues/options');
    expect(studioSwitchPath('CLUB', { venue: 0, host: 0, club: 0 })).toBe('/clubs/options');
    expect(studioSwitchPath('ECOMM', null)).toBe('/products/options');
    expect(studioSwitchPath('USER', null)).toBe('/');
  });

  it('opens the Auto Pod queue instead while one is waiting on the role', () => {
    const counts = { venue: 2, host: 0, club: 1 };
    expect(studioSwitchPath('VENUE', counts)).toBe('/venues/auto-pods');
    expect(studioSwitchPath('CLUB', counts)).toBe('/clubs/auto-pods');
    // Nothing waiting on the host, and a brand never enrols in an Auto Pod.
    expect(studioSwitchPath('HOST', counts)).toBe('/host/options');
    expect(studioSwitchPath('ECOMM', counts)).toBe('/products/options');
    expect(studioSwitchPath('USER', counts)).toBe('/');
  });

  it('exposes a shipped label key for every mode', () => {
    expect(MWEB_FALLBACK_FLAT[STUDIO_LABEL_KEY.ECOMM]).toBe('ecomm');
    expect(MWEB_FALLBACK_FLAT[STUDIO_LABEL_KEY.USER]).toBe('User');
    expect(MWEB_FALLBACK_FLAT[STUDIO_LABEL_KEY.HOST]).toBe('Host Studio');
  });
});
