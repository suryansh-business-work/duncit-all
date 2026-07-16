import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import EstimateCard from '../../src/pages/create-ad-page/EstimateCard';
import type { AdPricing } from '../../src/pages/ads/queries';
import { renderWithProviders } from './testkit';

const pricing: AdPricing = {
  auto_per_day: 900,
  home_bottom_per_day: 500,
  sidebar_per_day: 400,
  explore_scroll_per_day: 600,
  status_per_day: 700,
  venue_list_per_day: 300,
  club_list_per_day: 300,
  pod_list_per_day: 350,
  pod_details_per_day: 450,
  currency_symbol: '₹',
};

describe('EstimateCard', () => {
  it('shows skeletons while pricing is loading', () => {
    const { container } = renderWithProviders(
      <EstimateCard pricing={undefined} loading position="AUTO" durationDays={7} />,
    );
    expect(screen.getByText('Estimated Cost')).toBeInTheDocument();
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });

  it('shows skeletons when pricing is missing even if not loading', () => {
    const { container } = renderWithProviders(
      <EstimateCard pricing={null} loading={false} position="AUTO" durationDays={7} />,
    );
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });

  it('computes the per-day price times duration (plural days)', () => {
    renderWithProviders(
      <EstimateCard pricing={pricing} loading={false} position="HOME_BOTTOM" durationDays={7} />,
    );
    expect(screen.getByText('Home Bottom · per day')).toBeInTheDocument();
    expect(screen.getByText('₹500')).toBeInTheDocument();
    expect(screen.getByText('7 days')).toBeInTheDocument();
    // 500 × 7 = 3500 total estimate.
    expect(screen.getByText('₹3,500')).toBeInTheDocument();
  });

  it('renders a singular day label for a one-day campaign', () => {
    renderWithProviders(
      <EstimateCard pricing={pricing} loading={false} position="SIDEBAR" durationDays={1} />,
    );
    expect(screen.getByText('1 day')).toBeInTheDocument();
  });
});
