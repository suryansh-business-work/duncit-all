import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import {
  APPROVED_HOSTS,
  APPROVED_VENUES,
  CLUBS,
  FINANCE_FOR_PODS,
  INVENTORY_PRODUCTS,
  LOCATIONS,
  USERS,
} from '../queries';
import usePodPageData from '../usePodPageData';

const club = {
  __typename: 'Club',
  id: 'club1',
  club_id: 'DUN-CLB-101',
  club_name: 'Sunset Racquet Club',
  super_category_id: 'sc1',
  category_id: 'cat1',
  matched_venues: [{ __typename: 'Venue', id: 'venue1' }],
};

const location = {
  __typename: 'Location',
  id: 'loc1',
  location_id: 'DUN-LOC-7',
  location_name: 'Indiranagar',
  city: 'Bengaluru',
  state: 'Karnataka',
  location_zones: [{ __typename: 'LocationZone', zone_name: 'East' }],
};

const venue = {
  __typename: 'Venue',
  id: 'venue1',
  venue_name: 'Court 2, Koramangala',
  address_line1: '80 Feet Road',
  address_line2: null,
  country: 'India',
  city: 'Bengaluru',
  state: 'Karnataka',
  locality: 'Koramangala',
  postal_code: '560034',
  lat: 12.93,
  lng: 77.62,
};

const user = { __typename: 'User', user_id: 'u1', full_name: 'Meera Nair', email: 'meera@duncit.test' };
const host = { __typename: 'Host', user_id: 'u2', full_name: 'Raj Mehta', email: 'raj@duncit.test' };
const finance = { __typename: 'PublicFinanceSettings', platform_fee_pct: 5, gst_pct: 18, currency_symbol: '₹' };

const ok = (query: MockedResponse['request']['query'], data: Record<string, unknown>): MockedResponse => ({
  request: { query },
  result: { data },
});

const allMocks = (): MockedResponse[] => [
  ok(CLUBS, { clubs: [club] }),
  ok(LOCATIONS, { locations: [location] }),
  ok(APPROVED_VENUES, { venues: [venue] }),
  ok(INVENTORY_PRODUCTS, { inventoryProducts: [] }),
  ok(USERS, { users: [user] }),
  ok(APPROVED_HOSTS, { hosts: [host] }),
  ok(FINANCE_FOR_PODS, { publicFinanceSettings: finance }),
];

const wrapperWith = (mocks: MockedResponse[]) =>
  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <MockedProvider mocks={mocks} mockLinkDefaultOptions={{ delay: 0 }}>
        {children}
      </MockedProvider>
    );
  };

describe('usePodPageData', () => {
  it('hands back empty lookups and dashes every name before the queries answer', () => {
    const { result } = renderHook(() => usePodPageData(), { wrapper: wrapperWith(allMocks()) });

    expect(result.current.clubs).toEqual([]);
    expect(result.current.locations).toEqual([]);
    expect(result.current.approvedVenues).toEqual([]);
    expect(result.current.inventoryProducts).toEqual([]);
    expect(result.current.users).toEqual([]);
    expect(result.current.approvedHosts).toEqual([]);
    expect(result.current.finance).toBeUndefined();
    expect(result.current.clubName('club1')).toBe('—');
    expect(result.current.locName('loc1')).toBe('—');
    expect(result.current.venueName('venue1')).toBe('—');
  });

  it('exposes every dataset once loaded and resolves names by id', async () => {
    const { result } = renderHook(() => usePodPageData(), { wrapper: wrapperWith(allMocks()) });

    await waitFor(() => expect(result.current.finance).toEqual(finance));
    await waitFor(() => expect(result.current.clubs).toEqual([club]));
    await waitFor(() => expect(result.current.approvedHosts).toEqual([host]));
    expect(result.current.locations).toEqual([location]);
    expect(result.current.approvedVenues).toEqual([venue]);
    expect(result.current.users).toEqual([user]);
    expect(result.current.inventoryProducts).toEqual([]);

    expect(result.current.clubName('club1')).toBe('Sunset Racquet Club');
    expect(result.current.locName('loc1')).toBe('Indiranagar');
    expect(result.current.venueName('venue1')).toBe('Court 2, Koramangala');
  });

  it('dashes an id that is not in the loaded lists', async () => {
    const { result } = renderHook(() => usePodPageData(), { wrapper: wrapperWith(allMocks()) });

    await waitFor(() => expect(result.current.clubs).toHaveLength(1));
    await waitFor(() => expect(result.current.locations).toHaveLength(1));
    await waitFor(() => expect(result.current.approvedVenues).toHaveLength(1));
    expect(result.current.clubName('club-missing')).toBe('—');
    expect(result.current.locName('loc-missing')).toBe('—');
    expect(result.current.venueName('venue-missing')).toBe('—');
  });
});
