import type { ReactNode } from 'react';
import { expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { useVenueEditor } from '../../../src/venues/editor/useVenueEditor';
import {
  ADMIN_UPDATE_VENUE,
  SET_VENUE_ACTIVE,
  SET_VENUE_DEDUCTIONS,
  SET_VENUE_HOST_REQUEST_LIMIT,
  UPDATE_VENUE_SETTINGS,
  VENUE_REGISTRATION_CONFIG,
} from '../../../src/venues/editor/queries';
import { VENUE_DETAIL, type AdminVenueDetail } from '../../../src/venues/detail/queries';
import { venuePayload } from '../../../src/venues/detail/__tests__/fixtures';
import { registrationConfig } from '../../../src/venues/editor/__tests__/catalogues';
import { venueRecord } from '../../fixtures';

/**
 * What the two `useVenueEditor` suites share: the mocked reads, the recorded
 * writes, and the hook mounted under Apollo and a router. Test kit, not shipped
 * code. Each suite still mocks `@duncit/user-context` itself — `vi.mock` is
 * hoisted per test file.
 */

/** Every write the hook made, in order, with what it sent. */
export const calls: { log: { op: string; variables: Record<string, unknown> }[] } = { log: [] };

export const VENUE_ID = venueRecord.id;
export const CATAN_TRIPLE = {
  super_category_id: '66a0000000000000000000a1',
  category_id: '66a0000000000000000000b2',
  sub_category_id: '66a0000000000000000000c3',
};
export const QUIZ_TRIPLE = {
  super_category_id: '66a0000000000000000000a1',
  category_id: '66a0000000000000000000b5',
  sub_category_id: '66a0000000000000000000c6',
};

export const write = (
  op: string,
  query: MockedResponse['request']['query'],
  data: Record<string, unknown>,
  error?: Error,
): MockedResponse => ({
  request: {
    query,
    variables: (variables: Record<string, unknown>) => {
      calls.log.push({ op, variables });
      return true;
    },
  },
  ...(error ? { error } : { result: { data } }),
});

export const venueRef = (id = VENUE_ID) => ({ __typename: 'Venue', id });

export const writeMocks = () => [
  write('update', ADMIN_UPDATE_VENUE, { adminUpdateVenue: { ...venueRef(), status: 'APPROVED' } }),
  write('settings', UPDATE_VENUE_SETTINGS, { updateVenueSettings: venueRef() }),
  write('deductions', SET_VENUE_DEDUCTIONS, { setVenueDeductions: venueRef() }),
  write('active', SET_VENUE_ACTIVE, { setVenueActive: { ...venueRef(), is_active: false } }),
  write('limit', SET_VENUE_HOST_REQUEST_LIMIT, {
    setVenueHostRequestLimit: { ...venueRef(), host_requests_limit_override: 4 },
  }),
];

export const configMock = (over: Parameters<typeof registrationConfig>[0] = {}): MockedResponse => ({
  request: { query: VENUE_REGISTRATION_CONFIG },
  result: { data: { venueRegistrationConfig: { __typename: 'VenueRegistrationConfig', ...registrationConfig(over) } } },
});

export const detailMock = (venue: AdminVenueDetail = venueRecord): MockedResponse => ({
  request: { query: VENUE_DETAIL, variables: { venue_doc_id: VENUE_ID } },
  result: { data: { venue: venuePayload(venue) } },
});

export const ops = () => calls.log.map((entry) => entry.op);
export const sent = (op: string) => calls.log.find((entry) => entry.op === op)?.variables ?? {};

export function mount(entry: string, venueId: string, mocks: MockedResponse[]) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="*" element={children} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>
  );
  return renderHook(() => ({ editor: useVenueEditor(venueId), location: useLocation() }), { wrapper });
}

export const loadedEdit = async (mocks: MockedResponse[], config = configMock()) => {
  const view = mount(`/venues/${VENUE_ID}/edit`, VENUE_ID, [detailMock(), config, ...mocks]);
  await waitFor(() => expect(view.result.current.editor.venue).not.toBeNull());
  return view;
};
