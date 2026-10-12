import { fireEvent, screen, within } from '@testing-library/react-native';

import { SettlementSummary } from '@/components/host-manage/SettlementSummary';
import { renderWithProviders } from '@/utils/test-utils';

// The engine's split of ₹1,000 @ GST 18 / fee 5 / both commissions 10, a ₹300
// slot: host 454.58 + venue 270 + Duncit & govt 275.42 (GST 152.54 + fee 42.37
// + host commission 50.51 + venue commission 30) = 1,000.
const waterfall = {
  amount: 1000,
  gst_pct: 18,
  gst_amount: 152.54,
  net_amount: 847.46,
  platform_fee_pct: 5,
  platform_fee_amount: 42.37,
  pool_amount: 805.09,
  club_admin_pct: 0,
  club_admin_amount: 0,
  venue_amount: 300,
  venue_commission_pct: 10,
  venue_commission_amount: 30,
  venue_receives: 270,
  host_amount: 505.09,
  host_commission_pct: 10,
  host_commission_amount: 50.51,
  host_receives: 454.58,
  host_earn_pct: 45.46,
};

const settlement = {
  currency_symbol: '₹',
  collected_total: 1000,
  has_venue: true,
  // Four guests paid; the host's own seat is free and never counted.
  paying_attendees: 4,
  // Five of the six booked seats were checked in.
  attended_seats: 5,
  booked_seats: 6,
  // No final bill was entered, so the venue's side is the ₹300 slot price.
  venue_bill: 0,
  venue_slot_price: 300,
  include_slot_price: false,
  // Inside the completion window, so the host is paid the computed remainder.
  complete_deadline: '2026-08-25T05:30:00.000Z',
  complete_expired: false,
  host_payout_amount: 454.58,
  waterfall,
};

