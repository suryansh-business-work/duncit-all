/**
 * The Targets dashboard against mocked Apollo: this month's numbers, the
 * review queue and the newest growth plan as the server sent them, every tile
 * opening the screen behind it, honest empty states, and a load failure that
 * says so and can be retried.
 */
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockedResponse } from '@apollo/client/testing';
import TargetsOverview from '../../../src/pages/dashboard/TargetsOverview';
import TargetsDashboardPage from '../../../src/pages/dashboard/TargetsDashboardPage';
import { TARGETS_DASHBOARD, type DashboardData } from '../../../src/lib/dashboard-queries';

const { welcomeProps } = vi.hoisted(() => ({ welcomeProps: vi.fn() }));
vi.mock('@duncit/shell', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/shell')>();
  return {
    ...actual,
    // The real greeting needs the `me` query and the layout grid; the page's job is only to hand both its body.
    WelcomeDashboard: (props: { dashboardId: string; tagline: string; children?: ReactNode }) => {
      welcomeProps(props);
      return <div data-testid="welcome">{props.children}</div>;
    },
  };
});

const queueRow = (id: string, name: string, month: string, percent: number, submittedAt: string) => ({
  __typename: 'EmployeeTarget',
  id,
  month,
  employee: { __typename: 'EmployeeTargetPerson', name },
  submission: { __typename: 'EmployeeTargetSubmission', completion_percent: percent, submitted_at: submittedAt },
});

const PLAN = {
  __typename: 'GrowthCalculation',
  id: 'calc-1',
  title: 'Twelve cities',
  created_at: '2026-11-18T09:30:00.000Z',
  calculated_by: { __typename: 'GrowthActor', name: 'Asha Rao' },
  totals: {
    __typename: 'GrowthTotals',
    cities: 12,
    venues: 1200,
    hosts: 2400,
    monthly_pods: 4800,
    total_leads: 48000,
    monthly_gmv: '19200000.00',
    monthly_earnings: '3840000.00',
    annual_earnings: '46080000.00',
  },
};

const BOARD: DashboardData = {
  month: '2026-11',
  current_month: { total: 12, assigned: 5, submitted: 4, reviewed: 3, average_completion: 72.5 },
  active_employees: 30,
  awaiting_review: 6,
  reminders_due: 2,
  saved_calculations: 3,
  review_queue: [
    queueRow('t-1', 'Priya Rao', '2026-10', 90, '2026-11-01T06:00:00.000Z'),
    queueRow('t-2', 'Ravi Kumar', '2026-11', 40, '2026-11-03T06:00:00.000Z'),
  ],
  latest_calculation: PLAN,
};

const EMPTY: DashboardData = {
  month: '2026-11',
  current_month: { total: 0, assigned: 0, submitted: 0, reviewed: 0, average_completion: null },
  active_employees: 0,
  awaiting_review: 0,
  reminders_due: 0,
  saved_calculations: 0,
  review_queue: [],
  latest_calculation: null,
};

const ok = (board: DashboardData): MockedResponse => ({
  request: { query: TARGETS_DASHBOARD },
  result: { data: { targetsDashboard: { __typename: 'TargetsDashboard', ...board } } },
});
const failed: MockedResponse = { request: { query: TARGETS_DASHBOARD }, error: new Error('network down') };

const renderWith = (mocks: MockedResponse[], ui: ReactNode = <TargetsOverview />) =>
  render(
    <MockedProvider mocks={mocks}>
      <MemoryRouter>{ui}</MemoryRouter>
    </MockedProvider>
  );

