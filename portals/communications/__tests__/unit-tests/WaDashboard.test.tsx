import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../testkit';

const m = vi.hoisted(() => ({
  data: undefined as unknown,
  loading: false,
  error: undefined as unknown,
  calls: [] as Array<Record<string, unknown>>,
}));
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useQuery: (_doc: unknown, options?: { variables?: Record<string, unknown> }) => {
    if (options?.variables && 'from' in options.variables) m.calls.push(options.variables);
    return { data: m.data, loading: m.loading, error: m.error };
  },
}));

import WaDashboard from '../../src/pages/whatsapp-page/wa-dashboard';
import SpendByCategory from '../../src/pages/whatsapp-page/wa-dashboard/SpendByCategory';
import { categoryLabel } from '../../src/pages/whatsapp-page/helpers';

const board = (over: Record<string, unknown> = {}) => ({
  currency_symbol: '$',
  campaigns: 3,
  messages_sent: 1200,
  messages_failed: 14,
  messages_skipped: 6,
  total_cost: 940.5,
  by_category: [
    { category: 'MARKETING', campaigns: 2, messages: 1000, failed: 10, skipped: 5, cost: 785 },
    { category: 'UTILITY', campaigns: 1, messages: 200, failed: 4, skipped: 1, cost: 155.5 },
  ],
  top_campaigns: [
    {
      campaign_id: 'c1',
      name: 'Diwali blast',
      wa_campaign_name: 'diwali_camp',
      template_category: 'MARKETING',
      messages: 1000,
      cost: 785,
      status: 'SENT',
      sent_at: '2026-08-06T10:00:00.000Z',
    },
    {
      campaign_id: 'c2',
      name: 'Queued send',
      wa_campaign_name: 'q',
      template_category: '',
      messages: 0,
      cost: 0,
      status: 'SCHEDULED',
      sent_at: null,
    },
  ],
  ...over,
});

beforeEach(() => {
  m.data = { waCampaignDashboard: board() };
  m.loading = false;
  m.error = undefined;
  m.calls = [];
});

describe('WaDashboard', () => {
  it('shows spend and reach figures in the rate card currency', () => {
    renderWithProviders(<WaDashboard />);
    expect(screen.getByText('$940.50')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
    expect(screen.getByText('Across 3 sends')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
  });

  it('breaks spend down by category with its message count', () => {
    renderWithProviders(<WaDashboard />);
    expect(screen.getByText('1,000 · $785.00')).toBeInTheDocument();
    expect(screen.getByText('200 · $155.50')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
  });

  it('lists the costliest sends, and says when one has not gone out', () => {
    renderWithProviders(<WaDashboard />);
    expect(screen.getByText('Diwali blast')).toBeInTheDocument();
    expect(screen.getByText(/Not categorised · 0 sent · not sent yet/)).toBeInTheDocument();
  });

  it('says so when nothing was sent in the window', () => {
    m.data = { waCampaignDashboard: board({ by_category: [], top_campaigns: [] }) };
    renderWithProviders(<WaDashboard />);
    expect(screen.getAllByText('Nothing sent in this window.')).toHaveLength(2);
  });

  it('asks for the last 30 days first, then re-asks for another window or all time', () => {
    renderWithProviders(<WaDashboard />);
    const first = m.calls[0] as { from: string; to: null };
    const spanDays = (Date.now() - new Date(first.from).getTime()) / 86_400_000;
    expect(Math.round(spanDays)).toBe(30);

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Window/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('All time'));
    expect(m.calls.at(-1)).toEqual({ from: null, to: null });
  });

  it('draws each bar against the biggest spender', () => {
    renderWithProviders(
      <SpendByCategory
        currency="$"
        rows={[
          { category: 'MARKETING', campaigns: 1, messages: 10, failed: 0, skipped: 0, cost: 200 },
          { category: 'UTILITY', campaigns: 1, messages: 5, failed: 0, skipped: 0, cost: 50 },
        ]}
      />
    );
    const bars = screen.getAllByRole('progressbar');
    expect(bars[0]).toHaveAttribute('aria-valuenow', '100');
    expect(bars[1]).toHaveAttribute('aria-valuenow', '25');
  });

  it('keeps an uncategorised, free send at an empty bar', () => {
    renderWithProviders(
      <SpendByCategory
        currency="$"
        rows={[{ category: '', campaigns: 1, messages: 3, failed: 0, skipped: 0, cost: 0 }]}
      />
    );
    expect(screen.getByText(categoryLabel(''))).toBeInTheDocument();
    expect(screen.getByText('3 · $0.00')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('shows a skeleton while the first answer loads', () => {
    m.data = undefined;
    m.loading = true;
    const { container } = renderWithProviders(<WaDashboard />);
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });

  it('shows the error instead of the board when it cannot be read', () => {
    m.error = new Error('Dashboard exploded');
    renderWithProviders(<WaDashboard />);
    expect(screen.getByText('Dashboard exploded')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
