/**
 * Brand sales analytics. The server does every sum, so what is pinned down here
 * is that the panel asks for the right brand and window, renders the server's
 * figures as written (INR, en-IN grouping, the configured date format), keeps
 * the tiles on screen for an empty window, and recovers from a failure through
 * Retry rather than a reload.
 */
import { describe, expect, it } from 'vitest';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { formatDate } from '@duncit/app-settings';

import { BrandAnalyticsPanel } from '../src/brand/analytics/BrandAnalyticsPanel';
import { BRAND_ANALYTICS, type BrandAnalytics } from '../src/brand/analytics/queries';

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const SINCE = '2026-09-05T00:00:00.000Z';

const analytics = (over: Partial<BrandAnalytics> = {}): BrandAnalytics => ({
  days: 30,
  since: SINCE,
  orders: 1240,
  units_sold: 1810,
  gross_revenue: 125000,
  net_earnings: 106250,
  average_order_value: 1008,
  product_views: 54321,
  product_clicks: 4321,
  total_products: 12,
  live_products: 9,
  trend: [
    { date: '2026-10-02', orders: 4, gross_revenue: 4000 },
    { date: '2026-10-03', orders: 8, gross_revenue: 8200 },
    { date: '2026-10-04', orders: 2, gross_revenue: 1900 },
  ],
  top_products: [
    { product_id: 'prod-1', name: 'Chicken Jerky Treats', units_sold: 320, gross_revenue: 48000, net_earnings: 40800 },
    { product_id: 'prod-2', name: 'Rope Tug Toy', units_sold: 150, gross_revenue: 22500, net_earnings: 19125 },
  ],
  ...over,
});

/** The server's answer, typenames and all, as the cache stores it. */
const typed = (a: BrandAnalytics) => ({
  __typename: 'BrandAnalytics',
  ...a,
  trend: a.trend.map((p) => ({ __typename: 'BrandAnalyticsPoint', ...p })),
  top_products: a.top_products.map((p) => ({ __typename: 'PartnerProductPerformance', ...p })),
});

const ok = (a: BrandAnalytics, days = 30, brandId = 'brand-42'): MockedResponse => ({
  request: { query: BRAND_ANALYTICS, variables: { brand_doc_id: brandId, days } },
  result: { data: { brandAnalytics: typed(a) } },
});

const failing = (message: string): MockedResponse => ({
  request: { query: BRAND_ANALYTICS, variables: { brand_doc_id: 'brand-42', days: 30 } },
  error: new Error(message),
});

const mount = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <BrandAnalyticsPanel brandId="brand-42" />
    </MockedProvider>
  );

describe('BrandAnalyticsPanel', () => {
  it('announces loading, then shows the last 30 days by default', async () => {
    mount([ok(analytics())]);

    expect(screen.getByRole('status', { name: 'Loading brand analytics…' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true');

    await settle();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sales analytics' })).toBeInTheDocument();
    expect(screen.getByTestId('brand-analytics-since')).toHaveTextContent(`Since ${formatDate(SINCE)}`);
  });

  it("renders the server's figures in every tile", async () => {
    mount([ok(analytics())]);
    await settle();

    const tile = (id: string) => screen.getByTestId(`brand-analytics-tile-${id}`);
    expect(tile('orders')).toHaveTextContent('Orders1,240');
    expect(tile('units')).toHaveTextContent('Units sold1,810');
    expect(tile('gross')).toHaveTextContent('Gross sales₹1,25,000');
    expect(tile('net')).toHaveTextContent('Net earnings₹1,06,250');
    expect(tile('aov')).toHaveTextContent('Avg order value₹1,008');
    expect(tile('views')).toHaveTextContent('Product views54,321');
    expect(tile('clicks')).toHaveTextContent('Product clicks4,321');
    expect(tile('live')).toHaveTextContent('Live products9 of 12');
    expect(screen.queryByTestId('brand-analytics-empty')).not.toBeInTheDocument();
  });

  it('draws one bar per day and describes the strip in words', async () => {
    mount([ok(analytics())]);
    await settle();

    const strip = screen.getByRole('img', {
      name: 'Orders per day over the last 30 days: 1,240 in total, at most 8 in a single day.',
    });
    expect(within(strip).getAllByTestId('brand-analytics-trend-bar')).toHaveLength(3);
  });

  it('lists the best sellers in a captioned table', async () => {
    mount([ok(analytics())]);
    await settle();

    const table = screen.getByRole('table', { name: 'Best-selling products in the last 30 days' });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Product',
      'Units sold',
      'Gross sales',
      'Net earnings',
    ]);
    const jerky = within(table).getByRole('row', { name: /Chicken Jerky Treats/ });
    expect(jerky).toHaveTextContent('Chicken Jerky Treats320₹48,000₹40,800');
    expect(within(table).getByRole('rowheader', { name: 'Rope Tug Toy' })).toBeInTheDocument();
  });

  it('keeps the tiles at zero and says so when the window had no orders', async () => {
    const empty = analytics({
      orders: 0,
      units_sold: 0,
      gross_revenue: 0,
      net_earnings: 0,
      average_order_value: 0,
      live_products: 0,
      trend: [
        { date: '2026-10-03', orders: 0, gross_revenue: 0 },
        { date: '2026-10-04', orders: 0, gross_revenue: 0 },
      ],
      top_products: [],
    });
    mount([ok(empty)]);
    await settle();

    expect(screen.getByTestId('brand-analytics-empty')).toHaveTextContent(
      'No orders in the last 30 days yet. Figures appear here as soon as customers buy.'
    );
    expect(screen.getByTestId('brand-analytics-tile-orders')).toHaveTextContent('Orders0');
    expect(screen.getByTestId('brand-analytics-tile-gross')).toHaveTextContent('Gross sales₹0');
    expect(screen.getByTestId('brand-analytics-tile-live')).toHaveTextContent('0 of 12');
    expect(
      screen.getByRole('img', { name: 'Orders per day over the last 30 days: 0 in total, at most 0 in a single day.' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('No products sold in this window.')).toBeInTheDocument();
  });

  it('asks again for the window the reader picks, and ignores pressing the active one', async () => {
    mount([ok(analytics()), ok(analytics({ days: 7, orders: 300 }), 7)]);
    await settle();

    fireEvent.click(screen.getByRole('button', { name: '30 days' }));
    expect(screen.getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('brand-analytics-tile-orders')).toHaveTextContent('1,240');

    fireEvent.click(screen.getByRole('button', { name: '7 days' }));
    await settle();
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('brand-analytics-tile-orders')).toHaveTextContent('Orders300');
    expect(screen.getByRole('group', { name: 'Analytics window' })).toBeInTheDocument();
  });

  it('shows why it failed, and Retry asks again until the server answers', async () => {
    mount([
      failing('Brand analytics are unavailable right now'),
      failing('Still unavailable'),
      ok(analytics()),
    ]);
    await settle();

    expect(screen.getByTestId('brand-analytics-error')).toHaveTextContent(
      'Brand analytics are unavailable right now'
    );

    // A retry that fails again keeps the alert up with the new reason.
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await settle();
    expect(screen.getByTestId('brand-analytics-error')).toHaveTextContent('Still unavailable');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await settle();
    expect(screen.queryByTestId('brand-analytics-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('brand-analytics-tile-orders')).toHaveTextContent('1,240');
  });
});
