/**
 * The one web view of a pod's money: the host's earning first and strongest,
 * then where the rest of the collection goes, each row opening its own
 * breakdown. Every figure comes off the server waterfall.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { EarningsWaterfall } from '@duncit/utils';

import EarningsSplitView from '../src/finance-waterfall/EarningsSplitView';

// ₹1,000 collected, GST 18 / fee 10 / host commission 20 / venue commission 10,
// a ₹300 slot and a 2% club admin cut — the four buckets add back to ₹1,000.
const waterfall: EarningsWaterfall = {
  amount: 1000,
  gst_pct: 18,
  gst_amount: 152.54,
  net_amount: 847.46,
  platform_fee_pct: 10,
  platform_fee_amount: 84.75,
  pool_amount: 762.71,
  club_admin_pct: 2,
  club_admin_amount: 15.25,
  venue_amount: 300,
  venue_commission_pct: 10,
  venue_commission_amount: 30,
  venue_receives: 270,
  host_amount: 447.46,
  host_commission_pct: 20,
  host_commission_amount: 89.49,
  host_receives: 357.97,
  host_earn_pct: 35.8,
};

const rowLabels = () =>
  screen.getAllByRole('button').map((node) => node.getAttribute('aria-label'));

describe('EarningsSplitView', () => {
  it('leads with the host’s earning, then venue, club admin and Duncit & govt', () => {
    render(<EarningsSplitView waterfall={waterfall} symbol="₹" viewer="staff" />);
    expect(rowLabels()).toEqual([
      'Host Earning',
      'Venue Take',
      'Club Admin Take',
      'Duncit Commission & Govt Charges',
    ]);
    expect(screen.getByText('Where the rest goes')).toBeInTheDocument();
    expect(screen.getByText('₹357.97')).toBeInTheDocument();
    expect(screen.getByText('35.8% of collection')).toBeInTheDocument();
    expect(screen.getByText('₹270.00')).toBeInTheDocument();
    expect(screen.getByText('₹15.25')).toBeInTheDocument();
    // GST 152.54 + fee 84.75 + host commission 89.49 + venue commission 30
    expect(screen.getByText('₹356.78')).toBeInTheDocument();
    expect(screen.queryByTestId('earnings-split-reconcile-warning')).not.toBeInTheDocument();
  });

  it('speaks to the host in the second person on their own pod', () => {
    render(<EarningsSplitView waterfall={waterfall} symbol="₹" viewer="host" />);
    expect(rowLabels()[0]).toBe('Your Earning (Host)');
  });

  it('keeps every row closed until it is opened, and closes it again', async () => {
    const user = userEvent.setup();
    render(<EarningsSplitView waterfall={waterfall} symbol="₹" viewer="staff" />);
    expect(screen.queryByText('Commission from host @20%')).not.toBeInTheDocument();

    const duncit = screen.getByRole('button', { name: 'Duncit Commission & Govt Charges' });
    await user.click(duncit);
    expect(duncit).toHaveAttribute('aria-expanded', 'true');
    const lines = within(screen.getByTestId('earnings-split-duncit'));
    expect(lines.getByText('Commission from host @20%')).toBeInTheDocument();
    expect(lines.getByText('₹447.46 × 20%')).toBeInTheDocument();
    expect(lines.getByText('Commission from venue @10%')).toBeInTheDocument();
    expect(lines.getByText('GST @18% (paid to Govt.)')).toBeInTheDocument();
    expect(lines.getByText('₹1,000.00 (total collection) × 18 ÷ 118')).toBeInTheDocument();
    expect(lines.getByText('Platform fee @10%')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Host Earning' }));
    expect(screen.getByText('Host receives')).toBeInTheDocument();

    await user.click(duncit);
    expect(duncit).toHaveAttribute('aria-expanded', 'false');
  });

  it('pins a blocking reason to the venue row only', () => {
    render(
      <EarningsSplitView
        waterfall={waterfall}
        symbol="₹"
        viewer="host"
        venueError="The pod cannot cover the venue price."
      />,
    );
    const venue = within(screen.getByTestId('earnings-split-venue'));
    expect(venue.getByText('The pod cannot cover the venue price.')).toBeInTheDocument();
    expect(screen.getAllByText('The pod cannot cover the venue price.')).toHaveLength(1);
  });

  it('warns when the figures do not add back to the collection', () => {
    // A club cut the payout was never reduced by.
    render(
      <EarningsSplitView
        waterfall={{ ...waterfall, club_admin_amount: 115.25 }}
        symbol="₹"
        viewer="staff"
      />,
    );
    expect(screen.getByTestId('earnings-split-reconcile-warning')).toHaveTextContent(
      'These figures do not reconcile — refresh, or contact support if this persists.',
    );
  });
});
