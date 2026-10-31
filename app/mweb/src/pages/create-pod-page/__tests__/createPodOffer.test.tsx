import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useEffect, type ReactNode } from 'react';

import VenueOfferPicker from '../create-pod/steps/VenueOfferPicker';
import VenueOfferStep from '../create-pod/steps/VenueOfferStep';
import { blankCreatePodForm, type CreatePodFormValues } from '../create-pod/create-pod.types';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  calendar: { loading: false, error: null as unknown, tiles: [] as unknown[], endsFor: vi.fn() },
  quote: { quote: null, quoteMin: null, message: null, loading: false, error: null },
}));

vi.mock('../create-pod/steps/useOfferCalendar', () => ({ useOfferCalendar: () => h.calendar }));
vi.mock('../create-pod/useOfferQuote', () => ({ useOfferQuote: () => h.quote }));
vi.mock('../create-pod/steps/BookingGuestFields', () => ({ default: () => <div data-testid="guest-fields" /> }));
vi.mock('../create-pod/steps/VenueQuoteCard', () => ({ default: () => <div data-testid="quote-card" /> }));
vi.mock('../create-pod/steps/OfferTermsFields', () => ({ default: () => <div data-testid="terms-fields" /> }));
vi.mock('@duncit/forms', async (orig) => ({ ...(await orig<object>()), VenueOfferAskFields: () => <div data-testid="ask-fields" /> }));
vi.mock('@duncit/slots/mui', () => ({
  SlotCalendar: (p: Record<string, any>) => (
    <div data-testid="slot-calendar" data-error={p.error ?? ''} data-selected={p.selectedSlotId}>
      <button data-testid="pick-tile" onClick={() => p.onPick({ id: 't1' })} />
    </div>
  ),
}));
vi.mock('../../../hooks/usePricing', () => ({ usePricing: () => ({ currency: '₹', format: (v: number) => '₹' + v }) }));
vi.mock('../../../utils/dateFormat', async (orig) => ({
  ...(await orig<object>()),
  useDateFormat: () => ({ formatTime: (v: string) => 'T:' + v }),
}));

