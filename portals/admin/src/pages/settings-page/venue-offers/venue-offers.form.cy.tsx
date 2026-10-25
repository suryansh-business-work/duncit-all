import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import VenueOffersForm from './venue-offers.form';
import {
  VENUE_OFFER_DEFAULT_LIMITS,
  makeVenueOffersSchema,
  toVenueOffersInput,
  toVenueOffersValues,
} from './venue-offers.schema';
import type { VenueOfferDefaultsValues } from './venue-offers.types';

/** Reads the key and its vars back, so a message names the rule it came from. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key;
const schema = makeVenueOffersSchema(t);

const values = (minGuests: string, hours: string): VenueOfferDefaultsValues => ({
  venue_offer_min_guests_default: minGuests,
  venue_offer_response_hours_default: hours,
});
const errorsOf = (input: VenueOfferDefaultsValues) => {
  const result = schema.safeParse(input);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
};

describe('makeVenueOffersSchema', () => {
  it('matches the server bounds', () => {
    expect(VENUE_OFFER_DEFAULT_LIMITS).toEqual({ minGuests: { min: 1, max: 1000 }, responseHours: { min: 1, max: 720 } });
  });

  it.each([
    ['1', '1'],
    ['8', '24'],
    ['1000', '720'],
    [' 12 ', '48'],
  ])('accepts %j guests and %j hours', (minGuests, hours) => {
    expect(errorsOf(values(minGuests, hours))).toEqual({});
  });

  // A default of 0 would mean "no minimum" / "never expires" for every venue that relies on it.
  it.each([['0'], ['1001'], ['2.5'], ['-1'], ['']])('refuses %j minimum guests', (minGuests) => {
    expect(errorsOf(values(minGuests, '24'))).toEqual({
      venue_offer_min_guests_default: 'admin.venueOfferSettings.minGuestsInvalid({"min":1,"max":1000})',
    });
  });

  it.each([['0'], ['721'], ['1.5'], ['']])('refuses %j response hours', (hours) => {
    expect(errorsOf(values('8', hours))).toEqual({
      venue_offer_response_hours_default: 'admin.venueOfferSettings.responseHoursInvalid({"min":1,"max":720})',
    });
  });
});

describe('venue offer default mappers', () => {
  it('maps the stored numbers to the form and back', () => {
    const stored = { venue_offer_min_guests_default: 8, venue_offer_response_hours_default: 24 };
    expect(toVenueOffersValues(stored)).toEqual(values('8', '24'));
    expect(toVenueOffersInput(values('10', '48'))).toEqual({
      venue_offer_min_guests_default: 10,
      venue_offer_response_hours_default: 48,
    });
  });
});

describe('VenueOffersForm', () => {
  const renderForm = (over: Partial<Parameters<typeof VenueOffersForm>[0]> = {}) => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<VenueOffersForm initialValues={values('8', '24')} saving={false} error={null} onSubmit={onSubmit} {...over} />);
    return onSubmit;
  };

  it('submits the edited defaults', async () => {
    const onSubmit = renderForm();
    fireEvent.change(screen.getByRole('spinbutton', { name: /Minimum guests/ }), { target: { value: '12' } });
    fireEvent.click(screen.getByTestId('save-venue-offers'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(values('12', '24')));
  });

  it('shows the saving state and the server error', () => {
    renderForm({ saving: true, error: 'Settings are locked' });
    expect(screen.getByTestId('save-venue-offers')).toBeDisabled();
    expect(screen.getByTestId('save-venue-offers')).toHaveTextContent('Saving…');
    expect(screen.getByRole('alert')).toHaveTextContent('Settings are locked');
  });
});
