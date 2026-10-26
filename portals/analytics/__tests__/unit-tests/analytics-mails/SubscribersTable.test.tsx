import { describe, expect, it, vi } from 'vitest';
import SubscribersTable from '../../../src/pages/analytics-mails/SubscribersTable';
import type { AnalyticsMailSubscription } from '../../../src/pages/analytics-mails/queries';
import { mount, waitUntil } from '../../dom';
import { COPY } from '../../mocks/analytics';

vi.mock('@duncit/table', () => import('../../mocks/table'));

const subscriber = (over: Partial<AnalyticsMailSubscription> = {}): AnalyticsMailSubscription => ({
  __typename: 'AnalyticsMailSubscription',
  id: 's1',
  name: 'Asha Rao',
  email: 'asha@duncit.test',
  pages: ['PODS'] as AnalyticsMailSubscription['pages'],
  frequency: 'WEEKLY',
  days: 30,
  ai_summary: true,
  is_active: true,
  last_sent_at: null,
  last_status: null,
  last_error: null,
  next_send_at: null,
  created_at: '2026-09-01T09:00:00.000Z',
  ...over,
});

const rowsOf = () => [...document.querySelectorAll('[data-testid="table-row"]')];
const cellOf = (row: Element, field: string) => row.querySelector(`[data-testid="cell-${field}"]`)?.textContent;

const render = async (rows: AnalyticsMailSubscription[]) => {
  await mount(<SubscribersTable rows={rows} onSend={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} sendingId={null} />);
  await waitUntil(() => expect(rowsOf()).toHaveLength(rows.length));
};

describe('SubscribersTable - periods', () => {
  it('names a preset period in words', async () => {
    await render([subscriber({ days: 90 })]);
    expect(cellOf(rowsOf()[0], 'days')).toBe(COPY['analytics.page.days90']);
  });

  it('names a period that is not one of the presets by its day count', async () => {
    await render([subscriber({ days: 14 })]);
    expect(cellOf(rowsOf()[0], 'days')).toBe('14');
  });

  it('words the frequency of each subscriber', async () => {
    await render([subscriber({ id: 's1', name: 'A', frequency: 'DAILY' }), subscriber({ id: 's2', name: 'B', frequency: 'WEEKLY' })]);
    expect(rowsOf().map((row) => cellOf(row, 'frequency'))).toEqual([COPY['analytics.mails.daily'], COPY['analytics.mails.weekly']]);
  });
});
