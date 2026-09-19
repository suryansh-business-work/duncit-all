import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import BreakdownChart, { ScopeChip } from '../../../src/pages/entity-analytics/BreakdownChart';
import { byTestId, mount, waitUntil } from '../../dom';
import { COPY, breakdown } from '../../mocks/analytics';
import { charts, optionAt, resetCharts } from '../../mocks/charts';

vi.mock('react-chartjs-2', () => import('../../mocks/charts'));

type TooltipLabel = (item: { parsed: { x: number; y: number } }) => string;

/** The admin's display settings: a 24-hour clock. */
const settingsMock = (): MockedResponse => ({
  request: { query: PUBLIC_APP_SETTINGS },
  result: {
    data: {
      publicAppSettings: {
        __typename: 'PublicAppSettings',
        date_format: 'dd MMM yyyy',
        time_format: 'HH:mm',
        time_zone: 'Asia/Kolkata',
        time_source: 'BROWSER',
        custom_time: null,
        custom_time_set_at: null,
        server_time: '2026-09-18T10:00:00.000Z',
        min_signup_age: 18,
        draft_retention_days: 30,
        ticket_discount_max_pct: 50,
      },
    },
  },
});

function WithSettings({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[settingsMock()]}>
      {children}
    </MockedProvider>
  );
}

const HOURS = breakdown({
  key: 'hour_of_day',
  ordered: true,
  slices: [
    { key: '6', label: null, value: 2 },
    { key: '9', label: null, value: 7 },
    { key: '18', label: null, value: 3 },
  ],
});

beforeEach(() => {
  resetCharts();
});

describe('BreakdownChart', () => {
  it('lays unordered slices as horizontal bars, largest first, without touching the cached list', async () => {
    const byCity = breakdown();
    await mount(
      <WithSettings>
        <BreakdownChart breakdown={byCity} label="Pods by city" />
      </WithSettings>,
    );

    expect(byTestId('analytics-breakdown-pods_by_city').querySelector('[aria-label="Pods by city"]')).not.toBeNull();
    expect(charts.bar?.data.labels).toEqual(['Bengaluru', 'Hyderabad', 'Mysuru']);
    expect(charts.bar?.data.datasets[0].data).toEqual([48, 17, 5]);
    expect(byCity.slices.map((slice) => slice.label)).toEqual(['Mysuru', 'Bengaluru', 'Hyderabad']);

    expect(optionAt(charts.bar, 'indexAxis')).toBe('y');
    expect(optionAt(charts.bar, 'scales.x.beginAtZero')).toBe(true);
    expect(optionAt(charts.bar, 'scales.y.ticks.maxTicksLimit')).toBe(10);
    const label = optionAt(charts.bar, 'plugins.tooltip.callbacks.label') as TooltipLabel;
    expect(label({ parsed: { x: 48, y: 0 } })).toBe('48');
  });

  it('stands ordered slices as columns in their own order, hours in the admin’s clock', async () => {
    await mount(
      <WithSettings>
        <BreakdownChart breakdown={HOURS} label="Pods by start time" />
      </WithSettings>,
    );

    await waitUntil(() => expect(charts.bar?.data.labels).toEqual(['06:00', '09:00', '18:00']));
    expect(charts.bar?.data.datasets[0].data).toEqual([2, 7, 3]);
    expect(optionAt(charts.bar, 'indexAxis')).toBe('x');
    expect(optionAt(charts.bar, 'scales.x.ticks.maxTicksLimit')).toBe(12);
    expect(optionAt(charts.bar, 'scales.y.beginAtZero')).toBe(true);
    const label = optionAt(charts.bar, 'plugins.tooltip.callbacks.label') as TooltipLabel;
    expect(label({ parsed: { x: 0, y: 7 } })).toBe('7');
  });

  it('says there is nothing to show rather than drawing empty bars', async () => {
    await mount(
      <WithSettings>
        <BreakdownChart
          breakdown={breakdown({ slices: [{ key: 'loc-blr', label: 'Bengaluru', value: 0 }] })}
          label="Pods by city"
        />
      </WithSettings>,
    );

    expect(byTestId('analytics-breakdown-pods_by_city').textContent).toBe(COPY['analytics.page.noData']);
    expect(charts.bar).toBeNull();
  });
});

describe('ScopeChip', () => {
  it('marks a breakdown of everything so far as all time', async () => {
    const { container } = await mount(<ScopeChip breakdown={breakdown({ scope: 'ALL_TIME' })} />);
    expect(container.textContent).toBe(COPY['analytics.page.allTime']);
  });

  it('marks a named list as its top ten', async () => {
    const { container } = await mount(<ScopeChip breakdown={breakdown()} />);
    expect(container.textContent).toBe(COPY['analytics.breakdown.topTen']);
  });

  it('says nothing for a breakdown of the period itself', async () => {
    const { container } = await mount(<ScopeChip breakdown={HOURS} />);
    expect(container.childElementCount).toBe(0);
  });
});
