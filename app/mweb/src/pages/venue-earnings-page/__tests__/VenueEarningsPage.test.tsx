import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import VenueEarningsPage from '../index';
import { VENUE_EARNINGS } from '../queries';

const payout = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  pod_title: 'Sunday Jam',
  status: 'APPROVED',
  amount_requested: 300,
  approved_amount: 270,
  created_at: '2026-06-01T10:00:00.000Z',
  breakdown: {
    version: 2,
    share_amount: 300,
    commission_pct: 10,
    commission_amount: 30,
    payout_amount: 270,
  },
  ...over,
});

const mocks = [
  {
    request: { query: VENUE_EARNINGS },
    result: {
      data: {
        myVenueEarningsSummary: {
          currency_symbol: '₹',
          lifetime_earnings: 1250.5,
          pending_amount: 270,
          pods_completed: 4,
          this_month_earnings: 540,
        },
        myVenuePayouts: [payout()],
      },
    },
  },
];

function setup() {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter>
        <VenueEarningsPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe('VenueEarningsPage', () => {
  it('renders the earnings summary stat cards', async () => {
    setup();
    expect(await screen.findByText('₹1250.50')).toBeInTheDocument();
    expect(screen.getByText('Lifetime')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
    expect(screen.getByText('Pods completed')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('lists payouts and expands the v2 slot-price breakdown', async () => {
    setup();
    expect(await screen.findByText('Sunday Jam')).toBeInTheDocument();
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.queryByText(/Slot price/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show payout breakdown' }));
    expect(screen.getByText(/Slot price ₹300\.00 − commission \(10%\) ₹30\.00 = ₹270\.00/)).toBeInTheDocument();
  });
});