describe('the numbers', () => {
  it("shows this month's targets, reports, reviews, reminders and plans, each opening its screen", async () => {
    renderWith([ok(BOARD)]);
    expect(screen.getByTestId('targets-dashboard-loading')).toBeInTheDocument();
    expect(await screen.findByText('This month: November 2026')).toBeInTheDocument();

    const tile = (id: string) => screen.getByTestId(`targets-stat-${id}`);
    expect(tile('targets-set')).toHaveTextContent('Targets this month');
    expect(tile('targets-set')).toHaveTextContent('12');
    expect(tile('targets-set')).toHaveTextContent('Active employees: 30');
    expect(tile('reported')).toHaveTextContent('7 of 12');
    expect(tile('reported')).toHaveTextContent('Average completion 72.5%');
    expect(tile('awaiting-review')).toHaveTextContent('6');
    expect(tile('reminders-due')).toHaveTextContent('2');
    expect(tile('saved-plans')).toHaveTextContent('3');

    expect(tile('targets-set')).toHaveAttribute('href', '/employee-targets');
    expect(tile('reminders-due')).toHaveAttribute('href', '/employee-targets');
    expect(tile('saved-plans')).toHaveAttribute('href', '/growth-calculator');
  });

  it('lists the longest-waiting reports with their month and completion, and says how many more wait', async () => {
    renderWith([ok(BOARD)]);
    const rows = await screen.findAllByTestId('targets-queue-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Priya Rao')).toBeInTheDocument();
    expect(within(rows[0]).getByText(/^October 2026 · submitted /)).toBeInTheDocument();
    expect(within(rows[0]).getByText('90%')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.getByText('2 of 6')).toBeInTheDocument();
    expect(screen.getByTestId('targets-queue-open')).toHaveAttribute('href', '/employee-targets');
  });

  it("shows the newest plan's targets and who saved it", async () => {
    renderWith([ok(BOARD)]);
    const plan = await screen.findByTestId('targets-plan');
    expect(within(plan).getByText('Twelve cities')).toBeInTheDocument();
    expect(within(plan).getByText(/^Saved by Asha Rao on /)).toBeInTheDocument();
    expect(within(plan).getByText('Across 12 cities')).toBeInTheDocument();
    expect(screen.getByTestId('targets-plan-monthly-pods')).toHaveTextContent('4,800');
    expect(screen.getByTestId('targets-plan-total-leads')).toHaveTextContent('48,000');
    expect(screen.getByTestId('targets-plan-partners')).toHaveTextContent('1,200 venues · 2,400 hosts');
    expect(screen.getByTestId('targets-plan-monthly-gmv')).toHaveTextContent(/₹1\.9\s?Cr/);
    expect(screen.getByTestId('targets-plan-open')).toHaveAttribute('href', '/growth-calculator');
  });
});

describe('nothing yet', () => {
  it('says no reports are in, nothing waits for review and no plan is saved', async () => {
    renderWith([ok(EMPTY)]);
    expect(await screen.findByTestId('targets-stat-reported')).toHaveTextContent('No reports yet');
    expect(screen.getByTestId('targets-stat-reported')).toHaveTextContent('0 of 0');
    expect(screen.getByTestId('targets-queue-empty')).toHaveTextContent('No reports are waiting for a review.');
    expect(screen.queryByTestId('targets-queue-open')).not.toBeInTheDocument();
    expect(screen.getByTestId('targets-plan-empty')).toHaveTextContent('No growth plan is saved yet.');
    expect(screen.getByTestId('targets-plan-open')).toHaveAttribute('href', '/growth-calculator');
  });
});

describe('a failed load', () => {
  it('says the dashboard could not load, and Try again fetches it', async () => {
    renderWith([failed, ok(BOARD)]);
    expect(await screen.findByTestId('targets-dashboard-error')).toHaveTextContent(
      'The dashboard could not load. Try again in a moment.'
    );
    fireEvent.click(screen.getByTestId('targets-dashboard-retry'));
    expect(await screen.findByTestId('targets-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('targets-dashboard-error')).not.toBeInTheDocument();
  });
});

describe('the page', () => {
  it("puts the overview inside the shared greeting, under this console's own layout key and tagline", async () => {
    renderWith([ok(BOARD)], <TargetsDashboardPage />);
    expect(await screen.findByTestId('targets-dashboard')).toBeInTheDocument();
    expect(welcomeProps).toHaveBeenCalledWith(
      expect.objectContaining({ dashboardId: 'targets.overview', tagline: 'Every goal Duncit is chasing, in one place.' })
    );
  });
});
