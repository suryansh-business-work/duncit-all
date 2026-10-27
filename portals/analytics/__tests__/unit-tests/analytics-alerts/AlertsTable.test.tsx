import { describe, expect, it, vi } from 'vitest';
import AlertsTable from '../../../src/pages/analytics-alerts/AlertsTable';
import type { AnalyticsAlert } from '../../../src/pages/analytics-alerts/queries';
import { mount, waitUntil } from '../../dom';
import { COPY } from '../../mocks/analytics';

vi.mock('@duncit/table', () => import('../../mocks/table'));

const alert = (over: Partial<AnalyticsAlert> = {}): AnalyticsAlert => ({
  __typename: 'AnalyticsAlert',
  id: 'a1',
  name: 'Fill rate dip',
  entity: 'PODS',
  kpi_key: 'fill_rate',
  condition: 'FALLS_BY',
  threshold: 15,
  days: 7,
  emails: ['ops@duncit.test'],
  slack: false,
  is_active: true,
  last_checked_at: null,
  last_value: null,
  last_status: null,
  last_error: null,
  last_notified_at: null,
  created_at: '2026-09-01T10:00:00.000Z',
  ...over,
});

const rowsOf = () => [...document.querySelectorAll('[data-testid="table-row"]')];
const cellOf = (row: Element, field: string) => row.querySelector(`[data-testid="cell-${field}"]`)?.textContent;

const render = async (rows: AnalyticsAlert[]) => {
  await mount(<AlertsTable rows={rows} onCheck={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} checkingId={null} />);
  await waitUntil(() => expect(rowsOf()).toHaveLength(rows.length));
};

describe('AlertsTable - rows the dashboards no longer describe', () => {
  it('names a period that is not one of the presets by its day count', async () => {
    await render([alert({ days: 14 })]);
    expect(cellOf(rowsOf()[0], 'days')).toBe('14');
  });

  it('names a preset period in words', async () => {
    await render([alert({ days: 30 })]);
    expect(cellOf(rowsOf()[0], 'days')).toBe(COPY['analytics.page.days30']);
  });

  it('names a dashboard this console has no page for yet (a newer server) by its raw entity, and a tile it no longer has by its key', async () => {
    await render([alert({ entity: 'NEW_DASHBOARD' as never, kpi_key: 'old_tile' })]);
    expect(cellOf(rowsOf()[0], 'name')).toContain(
      COPY['analytics.alerts.tileCaption'].replace('{tile}', 'old_tile').replace('{dashboard}', 'NEW_DASHBOARD'),
    );
  });

  it('names a known tile and dashboard in words', async () => {
    await render([alert()]);
    expect(cellOf(rowsOf()[0], 'name')).toContain(
      COPY['analytics.alerts.tileCaption']
        .replace('{tile}', COPY['analytics.kpi.fillRate'])
        .replace('{dashboard}', COPY['analytics.page.pods.title']),
    );
  });
});
