import { describe, expect, it } from 'vitest';
import { STUDIO_OPTIONS_ENTRY } from '../src/studio-options';
import {
  STUDIO_ROLE_LABEL_KEY,
  heldStudioModes,
  studioEntryFor,
  studioModeFor,
} from '../src/studio-switcher';

const EVERY_ROLE = ['HOST', 'VENUE_OWNER', 'CLUB_ADMIN', 'ECOMM_MANAGER'];

describe('STUDIO_ROLE_LABEL_KEY', () => {
  it('names each partner role with its own translation key', () => {
    expect(STUDIO_ROLE_LABEL_KEY).toEqual({
      HOST: 'mweb.studioOptions.roleHost',
      VENUE: 'mweb.studioOptions.roleVenue',
      ECOMM: 'mweb.studioOptions.roleBrand',
      CLUB: 'mweb.studioOptions.roleClub',
    });
  });
});

describe('heldStudioModes', () => {
  it('offers only the partner roles the user holds, in switcher order, never USER', () => {
    expect(heldStudioModes(EVERY_ROLE)).toEqual(['HOST', 'VENUE', 'ECOMM', 'CLUB']);
    expect(heldStudioModes(['CLUB_ADMIN', 'HOST'])).toEqual(['HOST', 'CLUB']);
    expect(heldStudioModes(['VENUE_OWNER'])).toEqual(['VENUE']);
  });

  it('is empty for a user with no partner role', () => {
    expect(heldStudioModes([])).toEqual([]);
    expect(heldStudioModes(['USER', 'ADMIN'])).toEqual([]);
  });

  it('drops the brand role while products are switched off', () => {
    expect(heldStudioModes(EVERY_ROLE, { products: false })).toEqual(['HOST', 'VENUE', 'CLUB']);
    expect(heldStudioModes(['ECOMM_MANAGER'], { products: false })).toEqual([]);
    expect(heldStudioModes(['ECOMM_MANAGER'], { products: true })).toEqual(['ECOMM']);
  });
});

describe('studioModeFor', () => {
  it('opens on the remembered role while the user still holds it', () => {
    expect(studioModeFor('CLUB', EVERY_ROLE)).toBe('CLUB');
    expect(studioModeFor('VENUE', ['HOST', 'VENUE_OWNER'])).toBe('VENUE');
  });

  it('falls back to the first held role from User mode or a role since revoked', () => {
    expect(studioModeFor('USER', ['VENUE_OWNER', 'CLUB_ADMIN'])).toBe('VENUE');
    expect(studioModeFor('HOST', ['CLUB_ADMIN'])).toBe('CLUB');
  });

  it('leaves a remembered brand role for the next held one once products are off', () => {
    expect(studioModeFor('ECOMM', ['ECOMM_MANAGER', 'CLUB_ADMIN'], { products: false })).toBe('CLUB');
  });

  it('is null for a user with no partner role', () => {
    expect(studioModeFor('USER', [])).toBeNull();
    expect(studioModeFor('HOST', [])).toBeNull();
    expect(studioModeFor('ECOMM', ['ECOMM_MANAGER'], { products: false })).toBeNull();
  });
});

describe('studioEntryFor', () => {
  it('is one "Studio" entry that opens the active role’s Options page', () => {
    expect(studioEntryFor('VENUE', EVERY_ROLE)).toEqual({
      labelKey: 'mweb.studioOptions.studioEntry',
      hintKey: 'mweb.studioOptions.studioEntryHint',
      path: STUDIO_OPTIONS_ENTRY.VENUE.path,
      route: STUDIO_OPTIONS_ENTRY.VENUE.route,
      portal: STUDIO_OPTIONS_ENTRY.VENUE.portal,
    });
  });

  it('is offered in User mode too, opening the first role the user holds', () => {
    expect(studioEntryFor('USER', ['CLUB_ADMIN'])).toMatchObject({
      labelKey: 'mweb.studioOptions.studioEntry',
      path: '/clubs/options',
      route: 'ClubOptions',
    });
  });

  it('carries the same name whichever role is active', () => {
    const labels = (['HOST', 'VENUE', 'ECOMM', 'CLUB'] as const).map(
      (mode) => studioEntryFor(mode, EVERY_ROLE)?.labelKey,
    );
    expect(new Set(labels)).toEqual(new Set(['mweb.studioOptions.studioEntry']));
  });

  it('is null for a user with no partner role, and for a brand-only user while products are off', () => {
    expect(studioEntryFor('USER', [])).toBeNull();
    expect(studioEntryFor('ECOMM', ['ECOMM_MANAGER'], { products: false })).toBeNull();
  });

  it('does not change the per-role Options entries it is built from', () => {
    studioEntryFor('HOST', ['HOST']);
    expect(STUDIO_OPTIONS_ENTRY.HOST.labelKey).toBe('mweb.studioOptions.hostEntry');
  });
});
