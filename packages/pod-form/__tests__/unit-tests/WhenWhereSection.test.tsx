import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import WhenWhereSection from '../../src/sections/WhenWhereSection';
import { PodFormDataProvider } from '../../src/context';
import { Harness, makeConfig, makeData, SLOT_LABELS } from './helpers';
import type { PodFormData, PodFormValues } from '../../src/types';

const useQueryMock = vi.fn();
vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({ label, slotProps }: any) => (
    <div>
      <span>picker:{label}</span>
      <span>helper:{slotProps?.textField?.helperText ?? ''}</span>
    </div>
  ),
}));

// The calendar itself is @duncit/slots' concern (tested there); this fake only
// shows what VenueSlotField hands it — one tile per slot, captioned — and
// reports a pick back the way the real one does.
vi.mock('@duncit/slots/mui', () => ({
  SlotCalendar: ({ slots, loading, selectedSlotId, onPick, labels, required }: any) => (
    <div data-testid="slot-calendar" data-selected={selectedSlotId} data-required={String(!!required)}>
      {loading && <span>{labels.loading}</span>}
      {slots.map((slot: any) => (
        <button key={slot.id} type="button" onClick={() => onPick(slot)} data-end={slot.end_at ?? ''}>
          {slot.caption}
        </button>
      ))}
    </div>
  ),
}));

const VENUES = [
  { id: 'v1', venue_name: 'Alpha', locality: 'Bandra', city: 'Mumbai', lat: 19.1, lng: 72.8 },
  { id: 'v2', venue_name: 'Beta' },
];
const CLUBS = [{ id: 'c1' }];

const HALL_SLOT = {
  id: 's1',
  start_at: '2030-06-01T10:00:00.000Z',
  end_at: '2030-06-01T12:00:00.000Z',
  whole_day: false,
  notes: 'Hall',
  price: 250,
  space_label: 'Court 2',
  capacity: 12,
};

const slotsQuery = (venueAvailableSlots: unknown[], over: Partial<{ loading: boolean; error: Error }> = {}) => ({
  data: { venueAvailableSlots },
  loading: false,
  error: undefined,
  ...over,
});

function renderWW(data: PodFormData, defaults: Partial<PodFormValues> = {}) {
  const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
  render(
    <Harness data={data} defaultValues={defaults} methodsRef={methodsRef}>
      <WhenWhereSection />
    </Harness>,
  );
  return methodsRef;
}

beforeEach(() => {
  useQueryMock.mockReset();
  useQueryMock.mockReturnValue(slotsQuery([]));
});

function NoDefaults({ data }: Readonly<{ data: PodFormData }>) {
  const methods = useForm<PodFormValues>();
  return (
    <FormProvider {...methods}>
      <PodFormDataProvider value={data}>
        <WhenWhereSection />
      </PodFormDataProvider>
    </FormProvider>
  );
}

describe('WhenWhereSection (no form defaults)', () => {
  it('handles an undefined defaultValues object', () => {
    const data = makeData({ clubs: CLUBS, venues: VENUES, getClubVenueIds: () => ['v1', 'v2'] });
    render(<NoDefaults data={data} />);
    // with no club selected the venue field still prompts for a club
    expect(screen.getByText('Pick a club in Basic Information first.')).toBeInTheDocument();
  });
});

