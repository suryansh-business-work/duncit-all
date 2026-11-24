import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { GraphQLError } from 'graphql';
import { useVenueRequestsWaiting, VENUE_REQUESTS_WAITING, WAITING_BADGE_LABEL_KEY } from './useVenueRequestsWaiting';

const body = (venueSlotRequestCount: number | null, open: number | null, errors?: GraphQLError[]) => ({
  data: {
    venueSlotRequestCount,
    myReceivedEventRequestCounts: open === null ? null : { __typename: 'EventRequestCounts', open },
  },
  ...(errors ? { errors } : {}),
});

const answer = (count: number | null, open: number | null, errors?: GraphQLError[]): MockedResponse => ({
  request: { query: VENUE_REQUESTS_WAITING },
  result: body(count, open, errors),
});

const wrapperWith =
  (mocks: MockedResponse[]) =>
  ({ children }: Readonly<{ children: ReactNode }>) => (
    <MockedProvider mocks={mocks}>
      <MemoryRouter>{children}</MemoryRouter>
    </MockedProvider>
  );

describe('useVenueRequestsWaiting', () => {
  it('adds unanswered booking offers to open member requests', async () => {
    const { result } = renderHook(() => useVenueRequestsWaiting(true), { wrapper: wrapperWith([answer(2, 3)]) });

    await waitFor(() => expect(result.current).toEqual({ count: 5, labelKey: WAITING_BADGE_LABEL_KEY }));
  });

  it('shows no badge when nothing waits', async () => {
    const served = vi.fn(() => body(0, 0));
    const mocks: MockedResponse[] = [{ request: { query: VENUE_REQUESTS_WAITING }, result: served }];
    const { result } = renderHook(() => useVenueRequestsWaiting(true), { wrapper: wrapperWith(mocks) });

    // Only once the read has been served is "no badge" an answer rather than "not loaded yet".
    await waitFor(() => expect(served).toHaveBeenCalled());
    await waitFor(() => expect(result.current).toBeNull());
  });

  it('reads nothing outside the venue studio', () => {
    // No mock is given, so a request here would fail the test with an unmatched query.
    const { result } = renderHook(() => useVenueRequestsWaiting(false), { wrapper: wrapperWith([]) });

    expect(result.current).toBeNull();
  });

  it('keeps the count that loaded when the other one fails', async () => {
    const mocks = [answer(2, null, [new GraphQLError('Forbidden', { path: ['myReceivedEventRequestCounts'] })])];
    const { result } = renderHook(() => useVenueRequestsWaiting(true), { wrapper: wrapperWith(mocks) });

    await waitFor(() => expect(result.current).toEqual({ count: 2, labelKey: WAITING_BADGE_LABEL_KEY }));
  });
});
