/**
 * A FREE physical pod on Step 4.
 *
 * A physical pod may now be free (`pod_type: 'FREE'`, `pod_amount: 0`). A free
 * pod shows no calculation anywhere: no amount field, no suggested prices, no
 * multi-ticket discount and no earnings panel — and it never asks the server
 * for earnings. When the slot it books costs something at a venue the host does
 * not own, the host is told to settle with the venue directly. A PAID pod is
 * unchanged. Native twin: create-pod-free-pod.test.tsx (rule 27).
 */
import '@testing-library/jest-dom/vitest';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { FreePodVenueNotice } from '@duncit/utils';
import { describe, expect, it, vi } from 'vitest';
import { fallbackT } from '../../../../i18n/fallback';
import { useStepperSelections } from '../CreatePodStepper/useStepperSelections';
import { buildCreatePodInput, createPodSchema } from '../create-pod.form';
import { POTENTIAL_POD_EARNINGS } from '../price-panel';
import PricingStep from '../steps/PricingStep';
import { VENUE_AVAILABLE_SLOTS } from '../venueSlots';
import { blankCreatePodForm, type CreatePodForm, type CreatePodFormValues, type CreatePodVenue } from '../create-pod.types';

const VENUES: CreatePodVenue[] = [
  { id: 'venue-own', owner_user_id: 'u-me', venue_name: 'My Own Court', capacity: 10 },
  { id: 'venue-partner', owner_user_id: 'u-other', venue_name: 'Partner Courts', capacity: 10 },
];

const slot = (price: number) => ({
  id: 'slot-1',
  start_at: '2030-01-05T10:00:00.000Z',
  end_at: '2030-01-05T12:00:00.000Z',
  whole_day: false,
  price,
  space_label: '',
  capacity: 10,
  status: 'OPEN',
});