describe('WhenWhereSection (map + date mode)', () => {
  const data = makeData({
    clubs: CLUBS,
    venues: VENUES,
    getClubVenueIds: () => ['v1', 'v2'],
  });

  it('prompts to pick a club first when none is chosen', () => {
    renderWW(data);
    expect(screen.getByText('Pick a club in Basic Information first.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Venue/ })).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows the map preview and date pickers for the selected venue', () => {
    renderWW(data, { club_id: 'c1', venue_id: 'v1' });
    expect(screen.getByText('picker:Start date & time')).toBeInTheDocument();
    expect(screen.getByText('picker:End date & time')).toBeInTheDocument();
    // GoogleMapPreview uses the venue name as the section title
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('changes the venue without clearing dates when the slot picker is off', async () => {
    const user = userEvent.setup();
    const ref = renderWW(data, { club_id: 'c1' });
    await user.click(screen.getByLabelText(/Venue/));
    await user.click(await screen.findByRole('option', { name: 'Alpha - Bandra, Mumbai' }));
    expect(ref.current?.getValues('venue_id')).toBe('v1');
  });

  it('shows the empty-venue hint when the club has no linked venues', () => {
    const noVenues = makeData({ clubs: CLUBS, venues: VENUES, getClubVenueIds: () => [] });
    renderWW(noVenues, { club_id: 'c1' });
    expect(screen.getByText('No approved venues linked to this club.')).toBeInTheDocument();
  });

  it('shows the venue validation error message', () => {
    const ref = renderWW(data, { club_id: 'c1' });
    act(() => ref.current?.setError('venue_id', { type: 'custom', message: 'Select a venue' }));
    expect(screen.getByText('Select a venue')).toBeInTheDocument();
  });
});

describe('WhenWhereSection (venue-slot mode)', () => {
  const slotData = makeData({
    clubs: CLUBS,
    venues: VENUES,
    getClubVenueIds: () => ['v1', 'v2'],
    config: makeConfig({ showVenueSlot: true }),
  });

  it('asks for a venue before offering any slot', () => {
    renderWW(slotData, { club_id: 'c1', venue_id: '' });
    expect(screen.getByText(SLOT_LABELS.pickVenueFirst)).toBeInTheDocument();
    expect(screen.queryByTestId('slot-calendar')).not.toBeInTheDocument();
  });

  it('picks a slot and sets the pod dates', async () => {
    const user = userEvent.setup();
    useQueryMock.mockReturnValue(slotsQuery([HALL_SLOT]));
    const ref = renderWW(slotData, { club_id: 'c1', venue_id: 'v1' });
    expect(screen.getByTestId('slot-calendar')).toHaveAttribute('data-required', 'true');
    // The note takes the caption line; the space only stands in when there is none.
    await user.click(screen.getByRole('button', { name: 'Hall' }));
    expect(ref.current?.getValues('venue_slot_id')).toBe('s1');
    expect(ref.current?.getValues('pod_date_time')?.toISOString()).toBe('2030-06-01T10:00:00.000Z');
    expect(ref.current?.getValues('pod_end_date_time')?.toISOString()).toBe('2030-06-01T12:00:00.000Z');
  });

  it('falls back to the slot start as its end when the picked slot carries none', async () => {
    const user = userEvent.setup();
    useQueryMock.mockReturnValue(slotsQuery([{ ...HALL_SLOT, end_at: null }]));
    const ref = renderWW(slotData, { club_id: 'c1', venue_id: 'v1' });
    await user.click(screen.getByRole('button', { name: 'Hall' }));
    expect(ref.current?.getValues('pod_end_date_time')?.toISOString()).toBe('2030-06-01T10:00:00.000Z');
  });

  it('captions a slot by its space, then by the whole venue when it names none', () => {
    useQueryMock.mockReturnValue(
      slotsQuery([
        { ...HALL_SLOT, id: 'court', notes: '' },
        { ...HALL_SLOT, id: 'whole', notes: '', space_label: '' },
      ]),
    );
    renderWW(slotData, { club_id: 'c1', venue_id: 'v1' });
    expect(screen.getByRole('button', { name: 'Court 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: SLOT_LABELS.wholeVenue })).toBeInTheDocument();
  });

  it('clears the dates when the picker deselects an unavailable slot', async () => {
    useQueryMock.mockReturnValue(slotsQuery([HALL_SLOT]));
    const ref = renderWW(slotData, { club_id: 'c1', venue_id: 'v1', venue_slot_id: 'gone', pod_date_time: null });
    await waitFor(() => expect(ref.current?.getValues('venue_slot_id')).toBe(''));
    expect(ref.current?.getValues('pod_date_time')).toBeNull();
    expect(ref.current?.getValues('pod_end_date_time')).toBeNull();
  });

  it('keeps a selected slot while the list is still loading', () => {
    useQueryMock.mockReturnValue(slotsQuery([], { loading: true }));
    const ref = renderWW(slotData, { club_id: 'c1', venue_id: 'v1', venue_slot_id: 's1' });
    expect(screen.getByText(SLOT_LABELS.loading)).toBeInTheDocument();
    expect(ref.current?.getValues('venue_slot_id')).toBe('s1');
  });

  it('clears the dates when the venue changes in slot mode', async () => {
    const user = userEvent.setup();
    const ref = renderWW(slotData, {
      club_id: 'c1',
      venue_id: 'v1',
      pod_date_time: new Date('2030-06-01T10:00:00.000Z'),
      pod_end_date_time: new Date('2030-06-01T12:00:00.000Z'),
    });
    expect(screen.getByText(SLOT_LABELS.empty)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/Venue/));
    await user.click(await screen.findByRole('option', { name: 'Beta' }));
    expect(ref.current?.getValues('venue_id')).toBe('v2');
    expect(ref.current?.getValues('pod_date_time')).toBeNull();
    expect(ref.current?.getValues('pod_end_date_time')).toBeNull();
  });

  it('shows the slot query error instead of the calendar', () => {
    useQueryMock.mockReturnValue(slotsQuery([], { error: new Error('Venue offline') }));
    renderWW(slotData, { club_id: 'c1', venue_id: 'v1' });
    expect(screen.getByText('Venue offline')).toBeInTheDocument();
    expect(screen.queryByTestId('slot-calendar')).not.toBeInTheDocument();
  });

  it('shows the slot validation error as an alert', () => {
    const ref = renderWW(slotData, { club_id: 'c1', venue_id: 'v1' });
    act(() => ref.current?.setError('venue_slot_id', { type: 'custom', message: 'Pick an available slot' }));
    expect(screen.getByText('Pick an available slot')).toBeInTheDocument();
  });

  it('offers the currently-booked slot when editing keeps its venue', () => {
    const ref = renderWW(slotData, {
      club_id: 'c1',
      venue_id: 'v1',
      venue_slot_id: 'booked',
      pod_date_time: new Date('2030-06-01T10:00:00.000Z'),
      pod_end_date_time: new Date('2030-06-01T12:00:00.000Z'),
    });
    const booked = screen.getByRole('button', { name: SLOT_LABELS.currentlyBooked });
    expect(booked).toHaveAttribute('data-end', '2030-06-01T12:00:00.000Z');
    expect(screen.getByTestId('slot-calendar')).toHaveAttribute('data-selected', 'booked');
    // A booked slot is no longer "available", but it is never auto-cleared.
    expect(ref.current?.getValues('venue_slot_id')).toBe('booked');
  });

  it('falls back to the start time as the current slot end when no end is set', () => {
    renderWW(slotData, {
      club_id: 'c1',
      venue_id: 'v1',
      venue_slot_id: 'booked',
      pod_date_time: new Date('2030-06-01T10:00:00.000Z'),
      pod_end_date_time: null,
    });
    expect(screen.getByRole('button', { name: SLOT_LABELS.currentlyBooked })).toHaveAttribute(
      'data-end',
      '2030-06-01T10:00:00.000Z',
    );
  });
});
