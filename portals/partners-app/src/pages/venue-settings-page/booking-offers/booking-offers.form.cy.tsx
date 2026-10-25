import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
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
    [{ min_guests: ' 12 ', response_hours: '48' }],
  ])('accepts %j', (values) => {
    expect(errorsOf(values)).toEqual({});
  });

  it.each([['1001'], ['-1'], ['2.5'], ['ten']])('refuses %j minimum guests', (min_guests) => {
    expect(errorsOf({ min_guests, response_hours: '24' })).toEqual({
      min_guests: 'venueSettings.offers.minGuestsInvalid({"max":1000})',
    });
  });

  it.each([['721'], ['-1'], ['1.5'], ['soon']])('refuses %j response hours', (response_hours) => {
    expect(errorsOf({ min_guests: '8', response_hours })).toEqual({
      response_hours: 'venueSettings.offers.responseHoursInvalid({"max":720})',
    });
  });
});

describe('booking offers mappers', () => {
  it('reads the stored numbers as the form values, and nothing stored as 0', () => {
    expect(toBookingOffersValues({ min_guests: 12, response_hours: 48 })).toEqual({ min_guests: '12', response_hours: '48' });
    expect(toBookingOffersValues(null)).toEqual({ min_guests: '0', response_hours: '0' });
    expect(toBookingOffersValues(undefined)).toEqual({ min_guests: '0', response_hours: '0' });
  });

  it('sends whole numbers, an empty box as 0', () => {
    expect(toBookingOffersInput({ min_guests: '12', response_hours: '48' })).toEqual({ min_guests: 12, response_hours: 48 });
    expect(toBookingOffersInput({ min_guests: '', response_hours: '' })).toEqual({ min_guests: 0, response_hours: 0 });
  });
});

describe('BookingOffersForm', () => {
  afterEach(cleanup);

  const mountForm = (over: Partial<Parameters<typeof BookingOffersForm>[0]> = {}) => {
    const props = {
      initialValues: { min_guests: '0', response_hours: '0' },
      effective: { min_guests: 8, response_hours: 24 },
      saving: false,
      error: null,
      onSubmit: vi.fn(async () => undefined),
      ...over,
    };
    renderWithProviders(<BookingOffersForm {...props} />);
    return props;
  };

  it('submits the typed values', async () => {
    const props = mountForm();
    fireEvent.change(screen.getByLabelText('Minimum guests'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save booking offers' }));
    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledWith({ min_guests: '10', response_hours: '0' }));
  });

  it('shows the saving state and the server error it is given', () => {
    mountForm({ saving: true, error: 'Venue is suspended' });
    expect((screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toBe('Venue is suspended');
  });
});
