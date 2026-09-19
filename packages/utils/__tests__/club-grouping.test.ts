import { describe, expect, it } from 'vitest';
import {
  clubCityName,
  clubOptionLabel,
  clubPlaceLabel,
  groupClubsByCity,
  groupClubsByLocality,
  localitiesByClubCount,
  placeLabel,
} from '../src/club-grouping';

const locations = [
  { id: 'loc-pune', location_name: 'Pune West', city: 'Pune', location_image: ' https://ik.imagekit.io/pune.jpg ' },
  { id: 'loc-blr', location_name: 'Bengaluru', city: null },
  { id: 'loc-goa', location_name: 'Goa' },
];

const club = (id: string, location_id: string | null, locality?: string | null) => ({ id, location_id, locality });

describe('clubCityName', () => {
  it('prefers the city and falls back to the location name', () => {
    expect(clubCityName(locations[0])).toBe('Pune');
    expect(clubCityName({ id: 'x', location_name: 'Mumbai', city: '  ' })).toBe('Mumbai');
  });
});

describe('placeLabel', () => {
  it('joins a trimmed area and city', () => {
    expect(placeLabel(' Gomti Nagar ', 'Lucknow ')).toBe('Gomti Nagar, Lucknow');
  });

  it('shows whichever of the two is known, and nothing when neither is', () => {
    expect(placeLabel('Baner', null)).toBe('Baner');
    expect(placeLabel('  ', 'Pune')).toBe('Pune');
    expect(placeLabel()).toBe('');
  });
});

describe('clubPlaceLabel', () => {
  it("names the club's area and its city", () => {
    expect(clubPlaceLabel(club('c1', 'loc-pune', 'Baner'), locations)).toBe('Baner, Pune');
    expect(clubPlaceLabel(club('c2', 'loc-blr', null), locations)).toBe('Bengaluru');
  });

  it('still shows the area of a club whose city is not listed', () => {
    expect(clubPlaceLabel(club('c3', 'loc-gone', 'Indiranagar'), locations)).toBe('Indiranagar');
    expect(clubPlaceLabel(club('c4', null), locations)).toBe('');
  });
});

describe('clubOptionLabel', () => {
  it('puts the place after the club name', () => {
    expect(clubOptionLabel('Who Even Are We?', 'Gomti Nagar, Lucknow')).toBe(
      'Who Even Are We? | Gomti Nagar, Lucknow',
    );
  });

  it('is just the name when the place is unknown', () => {
    expect(clubOptionLabel('Sunrise Runners', '')).toBe('Sunrise Runners');
  });
});

describe('groupClubsByCity', () => {
  it('groups clubs under their city A→Z, keeping order and skipping empty or unknown cities', () => {
    const clubs = [
      club('c1', 'loc-pune', 'Baner'),
      club('c2', 'loc-blr', 'Indiranagar'),
      club('c3', 'loc-pune'),
      club('c4', 'loc-gone'),
      club('c5', null),
    ];
    expect(groupClubsByCity(clubs, locations)).toEqual([
      { locationId: 'loc-blr', city: 'Bengaluru', image: '', clubs: [clubs[1]] },
      { locationId: 'loc-pune', city: 'Pune', image: 'https://ik.imagekit.io/pune.jpg', clubs: [clubs[0], clubs[2]] },
    ]);
  });
});

describe('localitiesByClubCount', () => {
  it('lists localities with clubs first and the empty ones last, each in zone order', () => {
    const clubs = [club('c1', 'loc-pune', 'Kothrud'), club('c2', 'loc-pune', null), club('c3', 'loc-pune', 'Baner')];
    expect(localitiesByClubCount(['Aundh', 'Baner', 'Viman Nagar', 'Kothrud'], clubs)).toEqual([
      { locality: 'Baner', count: 1 },
      { locality: 'Kothrud', count: 1 },
      { locality: 'Aundh', count: 0 },
      { locality: 'Viman Nagar', count: 0 },
    ]);
  });
});

describe('groupClubsByLocality', () => {
  it('groups by trimmed locality A→Z with the no-area clubs last', () => {
    const clubs = [
      club('c1', 'loc-pune', 'Kothrud'),
      club('c2', 'loc-pune', null),
      club('c3', 'loc-pune', ' Baner '),
      club('c4', 'loc-pune', 'Kothrud'),
      club('c5', 'loc-pune', ''),
    ];
    expect(groupClubsByLocality(clubs)).toEqual([
      { locality: 'Baner', clubs: [clubs[2]] },
      { locality: 'Kothrud', clubs: [clubs[0], clubs[3]] },
      { locality: '', clubs: [clubs[1], clubs[4]] },
    ]);
  });

  it('sorts a no-area group last whichever side the comparator sees it on', () => {
    const clubs = [club('c1', 'loc-pune', ''), club('c2', 'loc-pune', 'Aundh')];
    expect(groupClubsByLocality(clubs).map((group) => group.locality)).toEqual(['Aundh', '']);
  });
});