describe('SettlementSummary', () => {
  it('shows the empty prompt with no settlement', () => {
    renderWithProviders(<SettlementSummary settlement={null} isLoading={false} />);
    expect(screen.getByTestId('settlement-empty')).toBeOnTheScreen();
    expect(screen.getByText('Enter a bill to preview your share.')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-bill-summary')).toBeNull();
  });

  it('shows the spinner while loading', () => {
    renderWithProviders(<SettlementSummary settlement={null} isLoading />);
    expect(screen.getByTestId('settlement-loading')).toBeOnTheScreen();
  });

  it('splits the money four ways with the host’s own earning first', () => {
    renderWithProviders(<SettlementSummary settlement={settlement} isLoading={false} />);
    // The head count behind the money — a completed pod settles on who actually
    // paid, not on the spots the host planned for.
    expect(screen.getByTestId('settlement-attendees')).toHaveTextContent(
      /Based on 4 paying attendees/,
    );
    const rows = [
      'Your Earning (Host)',
      'Venue Take',
      'Club Admin Take',
      'Duncit Commission & Govt Charges',
    ];
    const order = screen
      .getAllByRole('button')
      .map((node) => node.props['aria-label'])
      .filter((label) => rows.includes(label));
    expect(order).toEqual(rows);
    expect(screen.getByText('₹454.58')).toBeOnTheScreen();
    expect(screen.getByText('₹270.00')).toBeOnTheScreen();
    expect(screen.getByText('₹275.42')).toBeOnTheScreen();
    expect(screen.queryByTestId('price-panel-reconcile-warning')).toBeNull();
    expect(
      screen.getByText('Your share (credited to your wallet once Finance approves)'),
    ).toBeOnTheScreen();
  });

  // One venue-bill line: its label and its figure, read off the exact Text nodes.
  const expectBillLine = (key: string, label: string, value: string) => {
    const line = within(screen.getByTestId(`venue-bill-line-${key}`));
    expect(line.getByText(label)).toBeOnTheScreen();
    expect(line.getByText(value)).toBeOnTheScreen();
  };

  it('states the venue side with no final bill: the slot price stands', () => {
    renderWithProviders(<SettlementSummary settlement={settlement} isLoading={false} />);
    expect(screen.getByTestId('venue-bill-summary')).toBeOnTheScreen();
    expectBillLine('attendees', 'Total attendees', '5 of 6 seats');
    expectBillLine('slot-price', 'Earlier slot price', '₹300.00');
    expectBillLine('final-bill', 'Final bill uploaded', 'None');
    expectBillLine('venue-total', 'Venue total', '₹300.00');
  });

  it('shows a final bill replacing the slot price', () => {
    renderWithProviders(
      <SettlementSummary
        settlement={{
          ...settlement,
          venue_bill: 450,
          waterfall: { ...waterfall, venue_amount: 450 },
        }}
        isLoading={false}
      />,
    );
    expectBillLine('slot-price', 'Earlier slot price', '₹300.00');
    expectBillLine('final-bill', 'Final bill uploaded', '₹450.00');
    expectBillLine('venue-total', 'Venue total', '₹450.00');
    expect(screen.queryByText('Venue total (slot price + bill)')).toBeNull();
  });

  it('labels the venue total when the bill is paid on top of the slot price', () => {
    renderWithProviders(
      <SettlementSummary
        settlement={{
          ...settlement,
          venue_bill: 450,
          include_slot_price: true,
          waterfall: { ...waterfall, venue_amount: 750 },
        }}
        isLoading={false}
      />,
    );
    expectBillLine('final-bill', 'Final bill uploaded', '₹450.00');
    expectBillLine('venue-total', 'Venue total (slot price + bill)', '₹750.00');
    expect(screen.queryByText('Venue total')).toBeNull();
  });

  // A legacy pod with no slot link: "₹0" there would read as a free venue.
  it('leaves the slot-price line out when there is no slot price to state', () => {
    renderWithProviders(
      <SettlementSummary
        settlement={{
          ...settlement,
          venue_bill: 450,
          venue_slot_price: 0,
          waterfall: { ...waterfall, venue_amount: 450 },
        }}
        isLoading={false}
      />,
    );
    expect(screen.queryByTestId('venue-bill-line-slot-price')).toBeNull();
    expectBillLine('venue-total', 'Venue total', '₹450.00');
  });

  it('opens the Duncit & govt row onto its four charges', () => {
    renderWithProviders(<SettlementSummary settlement={settlement} isLoading={false} />);
    fireEvent.press(screen.getByTestId('price-panel-split-duncit'));
    expect(screen.getByText('Commission from host @10%')).toBeOnTheScreen();
    expect(screen.getByText('₹505.09 × 10%')).toBeOnTheScreen();
    expect(screen.getByText('GST @18% (paid to Govt.)')).toBeOnTheScreen();
    expect(screen.getByText('Platform fee @5%')).toBeOnTheScreen();
  });

  it('reads naturally when exactly one guest paid', () => {
    renderWithProviders(
      <SettlementSummary settlement={{ ...settlement, paying_attendees: 1 }} isLoading={false} />,
    );
    expect(screen.getByTestId('settlement-attendees')).toHaveTextContent(
      /Based on 1 paying attendee —/,
    );
  });

  it('shows a nil venue take for a pod with no venue', () => {
    const noVenue = {
      ...settlement,
      has_venue: false,
      venue_slot_price: 0,
      host_payout_amount: 724.58,
      waterfall: {
        ...waterfall,
        venue_amount: 0,
        venue_commission_amount: 0,
        venue_receives: 0,
        host_amount: 805.09,
        host_commission_amount: 80.51,
        host_receives: 724.58,
      },
    };
    renderWithProviders(<SettlementSummary settlement={noVenue} isLoading={false} />);
    expect(screen.getByText('₹724.58')).toBeOnTheScreen();
    expect(screen.getAllByText('₹0.00')).toHaveLength(2); // venue + club admin
    // No venue, so there is no venue bill to state.
    expect(screen.queryByTestId('venue-bill-summary')).toBeNull();
    expect(screen.queryByText('Total attendees')).toBeNull();
  });

  it('says why nothing is paid once the completion window has expired', () => {
    renderWithProviders(
      <SettlementSummary
        settlement={{ ...settlement, complete_expired: true, host_payout_amount: 0 }}
        isLoading={false}
      />,
    );
    expect(screen.getByTestId('settlement-expired')).toBeOnTheScreen();
    expect(screen.queryByTestId('settlement-shortfall')).toBeNull();
  });

  it('flags a host side that went below zero', () => {
    // The ₹900 slot overruns the ₹805.09 pool: no host commission, host −94.91.
    const thin = {
      ...waterfall,
      venue_amount: 900,
      venue_commission_amount: 90,
      venue_receives: 810,
      host_amount: -94.91,
      host_commission_amount: 0,
      host_receives: -94.91,
    };
    renderWithProviders(
      <SettlementSummary
        settlement={{ ...settlement, host_payout_amount: 0, waterfall: thin }}
        isLoading={false}
      />,
    );
    expect(screen.getByTestId('settlement-shortfall')).toBeOnTheScreen();
    expect(screen.queryByTestId('price-panel-reconcile-warning')).toBeNull();
  });
});
