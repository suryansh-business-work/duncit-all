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

describe('makeBookingOffersSchema', () => {
  it('matches the server bounds', () => {
    expect(BOOKING_OFFER_LIMITS).toEqual({ minGuestsMax: 1000, responseHoursMax: 720 });
  });

  // 0 (and an empty box) leaves it to Duncit's default.
  it.each([
    [{ min_guests: '0', response_hours: '0' }],
    [{ min_guests: '', response_hours: '' }],
    [{ min_guests: '1000', response_hours: '720' }],
  ])('accepts %j', (values) => {
    expect(errorsOf(values)).toEqual({});
  });

  it.each([['1001'], ['-1'], ['2.5'], ['ten']])('refuses %j minimum guests', (min_guests) => {
    expect(errorsOf({ min_guests, response_hours: '24' })).toEqual({
      min_guests: 'venueSettings.offers.minGuestsInvalid({"max":1000})',
    });
  });

  it.each([['721'], ['-1'], ['1.5']])('refuses %j response hours', (response_hours) => {
    expect(errorsOf({ min_guests: '8', response_hours })).toEqual({
      response_hours: 'venueSettings.offers.responseHoursInvalid({"max":720})',
    });
  });
});

describe('booking offers mappers', () => {
  it('reads the stored numbers, and nothing stored as 0', () => {
    expect(toBookingOffersValues({ min_guests: 12, response_hours: 48 })).toEqual({ min_guests: '12', response_hours: '48' });
    expect(toBookingOffersValues(null)).toEqual({ min_guests: '0', response_hours: '0' });
  });

  it('sends whole numbers, an empty box as 0', () => {
    expect(toBookingOffersInput({ min_guests: '12', response_hours: '48' })).toEqual({ min_guests: 12, response_hours: 48 });
    expect(toBookingOffersInput({ min_guests: '', response_hours: '' })).toEqual({ min_guests: 0, response_hours: 0 });
  });
});

describe('BookingOffersForm', () => {
  const renderForm = (over: Partial<Parameters<typeof BookingOffersForm>[0]> = {}) => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <BookingOffersForm
        initialValues={{ min_guests: '0', response_hours: '0' }}
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

  it('says what 0 means right now under each field', () => {
    renderForm();
    expect(screen.getByText('0 uses Duncit’s default. In effect now: 8 guests.')).toBeInTheDocument();
    expect(screen.getByText('0 uses Duncit’s default. In effect now: 24 hours.')).toBeInTheDocument();
  });

  it('submits the typed values', async () => {
    const onSubmit = renderForm();
    fireEvent.change(field('booking-offers-min-guests'), { target: { value: '12' } });
    fireEvent.change(field('booking-offers-response-hours'), { target: { value: '48' } });
    fireEvent.click(screen.getByTestId('booking-offers-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ min_guests: '12', response_hours: '48' }));
  });

  it('refuses an out-of-range value and does not submit', async () => {
    const onSubmit = renderForm();
    fireEvent.change(field('booking-offers-response-hours'), { target: { value: '721' } });
    fireEvent.click(screen.getByTestId('booking-offers-save'));
    expect(await screen.findByText('Enter a whole number of hours from 0 to 720')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the saving state and the server error it is given', () => {
    renderForm({ saving: true, error: 'Venue is suspended' });
    expect(screen.getByTestId('booking-offers-save')).toBeDisabled();
    expect(screen.getByTestId('booking-offers-error')).toHaveTextContent('Venue is suspended');
  });
});
