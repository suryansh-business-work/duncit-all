import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import PriceBreakdownView from '../src/pricing/preview/PriceBreakdownView';
import type { PriceBreakdown } from '../src/pricing/types';
import { makeBreakdown } from './pricing-fixtures';

const line = (id: string) => {
  const row = screen.getByTestId(`price-line-${id}`);
  const [label, amount] = Array.from(row.children).map((el) => el.textContent);
  return { label, amount };
};
const lineIds = () =>
  Array.from(within(screen.getByTestId('price-breakdown')).queryAllByTestId(/^price-line-/)).map((el) =>
    el.getAttribute('data-testid')?.replace('price-line-', ''),
  );

describe('PriceBreakdownView', () => {
  it('draws every line of a full quote in order, with Duncit’s fee on top of what the venue receives', () => {
    const breakdown = makeBreakdown({
      rules: [
        { type: 'WEEKDAY_SURCHARGE', label: 'Weekend', mode: 'PERCENT', value: 20, amount: 1200 },
        { type: 'DATE_RANGE', label: 'Off season', mode: 'FLAT', value: -500, amount: -500 },
      ],
      rules_total: 700,
      min_spend_top_up: 300,
      cleaning_fee: 500,
      pet_fee: 250,
      venue_price: 7750,
      gst_pct: 18,
      taxes: 1395,
      venue_payout: 9145,
      platform_fee_pct: 10,
      platform_fee: 914.5,
      total: 10059.5,
      deposit: 2000,
    });
    render(<PriceBreakdownView breakdown={breakdown} />);

    expect(lineIds()).toEqual(['base', 'rule-0', 'rule-1', 'adjusted', 'min-spend', 'cleaning', 'pet', 'venue-price', 'gst', 'payout', 'fee', 'total', 'deposit']);
    expect(line('base')).toEqual({ label: '20 guests × ₹300', amount: '₹6,000' });
    expect(line('rule-0')).toEqual({ label: 'Weekend +20%', amount: '+₹1,200' });
    expect(line('rule-1')).toEqual({ label: 'Off season -₹500', amount: '-₹500' });
    expect(line('adjusted')).toEqual({ label: 'After price rules', amount: '₹6,700' });
    expect(line('min-spend')).toEqual({ label: 'Minimum spend top-up', amount: '+₹300' });
    expect(line('cleaning')).toEqual({ label: 'Cleaning fee', amount: '+₹500' });
    expect(line('pet')).toEqual({ label: 'Pet fee', amount: '+₹250' });
    expect(line('venue-price')).toEqual({ label: 'Venue price', amount: '₹7,750' });
    expect(line('gst')).toEqual({ label: 'GST 18%', amount: '+₹1,395' });
    expect(line('payout')).toEqual({ label: 'You receive', amount: '₹9,145' });
    expect(line('fee')).toEqual({ label: "Duncit fee 10% (added on top, paid from the host's share)", amount: '₹914.50' });
    expect(line('total')).toEqual({ label: 'Total', amount: '₹10,059.50' });
    expect(line('deposit')).toEqual({ label: 'Refundable deposit, paid at the venue', amount: '₹2,000' });
  });

  it('leaves out the lines a plain quote does not have', () => {
    render(<PriceBreakdownView breakdown={makeBreakdown()} />);
    expect(lineIds()).toEqual(['base', 'venue-price', 'payout', 'fee', 'total']);
    expect(line('total').amount).toBe('₹6,600');
  });

  it('floors the subtotal at zero when discounts outweigh the base', () => {
    const breakdown = makeBreakdown({
      base: 100,
      rules: [{ type: 'DATE_OVERRIDE', label: 'Free day', mode: 'FLAT', value: -200, amount: -200 }],
      rules_total: -200,
    });
    render(<PriceBreakdownView breakdown={breakdown} />);
    expect(line('adjusted').amount).toBe('₹0');
  });

  it.each<[PriceBreakdown['model'], Partial<PriceBreakdown>, string]>([
    ['PER_HOUR', { rate: 1000, hours: 3, base: 3000 }, '3 h × ₹1,000'],
    ['PER_SLOT', { rate: 800, base: 800 }, 'Slot price'],
    ['FLAT', { rate: 5000, base: 5000 }, 'Flat price'],
  ])('explains a %s base', (model, over, label) => {
    render(<PriceBreakdownView breakdown={makeBreakdown({ model, ...over })} />);
    expect(line('base').label).toBe(label);
  });
});
