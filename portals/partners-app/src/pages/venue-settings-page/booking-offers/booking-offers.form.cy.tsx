import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import BookingOffersForm from './booking-offers.form';
import {
  BOOKING_OFFER_LIMITS,
  makeBookingOffersSchema,
  toBookingOffersInput,
  toBookingOffersValues,
} from './booking-offers.schema';
import type { BookingOffersValues } from './booking-offers.types';
import { renderWithProviders } from '../../../__tests__/render';

/** Reads the key and its vars back, so a message names the rule it came from. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key;
const schema = makeBookingOffersSchema(t);

const PER_GUEST_200 = [{ model: 'PER_GUEST', amount: '200' }];
const AMOUNT_INVALID = 'availability.offers.minBusiness.amountInvalid({"max":10000000})';

/** The two numbers with a valid business row, unless the case says otherwise. */
const values = (over: Partial<BookingOffersValues> = {}): BookingOffersValues => ({
  min_guests: '8',
  response_hours: '24',
  min_business: PER_GUEST_200,
  ...over,
});

const errorsOf = (input: BookingOffersValues) => {
  const result = schema.safeParse(input);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
};

describe('makeBookingOffersSchema', () => {
  it('matches the server bounds', () => {
    expect(BOOKING_OFFER_LIMITS).toEqual({ minGuestsMax: 1000, responseHoursMax: 720, amountMax: 10_000_000 });
  });

  // 0 (and an empty box) leaves it to Duncit's default.
  it.each([
    [{ min_guests: '0', response_hours: '0' }],
    [{ min_guests: '', response_hours: '' }],
    [{ min_guests: '1000', response_hours: '720' }],
    [{ min_guests: ' 12 ', response_hours: '48' }],
  ])('accepts %j', (over) => {
    expect(errorsOf(values(over))).toEqual({});
  });

  it.each([['1001'], ['-1'], ['2.5'], ['ten']])('refuses %j minimum guests', (min_guests) => {
    expect(errorsOf(values({ min_guests }))).toEqual({
      min_guests: 'venueSettings.offers.minGuestsInvalid({"max":1000})',
    });
  });

  it.each([['721'], ['-1'], ['1.5'], ['soon']])('refuses %j response hours', (response_hours) => {
    expect(errorsOf(values({ response_hours }))).toEqual({
      response_hours: 'venueSettings.offers.responseHoursInvalid({"max":720})',
    });
  });

  it('takes one amount on each basis, decimals and the ceiling included', () => {
    expect(
      errorsOf(
        values({
          min_business: [
            { model: 'PER_GUEST', amount: ' 250 ' },
            { model: 'PER_HOUR', amount: '99.5' },
            { model: 'FLAT', amount: '10000000' },
          ],
        }),
      ),
    ).toEqual({});
  });

  it('asks for at least one amount', () => {
    expect(errorsOf(values({ min_business: [] }))).toEqual({ min_business: 'availability.offers.minBusiness.required' });
  });

  it.each([[''], ['0'], ['-5'], ['abc'], ['10000001']])('refuses an amount of %j', (amount) => {
    expect(errorsOf(values({ min_business: [{ model: 'PER_GUEST', amount }] }))).toEqual({
      'min_business.0.amount': AMOUNT_INVALID,
    });
  });

  // PER_SLOT was retired: a venue names business per guest, per hour or per booking.
  it.each([['PER_SLOT'], ['']])('refuses a basis of %j', (model) => {
    expect(errorsOf(values({ min_business: [{ model, amount: '200' }] }))).toEqual({
      'min_business.0.model': 'availability.offers.minBusiness.modelRequired',
    });
  });

  it('refuses the same basis twice, on the later row', () => {
    const twice = [...PER_GUEST_200, { model: 'PER_HOUR', amount: '400' }, { model: 'PER_GUEST', amount: '300' }];
    expect(errorsOf(values({ min_business: twice }))).toEqual({
      'min_business.2.model': 'availability.offers.minBusiness.duplicate',
    });
  });
});

describe('booking offers mappers', () => {
  it('reads the stored settings as the form values, amounts as text', () => {
    expect(
      toBookingOffersValues({ min_guests: 12, response_hours: 48, min_business: [{ model: 'FLAT', amount: 5000 }] }),
    ).toEqual({ min_guests: '12', response_hours: '48', min_business: [{ model: 'FLAT', amount: '5000' }] });
  });

  // Nothing stored reads as 0 (the default), and no amounts as one empty row to fill.
  it.each([[null], [undefined], [{ min_guests: 3, response_hours: 6 }], [{ min_guests: 3, response_hours: 6, min_business: [] }]])(
    'starts %j on one empty per-guest row',
    (stored) => {
      expect(toBookingOffersValues(stored).min_business).toEqual([{ model: 'PER_GUEST', amount: '' }]);
    },
  );

  it('reads nothing stored as 0', () => {
    expect(toBookingOffersValues(null)).toMatchObject({ min_guests: '0', response_hours: '0' });
  });

  it('sends whole numbers, an empty box as 0, and every amount as a number', () => {
    expect(
      toBookingOffersInput({
        min_guests: '12',
        response_hours: '',
        min_business: [
          { model: 'PER_GUEST', amount: '200' },
          { model: 'PER_HOUR', amount: '99.5' },
        ],
      }),
    ).toEqual({
      min_guests: 12,
      response_hours: 0,
      min_business: [
        { model: 'PER_GUEST', amount: 200 },
        { model: 'PER_HOUR', amount: 99.5 },
      ],
    });
  });
});

describe('BookingOffersForm', () => {
  afterEach(cleanup);

  const mountForm = (over: Partial<Parameters<typeof BookingOffersForm>[0]> = {}) => {
    const props = {
      initialValues: { min_guests: '0', response_hours: '0', min_business: PER_GUEST_200 },
      effective: { min_guests: 8, response_hours: 24 },
      saving: false,
      error: null,
      onSubmit: vi.fn(async () => undefined),
      ...over,
    };
    renderWithProviders(<BookingOffersForm {...props} />);
    return props;
  };

  it('submits the typed values with the business amounts', async () => {
    const props = mountForm();
    fireEvent.change(screen.getByLabelText('Minimum guests'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save booking offers' }));
    await waitFor(() =>
      expect(props.onSubmit).toHaveBeenCalledWith({
        min_guests: '10',
        response_hours: '0',
        min_business: [{ model: 'PER_GUEST', amount: '250' }],
      }),
    );
  });

  it('names the business it asks for, and adds the next basis not listed yet', async () => {
    mountForm();
    const business = within(screen.getByTestId('booking-offers-min-business'));
    expect(business.getByRole('heading', { name: 'Business you expect per booking' })).toBeTruthy();
    fireEvent.click(business.getByRole('button', { name: 'Add amount' }));
    const second = within(await screen.findByTestId('booking-offers-min-business-row-1'));
    expect(second.getByRole('combobox').textContent).toBe('Per hour');
  });

  it('does not submit without an amount, and says why', async () => {
    const props = mountForm({ initialValues: { min_guests: '0', response_hours: '0', min_business: [{ model: 'PER_GUEST', amount: '' }] } });
    fireEvent.click(screen.getByRole('button', { name: 'Save booking offers' }));
    expect(await screen.findByText(/^Enter an amount above 0, up to /)).toBeTruthy();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('locks every field while saving and shows the server error it is given', () => {
    mountForm({ saving: true, error: 'Venue is suspended' });
    expect((screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toBe('Venue is suspended');
    expect((screen.getByLabelText('Amount (₹)') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Add amount' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
