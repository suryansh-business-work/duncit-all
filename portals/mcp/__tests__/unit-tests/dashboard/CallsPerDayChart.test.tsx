import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { charts, optionAt, resetCharts } from '../../mocks/charts';
import { renderWithProviders } from '../../testkit';

vi.mock('react-chartjs-2', () => import('../../mocks/charts'));

import CallsPerDayChart from '../../../src/pages/dashboard/CallsPerDayChart';

const DAYS = [
  { day: '2026-10-24', calls: 0, errors: 0 },
  { day: '2026-10-25', calls: 4, errors: 1 },
  { day: '2026-10-26', calls: 1200, errors: 0 },
];

beforeEach(() => resetCharts());

describe('CallsPerDayChart', () => {
  it('draws calls beside errors, one pair of bars per day', async () => {
    renderWithProviders(<CallsPerDayChart days={DAYS} />);
    await waitFor(() => expect(charts.bar?.data.labels).toEqual(['24 Oct 2026', '25 Oct 2026', '26 Oct 2026']));
    const [calls, errors] = charts.bar?.data.datasets ?? [];
    expect(calls).toMatchObject({ label: 'Calls', data: [0, 4, 1200] });
    expect(errors).toMatchObject({ label: 'Errors', data: [0, 1, 0] });
    expect(calls.backgroundColor).not.toEqual(errors.backgroundColor);
  });

  it('names the chart for a screen reader with the window’s total and dates', async () => {
    renderWithProviders(<CallsPerDayChart days={DAYS} />);
    await waitFor(() =>
      expect(screen.getByRole('img', { name: '1,204 calls from 24 Oct 2026 to 26 Oct 2026' })).toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { name: 'Calls per day' })).toBeInTheDocument();
  });

  it('labels the value axis in grouped whole numbers', async () => {
    renderWithProviders(<CallsPerDayChart days={DAYS} />);
    await waitFor(() => expect(charts.bar).not.toBeNull());
    const tick = optionAt(charts.bar, 'scales.y.ticks.callback') as (value: number) => string;
    expect(tick(1200)).toBe('1,200');
  });
});
