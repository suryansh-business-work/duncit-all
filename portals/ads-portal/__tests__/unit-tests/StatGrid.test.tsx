import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import StatGrid from '../../src/pages/dashboard/StatGrid';
import type { AdsDashboardStats } from '../../src/pages/dashboard/queries';
import { renderWithProviders } from './testkit';

const stats: AdsDashboardStats = {
  total: 12,
  pending: 3,
  approved: 2,
  live: 4,
  rejected: 1,
  expired: 2,
  total_estimated_cost: 50000,
  total_approved_cost: 42000,
  live_spend: 15000,
  next_start_at: null,
  next_start_title: null,
  currency_symbol: '₹',
};

describe('StatGrid', () => {
  it('renders a tile per bucket, formatting money buckets with the currency symbol', () => {
    renderWithProviders(<StatGrid stats={stats} />);
    // Count buckets render as raw numbers.
    expect(screen.getByText('Total Ads')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Live Now')).toBeInTheDocument();
    // Money buckets go through formatAdCost.
    expect(screen.getByText('Total Approved Spend')).toBeInTheDocument();
    expect(screen.getByText('₹42,000')).toBeInTheDocument();
    expect(screen.getByText('₹15,000')).toBeInTheDocument();
  });
});
