import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import EcommStatCards, { ecommStatCards, emptyEcommStats } from './EcommStatCards';
import type { PartnerEcommStats } from './ecomm-dashboard.queries';

afterEach(cleanup);

const stats: PartnerEcommStats = {
  total_brands: 3,
  approved_brands: 2,
  total_products: 14,
  approved_products: 9,
  total_warehouses: 4,
  total_orders: 27,
  total_items_sold: 61,
  gross_revenue: 125000,
};

describe('ecommStatCards', () => {
  it('maps the stats payload into six labelled cards with approved captions', () => {
    const cards = ecommStatCards(stats);
    expect(cards.map((card) => card.label)).toEqual([
      'Total Brands',
      'Total Products',
      'Total Warehouses',
      'Total Orders',
      'Total Items Sold',
      'Total Revenue',
    ]);
    expect(cards[0]).toMatchObject({ value: '3', caption: '2 approved' });
    expect(cards[1]).toMatchObject({ value: '14', caption: '9 approved' });
    expect(cards[5].value).toBe('₹1,25,000');
  });
});

describe('EcommStatCards', () => {
  it('renders every KPI card with its value', () => {
    render(<EcommStatCards stats={stats} />);
    expect(screen.getByText('Total Brands')).toBeTruthy();
    expect(screen.getByText('2 approved')).toBeTruthy();
    expect(screen.getByText('Total Products')).toBeTruthy();
    expect(screen.getByText('9 approved')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('27')).toBeTruthy();
    expect(screen.getByText('61')).toBeTruthy();
    expect(screen.getByText('₹1,25,000')).toBeTruthy();
  });

  it('falls back to zeroed stats while loading', () => {
    render(<EcommStatCards stats={null} />);
    expect(screen.getByText('Total Revenue')).toBeTruthy();
    expect(screen.getByText(`₹${emptyEcommStats.gross_revenue}`)).toBeTruthy();
  });
});
