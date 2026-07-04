import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import EarningsCard from '../EarningsCard';

const summary = {
  currency_symbol: '₹',
  lifetime_earnings: 1234.5,
  pending_amount: 454.58,
  pods_completed: 7,
  this_month_earnings: 200,
};

function setup(withSummary: boolean) {
  return render(
    <MockedProvider addTypename={false}>
      <MemoryRouter>
        <EarningsCard balance={99.5} currency="₹" summary={withSummary ? summary : null} />
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe('EarningsCard', () => {
  it('shows the wallet balance plus the myHostEarningsSummary stats', () => {
    setup(true);
    expect(screen.getByText('₹99.50')).toBeInTheDocument();
    expect(screen.getByText('Lifetime earnings')).toBeInTheDocument();
    expect(screen.getByText('₹1234.50')).toBeInTheDocument();
    expect(screen.getByText('Pending approval')).toBeInTheDocument();
    expect(screen.getByText('₹454.58')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
    expect(screen.getByText('₹200.00')).toBeInTheDocument();
    expect(screen.getByText('Pods completed')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders without the summary block when the query has no data yet', () => {
    setup(false);
    expect(screen.getByText('₹99.50')).toBeInTheDocument();
    expect(screen.queryByText('Lifetime earnings')).not.toBeInTheDocument();
  });
});
