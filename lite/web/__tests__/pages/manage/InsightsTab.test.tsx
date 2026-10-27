import type { MockedResponse } from '@apollo/client/testing';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LITE_EVENT_INSIGHTS, type LiteInsightDay } from '../../../graphql/events';
import { InsightsTab } from '../../../pages/manage/InsightsTab';
import { renderWithProviders, typed } from '../../test-utils';
import { apiRefusal, hostedEvent } from './manage-mocks';

const day = (date: string, views: number, registrations: number): LiteInsightDay => typed('LiteInsightDay', { day: date, views, registrations });

const insightsMock = (days: number, series: LiteInsightDay[]): MockedResponse => ({
  request: { query: LITE_EVENT_INSIGHTS, variables: { event_id: 'ev-1', days } },
  result: {
    data: {
      liteEventInsights: typed('LiteEventInsights', {
        days,
        total_views: series.reduce((sum, d) => sum + d.views, 0),
        total_registrations: series.reduce((sum, d) => sum + d.registrations, 0),
        series,
      }),
    },
  },
});

const renderTab = (mocks: MockedResponse[], route = '/e/garden-party/manage?selectedtab=insights') =>
  renderWithProviders(<InsightsTab event={hostedEvent()} />, { mocks, path: '/e/:slug/manage', route });

describe('InsightsTab', () => {
  it('offers 7, 30 and 90 days as a labelled toggle, 7 by default', async () => {
    renderTab([insightsMock(7, [])]);

    const range = screen.getByRole('group', { name: 'Time range' });
    const buttons = within(range).getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(['7 days', '30 days', '90 days']);
    expect(within(range).getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
    await screen.findByTestId('insights-views');
  });

  it('shows zero totals and an empty state, with no chart, before anyone visits', async () => {
    renderTab([insightsMock(7, [day('2026-11-01', 0, 0)])]);

    expect(await screen.findByText('No views yet')).toBeInTheDocument();
    expect(screen.getByText('Share the event link and the numbers will start showing up here.')).toBeInTheDocument();
    expect(screen.getByTestId('insights-views')).toHaveTextContent('0');
    expect(screen.getByTestId('insights-registrations')).toHaveTextContent('0');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('totals the window and gives screen readers the per-day numbers as a captioned table', async () => {
    renderTab([insightsMock(7, [day('2026-11-01', 10, 2), day('2026-11-02', 4, 1), day('2026-11-03', 0, 0)])]);

    const table = await screen.findByRole('table', { name: 'Page views and registrations per day, last 7 days' });
    expect(screen.getByTestId('insights-views')).toHaveTextContent('14');
    expect(screen.getByTestId('insights-registrations')).toHaveTextContent('3');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Day', 'Page views', 'Registrations']);
    const rows = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent));
    expect(rows).toEqual([
      ['2026-11-01', '10', '2'],
      ['2026-11-02', '4', '1'],
      ['2026-11-03', '0', '0'],
    ]);
    // The bars are drawn for sighted readers only; the table carries the same numbers.
    expect(screen.getByTitle('2026-11-01: 10').parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTitle('2026-11-03: 0')).toBeInTheDocument();
    expect(screen.queryByText('No views yet')).not.toBeInTheDocument();
  });

  it('reads the window from the URL and loads that many days', async () => {
    renderTab([insightsMock(90, [day('2026-09-01', 3, 0)])], '/e/garden-party/manage?selectedtab=insights&days=90');

    expect(await screen.findByRole('table', { name: 'Page views and registrations per day, last 90 days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '90 days' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches the window, keeping it in the URL', async () => {
    const { user, router } = renderTab([insightsMock(7, [day('2026-11-01', 1, 0)]), insightsMock(30, [day('2026-10-10', 6, 2)])]);
    await screen.findByRole('table', { name: 'Page views and registrations per day, last 7 days' });

    await user.click(screen.getByRole('button', { name: '30 days' }));

    expect(await screen.findByRole('table', { name: 'Page views and registrations per day, last 30 days' })).toBeInTheDocument();
    expect(screen.getByTestId('insights-views')).toHaveTextContent('6');
    expect(new URLSearchParams(router.state.location.search).get('days')).toBe('30');
    expect(new URLSearchParams(router.state.location.search).get('selectedtab')).toBe('insights');
  });

  it('ignores a click on the window already chosen', async () => {
    const { user, router } = renderTab([insightsMock(7, [day('2026-11-01', 1, 0)])]);
    await screen.findByTestId('insights-views');

    await user.click(screen.getByRole('button', { name: '7 days' }));

    expect(new URLSearchParams(router.state.location.search).get('days')).toBeNull();
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows why the numbers could not load', async () => {
    renderTab([{ ...insightsMock(7, []), result: apiRefusal('Insights are for hosts only') }]);

    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Insights are for hosts only');
  });
});
