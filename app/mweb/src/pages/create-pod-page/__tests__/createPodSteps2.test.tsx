import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useEffect, type ReactNode } from 'react';

import LocalityField from '../create-pod/steps/LocalityField';
import VenueQuoteCard from '../create-pod/steps/VenueQuoteCard';
import BookingGuestFields from '../create-pod/steps/BookingGuestFields';
import ClubField from '../create-pod/steps/ClubField';
import { useOfferCalendar } from '../create-pod/steps/useOfferCalendar';
import { blankCreatePodForm, type CreatePodFormValues } from '../create-pod/create-pod.types';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  calendar: { data: undefined as unknown, loading: false, error: undefined as unknown },
  calendarOpts: undefined as undefined | { skip: boolean; variables: Record<string, unknown> },
  spots: undefined as undefined | Record<string, any>,
  parseApiError: vi.fn(),
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: (_doc: unknown, opts: typeof h.calendarOpts) => {
    h.calendarOpts = opts;
    return h.calendar;
  },
}));
vi.mock('../../../components/app-header/LocationDialog', () => ({ default: () => null }));
vi.mock('@duncit/ui', async (orig) => ({
  ...(await orig<object>()),
  SpotsStepper: (p: Record<string, any>) => {
    h.spots = p;
    return <div data-testid="spots" data-value={p.value} data-hint={p.boundsHint ?? ''} data-readonly={String(p.readOnly)} data-error={p.error ?? ''} />;
  },
}));
vi.mock('@duncit/utils', async (orig) => ({
  ...(await orig<object>()),
  parseApiError: (e: unknown) => h.parseApiError(e),
  venueQuoteLines: () => ({
    lines: [
      { id: 'base', label: 'Base rate', amount: 100 },
      { id: 'fee', labelKey: 'mweb.createPod.quote.total', vars: {}, amount: 5 },
    ],
    total: 105,
    deposit: 20,
  }),
}));
vi.mock('../create-pod/steps/QuoteRangeRows', () => ({ default: () => <div data-testid="range-rows" /> }));
vi.mock('../../../hooks/usePricing', () => ({ usePricing: () => ({ currency: '₹', format: (v: number) => `₹${v}` }) }));
vi.mock('../../../utils/dateFormat', async (orig) => ({
  ...(await orig<object>()),
  useDateFormat: () => ({ dayKey: () => '2030-01-01', clock: { nowMs: () => 1_893_456_000_000 }, timeZone: 'UTC' }),
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

beforeEach(() => {
  vi.clearAllMocks();
  h.calendar = { data: undefined, loading: false, error: undefined };
  h.parseApiError.mockReturnValue('');
});

describe('LocalityField', () => {
  const zones = [{ zone_name: 'Koregaon' }, { zone_name: 'Baner' }, { zone_name: 'Empty' }];
  const cityClubs = [{ id: 'c1', locality: 'Koregaon' }, { id: 'c2', locality: 'Koregaon' }, { id: 'c3', locality: 'Baner' }] as never;
  const mount = (values: Partial<CreatePodFormValues> = {}) =>
    render(
      <Harness values={{ location_id: 'loc1', ...values }}>
        {(form) => (
          <>
            <LocalityField form={form} zones={zones} cityClubs={cityClubs} cityName="Pune" locations={[]} />
            <output data-testid="state">{JSON.stringify([form.watch('locality'), form.watch('club_id')])}</output>
          </>
        )}
      </Harness>
    );
  const open = () => fireEvent.mouseDown(within(screen.getByTestId('create-pod-locality')).getByRole('combobox'));

  it('lists localities with their club counts, the empty ones last and disabled, and picks one', async () => {
    mount();
    open();
    const koregaon = await screen.findByTestId('create-pod-locality-option-Koregaon');
    expect(koregaon).toHaveTextContent(fallbackT('mweb.clubsPage.clubCount', { count: 2 }));
    expect(screen.getByTestId('create-pod-locality-option-Empty')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(koregaon);
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')[0]).toBe('Koregaon'));
    expect(screen.queryByTestId('create-pod-location-reset')).not.toBeInTheDocument();
  });

  it('says the club was cleared when moving to another area with a club chosen, and clears the area from its clear button', async () => {
    mount({ locality: 'Koregaon', club_id: 'c1' });
    open();
    fireEvent.click(await screen.findByTestId('create-pod-locality-option-Baner'));
    expect(await screen.findByTestId('create-pod-location-reset')).toHaveTextContent(fallbackT('mweb.createPod.locationResetNotice'));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')).toEqual(['Baner', '']));
    fireEvent.click(within(screen.getByTestId('create-pod-locality')).getByLabelText('Clear'));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')[0]).toBe(''));
  });

  it('shows the no-options text when the city has no localities', async () => {
    render(
      <Harness values={{ location_id: 'loc1' }}>
        {(form) => <LocalityField form={form} zones={[]} cityClubs={[]} cityName="Pune" locations={[]} />}
      </Harness>
    );
    open();
    expect(await screen.findByText(fallbackT('mweb.createPod.localitiesEmpty'))).toBeInTheDocument();
  });
});

describe('VenueQuoteCard', () => {
  const quote = { total: 105 } as never;

  it('shows the server failure, or a generic line when it gives none', () => {
    h.parseApiError.mockReturnValue('Quote service down');
    const { unmount } = render(<VenueQuoteCard quote={null} loading={false} error={new Error('x')} />);
    expect(screen.getByTestId('create-pod-quote-error')).toHaveTextContent('Quote service down');
    unmount();
    h.parseApiError.mockReturnValue('');
    render(<VenueQuoteCard quote={null} loading={false} error={new Error('x')} />);
    expect(screen.getByTestId('create-pod-quote-error')).toHaveTextContent(fallbackT('mweb.createPod.quoteFailed'));
  });

  it('shows why the offer cannot be sent', () => {
    render(<VenueQuoteCard quote={null} loading={false} error={null} message="Below minimum" />);
    expect(screen.getByTestId('create-pod-offer-problem')).toHaveTextContent('Below minimum');
  });

  it('shows a spinner while pricing and nothing when there is nothing to price', () => {
    const { container, unmount } = render(<VenueQuoteCard quote={null} loading error={null} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    unmount();
    const idle = render(<VenueQuoteCard quote={null} loading={false} error={null} />);
    expect(idle.container).toBeEmptyDOMElement();
    expect(container).toBeDefined();
  });

  it('breaks the price down line by line with the total, the deposit and the range', () => {
    render(<VenueQuoteCard quote={quote} loading={false} error={null} />);
    expect(screen.getByTestId('range-rows')).toBeInTheDocument();
    expect(screen.getByText('Base rate')).toBeInTheDocument();
    expect(screen.getAllByText(fallbackT('mweb.createPod.quote.total'))).toHaveLength(2);
    expect(screen.getByTestId('create-pod-venue-quote-total')).toHaveTextContent('105');
    expect(screen.getByText(/20/, { selector: 'span' })).toBeInTheDocument();
  });
});

describe('BookingGuestFields', () => {
  const fields = (spots: Record<string, unknown>, minGuests?: number, values: Partial<CreatePodFormValues> = { no_of_spots: 6 }, errors: Record<string, string> = {}) =>
    render(
      <Harness values={values} errors={errors}>
        {(form) => (
          <>
            <BookingGuestFields form={form} spots={spots as never} minGuests={minGuests} />
            <output data-testid="state">{JSON.stringify([form.watch('no_of_spots'), form.watch('venue_booking_pets')])}</output>
          </>
        )}
      </Harness>
    );

  it('hints at the range when the spots can slide, locks them when there is no room, and passes the error', async () => {
    fields({ min: 2, max: 10, slidable: true }, 0, { no_of_spots: 6 }, { no_of_spots: 'Too few' });
    expect(screen.getByTestId('spots')).toHaveAttribute('data-hint', fallbackT('mweb.createPod.spotsVenueHint', { vars: { min: 2, max: 10 } }));
    expect(screen.getByTestId('spots')).toHaveAttribute('data-readonly', 'false');
    expect(screen.getByTestId('spots')).toHaveAttribute('data-value', '6');
    await waitFor(() => expect(screen.getByTestId('spots')).toHaveAttribute('data-error', 'Too few'));
    expect(screen.queryByTestId('create-pod-venue-minimum')).not.toBeInTheDocument();
  });

  it('has no range hint and is read only when the venue and space leave no room to choose', () => {
    fields({ min: 4, max: 4, slidable: false }, 0, {});
    expect(screen.getByTestId('spots')).toHaveAttribute('data-hint', '');
    expect(screen.getByTestId('spots')).toHaveAttribute('data-readonly', 'true');
    expect(screen.getByTestId('spots')).toHaveAttribute('data-value', '0');
  });

  it('says the venue minimum when it has one, updates the guests and takes the pets switch', async () => {
    fields({ min: 2, max: 10, slidable: true }, 3);
    expect(screen.getByTestId('create-pod-venue-minimum')).toHaveTextContent('3');
    act(() => h.spots?.onChange(8));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')[0]).toBe(8));
    fireEvent.click(screen.getByTestId('create-pod-booking-pets').querySelector('input') as HTMLElement);
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')[1]).toBe(true));
  });
});

describe('ClubField', () => {
  const clubs = [
    { id: 'c1', club_name: 'Runners', locality: 'Koregaon', location_id: 'loc1' },
    { id: 'c2', club_name: 'Readers', locality: 'Baner', location_id: 'loc1' },
  ] as never;
  const field = (props: { locked?: boolean; locality?: string; values?: Partial<CreatePodFormValues>; errors?: Record<string, string> } = {}) =>
    render(
      <Harness values={props.values} errors={props.errors}>
        {(form) => (
          <>
            <ClubField form={form} clubs={clubs} locations={[]} locality={props.locality ?? ''} locked={props.locked ?? false} />
            <output data-testid="state">{form.watch('club_id')}</output>
          </>
        )}
      </Harness>
    );

  it('picks a club, then clears the choice', async () => {
    field({ locality: 'Koregaon', values: { club_id: '' } });
    fireEvent.mouseDown(within(screen.getByTestId('create-pod-club')).getByRole('combobox'));
    fireEvent.click(await screen.findByText(/Readers/));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('c2'));
    fireEvent.click(within(screen.getByTestId('create-pod-club')).getByLabelText('Clear'));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent(/^$/));
  });

  it('says how many clubs the locality holds, or to pick a locality first when locked', () => {
    const { unmount } = field({ locality: 'Koregaon' });
    expect(screen.getByText(fallbackT('mweb.createPod.clubsInLocality', { count: 2, vars: { locality: 'Koregaon' } }))).toBeInTheDocument();
    unmount();
    field({ locked: true });
    expect(screen.getByText(fallbackT('mweb.createPod.clubPickLocalityFirst'))).toBeInTheDocument();
  });

  it('shows no hint without a locality, and the validation message over the hint', async () => {
    const { unmount } = field();
    expect(screen.queryByText(fallbackT('mweb.createPod.clubPickLocalityFirst'))).not.toBeInTheDocument();
    unmount();
    field({ locality: 'Koregaon', errors: { club_id: 'Pick a club' } });
    expect(await screen.findByText('Pick a club')).toBeInTheDocument();
  });
});

describe('useOfferCalendar', () => {
  it('asks for nothing until a venue and a space are chosen', () => {
    const { result } = renderHook(() => useOfferCalendar('', ''));
    expect(h.calendarOpts?.skip).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    renderHook(() => useOfferCalendar('v1', ''));
    expect(h.calendarOpts?.skip).toBe(true);
  });

  it('reads the venue calendar for the next days of the picked space', () => {
    renderHook(() => useOfferCalendar('v1', 'Court A'));
    expect(h.calendarOpts?.skip).toBe(false);
    expect(h.calendarOpts?.variables).toMatchObject({ venue_id: 'v1' });
  });

  it('is loading only before the first answer, and reports a failed read', () => {
    h.calendar = { data: undefined, loading: true, error: undefined };
    expect(renderHook(() => useOfferCalendar('v1', 'Court A')).result.current.loading).toBe(true);
    h.calendar = { data: { venueOfferCalendar: { days: [], buffer_minutes: 0, min_notice_minutes: 0 } }, loading: true, error: undefined };
    expect(renderHook(() => useOfferCalendar('v1', 'Court A')).result.current.loading).toBe(false);
    const error = new Error('x');
    h.calendar = { data: undefined, loading: false, error };
    expect(renderHook(() => useOfferCalendar('v1', 'Court A')).result.current.error).toBe(error);
  });
});
