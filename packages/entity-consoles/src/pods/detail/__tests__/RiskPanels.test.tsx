import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { formatDateTime } from '@duncit/app-settings';
import { AlertsLine, AttendeesPanel, FinancePanel, FixList } from '../RiskPanels';
import type { PodCancellationRiskView } from '../queries';

// The translator is the pod-details package's own and its copy arrives from the
// server, so this one echoes the key and the values it was handed — which is
// exactly what a panel is responsible for choosing.
vi.mock('@duncit/pod-details', () => ({
  usePodDetailsTranslation: () => ({
    t: (key: string, options?: { count?: number; vars?: Record<string, string | number> }) =>
      options ? `${key} ${JSON.stringify(options)}` : key,
  }),
}));

// The four-way earnings split is its own component with its own suite; here it
// only has to be handed this pod's waterfall, symbol and the staff viewpoint.
vi.mock('@duncit/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    EarningsSplitView: (props: { waterfall: { host_receives: number }; symbol: string; viewer: string }) => (
      <div data-testid="split">{`${props.symbol}|${props.waterfall.host_receives}|${props.viewer}`}</div>
    ),
  };
});

const makeRisk = (over: Partial<PodCancellationRiskView> = {}): PodCancellationRiskView => ({
  pod_id: 'pod-1',
  state: 'AT_RISK',
  at_risk: true,
  hours_until_start: 20,
  lead_hours: 24,
  window_hours: 72,
  alert_hours: 6,
  cancel_at: '2026-10-20T10:00:00.000Z',
  currency_symbol: '₹',
  collected_total: 1000,
  venue_amount: 2500,
  shortfall: 1234.5,
  waterfall: { host_receives: -310.5 } as PodCancellationRiskView['waterfall'],
  attendees: {
    booked_seats: 4,
    total_spots: 10,
    seats_available: 6,
    ticket_price: 250,
    spots_needed: 3,
  },
  alerted_at: null,
  alert_count: 0,
  next_alert_at: null,
  ...over,
});

const attendees = (over: Partial<PodCancellationRiskView['attendees']>) => ({
  ...makeRisk().attendees,
  ...over,
});

describe('FinancePanel', () => {
  it('explains the negative split, shows the waterfall for staff and the shortfall to the paisa', () => {
    render(<FinancePanel risk={makeRisk()} />);

    expect(screen.getByText('admin.podRisk.financeTitle')).toBeInTheDocument();
    expect(screen.getByText('admin.podRisk.financeIntro')).toBeInTheDocument();
    expect(screen.getByTestId('split')).toHaveTextContent('₹|-310.5|staff');
    expect(screen.getByText('admin.podRisk.shortfall')).toBeInTheDocument();
    expect(screen.getByText('₹1234.50')).toBeInTheDocument();
  });
});

describe('AttendeesPanel', () => {
  it('shows seats against capacity, what is open, the price and how many more are needed', () => {
    render(<AttendeesPanel risk={makeRisk()} />);

    expect(screen.getByText('4 / 10')).toBeInTheDocument();
    expect(screen.getByText('admin.podRisk.seatsAvailable')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('₹250.00')).toBeInTheDocument();
    expect(screen.getByText('admin.podRisk.spotsNeededCount {"count":3}')).toBeInTheDocument();
  });

  it('calls an uncapped pod unlimited and drops the open-seats line', () => {
    render(<AttendeesPanel risk={makeRisk({ attendees: attendees({ total_spots: 0, seats_available: 0 }) })} />);

    expect(screen.getByText('4 / admin.podRisk.unlimitedSpots')).toBeInTheDocument();
    expect(screen.queryByText('admin.podRisk.seatsAvailable')).not.toBeInTheDocument();
  });

  it('says a free pod cannot be covered by bookings, whatever the server counted', () => {
    render(<AttendeesPanel risk={makeRisk({ attendees: attendees({ ticket_price: 0, spots_needed: 5 }) })} />);

    expect(screen.getByText('admin.podRisk.freePod')).toBeInTheDocument();
    expect(screen.queryByText(/spotsNeededCount/)).not.toBeInTheDocument();
  });

  it('says so when no number of bookings at this price would cover the cost', () => {
    render(<AttendeesPanel risk={makeRisk({ attendees: attendees({ spots_needed: null }) })} />);

    expect(screen.getByText('admin.podRisk.cannotCover')).toBeInTheDocument();
  });
});

describe('FixList', () => {
  it('lists the four ways out in order, quoting how many spots to fill', () => {
    render(<FixList risk={makeRisk()} />);

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'admin.podRisk.fixShare {"count":3}',
      'admin.podRisk.fixSlot',
      'admin.podRisk.fixPrice',
      'admin.podRisk.fixCancel',
    ]);
  });

  it('leaves out the share step when bookings alone can never cover it', () => {
    render(<FixList risk={makeRisk({ attendees: attendees({ spots_needed: null }) })} />);

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'admin.podRisk.fixSlot',
      'admin.podRisk.fixPrice',
      'admin.podRisk.fixCancel',
    ]);
  });
});

describe('AlertsLine', () => {
  it('says nobody has been alerted yet, and how often alerts will repeat', () => {
    render(<AlertsLine risk={makeRisk()} />);

    expect(screen.getByText('admin.podRisk.alertsNone')).toBeInTheDocument();
    expect(screen.getByText('admin.podRisk.alertsEvery {"vars":{"hours":6}}')).toBeInTheDocument();
  });

  it('reports the rounds sent with when the last went and when the next is due', () => {
    const last = '2026-10-18T08:00:00.000Z';
    const next = '2026-10-18T14:00:00.000Z';
    render(<AlertsLine risk={makeRisk({ alert_count: 2, alerted_at: last, next_alert_at: next })} />);

    const expected = {
      count: 2,
      vars: { last: formatDateTime(last), next: formatDateTime(next) },
    };
    expect(screen.getByText(`admin.podRisk.alertsSent ${JSON.stringify(expected)}`)).toBeInTheDocument();
  });

  it('shows a dash for the next alert when none is scheduled', () => {
    const last = '2026-10-18T08:00:00.000Z';
    render(<AlertsLine risk={makeRisk({ alert_count: 1, alerted_at: last, next_alert_at: null })} />);

    const expected = { count: 1, vars: { last: formatDateTime(last), next: '—' } };
    expect(screen.getByText(`admin.podRisk.alertsSent ${JSON.stringify(expected)}`)).toBeInTheDocument();
  });

  it('treats a count with no timestamp as not alerted', () => {
    render(<AlertsLine risk={makeRisk({ alert_count: 3, alerted_at: null })} />);
    expect(screen.getByText('admin.podRisk.alertsNone')).toBeInTheDocument();
  });
});
