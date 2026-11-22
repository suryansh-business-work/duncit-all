import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { LEAD_QUALITY_ANALYTICS } from '@/api/leadQuality.gql';
import LeadQualityAnalyticsPage from '@/pages/lead-quality-analytics';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { analytics, analyticsMock, typeStats } from './fixtures';

// Chart.js draws on a <canvas> jsdom cannot paint; the stub keeps the chart's own text alternative.
vi.mock('react-chartjs-2', () => {
  const stub = (kind: string) => (props: { 'aria-label'?: string }) => <canvas role="img" aria-label={props['aria-label']} data-chart={kind} />;
  return { Bar: stub('bar'), Line: stub('line') };
});

const ROUTE = { route: '/lead-quality/analytics' };

beforeEach(() => {
  window.localStorage.clear();
});

describe('Lead Quality Analytics page', () => {
  it('shows a card per lead type with its average-score ring and qualification counts', async () => {
    renderWithApollo(<LeadQualityAnalyticsPage />, [analyticsMock(null, analytics())], ROUTE);

    expect(screen.getByRole('heading', { name: 'Lead Quality Analytics', level: 1 })).toBeInTheDocument();
    const venue = await screen.findByTestId('type-card-VENUE_LEAD');
    expect(within(venue).getByRole('heading', { name: 'Venue lead', level: 3 })).toBeInTheDocument();
    expect(within(venue).getByRole('img', { name: 'Average quality score 61.3 out of 100' })).toBeInTheDocument();
    expect(venue).toHaveTextContent('10 of 12 scored');
    expect(within(venue).getByTestId('stat-VENUE_LEAD-qualified')).toHaveTextContent('4');
    expect(within(venue).getByTestId('stat-VENUE_LEAD-not-qualified')).toHaveTextContent('3');
    expect(within(venue).getByTestId('stat-VENUE_LEAD-failed-gates')).toHaveTextContent('2');
    expect(within(venue).getByTestId('stat-VENUE_LEAD-pending-items')).toHaveTextContent('17');
    const host = screen.getByTestId('type-card-HOST_LEAD');
    expect(within(host).getByRole('img', { name: 'Average quality score 48 out of 100' })).toBeInTheDocument();
    expect(host).toHaveTextContent('5 of 5 scored');
    expect(screen.getByText(/^Updated /)).toBeInTheDocument();
  });

  it('lists the top leads, each linking to its CRM page, with cities and conversion by classification', async () => {
    renderWithApollo(<LeadQualityAnalyticsPage />, [analyticsMock(null, analytics())], ROUTE);

    const top = await screen.findByTestId('top-leads');
    expect(await within(top).findByRole('link', { name: 'Grand Hall' })).toHaveAttribute('href', '/venue-leads/v1/view');
    expect(within(top).getByRole('link', { name: 'Asha Rao' })).toHaveAttribute('href', '/host-leads/h1/view');
    expect(top).toHaveTextContent('92/100');
    expect(top).toHaveTextContent('77.5/100');
    expect(within(top).getByText('Pending verification')).toBeInTheDocument();

    const cities = screen.getByTestId('cities');
    expect(await within(cities).findByText('Mumbai')).toBeInTheDocument();
    expect(cities).toHaveTextContent('66.4');
    // 3 of Mumbai's 8 scored leads qualified.
    expect(cities).toHaveTextContent('38%');

    const conversion = screen.getByTestId('conversion');
    expect(await within(conversion).findByText('Excellent')).toBeInTheDocument();
    expect(conversion).toHaveTextContent('50%');
  });

  it('compares researched with hand-entered leads and shows the research queue and evidence gaps', async () => {
    renderWithApollo(<LeadQualityAnalyticsPage />, [analyticsMock(null, analytics())], ROUTE);

    const origins = await screen.findByTestId('origins');
    expect(within(origins).getByRole('heading', { name: 'From Lead Research' })).toBeInTheDocument();
    expect(within(origins).getByTestId('stat-RESEARCH-leads')).toHaveTextContent('6');
    expect(within(origins).getByTestId('stat-RESEARCH-average')).toHaveTextContent('72');
    expect(within(origins).getByTestId('stat-RESEARCH-rate')).toHaveTextContent('50%');
    expect(within(origins).getByTestId('stat-MANUAL-leads')).toHaveTextContent('9');
    expect(within(origins).getByTestId('stat-MANUAL-rate')).toHaveTextContent('22%');

    const queue = screen.getByTestId('research-queue');
    expect(within(queue).getByTestId('stat-queue-NEW')).toHaveTextContent('9');
    expect(queue).toHaveTextContent('New');
    expect(queue).toHaveTextContent('Added: average score 81');

    const gaps = screen.getByTestId('evidence-gaps');
    expect(within(gaps).getByTestId('stat-duplicate-leads')).toHaveTextContent('3');
    expect(await within(gaps).findByText('Google reviews')).toBeInTheDocument();
  });

  it('describes each chart with its numbers and can show the same numbers as a table', async () => {
    renderWithApollo(<LeadQualityAnalyticsPage />, [analyticsMock(null, analytics())], ROUTE);

    const distribution = await screen.findByTestId('distribution');
    // Both lead types' buckets are added up.
    expect(within(distribution).getByRole('img', { name: 'Scored leads by score band. 0-19: 2, 20-39: 4, 40-59: 6, 60-79: 0, 80-100: 8' })).toBeInTheDocument();
    expect(within(screen.getByTestId('classifications')).getByRole('img', { name: 'Scored leads by classification. Excellent: 8, Average: 6, Weak: 6' })).toBeInTheDocument();
    expect(within(screen.getByTestId('trend')).getByRole('img', { name: /Week of .+: average 58 from 4 leads; Week of .+: average 63\.5 from 6 leads$/ })).toBeInTheDocument();

    fireEvent.click(within(distribution).getByRole('button', { name: 'Show table' }));

    expect(await within(distribution).findByText('80-100')).toBeInTheDocument();
    expect(within(distribution).queryByRole('img')).toBeNull();
    expect(within(distribution).getByRole('button', { name: 'Show chart' })).toBeInTheDocument();
  });

  it('asks for one lead type when its tab is picked', async () => {
    renderWithApollo(
      <LeadQualityAnalyticsPage />,
      [analyticsMock(null, analytics()), analyticsMock('VENUE_LEAD', analytics({ by_type: [typeStats('VENUE_LEAD', { average_score: 70 })] }))],
      ROUTE
    );
    await screen.findByTestId('type-card-HOST_LEAD');

    fireEvent.click(screen.getByTestId('analytics-type-VENUE_LEAD'));

    expect(await screen.findByRole('img', { name: 'Average quality score 70 out of 100' })).toBeInTheDocument();
    expect(screen.queryByTestId('type-card-HOST_LEAD')).toBeNull();
    expect(screen.getByTestId('location')).toHaveTextContent('selectedtab=VENUE_LEAD');
  });

  it('says there is nothing to analyse when no lead is scored and the queue is empty', async () => {
    const empty = analytics({
      by_type: [typeStats('VENUE_LEAD', { total: 0, scored: 0, average_score: null, qualified: 0, not_qualified: 0, pending_verification: 0 })],
      research_queue: [],
    });
    renderWithApollo(<LeadQualityAnalyticsPage />, [analyticsMock(null, empty)], ROUTE);

    expect(await screen.findByTestId('analytics-empty')).toHaveTextContent('No leads to analyse yet');
    expect(screen.queryByTestId('type-card-VENUE_LEAD')).toBeNull();
  });

  it('shows why the analytics could not load, and loads them on Try again', async () => {
    renderWithApollo(
      <LeadQualityAnalyticsPage />,
      [
        { request: { query: LEAD_QUALITY_ANALYTICS, variables: { entity_type: null } }, error: new Error('Analytics are unavailable') },
        analyticsMock(null, analytics()),
      ],
      ROUTE
    );

    expect(await screen.findByText('Analytics are unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByTestId('type-card-VENUE_LEAD')).toBeInTheDocument());
    expect(screen.queryByText('Analytics are unavailable')).toBeNull();
  });
});
