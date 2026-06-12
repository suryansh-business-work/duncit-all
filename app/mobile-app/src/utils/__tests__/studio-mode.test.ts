import { STUDIO_LABEL, availableModes, resolveMode } from '@/utils/studio-mode';

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

  it('exposes labels for every mode', () => {
    expect(STUDIO_LABEL.HOST).toBe('Host Studio');
    expect(STUDIO_LABEL.VENUE).toBe('Venue Studio');
    expect(STUDIO_LABEL.ECOMM).toBe('ecomm');
    expect(STUDIO_LABEL.USER).toBe('User');
  });
});
