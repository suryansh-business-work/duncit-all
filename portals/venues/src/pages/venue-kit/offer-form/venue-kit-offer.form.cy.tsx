// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OFFER_FIELDS, VenueKitOfferForm, offerToValues, valuesToOffer, venueKitOfferSchema } from '.';

const OFFER = {
  annual_price_paise: 999_900,
  included_table_labels: 25,
  extra_label_price_paise: 10_000,
  pos_activation_months: 12,
  gift_card_count: 10,
  gift_card_value_paise: 10_000,
  collab_gift_card_discount_pct: 10,
  order_benefit_pct: 1,
};

const echo = ((key: string, options?: { vars?: Record<string, unknown> }) => `${key}:${String(options?.vars?.max)}`) as Parameters<
  typeof venueKitOfferSchema
>[0];
const schema = venueKitOfferSchema(echo);

afterEach(cleanup);

describe('rupees in the form, paise on the wire', () => {
  it('reads the saved plan in rupees', () => {
    expect(offerToValues(OFFER)).toEqual({
      annual_price: 9999,
      included_table_labels: 25,
      extra_label_price: 100,
      pos_activation_months: 12,
      gift_card_count: 10,
      gift_card_value: 100,
      collab_gift_card_discount_pct: 10,
      order_benefit_pct: 1,
    });
  });

  it('round-trips the plan exactly', () => {
    expect(valuesToOffer(schema.parse(offerToValues(OFFER)))).toEqual(OFFER);
  });

  it('sends whole paise even for a typed fraction of a rupee', () => {
    const values = schema.parse({ ...offerToValues(OFFER), order_benefit_pct: '1.25' });
    expect(valuesToOffer({ ...values, annual_price: 9999.996 }).annual_price_paise).toBe(1_000_000);
    expect(valuesToOffer(values).order_benefit_pct).toBe(1.25);
  });
});

describe('venueKitOfferSchema', () => {
  const issueFor = (field: string, value: unknown) => {
    const result = schema.safeParse({ ...offerToValues(OFFER), [field]: value });
    return result.success ? null : result.error.issues[0]?.message;
  };

  it('takes typed text as numbers', () => {
    expect(schema.parse({ ...offerToValues(OFFER), annual_price: '12999' }).annual_price).toBe(12999);
  });

  it('refuses negatives, values over the ceiling and fractions where only whole numbers make sense', () => {
    expect(issueFor('annual_price', -1)).toBe('venueKit.console.fieldInvalid:1000000');
    expect(issueFor('annual_price', 1_000_001)).toBe('venueKit.console.fieldInvalid:1000000');
    expect(issueFor('included_table_labels', 2.5)).toBe('venueKit.console.fieldInvalid:1000');
    expect(issueFor('order_benefit_pct', 101)).toBe('venueKit.console.fieldInvalid:100');
    expect(issueFor('gift_card_count', 'ten')).toBe('venueKit.console.fieldInvalid:1000');
  });

  it('allows a fractional percentage', () => {
    expect(issueFor('collab_gift_card_discount_pct', 12.5)).toBeNull();
  });

  it('covers every field of the plan once', () => {
    expect(OFFER_FIELDS.map((f) => f.name)).toEqual(Object.keys(offerToValues(OFFER)));
  });
});

describe('VenueKitOfferForm', () => {
  const setup = (open = true) => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    const view = render(<VenueKitOfferForm open={open} offer={OFFER} saving={false} onClose={onClose} onSubmit={onSubmit} />);
    return { onSubmit, onClose, view };
  };
  const field = (name: string) => screen.getByTestId(`venue-kit-offer-${name}`) as HTMLInputElement;

  it('opens on the saved plan, in rupees', () => {
    setup();
    expect(field('annual_price').value).toBe('9999');
    expect(field('gift_card_value').value).toBe('100');
  });

  it('saves the edited plan in paise', async () => {
    const { onSubmit } = setup();
    fireEvent.change(field('annual_price'), { target: { value: '11999' } });
    fireEvent.click(screen.getByTestId('venue-kit-offer-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ ...OFFER, annual_price_paise: 1_199_900 }));
  });

  it('shows why a value was refused and saves nothing', async () => {
    const { onSubmit } = setup();
    fireEvent.change(field('order_benefit_pct'), { target: { value: '150' } });
    fireEvent.click(screen.getByTestId('venue-kit-offer-save'));
    expect(await screen.findByText('Enter a number from 0 to 100')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('closes on Cancel', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while closed', () => {
    setup(false);
    expect(screen.queryByTestId('venue-kit-offer-form')).toBeNull();
  });
});
