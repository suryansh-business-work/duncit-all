import { describe, expect, it } from 'vitest';
import { locationLabel, locationMismatch, type LocationPick } from '../src/location-mismatch';

const mumbai: LocationPick = { id: 'loc-mum', city: 'Mumbai', zone: 'Bandra' };
const bengaluru: LocationPick = { id: 'loc-blr', city: 'Bengaluru', zone: 'Indiranagar' };

describe('locationLabel', () => {
  it('joins the city and the area with a middle dot', () => {
    expect(locationLabel('Bengaluru', 'Indiranagar')).toBe('Bengaluru · Indiranagar');
  });

  it('is the city alone when no area is picked, whatever blank the area arrives as', () => {
    expect(locationLabel('Bengaluru')).toBe('Bengaluru');
    expect(locationLabel('Bengaluru', null)).toBe('Bengaluru');
    expect(locationLabel(' Bengaluru ', '   ')).toBe('Bengaluru');
  });

  it('falls back to the area when the city is unknown, and to nothing when both are', () => {
    expect(locationLabel(undefined, 'Indiranagar')).toBe('Indiranagar');
    expect(locationLabel(null, null)).toBe('');
  });
});

describe('locationMismatch', () => {
  it('names both places, the switch target and its area when the cities differ', () => {
    expect(locationMismatch(mumbai, bengaluru)).toEqual({
      current: 'Mumbai · Bandra',
      currentCity: 'Mumbai',
      target: 'Bengaluru · Indiranagar',
      targetCity: 'Bengaluru',
      targetId: 'loc-blr',
      targetZone: 'Indiranagar',
    });
  });

  it('selects the whole city when the link carries no area', () => {
    const result = locationMismatch(mumbai, { id: 'loc-blr', city: 'Bengaluru' });
    expect(result?.target).toBe('Bengaluru');
    expect(result?.targetZone).toBe('');
  });

  it('is null for the same city — two areas of one city share a feed', () => {
    expect(locationMismatch(mumbai, { id: 'loc-mum', city: 'Mumbai', zone: 'Andheri' })).toBeNull();
  });

  it('is null while either side has no id — nothing has hydrated yet', () => {
    expect(locationMismatch({ city: 'Mumbai' }, bengaluru)).toBeNull();
    expect(locationMismatch(mumbai, { id: '  ', city: 'Bengaluru' })).toBeNull();
  });

  it('is null when either city cannot be named — a dialog must never read "switch to "', () => {
    expect(locationMismatch({ id: 'loc-mum' }, bengaluru)).toBeNull();
    expect(locationMismatch(mumbai, { id: 'loc-blr', city: null })).toBeNull();
  });
});
