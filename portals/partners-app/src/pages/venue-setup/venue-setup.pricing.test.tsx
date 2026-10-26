import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { VENUE_PRICING, type VenuePricingData } from '@duncit/availability-calendar';
import FeesPage from './FeesPage';
import PriceRulesPage from './PriceRulesPage';
import { pricingWithPart } from './VenuePricingPartEditor';
import { MY_VENUES } from '../register-venue-page/queries';
import { shapeOf } from '../../__tests__/doc-shape';
import { renderWithProviders } from '../../__tests__/render';
import { recordNotices } from '../../__tests__/groupC-notices';
import { scriptedLink, STAY_PENDING, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';

let notices: ReturnType<typeof recordNotices>;
beforeEach(() => {
  globalThis.localStorage.clear();
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  cleanup();
});

const weekendRule = {
  __typename: 'PriceRule',
  type: 'WEEKDAY_SURCHARGE',
  label: 'Weekend',
  days: [5, 6],
  dates: [],
  from: null,
  to: null,
  mode: 'PERCENT',
  value: 10,
};

const savedPricing = {
  __typename: 'VenuePricing',
  model: 'PER_PAX',
  configured: true,
  base_rate: 300,
  min_pax: 1,
  max_pax: 0,
  min_hours: 1,
  max_hours: 0,
  booking_increment_minutes: 60,
  min_spend: 500,
  slots: [],
  operating_hours: [],
  price_rules: [weekendRule],
  deposit: 100,
  cleaning_fee: 50,
  pet_fee: 25,
  gst_enabled: false,
  blocked_dates: ['2026-12-20'],
};

const pricingData = (over: Record<string, unknown> = {}) =>
  shapeOf(VENUE_PRICING, { venuePricing: { ...savedPricing, ...over } });

const venues = shapeOf(MY_VENUES, {
  myVenues: [{ __typename: 'Venue', id: 'v1', status: 'APPROVED', venue_name: 'Cafe Mocha' }],
});

const mount = (ui: React.ReactElement, answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) =>
  renderWithProviders(ui, {
    route: '/venues/fees',
    link: scriptedLink(
      {
        MyVenues: venues,
        VenuePricingModule: pricingData(),
        UpdateVenuePricing: { updateVenuePricing: { ...savedPricing } },
        ...answers,
      },
      sent,
    ),
  });

/** Types into a fee field and waits for the form to notice it is dirty (Save is disabled until it does). */
const edit = async (label: string, value: string, testId = 'venue-pricing-fees-save') => {
  fireEvent.change(await screen.findByLabelText(label), { target: { value } });
  await waitFor(() => expect(screen.getByTestId(testId).hasAttribute('disabled')).toBe(false));
};

const writes = (sent: SentOperation[]) => sent.filter((op) => op.name === 'UpdateVenuePricing');

describe('pricingWithPart', () => {
  const values = {
    model: 'PER_PAX',
    base_rate: 300,
    min_pax: 1,
    max_pax: 0,
    min_hours: 1,
    max_hours: 0,
    booking_increment_minutes: 60,
    min_spend: 900,
    slots: [],
    custom_hours: false,
    operating_hours: [],
    price_rules: [],
    deposit: 1,
    cleaning_fee: 2,
    pet_fee: 3,
    gst_enabled: true,
    blocked_dates: [],
  } as const;
  const pricing = savedPricing as unknown as VenuePricingData;

  it('replaces only the fee fields on a fees save, sending the saved rules back unchanged', () => {
    const input = pricingWithPart('fees', pricing, values as never);
    expect(input).toMatchObject({ min_spend: 900, deposit: 1, cleaning_fee: 2, pet_fee: 3, gst_enabled: true });
    expect(input.price_rules).toEqual([
      { type: 'WEEKDAY_SURCHARGE', label: 'Weekend', mode: 'PERCENT', value: 10, days: [5, 6], dates: [], from: null, to: null },
    ]);
    expect(input.blocked_dates).toEqual(['2026-12-20']);
  });

  it('replaces only the rules on a rules save, keeping the saved fees', () => {
    const input = pricingWithPart('rules', pricing, values as never);
    expect(input.price_rules).toEqual([]);
    expect(input).toMatchObject({ min_spend: 500, deposit: 100, cleaning_fee: 50, pet_fee: 25, gst_enabled: false });
  });
});

describe('Fees & Minimum Spend page', () => {
  it('saves the changed fee and sends the saved price rules back untouched', async () => {
    const sent: SentOperation[] = [];
    mount(<FeesPage />, {}, sent);
    const save = await screen.findByTestId('venue-pricing-fees-save');
    expect(save.hasAttribute('disabled')).toBe(true);

    await edit('Minimum spend', '750');
    fireEvent.click(screen.getByTestId('pricing-gst'));
    fireEvent.click(save);

    await waitFor(() => expect(notices.notices.map((n) => n.message)).toContain('Saved.'));
    expect(writes(sent)).toHaveLength(1);
    const { venue_id, input } = writes(sent)[0].variables as { venue_id: string; input: Record<string, unknown> };
    expect(venue_id).toBe('v1');
    expect(input).toMatchObject({ min_spend: 750, deposit: 100, cleaning_fee: 50, pet_fee: 25, gst_enabled: true });
    expect(input.price_rules).toEqual([
      { type: 'WEEKDAY_SURCHARGE', label: 'Weekend', mode: 'PERCENT', value: 10, days: [5, 6], dates: [], from: null, to: null },
    ]);
  });

  it('stops a negative fee before it is sent and says why', async () => {
    const sent: SentOperation[] = [];
    mount(<FeesPage />, {}, sent);
    await edit('Minimum spend', '-5');
    fireEvent.click(screen.getByTestId('venue-pricing-fees-save'));
    expect(await screen.findByText('Cannot be negative')).toBeTruthy();
    expect(writes(sent)).toHaveLength(0);
  });

  it('shows the server message when the save is refused', async () => {
    mount(<FeesPage />, { UpdateVenuePricing: new Error('Pricing is locked') });
    await edit('Cleaning fee', '60');
    fireEvent.click(screen.getByTestId('venue-pricing-fees-save'));
    expect(await screen.findByText('Pricing is locked')).toBeTruthy();
    expect(notices.notices).toHaveLength(0);
  });

  it('falls back to its own words when the server gives no message', async () => {
    mount(<FeesPage />, { UpdateVenuePricing: new Error('') });
    await edit('Cleaning fee', '60');
    fireEvent.click(screen.getByTestId('venue-pricing-fees-save'));
    expect(await screen.findByText('Could not save. Try again.')).toBeTruthy();
  });

  it('shows a spinner while the pricing loads', async () => {
    mount(<FeesPage />, { VenuePricingModule: STAY_PENDING });
    expect(await screen.findByRole('progressbar')).toBeTruthy();
    expect(screen.queryByTestId('venue-pricing-fees')).toBeNull();
  });

  it('says the venue could not be loaded when the pricing read fails', async () => {
    mount(<FeesPage />, { VenuePricingModule: new Error('down') });
    expect(await screen.findByText('Could not load this venue. Try again.')).toBeTruthy();
  });
});

describe('Price Rules page', () => {
  it('lists the saved rule and saves a removal with the saved fees untouched', async () => {
    const sent: SentOperation[] = [];
    mount(<PriceRulesPage />, {}, sent);
    expect(await screen.findByTestId('pricing-rule-0')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove rule 1' }));
    fireEvent.click(screen.getByTestId('venue-pricing-rules-save'));

    await waitFor(() => expect(writes(sent)).toHaveLength(1));
    const { input } = writes(sent)[0].variables as { input: Record<string, unknown> };
    expect(input.price_rules).toEqual([]);
    expect(input).toMatchObject({ min_spend: 500, deposit: 100, cleaning_fee: 50, pet_fee: 25 });
  });

  it('points at a new weekday rule that names no day and sends nothing', async () => {
    const sent: SentOperation[] = [];
    mount(<PriceRulesPage />, {}, sent);
    await screen.findByTestId('pricing-rule-0');
    fireEvent.click(screen.getByTestId('pricing-rule-add'));
    fireEvent.click(screen.getByTestId('venue-pricing-rules-save'));
    expect(await screen.findByText('Pick at least one day')).toBeTruthy();
    expect(writes(sent)).toHaveLength(0);
  });
});
