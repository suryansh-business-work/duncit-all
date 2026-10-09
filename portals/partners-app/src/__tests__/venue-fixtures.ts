import type { MockedResponse } from '@apollo/client/testing';
import { MY_VENUES } from '../pages/register-venue-page/queries';

/** One `myVenues` row, shaped the way the MY_VENUES selection answers. */
export const myVenue = (id: string, venue_name: string, status = 'APPROVED') => ({
  __typename: 'Venue',
  id,
  status,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
  venue_name,
  venue_type: 'CAFE',
  capacity: 40,
  capacity_items: [],
  cover_image_url: '',
  city: 'Pune',
  locality: 'Baner',
  settings: null,
});

/** MY_VENUES answering these rows, however many times a page asks. */
export const myVenuesMock = (rows: ReturnType<typeof myVenue>[]): MockedResponse => ({
  request: { query: MY_VENUES, variables: {} },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { myVenues: rows } },
});
