import { fallbackT } from '@/i18n/fallback';
import {
  fromFilterValues,
  makeLeadListFiltersSchema,
  toFilterValues,
} from '@/forms/lead-list-filters';
import { LEAD_LIST_KINDS } from '../listKinds';
import {
  EMPTY_LEAD_FILTERS,
  FOLLOW_UP_FIRST,
  NEAREST_FIRST,
  activeFilterCount,
  effectiveSort,
  sortFieldsFor,
  toTableFilters,
  toTableQuery,
} from '../listQuery';
import { areaChoices, cityChoices } from '../useNearbyPlaces';
import { nearbyLabel } from '../useLeadListState';

/** The listing's filters, order and nearby wording — what the phone sends the `*LeadsTable` reads. */

const venue = LEAD_LIST_KINDS.VENUE_LEAD;
const creator = LEAD_LIST_KINDS.CREATOR_LEAD;
const ALL_SET = {
  ...EMPTY_LEAD_FILTERS,
  statuses: ['Won'],
  priorities: ['High'],
  assignees: ['u1'],
  superCategories: ['sc1'],
  platforms: ['IOS'],
  qualifications: ['QUALIFIED'],
  verifications: ['COMPLETE'],
  city: ' Pune ',
  extra: 'Instagram',
  scoreMin: 40,
  scoreMax: 90,
  followUpFrom: new Date(2026, 10, 1, 12),
  followUpTo: new Date(2026, 10, 3, 12),
  createdFrom: null,
  createdTo: null,
  distanceMax: 3,
};

describe('toTableFilters', () => {
  it('sends every set filter in the table contract’s terms', () => {
    expect(toTableFilters(ALL_SET, venue, true)).toEqual([
      { field: 'lead_status', op: 'in', values: ['Won'] },
      { field: 'priority', op: 'in', values: ['High'] },
      { field: 'assigned_to', op: 'in', values: ['u1'] },
      { field: 'super_category_id', op: 'in', values: ['sc1'] },
      { field: 'duncit_platforms', op: 'in', values: ['IOS'] },
      { field: 'quality_qualification', op: 'in', values: ['QUALIFIED'] },
      { field: 'quality_verification', op: 'in', values: ['COMPLETE'] },
      { field: 'city', op: 'contains', value: 'Pune' },
      { field: 'quality_score', op: 'between', values: ['40', '90'] },
      {
        field: 'next_follow_up_date',
        op: 'between',
        values: [
          new Date(2026, 10, 1).toISOString(),
          new Date(2026, 10, 3, 23, 59, 59, 999).toISOString(),
        ],
      },
      { field: 'distance_km', op: 'lte', value: '3' },
    ]);
  });

  it('drops what a kind or a listing without a nearby search cannot filter by', () => {
    const filters = toTableFilters(ALL_SET, creator, false);
    expect(filters.some((f) => f.field === 'duncit_platforms')).toBe(false);
    expect(filters.find((f) => f.field === 'distance_km')).toBeUndefined();
    expect(filters.find((f) => f.field === 'primary_platform')).toEqual({
      field: 'primary_platform',
      op: 'contains',
      value: 'Instagram',
    });
    expect(activeFilterCount(EMPTY_LEAD_FILTERS, venue, true)).toBe(0);
    expect(
      activeFilterCount({ ...EMPTY_LEAD_FILTERS, scoreMax: 50, city: '  ' }, venue, false),
    ).toBe(1);
  });

  it('builds one page’s query, a blank search sent as none', () => {
    expect(
      toTableQuery(
        {
          search: '  ',
          filters: EMPTY_LEAD_FILTERS,
          sort: FOLLOW_UP_FIRST,
          kind: venue,
          nearby: false,
        },
        2,
        25,
      ),
    ).toEqual({
      search: null,
      page: 2,
      page_size: 25,
      sort_by: 'next_follow_up_date',
      sort_dir: 'asc',
      filters: [],
    });
  });
});

