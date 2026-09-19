import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';
import { createTranslator } from '@duncit/app-settings';
import { buildAnalyticsWidgets } from '../../../src/pages/entity-analytics/widgets';
import { COPY, board, breakdown, leaderboard, trend } from '../../mocks/analytics';

const { t } = createTranslator({ locale: 'en-IN', fallback: COPY });

const byId = (widgets: ReturnType<typeof buildAnalyticsWidgets>, id: string) => {
  const widget = widgets.find((candidate) => candidate.id === id);
  if (!widget) throw new Error(`no widget ${id}`);
  return widget;
};

describe('buildAnalyticsWidgets', () => {
  it('turns every number, trend, breakdown and the ranking into its own widget, keyed by the server', () => {
    const widgets = buildAnalyticsWidgets(board(), t);
    expect(widgets.map((widget) => widget.id)).toEqual([
      'kpi-pods_held',
      'kpi-fill_rate',
      'kpi-revenue',
      'kpi-avg_rating',
      'kpi-cancellation_rate',
      'trend-pods',
      'trend-bookings',
      'trend-revenue',
      'breakdown-pods_by_city',
      'breakdown-weekday',
      'breakdown-fill_band',
      'breakdown-hour_of_day',
      'leaderboard-top_clubs',
    ]);
    expect(widgets.every((widget) => isValidElement(widget.content))).toBe(true);
  });

  it('lays the headline tiles four to a row, bare', () => {
    const widgets = buildAnalyticsWidgets(board(), t);
    expect(byId(widgets, 'kpi-pods_held')).toMatchObject({ bare: true, defaultLayout: { x: 0, y: 0, w: 3, h: 2 } });
    expect(byId(widgets, 'kpi-avg_rating').defaultLayout).toEqual({ x: 9, y: 0, w: 3, h: 2 });
    expect(byId(widgets, 'kpi-cancellation_rate').defaultLayout).toEqual({ x: 0, y: 2, w: 3, h: 2 });
  });

  it('pairs the trends below the tiles and stretches a lone last one across the row', () => {
    const widgets = buildAnalyticsWidgets(board(), t);
    expect(byId(widgets, 'trend-pods')).toMatchObject({
      title: COPY['analytics.trend.pods'],
      subtitle: COPY['analytics.trend.podsHint'],
      fitContent: true,
      defaultLayout: { x: 0, y: 4, w: 6, h: 5 },
    });
    expect(byId(widgets, 'trend-bookings').defaultLayout).toEqual({ x: 6, y: 4, w: 6, h: 5 });
    expect(byId(widgets, 'trend-revenue').defaultLayout).toEqual({ x: 0, y: 9, w: 12, h: 5 });
  });

  it('keeps a pair of trends side by side when neither is alone', () => {
    const widgets = buildAnalyticsWidgets(board({ trends: [trend({ key: 'pods' }), trend({ key: 'bookings' })] }), t);
    expect(byId(widgets, 'trend-bookings').defaultLayout).toEqual({ x: 6, y: 4, w: 6, h: 5 });
  });

  it('lays the breakdowns three to a row under the trends', () => {
    const widgets = buildAnalyticsWidgets(board(), t);
    expect(byId(widgets, 'breakdown-pods_by_city')).toMatchObject({
      title: COPY['analytics.breakdown.podsByCity'],
      defaultLayout: { x: 0, y: 14, w: 4, h: 5 },
    });
    expect(byId(widgets, 'breakdown-hour_of_day').defaultLayout).toEqual({ x: 0, y: 19, w: 4, h: 5 });
  });

  it('puts the ranking last, full width, edge to edge', () => {
    const widgets = buildAnalyticsWidgets(board(), t);
    expect(byId(widgets, 'leaderboard-top_clubs')).toMatchObject({
      title: COPY['analytics.leaderboard.topClubs'],
      subtitle: COPY['analytics.leaderboard.topClubsHint'],
      disablePadding: true,
      defaultLayout: { x: 0, y: 24, w: 12, h: 8 },
    });
  });

  it('adds no ranking where the server sends none', () => {
    const widgets = buildAnalyticsWidgets(board({ leaderboard: null }), t);
    expect(widgets.some((widget) => widget.id.startsWith('leaderboard-'))).toBe(false);
  });

  it('titles a panel with its raw key when the console has no words for it yet', () => {
    const widgets = buildAnalyticsWidgets(
      board({
        trends: [trend({ key: 'mystery_trend' })],
        breakdowns: [breakdown({ key: 'mystery_breakdown' })],
        leaderboard: leaderboard({ key: 'mystery_ranking' }),
      }),
      t,
    );
    expect(byId(widgets, 'trend-mystery_trend')).toMatchObject({ title: 'mystery_trend', subtitle: undefined });
    expect(byId(widgets, 'breakdown-mystery_breakdown').title).toBe('mystery_breakdown');
    expect(byId(widgets, 'leaderboard-mystery_ranking')).toMatchObject({ title: 'mystery_ranking', subtitle: undefined });
  });
});
