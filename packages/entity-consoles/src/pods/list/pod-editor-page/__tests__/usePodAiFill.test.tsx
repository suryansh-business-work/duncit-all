import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { VENUE_AVAILABLE_SLOTS, type PodFormConfig, type PodFormValues } from '@duncit/pod-form';
import type { UseFormReturn } from 'react-hook-form';
import usePodAiFill from '../usePodAiFill';

const slotsMock = (
  slots: Record<string, unknown>[] | null,
  seen: { variables: Record<string, unknown> | null },
): MockedResponse => ({
  request: {
    query: VENUE_AVAILABLE_SLOTS,
    variables: (variables: Record<string, unknown>) => {
      seen.variables = variables;
      return true;
    },
  },
  result: { data: { venueAvailableSlots: slots } },
});

const slot = {
  __typename: 'VenueSlot',
  id: 'slot-9',
  start_at: '2099-01-02T10:00:00.000Z',
  end_at: '2099-01-02T12:00:00.000Z',
  whole_day: false,
  notes: null,
  price: 500,
  space_label: null,
  capacity: 12,
};

const wrapper = (mocks: MockedResponse[]) =>
  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <MockedProvider mocks={mocks} mockLinkDefaultOptions={{ delay: 0 }}>
        {children}
      </MockedProvider>
    );
  };

const prevValues = {
  pod_title: '',
  club_id: '',
  venue_id: '',
  venue_slot_id: '',
  pod_mode: 'PHYSICAL',
  pod_hosts_id: [],
  pod_type: 'NATIVE_PAID',
  pod_amount: 0,
  pod_occurrence: 'ONE_TIME',
  no_of_spots: 8,
} as unknown as PodFormValues;

const args = (showVenueSlot = true) => ({
  config: { showVenueSlot } as PodFormConfig,
  clubs: [{ id: 'club-1', club_name: 'Sunset Club' }],
  venues: [{ id: 'venue-1', venue_name: 'Court 2' }],
  hosts: [{ user_id: 'host-1', full_name: 'Meera' }],
  getClubVenueIds: () => ['venue-1'],
});

const fakeForm = () => {
  const reset = vi.fn();
  const methods = { getValues: () => prevValues, reset } as unknown as UseFormReturn<PodFormValues>;
  return { methods, reset };
};

describe('usePodAiFill', () => {
  it('does nothing until the form has reported in', async () => {
    const { result } = renderHook(() => usePodAiFill(args()), { wrapper: wrapper([]) });
    await expect(result.current.handleAiFill({ pod_title: 'Ignored' })).resolves.toBeUndefined();
  });

  it('merges the fill into the live form, booking the venue\'s real next slot', async () => {
    const seen = { variables: null as Record<string, unknown> | null };
    const { result } = renderHook(() => usePodAiFill(args()), {
      wrapper: wrapper([slotsMock([slot], seen)]),
    });
    const { methods, reset } = fakeForm();
    result.current.onReady(methods);

    await act(async () => {
      await result.current.handleAiFill({ pod_title: 'Sunday Badminton', club_name: 'Sunset Club' });
    });

    expect(seen.variables).toMatchObject({ venue_id: 'venue-1' });
    expect(typeof seen.variables?.from).toBe('string');
    expect(reset).toHaveBeenCalledTimes(1);
    const [values, options] = reset.mock.calls[0];
    expect(values).toMatchObject({
      pod_title: 'Sunday Badminton',
      club_id: 'club-1',
      venue_id: 'venue-1',
      venue_slot_id: 'slot-9',
      pod_hosts_id: ['host-1'],
    });
    // The slot picker reads the defaults, so they stay the pod's own.
    expect(options).toEqual({ keepDefaultValues: true });
  });

  it('leaves a slot-driven pod undated when the venue has no calendar', async () => {
    const seen = { variables: null as Record<string, unknown> | null };
    const { result } = renderHook(() => usePodAiFill(args(true)), {
      wrapper: wrapper([slotsMock(null, seen)]),
    });
    const { methods, reset } = fakeForm();
    result.current.onReady(methods);

    await act(async () => {
      await result.current.handleAiFill({ pod_title: 'No calendar' });
    });

    expect(reset.mock.calls[0][0]).toMatchObject({
      venue_id: 'venue-1',
      venue_slot_id: '',
      pod_date_time: null,
    });
  });
});