describe('order', () => {
  it('only sorts nearest first while a nearby search is on', () => {
    expect(effectiveSort(NEAREST_FIRST, true)).toBe(NEAREST_FIRST);
    expect(effectiveSort(NEAREST_FIRST, false)).toBe(FOLLOW_UP_FIRST);
    const byName = { field: 'venue_name', dir: 'desc' as const };
    expect(effectiveSort(byName, false)).toBe(byName);
  });

  it('offers the server’s sortable fields, the kind’s extra column and, nearby, Distance first', () => {
    expect(sortFieldsFor(venue, false).map((f) => f.field)).toEqual([
      'next_follow_up_date',
      'venue_name',
      'created_at',
      'quality_score',
      'lead_status',
      'priority',
      'city',
      'email',
      'assigned_to',
    ]);
    const host = sortFieldsFor(LEAD_LIST_KINDS.HOST_LEAD, true);
    expect(host[0]).toEqual({ field: 'distance_km', labelKey: 'crm.nearby.distance' });
    expect(host.at(-1)).toEqual({ field: 'host_type', labelKey: 'shell.common.type' });
  });
});

describe('Filters sheet rules', () => {
  const schema = makeLeadListFiltersSchema(fallbackT);
  const values = toFilterValues(EMPTY_LEAD_FILTERS, FOLLOW_UP_FIRST);
  const messages = (over: Record<string, unknown>) => {
    const result = schema.safeParse({ ...values, ...over });
    return result.success ? [] : result.error.issues.map((i) => i.message);
  };

  it('takes empty filters and round-trips them with the order', () => {
    expect(messages({})).toEqual([]);
    expect(fromFilterValues({ ...values, sortField: 'city', sortDir: 'desc' })).toEqual({
      filters: EMPTY_LEAD_FILTERS,
      sort: { field: 'city', dir: 'desc' },
    });
  });

  it('refuses a score off the scale, a distance of 0 and a range the wrong way round', () => {
    expect(messages({ scoreMin: -1 })).toEqual(['Enter a score from 0 to 100']);
    expect(messages({ scoreMax: Number.NaN })).toEqual(['Enter a score from 0 to 100']);
    expect(messages({ distanceMax: 0 })).toEqual(['Enter a distance above 0 km']);
    expect(
      messages({ followUpFrom: new Date(2026, 1, 2), followUpTo: new Date(2026, 1, 1) }),
    ).toEqual(['The first value cannot be after the second']);
    expect(
      messages({ createdFrom: new Date(2026, 1, 2), createdTo: new Date(2026, 1, 1) }),
    ).toEqual(['The first value cannot be after the second']);
  });
});

describe('Nearby leads places and wording', () => {
  const locations = [
    {
      city: 'Pune',
      location_zones: [{ zone_name: 'Kothrud' }, { zone_name: 'Baner' }, { zone_name: null }],
    },
    { city: 'Mumbai', location_zones: null },
    { city: 'Pune', location_zones: [{ zone_name: 'Baner' }] },
    { city: null },
  ];

  it('lists each admin city once, A–Z, and the picked city’s areas', () => {
    expect(cityChoices(locations).map((c) => c.value)).toEqual(['Mumbai', 'Pune']);
    expect(areaChoices(locations, 'Pune').map((a) => a.label)).toEqual(['Baner', 'Kothrud']);
    expect(areaChoices(locations, '')).toEqual([]);
    expect(areaChoices(locations, 'Mumbai')).toEqual([]);
  });

  it('names the search as the portal’s chip does', () => {
    expect(nearbyLabel({ source: 'me', city: '', area: '', radius_km: 5 }, fallbackT)).toBe(
      'Within 5 km of you',
    );
    expect(nearbyLabel({ source: 'place', city: 'Pune', area: '', radius_km: 2 }, fallbackT)).toBe(
      'Within 2 km of Pune',
    );
    expect(
      nearbyLabel({ source: 'place', city: 'Pune', area: 'Baner', radius_km: 2 }, fallbackT),
    ).toBe('Within 2 km of Baner, Pune');
  });
});
