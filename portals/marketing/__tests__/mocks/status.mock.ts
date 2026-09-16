import type { MockedResponse } from '@apollo/client/testing';
import {
  CREATE_OFFICIAL_STATUS,
  DELETE_OFFICIAL_STATUS,
  LOCATIONS_FOR_STATUS,
  UPDATE_OFFICIAL_STATUS,
  type OfficialStatusRow,
  type StatusLocationOption,
} from '../../src/pages/status-page/queries';

export const makeOfficialStatusRow = (
  over: Partial<OfficialStatusRow> = {},
): OfficialStatusRow => ({
  id: 'os1',
  title: 'Diwali sale is live',
  media_url: 'https://cdn.duncit.com/status/diwali.jpg',
  media_type: 'IMAGE',
  caption: '20% off badminton pods',
  link_url: '/shop',
  scope: 'GLOBAL',
  location_ids: [],
  location_names: [],
  expires_at: null,
  is_active: true,
  is_live: true,
  view_count: 128,
  created_by: 'Asha Verma',
  created_at: '2026-07-31T00:00:00.000Z',
  updated_at: '2026-07-31T00:00:00.000Z',
  ...over,
});

const typedStatus = (row: OfficialStatusRow) => ({ __typename: 'OfficialStatus', ...row });

export const STATUS_LOCATIONS: StatusLocationOption[] = [
  { id: 'loc1', location_name: 'Mumbai' },
  { id: 'loc2', location_name: 'Pune' },
];

export const locationsForStatusMock = (
  locations: StatusLocationOption[] = STATUS_LOCATIONS,
): MockedResponse => ({
  request: { query: LOCATIONS_FOR_STATUS },
  result: {
    data: {
      locations: locations.map((location) => ({ __typename: 'Location', ...location })),
    },
  },
  maxUsageCount: 20,
});

export const createOfficialStatusMock = (
  over: Partial<OfficialStatusRow> = {},
  opts: { failWith?: string } = {},
): MockedResponse => ({
  request: { query: CREATE_OFFICIAL_STATUS, variables: () => true },
  ...(opts.failWith
    ? { result: { errors: [{ message: opts.failWith }] } }
    : { result: { data: { createOfficialStatus: typedStatus(makeOfficialStatusRow(over)) } } }),
});

export const updateOfficialStatusMock = (
  over: Partial<OfficialStatusRow> = {},
  opts: { failWith?: string } = {},
): MockedResponse => ({
  request: { query: UPDATE_OFFICIAL_STATUS, variables: () => true },
  ...(opts.failWith
    ? { result: { errors: [{ message: opts.failWith }] } }
    : { result: { data: { updateOfficialStatus: typedStatus(makeOfficialStatusRow(over)) } } }),
});

export const deleteOfficialStatusMock = (opts: { failWith?: string } = {}): MockedResponse => ({
  request: { query: DELETE_OFFICIAL_STATUS, variables: () => true },
  ...(opts.failWith
    ? { result: { errors: [{ message: opts.failWith }] } }
    : { result: { data: { deleteOfficialStatus: true } } }),
});