const slotsMock = (venueId: string, price: number) => ({
  request: { query: VENUE_AVAILABLE_SLOTS, variables: { venue_id: venueId, partner_request_id: null } },
  result: { data: { venueAvailableSlots: [slot(price)] } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const waterfall = {
  amount: 2500, gst_pct: 18, gst_amount: 381.36, net_amount: 2118.64, platform_fee_pct: 5,
  platform_fee_amount: 105.93, pool_amount: 2012.71, club_admin_pct: 0, club_admin_amount: 0,
  venue_amount: 800, venue_commission_pct: 10, venue_commission_amount: 80, venue_receives: 720,
  host_amount: 1212.71, host_commission_pct: 10, host_commission_amount: 121.27, host_receives: 1091.44, host_earn_pct: 0,
};

/** The earnings query a ₹500 × 6-spot pod on the ₹800 partner slot would send. */
const earningsMock = (spy: () => void) => ({
  request: {
    query: POTENTIAL_POD_EARNINGS,
    variables: { pod_amount: 500, no_of_spots: 6, venue_id: 'venue-partner', venue_amount: 800 },
  },
  result: () => {
    spy();
    return { data: { potentialPodEarnings: { total_spots: 6, payable_spots: 5, waterfall } } };
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

/** A physical pod with steps 1-3 filled in, on the partner venue's slot. */
const physical = (over: Partial<CreatePodFormValues> = {}): CreatePodFormValues => ({
  ...blankCreatePodForm,
  location_id: 'loc-1',
  host_category_key: 'sup|sub',
  pod_title: 'Sunday community hike',
  club_id: 'club-1',
  pod_mode: 'PHYSICAL',
  venue_id: 'venue-partner',
  venue_slot_id: 'slot-1',
  venue_space_label: 'Whole venue',
  pod_description: 'A relaxed group hike around the lake.',
  pod_date_time: new Date('2030-01-05T10:00:00.000Z'),
  pod_end_date_time: new Date('2030-01-05T12:00:00.000Z'),
  pod_amount: 500,
  no_of_spots: 6,
  media_text: 'https://cdn/img.jpg',
  what_this_pod_offers: ['Guided trail'],
  agreed_to_terms: true,
  ...over,
});

interface Seen {
  form: CreatePodForm;
  notice: FreePodVenueNotice;
  /** The picked slot price once the slot list answered (null before). */
  slotPrice: number | null;
}

/** The real Step 4 fed by the stepper's real selections hook, so the money
 * state, the earnings query and the venue note are all the production wiring. */
function Harness({ initial, seen }: Readonly<{ initial: CreatePodFormValues; seen: Seen[] }>) {
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    resolver: zodResolver(createPodSchema) as unknown as Resolver<CreatePodFormValues, any, CreatePodFormValues>,
    defaultValues: initial,
  });
  const selections = useStepperSelections(form, {
    clubs: [],
    hostCategories: [],
    products: [],
    subCategories: [],
    venues: VENUES,
    viewerUserId: 'u-me',
  });
  seen.push({ form, notice: selections.venueNotice, slotPrice: selections.preview.slotPrice });
  return (
    <PricingStep
      form={form}
      products={[]}
      showProducts={false}
      preview={selections.preview}
      spots={selections.spots}
      venueNotice={selections.venueNotice}
    />
  );
}

function renderStep(initial: CreatePodFormValues, mocks: unknown[] = [slotsMock('venue-partner', 800)]) {
  const seen: Seen[] = [];
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks as never[]}>
      <Harness initial={initial} seen={seen} />
    </MockedProvider>,
  );
  const last = () => seen.at(-1) as Seen;
  return { last, values: () => last().form.getValues() };
}

const choose = (testId: 'create-pod-free' | 'create-pod-paid') =>
  act(() => {
    fireEvent.click(within(screen.getByTestId(testId)).getByRole('button'));
  });

const settleLine = fallbackT('mweb.createPod.freeVenueSettle');
const holdLine = fallbackT('mweb.createPod.freeVenueHold');

describe('Step 4 — a paid physical pod is unchanged', () => {
  it('shows the amount, suggested prices, the discount and the earnings panel, and no free note', () => {
    renderStep(physical());
    expect(screen.getByTestId('create-pod-ticket-price-input')).toHaveValue(500);
    expect(screen.getByTestId('suggested-price-link')).toBeInTheDocument();
    expect(screen.getByTestId('pricing-step-ticket-discount-card')).toBeInTheDocument();
    expect(screen.getByTestId('create-pod-price-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('create-pod-free-note')).not.toBeInTheDocument();
    expect(screen.getByTestId('payment_terms-input')).toBeInTheDocument();
    // Both cards are offered and Paid is the one picked.
    expect(within(screen.getByTestId('create-pod-paid')).getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByTestId('create-pod-free')).getByRole('button')).toBeEnabled();
  });

  it('asks the server for its earnings', async () => {
    const spy = vi.fn();
    renderStep(physical(), [slotsMock('venue-partner', 800), earningsMock(spy)]);
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });
});

describe('Step 4 — a free physical pod', () => {
  it('drops the amount and every calculation the moment Free is picked', async () => {
    const { values } = renderStep(physical());
    choose('create-pod-free');

    expect(screen.queryByTestId('create-pod-ticket-price-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('suggested-price-link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pricing-step-ticket-discount-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('create-pod-price-panel')).not.toBeInTheDocument();
    // Payment terms describe refunds and charges a free pod does not have.
    expect(screen.queryByTestId('payment_terms-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('create-pod-free-note')).toHaveTextContent(fallbackT('mweb.createPod.freePodBody'));
    // The note is a section named by its own heading, under the step's title.
    expect(screen.getByRole('region', { name: fallbackT('mweb.createPod.freePodTitle') })).toBeInTheDocument();
    expect(values()).toMatchObject({
      pod_type: 'FREE',
      pod_amount: 0,
      ticket_discount_enabled: false,
      ticket_discount_tiers: [],
    });
  });

  it('validates and submits as FREE at ₹0, without the payment terms typed while it was paid', async () => {
    const { last } = renderStep(physical({ payment_terms: 'No refunds after Friday.' }));
    choose('create-pod-free');

    let valid = false;
    await act(async () => {
      valid = await last().form.trigger();
    });
    expect(valid).toBe(true);
    expect(buildCreatePodInput(last().form.getValues())).toMatchObject({
      pod_mode: 'PHYSICAL',
      pod_type: 'FREE',
      pod_amount: 0,
      venue_slot_id: 'slot-1',
      ticket_discount_enabled: false,
      ticket_discount_tiers: [],
      payment_terms: null,
    });
    // The same terms on a paid pod still travel.
    expect(buildCreatePodInput({ ...last().form.getValues(), pod_type: 'PAID', pod_amount: 500 }).payment_terms).toBe(
      'No refunds after Friday.',
    );
  });

  it('never asks the server for earnings, even when a stale price is still in the form', async () => {
    const spy = vi.fn();
    renderStep(physical({ pod_type: 'FREE' }), [slotsMock('venue-partner', 800), earningsMock(spy)]);
    await screen.findByTestId('create-pod-free-note-venue');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('stays consistent across Free → Paid → Free', async () => {
    const { values } = renderStep(physical());
    choose('create-pod-free');
    choose('create-pod-paid');

    // Back to Paid: a blank field the host must fill, with the normal rule.
    const input = screen.getByTestId('create-pod-ticket-price-input');
    expect(input).toHaveValue(null);
    expect(values()).toMatchObject({ pod_type: 'PAID', pod_amount: null });
    expect(screen.getByTestId('create-pod-price-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('create-pod-free-note')).not.toBeInTheDocument();
    fireEvent.blur(input);
    expect(await screen.findByText(fallbackT('mweb.createPod.validation.ticketPriceRequired'))).toBeInTheDocument();

    choose('create-pod-free');
    expect(values()).toMatchObject({ pod_type: 'FREE', pod_amount: 0 });
    expect(screen.queryByTestId('create-pod-ticket-price-input')).not.toBeInTheDocument();
  });
});

describe('Step 4 — the venue note on a free pod', () => {
  it('tells the host to settle a priced partner slot directly', async () => {
    const { last } = renderStep(physical({ pod_type: 'FREE', pod_amount: 0 }));
    const note = await screen.findByTestId('create-pod-free-note-venue');
    expect(note).toHaveTextContent(settleLine);
    expect(note).toHaveTextContent(holdLine);
    expect(last().notice).toBe('SETTLE_BEFORE_APPROVAL');
  });

  it('drops the approval line for a slot a Pod Request already confirmed', async () => {
    const { last } = renderStep(physical({ pod_type: 'FREE', pod_amount: 0, partner_request_id: 'req-1' }), [
      { ...slotsMock('venue-partner', 800), request: { query: VENUE_AVAILABLE_SLOTS, variables: { venue_id: 'venue-partner', partner_request_id: 'req-1' } } },
    ]);
    const note = await screen.findByTestId('create-pod-free-note-venue');
    expect(note).toHaveTextContent(settleLine);
    expect(note).not.toHaveTextContent(holdLine);
    expect(last().notice).toBe('SETTLE');
  });

  it('says nothing for a slot priced 0', async () => {
    const { last } = renderStep(physical({ pod_type: 'FREE', pod_amount: 0 }), [slotsMock('venue-partner', 0)]);
    await waitFor(() => expect(last().slotPrice).toBe(0));
    expect(last().notice).toBe('NONE');
    expect(screen.getByTestId('create-pod-free-note')).toBeInTheDocument();
    expect(screen.queryByTestId('create-pod-free-note-venue')).not.toBeInTheDocument();
  });

  it('says nothing for the host own venue, which books instantly', async () => {
    const { last } = renderStep(physical({ pod_type: 'FREE', pod_amount: 0, venue_id: 'venue-own' }), [
      slotsMock('venue-own', 800),
    ]);
    await waitFor(() => expect(last().slotPrice).toBe(800));
    expect(last().notice).toBe('NONE');
    expect(screen.queryByTestId('create-pod-free-note-venue')).not.toBeInTheDocument();
  });

  it('never shows on a paid pod, whatever the slot costs', async () => {
    const { last } = renderStep(physical());
    await waitFor(() => expect(last().slotPrice).toBe(800));
    expect(last().notice).toBe('NONE');
    expect(screen.queryByText(settleLine)).not.toBeInTheDocument();
  });
});
