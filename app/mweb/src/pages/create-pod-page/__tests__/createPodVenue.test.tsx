import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useEffect, type ReactNode } from 'react';

import VenueSlotStep from '../create-pod/steps/VenueSlotStep';
import OfferTermsFields from '../create-pod/steps/OfferTermsFields';
import BasicsStep from '../create-pod/steps/BasicsStep';
import { makeCreatePodSchema } from '../create-pod/create-pod.form';
import { blankCreatePodForm, type CreatePodFormValues } from '../create-pod/create-pod.types';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  calendar: { loading: false, error: null as unknown, tiles: [] as unknown[], endsFor: vi.fn() },
  quote: { quote: null, quoteMin: null, message: null, loading: false, error: null },
  slotProps: undefined as undefined | Record<string, any>,
  requestSpace: undefined as unknown,
  offerProps: undefined as undefined | Record<string, any>,
}));

vi.mock('../create-pod/steps/useOfferCalendar', () => ({ useOfferCalendar: () => h.calendar }));
vi.mock('../create-pod/useOfferQuote', () => ({ useOfferQuote: () => h.quote }));
vi.mock('../create-pod/steps/BookingGuestFields', () => ({ default: () => <div data-testid="guest-fields" /> }));
vi.mock('../create-pod/steps/VenueQuoteCard', () => ({ default: () => <div data-testid="quote-card" /> }));
vi.mock('@duncit/forms', async (orig) => ({ ...(await orig<object>()), VenueOfferAskFields: () => <div data-testid="ask-fields" /> }));
vi.mock('@duncit/slots/mui', () => ({
  SlotCalendar: (p: Record<string, any>) => {
    h.slotProps = p;
    return (
      <div data-testid="slot-calendar" data-error={p.error ?? ''} data-selected={p.selectedId}>
        <button data-testid="pick-tile" onClick={() => p.onPick({ start_at: '2030-01-01T10:00:00.000Z' })} />
      </div>
    );
  },
}));
vi.mock('../create-pod/steps/VenueOfferPicker', () => ({
  default: (p: Record<string, any>) => {
    h.offerProps = p;
    return <div data-testid="offer-picker" />;
  },
}));
vi.mock('../create-pod/steps/RequestSlotPicker', () => ({
  default: (p: { space: unknown }) => {
    h.requestSpace = p.space;
    return <div data-testid="request-picker" />;
  },
}));
vi.mock('../create-pod/VirtualMeetingFields', () => ({ default: () => <div data-testid="virtual-fields" /> }));
vi.mock('../create-pod/FreeVenueNote', () => ({ default: () => <div data-testid="free-note" /> }));
vi.mock('../create-pod/VenueContactCard', () => ({ default: () => <div data-testid="contact-card" /> }));
vi.mock('../../../components/VenueMapPreview', () => ({ default: (p: { title: string }) => <div data-testid="map" data-title={p.title} /> }));
vi.mock('@duncit/availability-calendar', () => ({ VenueMinBusinessNote: () => <div data-testid="min-business" /> }));
vi.mock('../create-pod/fields/MediaUrlsField', () => ({
  default: (p: { error?: string; subCategoryName?: string; maxImages?: number }) => <div data-testid="media" data-error={p.error ?? ''} data-sub={p.subCategoryName ?? ''} data-max={p.maxImages} />,
}));
vi.mock('../create-pod/fields/PodReelAccordion', () => ({ default: () => <div data-testid="reel-accordion" /> }));
vi.mock('../create-pod/fields/ReelEngagementNotice', () => ({ default: () => <div data-testid="reel-notice" /> }));
vi.mock('../../../hooks/usePricing', () => ({ usePricing: () => ({ currency: '₹', format: (v: number) => `₹${v}` }) }));
vi.mock('../../../utils/dateFormat', async (orig) => ({
  ...(await orig<object>()),
  useDateFormat: () => ({ formatTime: (v: string) => `T:${v}` }),
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

const venue = (over: Record<string, unknown> = {}) => ({
  id: 'v1',
  venue_name: 'Court One',
  venue_type: 'Cafe',
  capacity: 40,
  location_id: 'loc1',
  offer_min_business: [],
  capacity_items: [],
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  h.calendar = { loading: false, error: null, tiles: [], endsFor: vi.fn().mockReturnValue([]) };
});

describe('VenueSlotStep', () => {
  const state = () => JSON.parse(screen.getByTestId('state').textContent ?? '[]');
  const step = (values: Partial<CreatePodFormValues> = {}, props: { venues?: unknown[]; clubVenueIds?: string[]; errors?: Record<string, string> } = {}) =>
    render(
      <Harness values={{ pod_mode: 'PHYSICAL', location_id: 'loc1', ...values }} errors={props.errors}>
        {(form) => (
          <>
            <VenueSlotStep
              form={form}
              venues={(props.venues ?? [venue(), venue({ id: 'v2', venue_name: 'Elsewhere', location_id: 'loc2' })]) as never}
              clubVenueIds={new Set(props.clubVenueIds ?? ['v1', 'v2'])}
              venueNotice={{} as never}
              spots={{ min: 1, max: 40, slidable: true }}
              offerMinGuests={2}
            />
            <output data-testid="state">{JSON.stringify([form.watch('venue_id'), form.watch('venue_slot_id'), form.watch('venue_space_label'), form.watch('no_of_spots'), form.watch('pod_date_time'), form.watch('pod_end_date_time'), form.watch('venue_booking_pets')])}</output>
          </>
        )}
      </Harness>
    );

  it('shows the meeting fields for a virtual pod and no venue picker', () => {
    step({ pod_mode: 'VIRTUAL' });
    expect(screen.getByTestId('virtual-fields')).toBeInTheDocument();
    expect(screen.queryByTestId('create-pod-venue-slot-step')).not.toBeInTheDocument();
  });

  it('lists only the venues of the club in the pod city, or says there are none, with the venue error', async () => {
    step({}, { clubVenueIds: ['v1', 'v2'] });
    expect(screen.getByTestId('create-pod-venue-v1')).toBeInTheDocument();
    expect(screen.queryByTestId('create-pod-venue-v2')).not.toBeInTheDocument();
  });

  it('says there are no venues for the club, and shows the venue validation message', async () => {
    step({}, { clubVenueIds: [], errors: { venue_id: 'Pick a venue' } });
    expect(screen.getByTestId('create-pod-no-venues')).toBeInTheDocument();
    expect(await screen.findByTestId('venue_id-error')).toHaveTextContent('Pick a venue');
  });

  it('lists every club venue when the pod has no city yet', () => {
    step({ location_id: '' });
    expect(screen.getByTestId('create-pod-venue-v2')).toBeInTheDocument();
  });

  it('shows the venue type and capacity, the offer picker once a space is chosen, the contact card and the map', () => {
    step({ venue_id: 'v1', venue_space_label: '' });
    expect(screen.getByTestId('create-pod-venue-capacity')).toHaveTextContent(`Cafe · ${fallbackT('mweb.createPod.totalCapacity', { vars: { count: 40 } })}`);
    // The venue's minimum business heads the next step (Offer for Venue), not this one.
    expect(screen.queryByTestId('min-business')).not.toBeInTheDocument();
    expect(screen.getByTestId('contact-card')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toHaveAttribute('data-title', 'Court One');
    expect(screen.queryByTestId('offer-picker')).not.toBeInTheDocument();
  });

  it('shows the capacity alone for a venue with no type or capacity, naming the whole venue as its own space', () => {
    step({ venue_id: 'v1' }, { venues: [venue({ venue_type: '', capacity: null })] });
    expect(screen.getByTestId('create-pod-venue-capacity')).toHaveTextContent(fallbackT('mweb.createPod.totalCapacity', { vars: { count: 0 } }));
    expect(screen.getByTestId('create-pod-venue-capacity')).not.toHaveTextContent('·');
  });

  it('choosing a space sets the guests, clears the time and the pets, and opens the offer picker for it', async () => {
    const date = new Date('2030-01-01T10:00:00.000Z');
    step({ venue_id: 'v1', venue_slot_id: 'old', pod_date_time: date, pod_end_date_time: date, venue_booking_pets: true });
    fireEvent.mouseDown(within(screen.getByTestId('venue_space_label')).getByRole('combobox'));
    const options = await screen.findAllByRole('option');
    fireEvent.click(options[0]);
    await waitFor(() => expect(state()[3]).toBe(40));
    const [, slot, space, , start, end, pets] = state();
    expect(slot).toBe('');
    expect(space).not.toBe('');
    expect(start).toBeNull();
    expect(end).toBeNull();
    expect(pets).toBe(false);
    expect(await screen.findByTestId('offer-picker')).toBeInTheDocument();
    expect(h.offerProps).toMatchObject({ venueId: 'v1', minGuests: 2 });
  });

  it('keeps a pod-request window when the space changes, and books through the request picker', async () => {
    const date = new Date('2030-01-01T10:00:00.000Z');
    step({ venue_id: 'v1', partner_request_id: 'req1', venue_slot_id: 'slot', pod_date_time: date, pod_end_date_time: date });
    fireEvent.mouseDown(within(screen.getByTestId('venue_space_label')).getByRole('combobox'));
    fireEvent.click((await screen.findAllByRole('option'))[0]);
    await waitFor(() => expect(state()[1]).toBe(''));
    expect(state()[4]).toBe(date.toISOString());
    expect(await screen.findByTestId('request-picker')).toBeInTheDocument();
    expect(screen.queryByTestId('offer-picker')).not.toBeInTheDocument();
  });

  it('shows the validation message for the space and the pod window length once it is known', async () => {
    step(
      { venue_id: 'v1', pod_date_time: new Date('2030-01-01T10:00:00.000Z'), pod_end_date_time: new Date('2030-01-01T12:00:00.000Z') },
      { errors: { venue_space_label: 'Pick a space' } }
    );
    expect(await screen.findByText('Pick a space')).toBeInTheDocument();
    expect(screen.getByTestId('create-pod-window-duration')).toBeInTheDocument();
  });

  it('names a capacity space exactly as the venue wrote it', async () => {
    step({ venue_id: 'v1' }, { venues: [venue({ capacity_items: [{ label: 'Studio room', capacity: 6 }] })] });
    fireEvent.mouseDown(within(screen.getByTestId('venue_space_label')).getByRole('combobox'));
    const options = await screen.findAllByRole('option');
    expect(options.some((option) => option.textContent?.includes('Studio room'))).toBe(true);
    expect(options.some((option) => option.textContent?.includes(fallbackT('mweb.slots.wholeVenue')))).toBe(false);
  });

  it('picking another venue resets the space, the guests and the time', async () => {
    step({ venue_id: 'v1', venue_space_label: 'x', no_of_spots: 12 }, { venues: [venue(), venue({ id: 'v3', venue_name: 'Court Three' })], clubVenueIds: ['v1', 'v3'] });
    fireEvent.click(screen.getByRole('button', { name: 'Court Three' }));
    await waitFor(() => expect(state()[0]).toBe('v3'));
    expect(state()[2]).toBe('');
    expect(state()[3]).toBe(0);
  });
});

describe('OfferTermsFields', () => {
  const terms = (values: Partial<CreatePodFormValues> = {}, errors: Record<string, string> = {}) =>
    render(
      <Harness values={values} errors={errors}>
        {(form) => (
          <>
            <OfferTermsFields form={form} />
            <output data-testid="state">{JSON.stringify([form.watch('venue_offer_model'), form.watch('venue_offer_rate')])}</output>
          </>
        )}
      </Harness>
    );

  it('shows the generic hint before an option is picked, the option help after, and keeps only digits in the rate', async () => {
    terms();
    expect(screen.getByText(fallbackT('mweb.createPod.offer.modelHint'))).toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.createPod.offer.rateHint'))).toBeInTheDocument();
    fireEvent.mouseDown(within(screen.getByTestId('create-pod-offer-model')).getByRole('combobox'));
    fireEvent.click(await screen.findByTestId('create-pod-offer-model-FLAT'));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')[0]).toBe('FLAT'));
    fireEvent.change(screen.getByTestId('create-pod-offer-rate').querySelector('input') as HTMLElement, { target: { value: '12a5' } });
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')[1]).toBe('125'));
    expect(screen.queryByText(fallbackT('mweb.createPod.offer.modelHint'))).not.toBeInTheDocument();
  });

  it('shows the validation messages over the hints', async () => {
    terms({}, { venue_offer_model: 'Pick how you pay', venue_offer_rate: 'Enter an amount' });
    expect(await screen.findByText('Pick how you pay')).toBeInTheDocument();
    expect(screen.getByText('Enter an amount')).toBeInTheDocument();
  });
});

describe('BasicsStep error placement', () => {
  const basics = (values: Partial<CreatePodFormValues> = {}, errors: Record<string, string> = {}) =>
    render(<Harness values={values} errors={errors}>{(form) => <BasicsStep form={form} hostCategories={[]} />}</Harness>);

  it('passes the cover and offers validation messages to their fields', async () => {
    basics({}, { media_text: 'Add a cover image', what_this_pod_offers: 'List what you offer' });
    await waitFor(() => expect(screen.getByTestId('media')).toHaveAttribute('data-error', 'Add a cover image'));
    expect(await screen.findByText('List what you offer')).toBeInTheDocument();
  });

  it('shows the reel nudge only while there is no reel', () => {
    const { unmount } = basics({ reel_url: '' });
    expect(screen.getByTestId('reel-notice')).toBeInTheDocument();
    unmount();
    basics({ reel_url: 'https://reel.example/a.mp4' });
    expect(screen.queryByTestId('reel-notice')).not.toBeInTheDocument();
  });
});

describe('create pod schema timing', () => {
  const base = (over: Partial<CreatePodFormValues>): CreatePodFormValues => ({
    ...blankCreatePodForm,
    location_id: 'loc1',
    host_category_key: 'k',
    pod_title: 'Sunday run',
    club_id: 'c1',
    pod_mode: 'VIRTUAL',
    meeting_platform: 'zoom',
    meeting_url: 'https://meet.example/x',
    pod_description: 'A long enough description',
    media_text: 'https://img.example/a.png',
    what_this_pod_offers: ['Fun'],
    pod_type: 'FREE',
    no_of_spots: 5,
    agreed_to_terms: true,
    ...over,
  });

  it('refuses an end that is after the start but under the minimum duration', () => {
    const start = new Date(Date.now() + 3_600_000);
    const result = makeCreatePodSchema().safeParse(base({ pod_date_time: start, pod_end_date_time: new Date(start.getTime() + 10 * 60_000) }));
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);
    expect(messages).toContain(fallbackT('mweb.createPod.validation.endMinDuration'));
    expect(messages).not.toContain(fallbackT('mweb.createPod.validation.endAfterStart'));
  });

  it('refuses an end before the start, and accepts a long enough window', () => {
    const start = new Date(Date.now() + 3_600_000);
    const before = makeCreatePodSchema().safeParse(base({ pod_date_time: start, pod_end_date_time: new Date(start.getTime() - 60_000) }));
    expect(before.success ? [] : before.error.issues.map((issue) => issue.message)).toContain(fallbackT('mweb.createPod.validation.endAfterStart'));
    const ok = makeCreatePodSchema().safeParse(base({ pod_date_time: start, pod_end_date_time: new Date(start.getTime() + 2 * 3_600_000) }));
    expect(ok.success ? [] : ok.error.issues.map((issue) => issue.message)).not.toContain(fallbackT('mweb.createPod.validation.endMinDuration'));
  });
});
