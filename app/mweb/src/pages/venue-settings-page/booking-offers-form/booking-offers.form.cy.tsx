import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import BookingOffersForm from './booking-offers.form';
import {
  BOOKING_OFFER_LIMITS,
  makeBookingOffersSchema,
  toBookingOffersInput,
  toBookingOffersValues,
  type BookingOffersValues,
} from './booking-offers.types';

afterEach(cleanup);

/** Reads the key and its vars back, so a message names the rule it came from. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key;
const schema = makeBookingOffersSchema(t);

const errorsOf = (values: BookingOffersValues) => {
  const result = schema.safeParse(values);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
};

/** One amount the venue hopes for, so the guests and hours rules are read on their own. */
const PER_GUEST_200 = [{ model: 'PER_GUEST', amount: '200' }];
const offers = (over: Partial<BookingOffersValues> = {}): BookingOffersValues => ({
  min_guests: '8',
  response_hours: '24',
  min_business: PER_GUEST_200,
  ...over,
});

describe('makeBookingOffersSchema', () => {
  it('matches the server bounds', () => {
    expect(BOOKING_OFFER_LIMITS).toEqual({ minGuestsMax: 1000, responseHoursMax: 720, amountMax: 10_000_000 });
  });

  // 0 (and an empty box) leaves it to Duncit's default.
  it.each([
    [{ min_guests: '0', response_hours: '0' }],
    [{ min_guests: '', response_hours: '' }],
    [{ min_guests: '1000', response_hours: '720' }],
  ])('accepts %j', (values) => {
    expect(errorsOf(offers(values))).toEqual({});
  });

  it.each([['1001'], ['-1'], ['2.5'], ['ten']])('refuses %j minimum guests', (min_guests) => {
    expect(errorsOf(offers({ min_guests }))).toEqual({
      min_guests: 'venueSettings.offers.minGuestsInvalid({"max":1000})',
    });
  });

  it.each([['721'], ['-1'], ['1.5']])('refuses %j response hours', (response_hours) => {
    expect(errorsOf(offers({ response_hours }))).toEqual({
      response_hours: 'venueSettings.offers.responseHoursInvalid({"max":720})',
    });
  });

  it('takes one amount per basis, up to all three, in rupees and paise', () => {
    expect(
      errorsOf(
        offers({
          min_business: [
            { model: 'PER_GUEST', amount: '199.50' },
            { model: 'PER_HOUR', amount: '400' },
            { model: 'FLAT', amount: '10000000' },
          ],
        }),
      ),
    ).toEqual({});
  });

  it('asks for at least one amount', () => {
    expect(errorsOf(offers({ min_business: [] }))).toEqual({ min_business: 'availability.offers.minBusiness.required' });
  });

  it.each([[''], ['0'], ['-5'], ['10000001'], ['lots']])('refuses an amount of %j', (amount) => {
    expect(errorsOf(offers({ min_business: [{ model: 'PER_HOUR', amount }] }))).toEqual({
      'min_business.0.amount': 'availability.offers.minBusiness.amountInvalid({"max":10000000})',
    });
  });

  it('refuses a basis the server does not know, and the same basis twice', () => {
    expect(errorsOf(offers({ min_business: [{ model: 'PER_SLOT', amount: '500' }] }))).toEqual({
      'min_business.0.model': 'availability.offers.minBusiness.modelRequired',
    });
    expect(
      errorsOf(
        offers({
          min_business: [
            { model: 'FLAT', amount: '500' },
            { model: 'FLAT', amount: '700' },
          ],
        }),
      ),
    ).toEqual({ 'min_business.1.model': 'availability.offers.minBusiness.duplicate' });
  });
});

describe('booking offers mappers', () => {
  it('reads the stored numbers and amounts, and nothing stored as 0 with one empty amount to fill', () => {
    expect(
      toBookingOffersValues({ min_guests: 12, response_hours: 48, min_business: [{ model: 'PER_HOUR', amount: 400 }] }),
    ).toEqual({ min_guests: '12', response_hours: '48', min_business: [{ model: 'PER_HOUR', amount: '400' }] });
    const blank = { min_guests: '0', response_hours: '0', min_business: [{ model: 'PER_GUEST', amount: '' }] };
    expect(toBookingOffersValues(null)).toEqual(blank);
    // A record saved before the amounts existed.
    expect(toBookingOffersValues({ min_guests: 0, response_hours: 0, min_business: null })).toEqual(blank);
  });

  it('sends whole numbers, an empty box as 0, and each amount as a number', () => {
    expect(toBookingOffersInput(offers({ min_guests: '12', response_hours: '48', min_business: [{ model: 'FLAT', amount: '5000.50' }] }))).toEqual({
      min_guests: 12,
      response_hours: 48,
      min_business: [{ model: 'FLAT', amount: 5000.5 }],
    });
    expect(toBookingOffersInput(offers({ min_guests: '', response_hours: '' }))).toEqual({
      min_guests: 0,
      response_hours: 0,
      min_business: [{ model: 'PER_GUEST', amount: 200 }],
    });
  });
});

