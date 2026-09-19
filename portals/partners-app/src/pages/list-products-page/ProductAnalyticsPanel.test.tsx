import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import ProductAnalyticsPanel from './ProductAnalyticsPanel';
import { MY_PRODUCT_ANALYTICS } from './queries';
import { renderWithProviders } from '../../__tests__/render';

afterEach(cleanup);

const analytics = (over: Record<string, unknown> = {}) => ({
  __typename: 'ProductAnalytics',
  total_views: 1280,
  total_clicks: 342,
  orders: 57,
  units_sold: 64,
  gross_revenue: 31936,
  total_earning: 27145.6,
  currency_symbol: '₹',
  linked_pods: 12,
  locations: [
    { __typename: 'ProductAnalyticsLocation', location: 'Bengaluru', units_sold: 40, orders: 35 },
    { __typename: 'ProductAnalyticsLocation', location: 'Pune', units_sold: 24, orders: 22 },
  ],
  variants: [
    { __typename: 'ProductVariantStat', variant_id: 'v1', variant_label: 'M / Blue', units_sold: 40, orders: 36, views: 800, clicks: 210 },
    // Order lines placed before variants existed carry no variant id.
    { __typename: 'ProductVariantStat', variant_id: '', variant_label: 'Default', units_sold: 24, orders: 21, views: 480, clicks: 132 },
  ],
  ...over,
});

const analyticsMock = (result: MockedResponse['result']): MockedResponse => ({
  request: { query: MY_PRODUCT_ANALYTICS, variables: { product_doc_id: 'p1' } },
  result,
});

const renderPanel = (mocks: MockedResponse[]) => renderWithProviders(<ProductAnalyticsPanel productId="p1" />, { mocks });

describe('ProductAnalyticsPanel', () => {
  it('shows a labelled spinner until the numbers arrive', () => {
    renderPanel([analyticsMock({ data: { myProductAnalytics: analytics() } })]);
    expect(screen.getByRole('progressbar', { name: 'Loading…' })).toBeTruthy();
  });

  it('lays out the headline metrics with money in the brand currency', async () => {
    renderPanel([analyticsMock({ data: { myProductAnalytics: analytics() } })]);

    expect(await screen.findByRole('heading', { name: 'Analytics' })).toBeTruthy();
    // Metric captions are spans; the variant table repeats 'Orders' as a header cell.
    const metric = (label: string) => screen.getByText(label, { selector: 'span' }).parentElement as HTMLElement;
    expect(within(metric('Product views')).getByText('1280')).toBeTruthy();
    expect(within(metric('Total clicks')).getByText('342')).toBeTruthy();
    expect(within(metric('Orders')).getByText('57')).toBeTruthy();
    expect(within(metric('Units sold')).getByText('64')).toBeTruthy();
    expect(within(metric('Gross revenue')).getByText(`₹${(31936).toLocaleString('en-IN')}`)).toBeTruthy();
    expect(within(metric('Total earning')).getByText(`₹${(27145.6).toLocaleString('en-IN')}`)).toBeTruthy();
    expect(within(metric('Pods listed in')).getByText('12')).toBeTruthy();
  });

  it('breaks sales down by variant and by purchase location', async () => {
    renderPanel([analyticsMock({ data: { myProductAnalytics: analytics() } })]);

    expect(await screen.findByRole('heading', { name: 'By variant' })).toBeTruthy();
    const rows = screen.getAllByRole('row');
    // Header + one row per variant.
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['M / Blue', '40', '36', '210', '800']);
    expect(within(rows[2]).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['Default', '24', '21', '132', '480']);

    expect(screen.getByRole('heading', { name: 'Purchase locations' })).toBeTruthy();
    expect(screen.getByText('Bengaluru: 40 sold')).toBeTruthy();
    expect(screen.getByText('Pune: 24 sold')).toBeTruthy();
  });

  it('leaves out the breakdowns and shows zero money for a product with no sales yet', async () => {
    renderPanel([
      analyticsMock({
        data: {
          myProductAnalytics: analytics({
            total_views: 3,
            total_clicks: 0,
            orders: 0,
            units_sold: 0,
            gross_revenue: 0,
            total_earning: 0,
            linked_pods: 0,
            locations: [],
            variants: [],
          }),
        },
      }),
    ]);

    expect(await screen.findByRole('heading', { name: 'Analytics' })).toBeTruthy();
    expect(within(screen.getByText('Gross revenue').parentElement as HTMLElement).getByText('₹0')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'By variant' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Purchase locations' })).toBeNull();
  });

  it('reports a failed analytics query', async () => {
    renderPanel([analyticsMock({ errors: [new GraphQLError('Analytics are warming up')] })]);
    expect((await screen.findByRole('alert')).textContent).toContain('Analytics are warming up');
  });
});
