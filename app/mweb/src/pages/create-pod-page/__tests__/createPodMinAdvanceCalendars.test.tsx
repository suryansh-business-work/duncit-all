/**
 * The Create Pod calendars start on the host's first allowed day (Minimum
 * Advance Days): the venue offer calendar is read from that day, and a Pod
 * Request slot before it is never offered — the server would refuse the pod.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { blankCreatePodForm, type CreatePodFormValues } from '../create-pod/create-pod.types';
import { useOfferCalendar } from '../create-pod/steps/useOfferCalendar';
import RequestSlotPicker from '../create-pod/steps/RequestSlotPicker';

const h = vi.hoisted(() => ({
  minAdvance: null as null | { days: number; day: string; startMs: number },
  variables: [] as unknown[],
  slots: [] as Array<Record<string, unknown>>,
  pickerSlots: [] as Array<{ id: string }>,
}));

vi.mock('../create-pod/usePodMinAdvance', () => ({ usePodMinAdvance: () => h.minAdvance }));
vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: (_doc: unknown, opts: { variables?: unknown }) => {
    h.variables.push(opts?.variables);
    return { data: { venueAvailableSlots: h.slots }, loading: false };
  },
}));
vi.mock('../create-pod/SlotPicker', () => ({
  default: (p: { slots: Array<{ id: string }> }) => {
    h.pickerSlots = p.slots;
    return null;
  },
}));
vi.mock('../../../utils/dateFormat', async (orig) => ({
  ...(await orig<object>()),
  useDateFormat: () => ({
    dayKey: () => '2026-11-10',
    timeZone: 'Asia/Kolkata',
    clock: { nowMs: () => Date.parse('2026-11-10T08:30:00.000Z') },
  }),
}));

// 10 Nov in Kolkata + 5 days → 15 Nov, from local midnight.
const FIVE_DAYS = { days: 5, day: '2026-11-15', startMs: Date.parse('2026-11-14T18:30:00.000Z') };

beforeEach(() => {
  h.minAdvance = null;
  h.variables = [];
  h.pickerSlots = [];
  h.slots = [
    { id: 'too-soon', start_at: '2026-11-14T12:00:00.000Z', end_at: '2026-11-14T14:00:00.000Z', space_label: '' },
    { id: 'first-day', start_at: '2026-11-15T04:00:00.000Z', end_at: '2026-11-15T06:00:00.000Z', space_label: '' },
    { id: 'other-space', start_at: '2026-11-16T04:00:00.000Z', end_at: '2026-11-16T06:00:00.000Z', space_label: 'Deck' },
  ];
});

describe('useOfferCalendar', () => {
  it('reads 62 days from the first allowed day', () => {
    h.minAdvance = FIVE_DAYS;
    renderHook(() => useOfferCalendar('v1', 'Whole venue'));
    expect(h.variables.at(-1)).toMatchObject({ venue_id: 'v1', from: '2026-11-15', to: '2027-01-15' });
  });

  it('reads from today while the rule is unknown', () => {
    renderHook(() => useOfferCalendar('v1', 'Whole venue'));
    expect(h.variables.at(-1)).toMatchObject({ from: '2026-11-10', to: '2027-01-10' });
  });
});

describe('RequestSlotPicker', () => {
  function Harness() {
    const form = useForm<CreatePodFormValues>({
      defaultValues: { ...blankCreatePodForm, venue_id: 'v1', partner_request_id: 'r1' },
    });
    return <RequestSlotPicker form={form} space={{ label: 'Whole venue', capacity: 10, slotSpaceLabel: '' }} />;
  }

  it('drops a slot of the space that starts before the first allowed day', () => {
    h.minAdvance = FIVE_DAYS;
    render(<Harness />);
    expect(h.pickerSlots.map((slot) => slot.id)).toEqual(['first-day']);
  });

  it('offers every slot of the space while the rule is unknown', () => {
    render(<Harness />);
    expect(h.pickerSlots.map((slot) => slot.id)).toEqual(['too-soon', 'first-day']);
  });
});
