import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { formatINR } from '@duncit/utils';
import EcommDashboardPage from './EcommDashboardPage';
import EcommProductsChart from './EcommProductsChart';
import { PARTNER_ECOMM_STATS, type PartnerEcommStats } from './ecomm-dashboard.queries';
import { renderWithProviders } from '../../__tests__/render';

vi.mock('@duncit/dashboard', () => import('../../__tests__/dashboard-mock'));

afterEach(cleanup);

const stats: PartnerEcommStats = {
  total_brands: 2,
  approved_brands: 1,
  total_products: 5,
  approved_products: 4,
  total_warehouses: 1,
  total_orders: 12,
  total_items_sold: 30,
  gross_revenue: 60000,
  net_earnings: 51000,
  product_performance: [
    { product_id: 'p1', name: 'Cold Brew Starter Kit', units_sold: 20, gross_revenue: 40000, net_earnings: 34000 },
    { product_id: 'p2', name: 'Pour-Over Set', units_sold: 10, gross_revenue: 20000, net_earnings: 17000 },
  ],
};

const statsMock = (payload: PartnerEcommStats): MockedResponse => ({
  request: { query: PARTNER_ECOMM_STATS },
  result: {
    data: {
      partnerEcommStats: {
        __typename: 'PartnerEcommStats',
        ...payload,
        product_performance: payload.product_performance.map((row) => ({
          __typename: 'PartnerProductPerformance',
          ...row,
        })),
      },
    },
  },
});

describe('EcommDashboardPage', () => {
  it('shows a loading spinner on the KPI widget until the stats land', async () => {
    renderWithProviders(<EcommDashboardPage />, { mocks: [statsMock(stats)] });

    const performance = screen.getByTestId('widget-performance');
    expect(within(performance).getByRole('progressbar')).toBeTruthy();
    expect(within(performance).getByText('E-commerce performance')).toBeTruthy();

    expect(await screen.findByText(formatINR(60000))).toBeTruthy();
    expect(within(performance).queryByRole('progressbar')).toBeNull();
    expect(screen.getByText('1 approved')).toBeTruthy();
  });

  it('plots each sold product under Products Performance', async () => {
    renderWithProviders(<EcommDashboardPage />, { mocks: [statsMock(stats)] });

    const products = screen.getByTestId('widget-products');
    expect(within(products).getByText('Products Performance')).toBeTruthy();
    expect(await within(products).findByText('Cold Brew Starter Kit')).toBeTruthy();
    expect(within(products).getByText('Pour-Over Set')).toBeTruthy();
  });

  it('surfaces a failed stats request and keeps the zeroed cards', async () => {
    renderWithProviders(<EcommDashboardPage />, {
      mocks: [{ request: { query: PARTNER_ECOMM_STATS }, result: { errors: [new GraphQLError('Stats are offline')] } }],
    });

    expect(await screen.findByText('Stats are offline')).toBeTruthy();
    expect(screen.getAllByText('0 approved')).toHaveLength(2);
    expect(screen.getByText('No product sales yet. Once a product sells it appears here.')).toBeTruthy();
  });

  it('opens the brand list from the hero', () => {
    renderWithProviders(<EcommDashboardPage />, { mocks: [statsMock(stats)], route: '/ecomm/dashboard' });

    fireEvent.click(screen.getByRole('button', { name: 'Your Brands' }));

    expect(screen.getByTestId('location').textContent).toBe('/ecomm-brand');
  });
});

describe('EcommProductsChart', () => {
  it('sizes each bar against the best seller on gross, and labels it with net earnings', () => {
    renderWithProviders(<EcommProductsChart rows={stats.product_performance} />);

    const best = screen.getByRole('progressbar', { name: 'Cold Brew Starter Kit' });
    const second = screen.getByRole('progressbar', { name: 'Pour-Over Set' });
    expect(best.getAttribute('aria-valuenow')).toBe('100');
    expect(second.getAttribute('aria-valuenow')).toBe('50');
    expect(screen.getByText(formatINR(34000))).toBeTruthy();
    expect(screen.getByText('Units sold: 20')).toBeTruthy();
  });

  it('keeps a product that sold at zero revenue on an empty bar instead of dividing by zero', () => {
    renderWithProviders(
      <EcommProductsChart
        rows={[{ product_id: 'p9', name: 'Free Sample', units_sold: 3, gross_revenue: 0, net_earnings: 0 }]}
      />
    );

    expect(screen.getByRole('progressbar', { name: 'Free Sample' }).getAttribute('aria-valuenow')).toBe('0');
  });

  it('says there are no sales yet when nothing has sold', () => {
    renderWithProviders(<EcommProductsChart rows={[]} />);

    expect(screen.getByText('No product sales yet. Once a product sells it appears here.')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
