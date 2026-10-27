import { act, renderHook, waitFor } from '@testing-library/react-native';

import { SlotPricingMode, VenueSlotConflictMode } from '@/generated/graphql/graphql';
import {
  CreateVenueSlotsDocument,
  DeleteVenueSlotDocument,
  UpdateVenueSlotDocument,
  VenueSlotsDocument,
} from '@/graphql/venue-availability';
import {
  useOwnerVenueSlots,
  type NewVenueSlotInput,
  type VenueSlot,
} from '@/hooks/useOwnerVenueSlots';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;
const AUTH = { auth: true };
const RANGE = { from: '2026-11-01T00:00:00Z', to: '2026-12-01T00:00:00Z' };
const SLOT = { id: 's1', status: 'OPEN' } as unknown as VenueSlot;
const BLOCKED = { id: 's2', status: 'BLOCKED' } as unknown as VenueSlot;

const INPUT: NewVenueSlotInput = {
  start_at: '2026-11-02T10:00:00Z',
  end_at: '2026-11-02T12:00:00Z',
  whole_day: false,
  price: 900,
  pricing_mode: 'PER_PAX',
  overtime_rate: 100,
  notes: 'n',
  space_label: 'Court',
  capacity: 8,
};

const reads = () => request.mock.calls.filter(([doc]) => doc === VenueSlotsDocument);

beforeEach(() => {
  jest.clearAllMocks();
  request.mockImplementation((doc: unknown) =>
    Promise.resolve(doc === VenueSlotsDocument ? { venueSlots: [SLOT] } : {}),
  );
});

describe('useOwnerVenueSlots — reading', () => {
  it('reads the visible range for the venue', async () => {
    const { result } = renderHook(() => useOwnerVenueSlots('v1', RANGE));
    await waitFor(() => expect(result.current.slots).toEqual([SLOT]));
    expect(request).toHaveBeenCalledWith(
      VenueSlotsDocument,
      { venue_id: 'v1', from: RANGE.from, to: RANGE.to },
      AUTH,
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('clears the slots and reads nothing without a venue', async () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useOwnerVenueSlots(id, RANGE),
      { initialProps: { id: 'v1' as string | null } },
    );
    await waitFor(() => expect(result.current.slots).toHaveLength(1));
    rerender({ id: null });
    await waitFor(() => expect(result.current.slots).toEqual([]));
    expect(reads()).toHaveLength(1);
  });

  it('reads again when the month changes', async () => {
    const { rerender } = renderHook(
      ({ range }: { range: typeof RANGE }) => useOwnerVenueSlots('v1', range),
      { initialProps: { range: RANGE } },
    );
    await waitFor(() => expect(reads()).toHaveLength(1));
    rerender({ range: { from: '2026-12-01T00:00:00Z', to: '2027-01-01T00:00:00Z' } });
    await waitFor(() => expect(reads()).toHaveLength(2));
  });

  it('keeps the message of a failed read, and clears it after a good one', async () => {
    request.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useOwnerVenueSlots('v1', RANGE));
    await waitFor(() => expect(result.current.error).toBe('offline'));
    expect(result.current.isLoading).toBe(false);
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.slots).toEqual([SLOT]);
  });

  it('has no message for a failure that is not an Error', async () => {
    request.mockRejectedValueOnce('plain string');
    const { result } = renderHook(() => useOwnerVenueSlots('v1', RANGE));
    await waitFor(() => expect(reads()).toHaveLength(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
  });

  it('drops the answer of a read that was superseded', async () => {
    let finishFirst: (value: unknown) => void = () => undefined;
    request.mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)));
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useOwnerVenueSlots(id, RANGE),
      { initialProps: { id: 'v1' as string | null } },
    );
    await waitFor(() => expect(reads()).toHaveLength(1));
    request.mockImplementationOnce(() => Promise.resolve({ venueSlots: [BLOCKED] }));
    rerender({ id: 'v2' });
    await waitFor(() => expect(result.current.slots).toEqual([BLOCKED]));
    await act(async () => finishFirst({ venueSlots: [SLOT] }));
    expect(result.current.slots).toEqual([BLOCKED]);
  });

  it('drops a late failure of a read that was superseded', async () => {
    let failFirst: (reason: Error) => void = () => undefined;
    request.mockImplementationOnce(() => new Promise((_, reject) => (failFirst = reject)));
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useOwnerVenueSlots(id, RANGE),
      { initialProps: { id: 'v1' as string | null } },
    );
    await waitFor(() => expect(reads()).toHaveLength(1));
    rerender({ id: 'v2' });
    await waitFor(() => expect(result.current.slots).toEqual([SLOT]));
    await act(async () => failFirst(new Error('late')));
    expect(result.current.error).toBeNull();
  });
});

