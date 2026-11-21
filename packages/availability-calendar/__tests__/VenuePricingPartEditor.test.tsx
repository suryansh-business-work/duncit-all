import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { notifySuccess } from '@duncit/dialogs';
import VenuePricingPartEditor, { pricingWithPart, type PricingPart } from '../src/pricing/VenuePricingPartEditor';
import { toFormValues } from '../src/pricing/form';
import { UPDATE_VENUE_PRICING, VENUE_PRICING } from '../src/pricing/queries';
import { makePricing, pricingResult } from './pricing-fixtures';

vi.mock('@mui/x-date-pickers/DatePicker', async () => ({ DatePicker: (await import('./picker-stub')).PickerStub }));
vi.mock('@mui/x-date-pickers/TimePicker', async () => ({ TimePicker: (await import('./picker-stub')).PickerStub }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<object>()), notifySuccess: vi.fn() }));

const VENUE_ID = 'venue-1';
const weekend = { type: 'WEEKDAY_SURCHARGE' as const, label: 'Weekend', days: [0, 6], dates: [], from: null, to: null, mode: 'PERCENT' as const, value: 10 };
const saved = makePricing({ deposit: 100, cleaning_fee: 50, pet_fee: 25, price_rules: [weekend], blocked_dates: ['2026-12-20'] });

const pricingMock = (delay?: number): MockedResponse => ({
  request: { query: VENUE_PRICING, variables: { venue_id: VENUE_ID } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  delay,
  result: { data: { venuePricing: pricingResult(saved) } },
});

const saveMock = (sent: Record<string, unknown>[], error?: Error): MockedResponse => ({
  request: { query: UPDATE_VENUE_PRICING, variables: () => true },
  ...(error
    ? { error }
    : {
        result: (variables: Record<string, unknown>) => {
          sent.push(variables);
          return { data: { updateVenuePricing: pricingResult({ ...saved, cleaning_fee: 75 }) } };
        },
      }),
});

const mount = (part: PricingPart, mocks: MockedResponse[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <VenuePricingPartEditor venueId={VENUE_ID} part={part} />
    </MockedProvider>,
  );

/** Types into a fee and waits for Save to wake (it stays off until something changed). */
const edit = async (label: string, value: string) => {
  fireEvent.change(await screen.findByLabelText(label), { target: { value } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
};

beforeEach(() => vi.mocked(notifySuccess).mockClear());

describe('pricingWithPart', () => {
  const values = { ...toFormValues(saved), deposit: 1, cleaning_fee: 2, pet_fee: 3, gst_enabled: true, price_rules: [] };

  it('replaces only the fees on a fees save, sending the saved rules and dates back unchanged', () => {
    const input = pricingWithPart('fees', saved, values);
    expect(input).toMatchObject({ deposit: 1, cleaning_fee: 2, pet_fee: 3, gst_enabled: true, blocked_dates: ['2026-12-20'] });
    expect(input.price_rules).toHaveLength(1);
    expect(input).not.toHaveProperty('min_spend');
  });

  it('replaces only the rules on a rules save, keeping the saved fees', () => {
    const input = pricingWithPart('rules', saved, values);
    expect(input.price_rules).toEqual([]);
    expect(input).toMatchObject({ deposit: 100, cleaning_fee: 50, pet_fee: 25, gst_enabled: false });
  });
});

describe('VenuePricingPartEditor', () => {
  it('shows a loader until the saved pricing arrives', () => {
    mount('fees', [pricingMock(60_000)]);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.queryByTestId('venue-pricing-fees')).not.toBeInTheDocument();
  });

  it('says the venue could not be loaded when the read fails', async () => {
    mount('fees', [{ request: { query: VENUE_PRICING, variables: { venue_id: VENUE_ID } }, result: { errors: [new GraphQLError('Not your venue')] } }]);
    expect(await screen.findByText('Could not load this venue. Try again.')).toBeInTheDocument();
  });

  it('saves the changed fee with the rest of the pricing as saved, and says so', async () => {
    const sent: Record<string, unknown>[] = [];
    mount('fees', [pricingMock(), saveMock(sent)]);
    await edit('Cleaning fee', '75');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Saved.'));
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ venue_id: VENUE_ID, input: { cleaning_fee: 75, deposit: 100, pet_fee: 25, blocked_dates: ['2026-12-20'] } });
    expect((sent[0].input as { price_rules: unknown[] }).price_rules).toHaveLength(1);
  });

  it('stops a negative fee before it is sent', async () => {
    const sent: Record<string, unknown>[] = [];
    mount('fees', [pricingMock(), saveMock(sent)]);
    await edit('Cleaning fee', '-5');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Cannot be negative')).toBeInTheDocument();
    expect(sent).toHaveLength(0);
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('shows the server’s refusal, or its own words when the server gives none', async () => {
    const first = mount('fees', [pricingMock(), saveMock([], new Error('Pricing is locked'))]);
    await edit('Cleaning fee', '60');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Pricing is locked')).toBeInTheDocument();
    first.unmount();

    mount('fees', [pricingMock(), saveMock([], new Error(''))]);
    await edit('Cleaning fee', '60');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Could not save. Try again.')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('draws the price rules, not the fees, for the rules part', async () => {
    mount('rules', [pricingMock()]);
    expect(await screen.findByTestId('venue-pricing-rules')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cleaning fee')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
