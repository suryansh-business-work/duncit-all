/**
 * Which venues a Club Admin may book a pod into — the rule all three surfaces
 * share. The public list is the floor; a club's explicit links narrow it only
 * when it has any, because an empty link list is "never attached", not "none
 * allowed" (that reading is what emptied the picker).
 */
import { describe, expect, it } from 'vitest';

import {
  clubAdminVenueOptions,
  filterClubs,
  hostCategoryKeyOf,
  type BookableVenue,
  type ClubFilterOptions,
  type CreatePodClub,
} from '../src/club-venues';

const publicVenues: BookableVenue[] = [
  // publicVenues never selects `status`: the server already vouched for it.
  { id: 'v-1' },
  { id: 'v-2', status: 'APPROVED', is_active: true },
  { id: 'v-3', is_active: false },
];
const owned: BookableVenue[] = [
  { id: 'v-2', status: 'APPROVED' },
  { id: 'v-4', status: 'PENDING' },
  { id: 'v-5', status: 'APPROVED', is_active: null },
];

const ids = (venues: readonly BookableVenue[]) => venues.map((venue) => venue.id);

describe('clubAdminVenueOptions', () => {
  it('offers every bookable public and owned venue, once each, when the club has no links', () => {
    for (const club of [null, undefined, {}, { meetup_venues_id: null }, { meetup_venues_id: [] }]) {
      expect(ids(clubAdminVenueOptions(publicVenues, owned, club))).toEqual(['v-1', 'v-2', 'v-5']);
    }
  });

  it('drops an inactive venue and one still awaiting approval, but keeps one with no status at all', () => {
    const offered = ids(clubAdminVenueOptions(publicVenues, owned, null));
    expect(offered).not.toContain('v-3');
    expect(offered).not.toContain('v-4');
    expect(offered).toContain('v-1');
  });

  it('lets the owned copy of a venue stand in for its public twin', () => {
    const [, second] = clubAdminVenueOptions(publicVenues, owned, null);
    expect(second).toBe(owned[0]);
  });

  it('narrows to the venues the club has linked, ignoring links to venues it may not book', () => {
    const club = { meetup_venues_id: ['v-5', 'v-3', 'v-9'] };
    expect(ids(clubAdminVenueOptions(publicVenues, owned, club))).toEqual(['v-5']);
  });
});

describe('hostCategoryKeyOf', () => {
  it('joins super and sub category ids, leaving a missing side empty', () => {
    expect(hostCategoryKeyOf({ super_category_id: 's-1', sub_category_id: 'sub-1' })).toBe('s-1|sub-1');
    expect(hostCategoryKeyOf({ super_category_id: 's-1', sub_category_id: null })).toBe('s-1|');
    expect(hostCategoryKeyOf({})).toBe('|');
  });
});

describe('filterClubs', () => {
  const clubs: CreatePodClub[] = [
    { id: 'c-1', club_name: 'Run', super_category_id: 's-1', category_id: 'sub-1', location_id: 'blr', locality: 'Indiranagar' },
    { id: 'c-2', club_name: 'Swim', super_category_id: 's-1', category_id: 'sub-2', location_id: 'blr', locality: 'HSR' },
    { id: 'c-3', club_name: 'Chess', super_category_id: 's-2', category_id: 'sub-9', location_id: 'del', locality: null },
    { id: 'c-4', club_name: 'Uncategorised', super_category_id: null, location_id: 'blr' },
    // A Super with no Sub only matches a host category that is Super-only.
    { id: 'c-5', club_name: 'Yoga', super_category_id: 's-1', location_id: 'hyd' },
  ];
  const hostCategories = [
    { super_category_id: 's-1', sub_category_id: 'sub-1' },
    // A Super-only host category matches every club under that Super.
    { super_category_id: 's-2', sub_category_id: null },
  ];
  const opts = (over: Partial<ClubFilterOptions> = {}): ClubFilterOptions => ({
    hostCategories,
    selectedCategoryKey: '',
    locationId: '',
    locality: '',
    podMode: 'PHYSICAL',
    ...over,
  });
  const clubIds = (list: readonly CreatePodClub[]) => list.map((club) => club.id);

  it('scopes to all of the host categories while none is selected', () => {
    expect(clubIds(filterClubs(clubs, opts()))).toEqual(['c-1', 'c-3']);
  });

  it('scopes to the selected category only', () => {
    expect(clubIds(filterClubs(clubs, opts({ selectedCategoryKey: 's-1|sub-1' })))).toEqual(['c-1']);
    expect(clubIds(filterClubs(clubs, opts({ selectedCategoryKey: 's-2|' })))).toEqual(['c-3']);
  });

  it('lets a Super-only host category take every club under that Super, with or without a Sub', () => {
    const superOnly = [{ super_category_id: 's-1', sub_category_id: null }];
    expect(clubIds(filterClubs(clubs, opts({ hostCategories: superOnly })))).toEqual(['c-1', 'c-2', 'c-5']);
  });

  it('does not over-filter a host with no usable categories', () => {
    expect(clubIds(filterClubs(clubs, opts({ hostCategories: [] })))).toEqual(['c-1', 'c-2', 'c-3', 'c-4', 'c-5']);
    const subOnly = [{ super_category_id: null, sub_category_id: 'sub-1' }];
    expect(clubIds(filterClubs(clubs, opts({ hostCategories: subOnly })))).toEqual(['c-1', 'c-2', 'c-3', 'c-4', 'c-5']);
  });

  it('narrows a physical pod to the chosen city, then the chosen locality', () => {
    const all = opts({ hostCategories: [] });
    expect(clubIds(filterClubs(clubs, { ...all, locationId: 'blr' }))).toEqual(['c-1', 'c-2', 'c-4']);
    expect(clubIds(filterClubs(clubs, { ...all, locationId: 'blr', locality: 'HSR' }))).toEqual(['c-2']);
    // A club with no locality never matches a picked locality.
    expect(clubIds(filterClubs(clubs, { ...all, locationId: 'del', locality: 'Saket' }))).toEqual([]);
  });

  it('skips the city and locality filter for a virtual pod', () => {
    const virtual = opts({ podMode: 'VIRTUAL', locationId: 'mum', locality: 'Bandra' });
    expect(clubIds(filterClubs(clubs, virtual))).toEqual(['c-1', 'c-3']);
  });
});
