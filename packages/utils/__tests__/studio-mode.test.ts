import { describe, expect, it } from 'vitest';
import {
  STUDIO_OPTIONS,
  availableModes,
  resolveMode,
  type StudioMode,
} from '../src/studio-mode';

const EVERY_ROLE = ['HOST', 'VENUE_OWNER', 'ECOMM_MANAGER', 'CLUB_ADMIN'];

describe('availableModes', () => {
  it('always offers User, and nothing else without a partner role', () => {
    expect(availableModes([]).map((o) => o.mode)).toEqual(['USER']);
  });

  it('offers one studio per role held, in catalogue order', () => {
    expect(availableModes(['CLUB_ADMIN', 'HOST']).map((o) => o.mode)).toEqual([
      'USER',
      'HOST',
      'CLUB',
    ]);
    expect(availableModes(EVERY_ROLE).map((o) => o.mode)).toEqual([
      'USER',
      'HOST',
      'VENUE',
      'ECOMM',
      'CLUB',
    ]);
  });

  it('drops the E-commerce studio while the product system flag is off', () => {
    expect(availableModes(EVERY_ROLE, { products: false }).map((o) => o.mode)).toEqual([
      'USER',
      'HOST',
      'VENUE',
      'CLUB',
    ]);
  });

  it('treats an absent option and an explicit true as products-on', () => {
    // A caller with no reason to know about products behaves as it always did.
    expect(availableModes(EVERY_ROLE, {}).map((o) => o.mode)).toContain('ECOMM');
    expect(availableModes(EVERY_ROLE, { products: true }).map((o) => o.mode)).toContain('ECOMM');
  });
});

describe('resolveMode', () => {
  it('keeps a mode the user still qualifies for', () => {
    expect(resolveMode('HOST', ['HOST'])).toBe('HOST');
    expect(resolveMode('USER', [])).toBe('USER');
  });

  it('falls back to USER once the role is gone', () => {
    expect(resolveMode('HOST', [])).toBe('USER');
    expect(resolveMode('CLUB', ['HOST'])).toBe('USER');
  });

  it('falls a persisted ECOMM mode back to USER once products are switched off', () => {
    expect(resolveMode('ECOMM', ['ECOMM_MANAGER'], { products: true })).toBe('ECOMM');
    expect(resolveMode('ECOMM', ['ECOMM_MANAGER'], { products: false })).toBe('USER');
    // Only the product studio is affected — the other partner modes stand.
    expect(resolveMode('HOST', ['HOST'], { products: false })).toBe('HOST');
  });
});

describe('the catalogue', () => {
  it('lists every mode in switcher order, and carries no copy of its own', () => {
    const modes: StudioMode[] = ['USER', 'HOST', 'VENUE', 'ECOMM', 'CLUB'];
    expect(STUDIO_OPTIONS.map((o) => o.mode)).toEqual(modes);
    // The words live in each app's own STUDIO_LABEL — this module is the rule.
    expect(STUDIO_OPTIONS.every((o) => !('label' in o))).toBe(true);
    // USER is the only mode with no role behind it.
    expect(STUDIO_OPTIONS.filter((o) => !o.role).map((o) => o.mode)).toEqual(['USER']);
  });
});
