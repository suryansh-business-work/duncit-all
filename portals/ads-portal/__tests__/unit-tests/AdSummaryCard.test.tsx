import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import AdSummaryCard from '../../src/pages/ads/ad-details/AdSummaryCard';
import { adDetail } from './fixtures';
import { renderWithProviders } from './testkit';

vi.mock('@duncit/table', () => ({
  EM_DASH: '—',
  formatDateCell: (value: string, fmt: string) => `${value}|${fmt}`,
}));

describe('AdSummaryCard', () => {
  it('renders a linked redirect, approved cost and pluralised duration', () => {
    renderWithProviders(
      <AdSummaryCard ad={adDetail({ duration_days: 7, approved_cost: 4200 })} />,
    );
    const link = screen.getByRole('link', { name: 'https://duncit.com/offer' });
    expect(link).toHaveAttribute('href', 'https://duncit.com/offer');
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('₹4,200')).toBeInTheDocument();
    expect(screen.getByText('Young professionals in Indore')).toBeInTheDocument();
  });

  it('shows an em-dash redirect, pending approval and a single-day duration', () => {
    renderWithProviders(
      <AdSummaryCard
        ad={adDetail({
          duration_days: 1,
          approved_cost: null,
          redirect_url: null,
          target_audience: null,
        })}
      />,
    );
    expect(screen.getByText('1 day')).toBeInTheDocument();
    expect(screen.getByText('Pending review')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
