import { fireEvent, screen } from '@testing-library/react-native';

import type { VenueSlot } from '@/hooks/useOwnerVenueSlots';
import { renderWithProviders } from '@/utils/test-utils';
import { DaySlotRow } from '../DaySlotRow';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
// A fixed, zone-free formatter so the when-sentence is the same everywhere.
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDate: (iso: string) => String(iso).slice(0, 10),
    formatTime: (iso: string | Date) => new Date(iso).toISOString().slice(11, 16),
    dayKey: (iso: string | Date) => new Date(iso).toISOString().slice(0, 10),
  }),
}));

const slotOf = (patch: Record<string, unknown> = {}) =>
  ({
    id: 's1',
    status: 'AVAILABLE',
    start_at: '2030-01-09T10:00:00.000Z',
    end_at: '2030-01-09T12:00:00.000Z',
    whole_day: false,
    price: 0,
    space_label: '',
    capacity: 0,
    notes: '',
    booked_pod_title: '',
    ...patch,
  }) as unknown as VenueSlot;

const mount = (slot: VenueSlot, busy = false) => {
  const onToggleBlock = jest.fn();
  const onDelete = jest.fn();
  renderWithProviders(
    <DaySlotRow slot={slot} busy={busy} onToggleBlock={onToggleBlock} onDelete={onDelete} />,
  );
  return { onToggleBlock, onDelete };
};

describe('DaySlotRow — what shows', () => {
  it('shows the time span, a free price and the status', () => {
    mount(slotOf());
    expect(screen.getByText('2030-01-09, 10:00 – 12:00')).toBeOnTheScreen();
    expect(screen.getByText('availability.free')).toBeOnTheScreen();
    expect(screen.getByTestId('day-slot-s1-status')).toHaveTextContent('AVAILABLE');
  });

  it('shows the price in its own unit', () => {
    mount(slotOf({ price: 400, pricing_mode: 'HOURLY' }));
    expect(screen.getByText(/availability.priceUnitHourly/)).toBeOnTheScreen();
  });

  it('spells out a whole-day slot', () => {
    mount(
      slotOf({
        whole_day: true,
        start_at: '2030-01-09T00:00:00.000Z',
        end_at: '2030-01-10T00:00:00.000Z',
      }),
    );
    expect(screen.getByText('availability.wholeDay · 2030-01-09')).toBeOnTheScreen();
  });

  it('shows no space line for a whole-venue slot', () => {
    mount(slotOf());
    expect(screen.queryByText(/availability.holdsCapacity/)).toBeNull();
  });

  it('shows the space and what it holds', () => {
    mount(slotOf({ space_label: 'Court 1', capacity: 6 }));
    expect(screen.getByText('Court 1 · availability.holdsCapacity|6')).toBeOnTheScreen();
  });

  it('shows just the space name when the capacity is unknown, and just the capacity for an unnamed space', () => {
    const { unmount } = renderWithProviders(
      <DaySlotRow
        slot={slotOf({ space_label: 'Court 2' })}
        busy={false}
        onToggleBlock={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText('Court 2')).toBeOnTheScreen();
    unmount();
    renderWithProviders(
      <DaySlotRow
        slot={slotOf({ capacity: 8 })}
        busy={false}
        onToggleBlock={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText('availability.holdsCapacity|8')).toBeOnTheScreen();
  });

  it('shows the slot notes when there are any', () => {
    mount(slotOf({ notes: 'Bring your own racket' }));
    expect(screen.getByText('Bring your own racket')).toBeOnTheScreen();
  });

  it('shows the pod that booked a slot', () => {
    mount(slotOf({ status: 'BOOKED', booked_pod_title: 'Sunday Smash' }));
    expect(screen.getByText('availability.bookedByPod: Sunday Smash')).toBeOnTheScreen();
    expect(screen.queryByText('availability.awaitingDecision')).toBeNull();
  });

  it('shows a booking request as awaiting a decision, naming the pod that asked', () => {
    mount(slotOf({ status: 'PENDING', booked_pod_title: 'Sunday Smash' }));
    expect(screen.getByText('availability.requestedByPod: Sunday Smash')).toBeOnTheScreen();
    expect(screen.getByText('availability.awaitingDecision')).toBeOnTheScreen();
  });

  it('shows a request without a pod title as awaiting a decision, without a pod line', () => {
    mount(slotOf({ status: 'PENDING' }));
    expect(screen.getByText('availability.awaitingDecision')).toBeOnTheScreen();
    expect(screen.queryByText(/requestedByPod/)).toBeNull();
  });
});

describe('DaySlotRow — actions', () => {
  it('offers block and delete for a slot nobody holds', () => {
    const { onToggleBlock, onDelete } = mount(slotOf());
    expect(screen.getByText('availability.block')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('day-slot-s1-block'));
    fireEvent.press(screen.getByTestId('day-slot-s1-delete'));
    expect(onToggleBlock).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
  });

  it('offers unblock for a blocked slot', () => {
    mount(slotOf({ status: 'BLOCKED' }));
    expect(screen.getByText('availability.unblock')).toBeOnTheScreen();
    expect(screen.queryByText('availability.block')).toBeNull();
  });

  it.each(['BOOKED', 'PENDING'])(
    'offers no edit buttons while a pod holds the slot (%s)',
    (status) => {
      mount(slotOf({ status }));
      expect(screen.queryByTestId('day-slot-s1-block')).toBeNull();
      expect(screen.queryByTestId('day-slot-s1-delete')).toBeNull();
    },
  );

  it('disables both buttons while an action is in flight', () => {
    mount(slotOf(), true);
    expect(screen.getByTestId('day-slot-s1-block')).toBeDisabled();
    expect(screen.getByTestId('day-slot-s1-delete')).toBeDisabled();
  });
});