describe('BookingOffersForm', () => {
  const renderForm = (over: Partial<Parameters<typeof BookingOffersForm>[0]> = {}) => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <BookingOffersForm
        initialValues={{ min_guests: '0', response_hours: '0', min_business: PER_GUEST_200 }}
        effective={{ min_guests: 8, response_hours: 24 }}
        saving={false}
        error={null}
        onSubmit={onSubmit}
        {...over}
      />,
    );
    return onSubmit;
  };
  const field = (testId: string) => within(screen.getByTestId(testId)).getByRole('spinbutton');
  const row = (index: number) => screen.queryByTestId(`booking-offers-min-business-row-${index}`);
  const save = () => fireEvent.click(screen.getByTestId('booking-offers-save'));

  it('says what 0 means right now under each field, and what the amounts are for', () => {
    renderForm();
    expect(screen.getByText('0 uses Duncit’s default. In effect now: 8 guests.')).toBeInTheDocument();
    expect(screen.getByText('0 uses Duncit’s default. In effect now: 24 hours.')).toBeInTheDocument();
    expect(screen.getByText('Business you expect per booking')).toBeInTheDocument();
    expect(screen.getByText(/it is a guide for their offer, not a rule/)).toBeInTheDocument();
  });

  it('submits the typed values with the amounts', async () => {
    const onSubmit = renderForm();
    fireEvent.change(field('booking-offers-min-guests'), { target: { value: '12' } });
    fireEvent.change(field('booking-offers-response-hours'), { target: { value: '48' } });
    fireEvent.change(within(row(0) as HTMLElement).getByRole('spinbutton'), { target: { value: '250' } });
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      min_guests: '12',
      response_hours: '48',
      min_business: [{ model: 'PER_GUEST', amount: '250' }],
    });
  });

  it('adds the next basis not listed, up to one per basis, and removes down to one', async () => {
    const onSubmit = renderForm();
    // One row cannot be removed: at least one amount is asked for.
    expect(screen.getByTestId('booking-offers-min-business-remove-0')).toBeDisabled();

    fireEvent.click(screen.getByTestId('booking-offers-min-business-add'));
    expect(within(row(1) as HTMLElement).getByRole('combobox')).toHaveTextContent('Per hour');
    fireEvent.click(screen.getByTestId('booking-offers-min-business-add'));
    expect(within(row(2) as HTMLElement).getByRole('combobox')).toHaveTextContent('Per booking');
    // Every basis is listed: nothing more to add.
    expect(screen.queryByTestId('booking-offers-min-business-add')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('booking-offers-min-business-remove-1'));
    fireEvent.change(within(row(1) as HTMLElement).getByRole('spinbutton'), { target: { value: '5000' } });
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].min_business).toEqual([
      { model: 'PER_GUEST', amount: '200' },
      { model: 'FLAT', amount: '5000' },
    ]);
  });

  it('refuses an out-of-range value and does not submit', async () => {
    const onSubmit = renderForm();
    fireEvent.change(field('booking-offers-response-hours'), { target: { value: '721' } });
    save();
    expect(await screen.findByText('Enter a whole number of hours from 0 to 720')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses a missing amount and does not submit', async () => {
    const onSubmit = renderForm({ initialValues: { min_guests: '0', response_hours: '0', min_business: [{ model: 'PER_GUEST', amount: '' }] } });
    save();
    expect(await screen.findByText(/^Enter an amount above 0, up to/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the saving state and the server error it is given, with the amounts locked', () => {
    renderForm({ saving: true, error: 'Venue is suspended' });
    expect(screen.getByTestId('booking-offers-save')).toBeDisabled();
    expect(screen.getByTestId('booking-offers-min-business-add')).toBeDisabled();
    expect(within(row(0) as HTMLElement).getByRole('spinbutton')).toBeDisabled();
    expect(screen.getByTestId('booking-offers-error')).toHaveTextContent('Venue is suspended');
  });
});