type Form = ReturnType<typeof useForm<CreatePodFormValues>>;
function Harness({
  values,
  errors = {},
  children,
}: Readonly<{ values?: Partial<CreatePodFormValues>; errors?: Record<string, string>; children: (form: Form) => ReactNode }>) {
  const form = useForm<CreatePodFormValues>({ defaultValues: { ...blankCreatePodForm, ...values } });
  useEffect(() => {
    for (const [field, message] of Object.entries(errors)) form.setError(field as keyof CreatePodFormValues, { type: 'manual', message });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children(form)}</>;
}

const TILE = { id: 't1', start_at: '2030-01-01T10:00:00.000Z', end_at: '2030-01-01T11:00:00.000Z', status: 'AVAILABLE' };

beforeEach(() => {
  vi.clearAllMocks();
  h.calendar = { loading: false, error: null, tiles: [TILE], endsFor: vi.fn().mockReturnValue([]) };
});

describe('VenueOfferPicker', () => {
  const picker = (values: Partial<CreatePodFormValues> = {}, errors: Record<string, string> = {}) =>
    render(
      <Harness values={{ pod_mode: 'PHYSICAL', ...values }} errors={errors}>
        {(form) => (
          <>
            <VenueOfferPicker form={form} venueId="v1" spaceLabel="Court A" spots={{ min: 1, max: 10, slidable: true }} minGuests={0} />
            <output data-testid="state">{JSON.stringify([form.watch('venue_slot_id'), form.watch('pod_date_time'), form.watch('pod_end_date_time')])}</output>
          </>
        )}
      </Harness>
    );

  it('shows the calendar with no end picker until a start is picked', () => {
    picker();
    expect(screen.getByTestId('slot-calendar')).toHaveAttribute('data-selected', '');
    expect(screen.queryByTestId('create-pod-booking-end')).not.toBeInTheDocument();
    expect(screen.getByTestId('guest-fields')).toBeInTheDocument();
  });

  it('leaves the terms, the ask and the quote to the offer step', () => {
    picker({ venue_offer_model: 'FREE' });
    expect(screen.queryByTestId('terms-fields')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ask-fields')).not.toBeInTheDocument();
    expect(screen.queryByTestId('quote-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('create-pod-venue-free-arrangement')).not.toBeInTheDocument();
  });

  it('picks a start, taking the first end the calendar offers as the window', async () => {
    h.calendar.endsFor = vi.fn().mockReturnValue(['2030-01-01T11:00:00.000Z', '2030-01-01T12:00:00.000Z']);
    picker({ venue_slot_id: 'old' });
    fireEvent.click(screen.getByTestId('pick-tile'));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')[0]).toBe(''));
    expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]').slice(1)).toEqual(['2030-01-01T10:00:00.000Z', '2030-01-01T11:00:00.000Z']);
  });

  it('leaves the end empty when the calendar offers none', async () => {
    picker();
    fireEvent.click(screen.getByTestId('pick-tile'));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')[1]).toBe('2030-01-01T10:00:00.000Z'));
    expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')[2]).toBeNull();
    expect(await screen.findByText(fallbackT('mweb.createPod.bookingNoEnd'))).toBeInTheDocument();
  });

  it('offers the ends for the picked start, with the picked end selected, and changes it', async () => {
    const start = new Date('2030-01-01T10:00:00.000Z');
    const end = new Date('2030-01-01T11:00:00.000Z');
    h.calendar.endsFor = vi.fn().mockReturnValue([end.toISOString(), '2030-01-01T12:00:00.000Z']);
    picker({ pod_date_time: start, pod_end_date_time: end });
    expect(screen.getByText(fallbackT('mweb.createPod.bookingEndHint'))).toBeInTheDocument();
    fireEvent.mouseDown(within(screen.getByTestId('create-pod-booking-end')).getByRole('combobox'));
    fireEvent.click(await screen.findByText('T:2030-01-01T12:00:00.000Z'));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')[2]).toBe('2030-01-01T12:00:00.000Z'));
  });

  it('says there is no end to pick when the start has none, and shows no selection for an end that is not offered', () => {
    h.calendar.endsFor = vi.fn().mockReturnValue([]);
    picker({ pod_date_time: new Date('2030-01-01T10:00:00.000Z'), pod_end_date_time: null });
    expect(screen.getByText(fallbackT('mweb.createPod.bookingNoEnd'))).toBeInTheDocument();
  });

  it('shows a calendar load failure instead of the calendar', () => {
    h.calendar.error = new Error('x');
    picker();
    expect(screen.getByTestId('create-pod-calendar-error')).toBeInTheDocument();
    expect(screen.queryByTestId('slot-calendar')).not.toBeInTheDocument();
  });

  it('passes the time validation message, from the start first and then the end, to the calendar', async () => {
    const { unmount } = picker({}, { pod_date_time: 'Start problem', pod_end_date_time: 'End problem' });
    await waitFor(() => expect(screen.getByTestId('slot-calendar')).toHaveAttribute('data-error', 'Start problem'));
    unmount();
    picker({}, { pod_end_date_time: 'End problem' });
    await waitFor(() => expect(screen.getByTestId('slot-calendar')).toHaveAttribute('data-error', 'End problem'));
  });
});


describe('VenueOfferStep', () => {
  const VENUES = [{ id: 'v1', venue_name: 'Court House', offer_min_business: [{ model: 'PER_GUEST', amount: 200 }] }];
  const offerStep = (values: Partial<CreatePodFormValues> = {}) =>
    render(
      <Harness values={{ pod_mode: 'PHYSICAL', venue_id: 'v1', ...values }}>
        {(form) => <VenueOfferStep form={form} venues={VENUES} />}
      </Harness>
    );

  it('holds the venue minimum, the terms, the ask and the quote — and no calendar', () => {
    offerStep({ venue_offer_model: 'PER_GUEST' });
    const step = screen.getByTestId('create-pod-offer-step');
    expect(within(step).getByTestId('create-pod-venue-min-business')).toBeInTheDocument();
    expect(within(step).getByTestId('terms-fields')).toBeInTheDocument();
    expect(within(step).getByTestId('ask-fields')).toBeInTheDocument();
    expect(within(step).getByTestId('quote-card')).toBeInTheDocument();
    expect(screen.queryByTestId('slot-calendar')).not.toBeInTheDocument();
    // A priced offer asks no free-venue justification.
    expect(screen.queryByTestId('create-pod-venue-free-arrangement')).not.toBeInTheDocument();
  });

  it('asks why the venue is free, beside the offer, when the host asks for it free', () => {
    offerStep({ venue_offer_model: 'FREE' });
    expect(screen.getByTestId('create-pod-venue-free-arrangement')).toBeInTheDocument();
    expect(screen.getByTestId('create-pod-venue-free-accept')).toBeInTheDocument();
  });

  it('shows no minimum for a venue that is not in the list', () => {
    offerStep({ venue_id: 'gone' });
    expect(screen.queryByTestId('create-pod-venue-min-business')).not.toBeInTheDocument();
    expect(screen.getByTestId('terms-fields')).toBeInTheDocument();
  });
});
