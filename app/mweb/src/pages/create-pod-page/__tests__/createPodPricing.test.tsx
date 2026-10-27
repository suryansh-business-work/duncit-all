import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useEffect, type ReactNode } from 'react';

import SuggestedPricesDialog from '../create-pod/price-panel/SuggestedPricesDialog';
import SuggestedPricesTable from '../create-pod/price-panel/SuggestedPricesTable';
import TicketPriceField from '../create-pod/price-panel/TicketPriceField';
import PricingStep from '../create-pod/steps/PricingStep';
import { podTypes } from '../create-pod/create-pod.types';
import { buildCreatePodInput } from '../create-pod/create-pod.payload';
import { blankCreatePodForm, type CreatePodFormValues } from '../create-pod/create-pod.types';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  suggested: { data: undefined as unknown, loading: false, error: undefined as unknown },
  suggestedOpts: undefined as unknown,
  productProps: undefined as undefined | Record<string, any>,
  spotProps: undefined as undefined | Record<string, any>,
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: (_doc: unknown, opts: unknown) => {
    h.suggestedOpts = opts;
    return h.suggested;
  },
}));
vi.mock('@duncit/pod-product-picker', () => ({
  PodProductsField: (p: Record<string, any>) => {
    h.productProps = p;
    return <div data-testid="products" data-error={p.error ?? ''} />;
  },
}));
vi.mock('@duncit/ui', async (orig) => ({
  ...(await orig<object>()),
  SpotsStepper: (p: Record<string, any>) => {
    h.spotProps = p;
    return <div data-testid="spots" data-readonly={String(p.readOnly)} data-slidable={String(p.slidable)} data-hint={p.boundsHint ?? ''} data-fixed={p.labels.fixedHint ?? ''} />;
  },
  TicketDiscountField: () => <div data-testid="tier-field" />,
}));
vi.mock('../create-pod/price-panel', async (orig) => ({
  ...(await orig<object>()),
  default: () => <div data-testid="price-panel" />,
  FreePodNote: () => <div data-testid="free-note" />,
}));
vi.mock('../../../hooks/usePricing', () => ({ usePricing: () => ({ currency: '₹', format: (v: number) => `₹${v}` }) }));
vi.mock('../../../hooks/useBrandingAssets', () => ({ useBrandingAssets: () => ({ termsUrl: 'https://t.example' }) }));
vi.mock('../../../utils/dateFormat', async (orig) => ({ ...(await orig<object>()), useTicketDiscountMaxPct: () => 40 }));

type Form = ReturnType<typeof useForm<CreatePodFormValues>>;
function Harness({ values, errors = {}, children }: Readonly<{ values?: Partial<CreatePodFormValues>; errors?: Record<string, string>; children: (form: Form) => ReactNode }>) {
  const form = useForm<CreatePodFormValues>({ defaultValues: { ...blankCreatePodForm, ...values } });
  useEffect(() => {
    for (const [field, message] of Object.entries(errors)) form.setError(field as keyof CreatePodFormValues, { type: 'manual', message });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children(form)}</>;
}
const preview = (over: Record<string, unknown> = {}) =>
  ({ zeroEarnings: false, noOfSpots: 10, hasVenue: false, venueId: null, slotPrice: null, ...over }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  h.suggested = { data: undefined, loading: false, error: undefined };
});

