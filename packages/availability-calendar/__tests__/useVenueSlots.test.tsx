import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { useVenueSlots } from '../src/useVenueSlots';
import { CREATE_VENUE_SLOTS, VENUE_SLOTS } from '../src/queries';

const VENUE_ID = 'venue-1';
const RANGE = { from: new Date(2026, 8, 1), to: new Date(2026, 8, 30, 23, 59, 59, 999) };
const INPUT = { start_at: '2026-09-10T15:30:00.000Z', end_at: '2026-09-10T16:30:00.000Z', price: 499, notes: '' };

describe('useVenueSlots', () => {
  it('sends an overwrite as REPLACE, since it only ever follows the confirmed warning', async () => {
    let created: Record<string, any> | null = null;
    const mocks: MockedResponse[] = [
      {
        request: { query: VENUE_SLOTS, variables: () => true },
        maxUsageCount: Number.POSITIVE_INFINITY,
        result: { data: { venueSlots: [] } },
      },
      {
        request: { query: CREATE_VENUE_SLOTS, variables: () => true },
        result: (variables: Record<string, any>) => {
          created = variables;
          return {
            data: {
              createVenueSlots: [
                { __typename: 'VenueSlot', id: 'new-1', start_at: INPUT.start_at, end_at: INPUT.end_at, price: 499, status: 'AVAILABLE', notes: '' },
              ],
            },
          };
        },
      },
    ];
    const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
        {children}
      </MockedProvider>
    );
    const { result } = renderHook(() => useVenueSlots(VENUE_ID, RANGE), { wrapper });

    await waitFor(() => expect(result.current.pending).toBe(false));
    await act(async () => {
      await result.current.create(INPUT, true);
    });

    expect(created).toEqual({ input: { venue_id: VENUE_ID, slots: [INPUT], on_conflict: 'REPLACE' } });
  });
});
