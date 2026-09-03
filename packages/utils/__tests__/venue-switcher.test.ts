import { describe, expect, it } from 'vitest';
import {
  VENUE_APPLICATION_STATUSES,
  canSwitchVenues,
  defaultVenueId,
  pickVenue,
  venueLabel,
  venueSubLabel,
  type SwitchableVenue,
} from '../src/venue-switcher';

/**
 * `myVenues` answers newest-first, so every list below is written in that order
 * — "first row" and "newest" have to mean the same thing for these rules to
 * mirror the server's `myVenue`.
 */
const CUBBON: SwitchableVenue = {
  id: 'DUN-VEN-1042',
  venue_name: 'Cubbon Park Cafe',
  city: 'Bengaluru',
  status: 'APPROVED',
};
const HAZRATGANJ: SwitchableVenue = {
  id: 'DUN-VEN-1108',
  venue_name: 'Hazratganj Studio',
  city: 'Lucknow',
  status: 'SUBMITTED',
};
const INDIRANAGAR: SwitchableVenue = {
  id: 'DUN-VEN-0977',
  venue_name: 'Indiranagar Loft',
  city: 'Bengaluru',
  status: 'APPROVED',
};

describe('canSwitchVenues', () => {
  it('offers the control once there is a second venue', () => {
    expect(canSwitchVenues([HAZRATGANJ, CUBBON])).toBe(true);
  });

  it('stays out of the way for one venue, and for none', () => {
    expect(canSwitchVenues([CUBBON])).toBe(false);
    expect(canSwitchVenues([])).toBe(false);
  });
});

describe('pickVenue', () => {
  it('shows the venue the owner selected', () => {
    expect(pickVenue([HAZRATGANJ, CUBBON], 'DUN-VEN-1042')).toBe(CUBBON);
  });

  it('falls back when the saved id names a venue that is no longer there', () => {
    // A deleted venue must not leave the studio blank — it lands on the
    // default, exactly as a first visit would.
    expect(pickVenue([HAZRATGANJ, CUBBON], 'DUN-VEN-0000')).toBe(HAZRATGANJ);
  });

  it('prefers the newest in-flight application over an approved venue', () => {
    // Mirrors the server's `myVenue`: an unfinished application is the thing
    // the studio still has to nag about.
    expect(pickVenue([CUBBON, HAZRATGANJ], null)).toBe(HAZRATGANJ);
    expect(pickVenue([CUBBON, HAZRATGANJ], undefined)).toBe(HAZRATGANJ);
  });

  it('takes the newest venue when every application is settled', () => {
    expect(pickVenue([CUBBON, INDIRANAGAR], null)).toBe(CUBBON);
  });

  it('reads a venue with no status as settled rather than in flight', () => {
    const unstated: SwitchableVenue = { id: 'DUN-VEN-2200', venue_name: 'Koramangala Deck' };
    expect(pickVenue([CUBBON, unstated], null)).toBe(CUBBON);
  });

  it('has nothing to show when the partner has no venues', () => {
    expect(pickVenue([], null)).toBeNull();
    expect(pickVenue([], 'DUN-VEN-1042')).toBeNull();
  });

  it('counts every status the server treats as an application in flight', () => {
    expect([...VENUE_APPLICATION_STATUSES]).toEqual(['DRAFT', 'REJECTED', 'SUBMITTED']);
  });
});

describe('defaultVenueId', () => {
  it('seeds a screen with the id the fallback would have landed on', () => {
    expect(defaultVenueId([CUBBON, HAZRATGANJ])).toBe('DUN-VEN-1108');
  });

  it('seeds nothing when there is nothing to seed', () => {
    expect(defaultVenueId([])).toBeNull();
  });
});

describe('venueLabel', () => {
  it('prints the venue name', () => {
    expect(venueLabel(CUBBON, 'Untitled venue')).toBe('Cubbon Park Cafe');
  });

  it('hands back the caller translated word for a draft with no name yet', () => {
    const blank: SwitchableVenue = { id: 'DUN-VEN-3301', venue_name: '   ', status: 'DRAFT' };
    expect(venueLabel(blank, 'Untitled venue')).toBe('Untitled venue');
    expect(venueLabel({ id: 'DUN-VEN-3302' }, 'Untitled venue')).toBe('Untitled venue');
    expect(venueLabel(null, 'Untitled venue')).toBe('Untitled venue');
  });
});

describe('venueSubLabel', () => {
  it('joins the city and the status', () => {
    expect(venueSubLabel(HAZRATGANJ)).toBe('Lucknow · SUBMITTED');
  });

  it('drops the half it does not have', () => {
    expect(venueSubLabel({ id: 'DUN-VEN-4400', city: 'Lucknow' })).toBe('Lucknow');
    expect(venueSubLabel({ id: 'DUN-VEN-4401', status: 'DRAFT' })).toBe('DRAFT');
  });

  it('says nothing at all for no venue', () => {
    expect(venueSubLabel(null)).toBe('');
  });
});
