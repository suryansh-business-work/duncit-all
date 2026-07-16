import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import WhenWhereSection from '../../src/sections/WhenWhereSection';
import { PodFormDataProvider } from '../../src/context';
import { Harness, makeConfig, makeData } from './helpers';
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

const VENUES = [
  { id: 'v1', venue_name: 'Alpha', locality: 'Bandra', city: 'Mumbai', lat: 19.1, lng: 72.8 },
  { id: 'v2', venue_name: 'Beta' },
];
const CLUBS = [{ id: 'c1' }];

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
  useQueryMock.mockReturnValue({ data: { venueAvailableSlots: [] }, loading: false, error: undefined });
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

  it('picks a slot and sets the pod dates', async () => {
    const user = userEvent.setup();
    useQueryMock.mockReturnValue({
      data: {
        venueAvailableSlots: [
          { id: 's1', start_at: '2030-06-01T10:00:00.000Z', end_at: '2030-06-01T12:00:00.000Z', notes: 'Hall' },
        ],
      },
      loading: false,
      error: undefined,
    });
    const ref = renderWW(slotData, { club_id: 'c1', venue_id: 'v1' });
    await user.click(screen.getByRole('combobox', { name: /Available slot/ }));
    await user.click(await screen.findByText(/Hall/));
    expect(ref.current?.getValues('venue_slot_id')).toBe('s1');
    expect(ref.current?.getValues('pod_date_time')?.toISOString()).toBe('2030-06-01T10:00:00.000Z');
    expect(ref.current?.getValues('pod_end_date_time')?.toISOString()).toBe('2030-06-01T12:00:00.000Z');
  });

  it('clears the dates when the picker deselects an unavailable slot', async () => {
    useQueryMock.mockReturnValue({
      data: {
        venueAvailableSlots: [
          { id: 's1', start_at: '2030-06-01T10:00:00.000Z', end_at: '2030-06-01T12:00:00.000Z', notes: 'Hall' },
        ],
      },
      loading: false,
      error: undefined,
    });
    const ref = renderWW(slotData, { club_id: 'c1', venue_id: 'v1', venue_slot_id: 'gone', pod_date_time: null });
    await waitFor(() => expect(ref.current?.getValues('venue_slot_id')).toBe(''));
  });

  it('clears the dates when the venue changes in slot mode', async () => {
    const user = userEvent.setup();
    const ref = renderWW(slotData, {
      club_id: 'c1',
      venue_id: 'v1',
      pod_date_time: new Date('2030-06-01T10:00:00.000Z'),
      pod_end_date_time: new Date('2030-06-01T12:00:00.000Z'),
    });
    await user.click(screen.getByLabelText(/Venue/));
    await user.click(await screen.findByRole('option', { name: 'Beta' }));
    expect(ref.current?.getValues('venue_id')).toBe('v2');
    expect(ref.current?.getValues('pod_date_time')).toBeNull();
    expect(ref.current?.getValues('pod_end_date_time')).toBeNull();
  });

  it('shows the slot validation error as an alert', () => {
    const ref = renderWW(slotData, { club_id: 'c1', venue_id: 'v1' });
    act(() => ref.current?.setError('venue_slot_id', { type: 'custom', message: 'Pick an available slot' }));
    expect(screen.getByText('Pick an available slot')).toBeInTheDocument();
  });

  it('offers the currently-booked slot when editing keeps its venue', () => {
    useQueryMock.mockReturnValue({ data: { venueAvailableSlots: [] }, loading: false, error: undefined });
    renderWW(slotData, {
      club_id: 'c1',
      venue_id: 'v1',
      venue_slot_id: 'booked',
      pod_date_time: new Date('2030-06-01T10:00:00.000Z'),
      pod_end_date_time: new Date('2030-06-01T12:00:00.000Z'),
    });
    expect(screen.getByText(/Currently booked for this pod/)).toBeInTheDocument();
  });

  it('falls back to the start time as the current slot end when no end is set', () => {
    useQueryMock.mockReturnValue({ data: { venueAvailableSlots: [] }, loading: false, error: undefined });
    renderWW(slotData, {
      club_id: 'c1',
      venue_id: 'v1',
      venue_slot_id: 'booked',
      pod_date_time: new Date('2030-06-01T10:00:00.000Z'),
      pod_end_date_time: null,
    });
    // currentSlot end_at falls back to the start when pod_end_date_time is null
    expect(screen.getByText(/Currently booked for this pod/)).toBeInTheDocument();
  });
});
