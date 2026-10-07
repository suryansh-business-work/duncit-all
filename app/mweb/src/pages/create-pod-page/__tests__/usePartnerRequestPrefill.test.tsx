import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { usePartnerRequestPrefill } from '../usePartnerRequestPrefill';
import type { CreatePodVenue } from '../create-pod/create-pod.types';

/** The hook's own request lookup (private to it) — only the fields the prefill sets. */
const CREATE_POD_PARTNER_REQUEST = gql`
  query CreatePodPartnerRequest($id: ID!) {
    podPartnerRequest(id: $id) {
      id
      status
      viewer_side
      venue {
        id
      }
      slot {
        id
        start_at
        end_at
        space_label
      }
    }
  }
`;

const START = '2026-10-10T10:00:00.000Z';
const END = '2026-10-10T12:00:00.000Z';

const ARENA: CreatePodVenue = {
  id: 'venue-1',
  venue_name: 'Gomti Arena',
  location_id: 'loc-lko',
  capacity: 60,
  capacity_items: [
    { label: 'Court A', capacity: 12 },
    { label: 'Court B', capacity: 20 },
  ],
};

interface RequestOver {
  status?: string;
  viewer_side?: string;
  venueId?: string | null;
  slot?: { id: string; start_at: string; end_at: string; space_label: string } | null;
}

const requestMock = (over: RequestOver = {}): MockedResponse => {
  const venueId = over.venueId === undefined ? 'venue-1' : over.venueId;
  const slot =
    over.slot === undefined ? { id: 'slot-9', start_at: START, end_at: END, space_label: 'Court B' } : over.slot;
  return {
    request: { query: CREATE_POD_PARTNER_REQUEST, variables: { id: 'req-1' } },
    result: {
      data: {
        podPartnerRequest: {
          __typename: 'PodPartnerRequest',
          id: 'req-1',
          status: over.status ?? 'SLOT_CONFIRMED',
          viewer_side: over.viewer_side ?? 'HOST',
          venue: venueId && { __typename: 'PartnerVenueSummary', id: venueId },
          slot: slot && { __typename: 'PartnerRequestSlot', ...slot },
        },
      },
    },
  };
};

function renderPrefill({
  mocks = [requestMock()],
  venues = [ARENA],
  enabled = true,
  url = '/create-pod?partner_request_id=req-1',
}: { mocks?: MockedResponse[]; venues?: CreatePodVenue[]; enabled?: boolean; url?: string } = {}) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
    </MockedProvider>
  );
  return renderHook(() => usePartnerRequestPrefill(venues, enabled), { wrapper });
}

describe('usePartnerRequestPrefill', () => {
  it("fills a fresh form from a confirmed request: the venue, its city, the slot's space, the slot window and the request id", async () => {
    const { result } = renderPrefill();

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.values).not.toBeNull());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.pinnedVenueId).toBe('venue-1');
    expect(result.current.values).toEqual({
      venue_id: 'venue-1',
      location_id: 'loc-lko',
      venue_space_label: 'Court B',
      no_of_spots: 20,
      venue_slot_id: 'slot-9',
      pod_date_time: new Date(START),
      pod_end_date_time: new Date(END),
      partner_request_id: 'req-1',
    });
  });

  it('matches a whole-venue slot to the whole venue and its capacity', async () => {
    const { result } = renderPrefill({
      mocks: [requestMock({ slot: { id: 'slot-1', start_at: START, end_at: END, space_label: '' } })],
      venues: [{ ...ARENA, capacity_items: [] }],
    });

    await waitFor(() => expect(result.current.values).not.toBeNull());
    expect(result.current.values).toMatchObject({ venue_space_label: 'Whole venue', no_of_spots: 60 });
  });

  it('leaves space and spots for the host when the slot names a space the venue no longer has, and keeps a venue without a city out of location_id', async () => {
    const { result } = renderPrefill({
      mocks: [requestMock({ slot: { id: 'slot-1', start_at: START, end_at: END, space_label: 'Rooftop' } })],
      venues: [{ ...ARENA, location_id: null }],
    });

    await waitFor(() => expect(result.current.values).not.toBeNull());
    expect(result.current.values).not.toHaveProperty('venue_space_label');
    expect(result.current.values).not.toHaveProperty('no_of_spots');
    expect(result.current.values).not.toHaveProperty('location_id');
    expect(result.current.values).toMatchObject({ venue_id: 'venue-1', venue_slot_id: 'slot-1' });
  });

  it.each([
    ['the slot is not confirmed yet', { status: 'SLOT_REQUESTED' }],
    ['the pod already exists', { status: 'POD_CREATED' }],
    ['the viewer is the venue', { viewer_side: 'VENUE' }],
    ['the request has no slot', { slot: null }],
    ['the request has no venue', { venueId: null }],
    ["the venue is not one the host can pick in Create Pod", { venueId: 'venue-elsewhere' }],
  ])('leaves the form blank when %s', async (_case, over: RequestOver) => {
    const { result } = renderPrefill({ mocks: [requestMock(over)] });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.values).toBeNull();
    expect(result.current.pinnedVenueId).toBeUndefined();
  });

  it('does nothing without a request id in the link', () => {
    const { result } = renderPrefill({ mocks: [], url: '/create-pod' });

    expect(result.current).toEqual({ loading: false, error: null, values: null, pinnedVenueId: undefined });
  });

  it('does nothing when disabled (a draft is being resumed)', () => {
    const { result } = renderPrefill({ mocks: [], enabled: false });

    expect(result.current.loading).toBe(false);
    expect(result.current.values).toBeNull();
  });

  it("reports the lookup's failure and fills nothing", async () => {
    const { result } = renderPrefill({
      mocks: [
        { request: { query: CREATE_POD_PARTNER_REQUEST, variables: { id: 'req-1' } }, error: new Error('Not your request') },
      ],
    });

    await waitFor(() => expect(result.current.error).toBe('Not your request'));
    expect(result.current.values).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