describe('SuggestedPricesDialog and table', () => {
  const dialog = () => render(<SuggestedPricesDialog open noOfSpots={10} venueId={null} venueAmount={null} symbol="₹" onClose={vi.fn()} />);

  it('only asks once it opens, and shows a spinner on the first read', () => {
    h.suggested = { data: undefined, loading: true, error: undefined };
    dialog();
    expect((h.suggestedOpts as { skip: boolean }).skip).toBe(false);
    expect(screen.getByTestId('suggested-prices-loading')).toBeInTheDocument();
  });

  it('says it could not load, and says there are no suggestions', () => {
    h.suggested = { data: undefined, loading: false, error: new Error('x') };
    const { unmount } = dialog();
    expect(screen.getByTestId('suggested-prices-error')).toHaveTextContent(fallbackT('mweb.createPod.suggestedPricesError'));
    unmount();
    h.suggested = { data: { suggestedTicketPrices: [] }, loading: false, error: undefined };
    dialog();
    expect(screen.getByTestId('suggested-prices-empty')).toBeInTheDocument();
  });

  it('shows the table with the open top rung, and keeps it up while refreshing', () => {
    h.suggested = { data: { suggestedTicketPrices: [{ price: 199 }, { price: 299 }] }, loading: true, error: undefined };
    dialog();
    expect(screen.getByTestId('suggested-prices-table')).toBeInTheDocument();
    expect(screen.getByTestId('suggested-prices-table')).toHaveTextContent('299');
  });

  it('shows a rung beyond the known tiers without a description rather than failing', () => {
    const prices = Array.from({ length: 8 }, (_, index) => ({ price: 100 + index }));
    render(<SuggestedPricesTable prices={prices as never} symbol="₹" />);
    expect(screen.getByTestId('suggested-prices-table')).toHaveTextContent('107');
  });

  it('closes from its button', () => {
    h.suggested = { data: { suggestedTicketPrices: [] }, loading: false, error: undefined };
    const onClose = vi.fn();
    render(<SuggestedPricesDialog open noOfSpots={10} venueId="v1" venueAmount={500} symbol="₹" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('suggested-prices-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect((h.suggestedOpts as { variables: object }).variables).toEqual({ no_of_spots: 10, venue_id: 'v1', venue_amount: 500 });
  });
});

describe('TicketPriceField', () => {
  const field = (p = preview(), values: Partial<CreatePodFormValues> = {}) =>
    render(
      <Harness values={values}>
        {(form) => (
          <>
            <TicketPriceField form={form} preview={p} />
            <output data-testid="state">{JSON.stringify(form.watch('pod_amount'))}</output>
          </>
        )}
      </Harness>
    );

  it('keeps an empty price as null and the typed number otherwise', async () => {
    field();
    const input = screen.getByTestId('create-pod-ticket-price-input');
    fireEvent.change(input, { target: { value: '250' } });
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('250'));
    fireEvent.change(input, { target: { value: '' } });
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('null'));
  });

  it('warns when the projected payout is nothing, and not otherwise', () => {
    const { unmount } = field(preview({ zeroEarnings: true }));
    expect(screen.getByText(fallbackT('mweb.createPod.zeroEarningsTitle'), { exact: false })).toBeInTheDocument();
    unmount();
    field();
    expect(screen.queryByText(fallbackT('mweb.createPod.zeroEarningsTitle'), { exact: false })).not.toBeInTheDocument();
  });

  it('opens the suggested prices for the pod spots, with the venue cost when a venue is booked', () => {
    h.suggested = { data: { suggestedTicketPrices: [] }, loading: false, error: undefined };
    field(preview({ hasVenue: true, venueId: 'v1', slotPrice: 800, noOfSpots: 12 }));
    fireEvent.click(screen.getByTestId('suggested-price-link'));
    expect((h.suggestedOpts as { variables: object }).variables).toEqual({ no_of_spots: 12, venue_id: 'v1', venue_amount: 800 });
  });

  it('asks for suggestions without a venue when none is booked', () => {
    h.suggested = { data: { suggestedTicketPrices: [] }, loading: false, error: undefined };
    field(preview());
    fireEvent.click(screen.getByTestId('suggested-price-link'));
    expect((h.suggestedOpts as { variables: object }).variables).toEqual({ no_of_spots: 10, venue_id: null, venue_amount: null });
  });
});