describe('useOwnerVenueSlots — writing', () => {
  it('creates a slot, failing on a clash, with the pricing mode mapped, then reads again', async () => {
    const { result } = renderHook(() => useOwnerVenueSlots('v1', RANGE));
    await waitFor(() => expect(reads()).toHaveLength(1));
    await act(async () => result.current.create(INPUT, false));
    expect(request).toHaveBeenCalledWith(
      CreateVenueSlotsDocument,
      {
        input: {
          venue_id: 'v1',
          slots: [{ ...INPUT, pricing_mode: SlotPricingMode.PerPax }],
          on_conflict: VenueSlotConflictMode.Fail,
        },
      },
      AUTH,
    );
    await waitFor(() => expect(reads()).toHaveLength(2));
  });

  it('replaces clashing slots only when the owner confirmed the overwrite', async () => {
    const { result } = renderHook(() => useOwnerVenueSlots('v1', RANGE));
    await waitFor(() => expect(reads()).toHaveLength(1));
    await act(async () => result.current.create({ ...INPUT, pricing_mode: 'HOURLY' }, true));
    const call = request.mock.calls.find(([doc]) => doc === CreateVenueSlotsDocument);
    expect(call?.[1].input.on_conflict).toBe(VenueSlotConflictMode.Replace);
    expect(call?.[1].input.slots[0].pricing_mode).toBe(SlotPricingMode.Hourly);
  });

  it('maps the flat pricing mode too', async () => {
    const { result } = renderHook(() => useOwnerVenueSlots('v1', RANGE));
    await waitFor(() => expect(reads()).toHaveLength(1));
    await act(async () => result.current.create({ ...INPUT, pricing_mode: 'FLAT' }, false));
    const call = request.mock.calls.find(([doc]) => doc === CreateVenueSlotsDocument);
    expect(call?.[1].input.slots[0].pricing_mode).toBe(SlotPricingMode.Flat);
  });

  it('creates nothing without a venue', async () => {
    const { result } = renderHook(() => useOwnerVenueSlots(null, RANGE));
    await act(async () => result.current.create(INPUT, false));
    expect(request).not.toHaveBeenCalled();
  });

  it('lets a failed create reach the caller and does not read again', async () => {
    const { result } = renderHook(() => useOwnerVenueSlots('v1', RANGE));
    await waitFor(() => expect(reads()).toHaveLength(1));
    request.mockRejectedValueOnce(new Error('clash'));
    await expect(result.current.create(INPUT, false)).rejects.toThrow('clash');
    expect(reads()).toHaveLength(1);
  });

  it('blocks an open slot and unblocks a blocked one', async () => {
    const { result } = renderHook(() => useOwnerVenueSlots('v1', RANGE));
    await waitFor(() => expect(reads()).toHaveLength(1));
    await act(async () => result.current.toggleBlock(SLOT));
    expect(request).toHaveBeenCalledWith(
      UpdateVenueSlotDocument,
      { slot_id: 's1', input: { block: true } },
      AUTH,
    );
    await act(async () => result.current.toggleBlock(BLOCKED));
    expect(request).toHaveBeenCalledWith(
      UpdateVenueSlotDocument,
      { slot_id: 's2', input: { block: false } },
      AUTH,
    );
    await waitFor(() => expect(reads()).toHaveLength(3));
  });

  it('deletes a slot and reads again', async () => {
    const { result } = renderHook(() => useOwnerVenueSlots('v1', RANGE));
    await waitFor(() => expect(reads()).toHaveLength(1));
    await act(async () => result.current.remove('s1'));
    expect(request).toHaveBeenCalledWith(DeleteVenueSlotDocument, { slot_id: 's1' }, AUTH);
    await waitFor(() => expect(reads()).toHaveLength(2));
  });
});
