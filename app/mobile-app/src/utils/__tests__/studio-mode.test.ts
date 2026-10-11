import { STUDIO_OPTIONS_ENTRY } from '@duncit/utils';

import {
  STUDIO_LABEL,
  STUDIO_ROUTE,
  availableModes,
  resolveMode,
  studioSwitchRoute,
} from '@/utils/studio-mode';

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

  it('falls a mode back to USER when the role is missing', () => {
    expect(resolveMode('HOST', ['HOST'])).toBe('HOST');
    expect(resolveMode('HOST', [])).toBe('USER');
    expect(resolveMode('USER', [])).toBe('USER');
    expect(resolveMode('ECOMM', ['ECOMM_MANAGER'])).toBe('ECOMM');
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

  it('names each role’s Studio screen exactly as the shared catalogue does', () => {
    expect(STUDIO_ROUTE).toEqual({
      HOST: STUDIO_OPTIONS_ENTRY.HOST.route,
      VENUE: STUDIO_OPTIONS_ENTRY.VENUE.route,
      ECOMM: STUDIO_OPTIONS_ENTRY.ECOMM.route,
      CLUB: STUDIO_OPTIONS_ENTRY.CLUB.route,
    });
  });

  it('lands a role switch on the role’s Studio screen, and User mode on Home', () => {
    expect(studioSwitchRoute('HOST', null)).toBe('HostOptions');
    expect(studioSwitchRoute('VENUE', undefined)).toBe('VenueOptions');
    expect(studioSwitchRoute('CLUB', { venue: 0, host: 0, club: 0 })).toBe('ClubOptions');
    expect(studioSwitchRoute('ECOMM', null)).toBe('BrandOptions');
    expect(studioSwitchRoute('USER', null)).toBe('Home');
  });

  it('opens the Auto Pod queue instead while one is waiting on the role', () => {
    const counts = { venue: 2, host: 0, club: 1 };
    expect(studioSwitchRoute('VENUE', counts)).toBe('VenueAutoPods');
    expect(studioSwitchRoute('CLUB', counts)).toBe('ClubAutoPods');
    // Nothing waiting on the host, and a brand never enrols in an Auto Pod.
    expect(studioSwitchRoute('HOST', counts)).toBe('HostOptions');
    expect(studioSwitchRoute('ECOMM', counts)).toBe('BrandOptions');
    expect(studioSwitchRoute('USER', counts)).toBe('Home');
  });

  it('exposes labels for every mode', () => {
    expect(STUDIO_LABEL.HOST).toBe('Host Studio');
    expect(STUDIO_LABEL.VENUE).toBe('Venue Studio');
    expect(STUDIO_LABEL.ECOMM).toBe('ecomm');
    expect(STUDIO_LABEL.USER).toBe('User');
  });
});
