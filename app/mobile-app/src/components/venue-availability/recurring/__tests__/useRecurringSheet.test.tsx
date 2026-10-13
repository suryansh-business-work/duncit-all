import { act, renderHook } from '@testing-library/react-native';

import { useRecurringSheet } from '@/components/venue-availability/recurring/useRecurringSheet';
import { CreateVenueSlotsDocument } from '@/graphql/venue-availability';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const SPACES = [
  { label: 'Terrace', capacity: 20 },
  { label: 'Hall', capacity: 40 },
];
const EMPTY: readonly { label: string; capacity: number }[] = [];

function setup(items = SPACES, onDone = jest.fn()) {
  const hook = renderHook(
    (props: { items: typeof SPACES }) => useRecurringSheet('venue-1', {}, props.items, 30, onDone),
    { initialProps: { items } },
  );
  return { ...hook, onDone };
}

/** One day a week ahead: inside the venue's advance window and past any lead time. */
function fillRange(result: ReturnType<typeof setup>['result']) {
  const day = new Date();
  day.setDate(day.getDate() + 7);
  day.setHours(0, 0, 0, 0);
  act(() => result.current.patch({ startDate: day, endDate: day, weekdays: [day.getDay()] }));
}

beforeEach(() => mockRequest.mockReset());

describe('useRecurringSheet', () => {
  it('seeds one priced row per venue space', () => {
    const { result } = setup();
    expect(result.current.form.spaces.map((s) => s.label)).toEqual(['Terrace', 'Hall']);
    expect(result.current.form.conflictMode).toBe('SKIP');
  });

  it('seeds a single whole-venue row from the capacity when no spaces are named', () => {
    const { result } = setup(EMPTY as never);
    expect(result.current.form.spaces).toEqual([
      { label: '', capacity: 30, price: '399', enabled: true },
    ]);
  });

  it('refuses to submit before a date range yields any slots', async () => {
    const { result } = setup();
    let ok = true;
    await act(async () => {
      ok = await result.current.submit();
    });
    expect(ok).toBe(false);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('previews slots for the chosen range and sends them with the conflict mode', async () => {
    mockRequest.mockResolvedValue({ createVenueSlots: {} });
    const { result, onDone } = setup();
    fillRange(result);
    expect(result.current.result.errors).toEqual([]);
    expect(result.current.result.slots.length).toBeGreaterThan(0);

    act(() => result.current.patch({ conflictMode: 'REPLACE' }));
    let ok = false;
    await act(async () => {
      ok = await result.current.submit();
    });
    expect(ok).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(mockRequest.mock.calls[0][0]).toBe(CreateVenueSlotsDocument);
    const input = mockRequest.mock.calls[0][1].input;
    expect(input.venue_id).toBe('venue-1');
    expect(input.on_conflict).toBe('REPLACE');
    expect(input.slots).toHaveLength(result.current.result.slots.length);
    expect(Object.keys(input.slots[0]).sort()).toEqual(
      ['capacity', 'end_at', 'price', 'space_label', 'start_at', 'whole_day'].sort(),
    );
    expect(result.current.submitting).toBe(false);
  });

  it('sends SKIP for the default mode', async () => {
    mockRequest.mockResolvedValue({});
    const { result } = setup();
    fillRange(result);
    await act(async () => {
      await result.current.submit();
    });
    expect(mockRequest.mock.calls[0][1].input.on_conflict).toBe('SKIP');
  });

  it('keeps the sheet open and shows the server reason on failure', async () => {
    mockRequest.mockRejectedValue(new Error('Venue is closed'));
    const { result, onDone } = setup();
    fillRange(result);
    let ok = true;
    await act(async () => {
      ok = await result.current.submit();
    });
    expect(ok).toBe(false);
    expect(onDone).not.toHaveBeenCalled();
    expect(result.current.serverError).toBe('Venue is closed');
    expect(result.current.submitting).toBe(false);
  });

  it('falls back to the localised message for a non-Error failure', async () => {
    mockRequest.mockRejectedValue('boom');
    const { result } = setup();
    fillRange(result);
    await act(async () => {
      await result.current.submit();
    });
    expect(typeof result.current.serverError).toBe('string');
    expect(result.current.serverError).not.toBe('boom');
    expect(result.current.serverError).not.toBe('');
  });

  it('reset restores the seed and clears the error', async () => {
    mockRequest.mockRejectedValue(new Error('x'));
    const { result } = setup();
    fillRange(result);
    await act(async () => {
      await result.current.submit();
    });
    act(() => result.current.reset());
    expect(result.current.serverError).toBeNull();
    expect(result.current.form.startDate).toBeNull();
  });

  it('re-seeds the rows when the venue spaces change but keeps other fields', () => {
    const { result, rerender } = setup();
    act(() => result.current.patch({ wholeDay: true }));
    rerender({ items: [{ label: 'Garden', capacity: 10 }] });
    expect(result.current.form.spaces.map((s) => s.label)).toEqual(['Garden']);
    expect(result.current.form.wholeDay).toBe(true);
  });
});