describe('PricingStep', () => {
  const step = (values: Partial<CreatePodFormValues> = {}, props: { showProducts?: boolean; spots?: object } = {}) =>
    render(
      <Harness values={values}>
        {(form) => (
          <>
            <PricingStep
              form={form}
              products={[]}
              showProducts={props.showProducts ?? false}
              preview={preview()}
              spots={(props.spots ?? { min: 2, max: 10, slidable: true }) as never}
              venueNotice={{} as never}
            />
            <output data-testid="state">{JSON.stringify([form.watch('products_enabled'), form.watch('no_of_spots')])}</output>
          </>
        )}
      </Harness>
    );

  it('shows the price, discount, panel, payment terms and charges for a paid physical pod', () => {
    step({ pod_type: 'PAID', pod_mode: 'PHYSICAL' });
    expect(screen.getByTestId('suggested-price-link')).toBeInTheDocument();
    expect(screen.getByTestId('tier-field')).toBeInTheDocument();
    expect(screen.getByTestId('price-panel')).toBeInTheDocument();
    expect(screen.getByTestId('payment_terms')).toBeInTheDocument();
    expect(screen.getByTestId('place-charges-field')).toBeInTheDocument();
    expect(screen.queryByTestId('free-note')).not.toBeInTheDocument();
  });

  it('shows a short note instead of price, discount and terms for a free pod, and no charges for a virtual one', () => {
    step({ pod_type: 'FREE', pod_mode: 'VIRTUAL' });
    expect(screen.getByTestId('free-note')).toBeInTheDocument();
    expect(screen.queryByTestId('suggested-price-link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tier-field')).not.toBeInTheDocument();
    expect(screen.queryByTestId('payment_terms')).not.toBeInTheDocument();
    expect(screen.queryByTestId('place-charges-field')).not.toBeInTheDocument();
  });

  it('locks the spots to the venue booking, with a hint where it is set', () => {
    step({ pod_mode: 'PHYSICAL', partner_request_id: '' });
    expect(screen.getByTestId('spots')).toHaveAttribute('data-readonly', 'true');
    expect(screen.getByTestId('spots')).toHaveAttribute('data-slidable', 'false');
    expect(screen.getByTestId('spots')).toHaveAttribute('data-fixed', fallbackT('mweb.createPod.spotsSetOnVenueStep'));
    expect(screen.getByTestId('spots')).toHaveAttribute('data-hint', fallbackT('mweb.createPod.spotsBoundsHint', { vars: { min: 2, max: 10 } }));
  });

  it('lets a pod request or a virtual pod size its own spots, locking only when the range has no room', () => {
    const { unmount } = step({ pod_mode: 'PHYSICAL', partner_request_id: 'req1' });
    expect(screen.getByTestId('spots')).toHaveAttribute('data-readonly', 'false');
    expect(screen.getByTestId('spots')).toHaveAttribute('data-slidable', 'true');
    unmount();
    const virtual = step({ pod_mode: 'VIRTUAL' });
    expect(screen.getByTestId('spots')).toHaveAttribute('data-readonly', 'false');
    virtual.unmount();
    step({ pod_mode: 'PHYSICAL', partner_request_id: 'req1' }, { spots: { min: 4, max: 4, slidable: false } });
    expect(screen.getByTestId('spots')).toHaveAttribute('data-readonly', 'true');
    expect(screen.getByTestId('spots')).toHaveAttribute('data-hint', '');
  });

  it('attaches products by adding one, and derives the switch from the rows', async () => {
    step({ pod_mode: 'VIRTUAL' }, { showProducts: true });
    expect(screen.getByTestId('products')).toBeInTheDocument();
    act(() => h.productProps?.onChange([{ product_id: 'p1' }]));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')[0]).toBe(true));
    act(() => h.productProps?.onChange([]));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')[0]).toBe(false));
  });
});

describe('PricingStep validation', () => {
  it('passes the spots and products validation messages to their fields', async () => {
    render(
      <Harness values={{ pod_mode: 'VIRTUAL' }} errors={{ no_of_spots: 'Too few spots', product_requests: 'Fix the products' }}>
        {(form) => <PricingStep form={form} products={[]} showProducts preview={preview()} spots={{ min: 2, max: 10, slidable: true } as never} venueNotice={{} as never} />}
      </Harness>
    );
    await waitFor(() => expect(h.spotProps?.error).toBe('Too few spots'));
    await waitFor(() => expect(screen.getByTestId('products')).toHaveAttribute('data-error', 'Fix the products'));
  });
});

describe('create pod helpers', () => {
  it('offers Free and Paid as the only pod types', () => {
    expect(podTypes(fallbackT).map((type) => type.value)).toEqual(['FREE', 'PAID']);
  });

  it('sends a virtual pod meeting platform trimmed, or none when blank, and none for a physical pod', () => {
    const base = { ...blankCreatePodForm, pod_mode: 'VIRTUAL' as const, meeting_url: ' https://m ' };
    expect(buildCreatePodInput({ ...base, meeting_platform: ' zoom ' }).meeting_platform).toBe('zoom');
    expect(buildCreatePodInput({ ...base, meeting_platform: '   ' }).meeting_platform).toBeNull();
    expect(buildCreatePodInput({ ...blankCreatePodForm, pod_mode: 'PHYSICAL', meeting_platform: 'zoom' }).meeting_platform).toBeNull();
  });
});
