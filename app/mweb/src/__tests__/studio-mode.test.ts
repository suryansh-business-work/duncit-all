import { describe, expect, it } from 'vitest';
import { STUDIO_LABEL, availableModes, resolveMode } from '../studio-mode';

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

  it('exposes labels for every mode', () => {
    expect(STUDIO_LABEL.ECOMM).toBe('ecomm');
    expect(STUDIO_LABEL.USER).toBe('User');
  });
});
