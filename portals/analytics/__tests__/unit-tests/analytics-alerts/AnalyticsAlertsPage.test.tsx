import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import { notify, notifyError, notifySuccess } from '@duncit/dialogs';
import AnalyticsAlertsPage from '../../../src/pages/analytics-alerts/AnalyticsAlertsPage';
import {
  ANALYTICS_ALERTS,
  CHECK_ANALYTICS_ALERT_NOW,
  CREATE_ANALYTICS_ALERT,
  DELETE_ANALYTICS_ALERT,
  type AnalyticsAlert,
} from '../../../src/pages/analytics-alerts/queries';
import { ENTITY_ANALYTICS } from '../../../src/pages/entity-analytics/queries';
import { byTestId, click, mount, queryTestId, settle, typeInto, waitUntil } from '../../dom';
import { COPY, board } from '../../mocks/analytics';

const confirm = vi.hoisted(() => vi.fn());

vi.mock('@duncit/table', () => import('../../mocks/table'));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  useConfirm: () => confirm,
}));

const alert = (over: Partial<AnalyticsAlert> = {}): AnalyticsAlert => ({
  __typename: 'AnalyticsAlert',
  id: 'a1',
  name: 'Fill rate dip',
  entity: 'PODS',
  kpi_key: 'fill_rate',
  condition: 'FALLS_BY',
  threshold: 15,
  days: 7,
  emails: ['ops@duncit.test', 'lead@duncit.test'],
  slack: true,
  is_active: true,
  last_checked_at: '2026-10-01T10:00:00.000Z',
  last_value: 61,
  last_status: 'TRIGGERED',
  last_error: null,
  last_notified_at: null,
  created_at: '2026-09-01T10:00:00.000Z',
  ...over,
});

const ALERTS = [
  alert(),
  alert({ id: 'a2', name: 'Revenue floor', kpi_key: 'revenue', condition: 'BELOW', threshold: 100000, days: 30, emails: [], slack: false, is_active: false, last_status: null, last_checked_at: null }),
  alert({ id: 'a3', name: 'Broken tile', kpi_key: 'old_tile', last_status: 'ERROR', last_error: 'TILE_GONE' }),
];

const list = (rows: AnalyticsAlert[]): MockedResponse => ({
  request: { query: ANALYTICS_ALERTS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { analyticsAlerts: rows } },
});

const tiles: MockedResponse = {
  request: { query: ENTITY_ANALYTICS, variables: (v: Record<string, unknown>) => Boolean(v) },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { entityAnalytics: board() } },
};

const check = (result: { status: string; value?: number | null; error?: string | null; notified: boolean }): MockedResponse => ({
  request: { query: CHECK_ANALYTICS_ALERT_NOW, variables: { id: 'a1' } },
  result: { data: { checkAnalyticsAlertNow: { __typename: 'AnalyticsAlertCheckResult', value: null, error: null, ...result } } },
});

const page = (mocks: MockedResponse[]) =>
  mount(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[list(ALERTS), tiles, ...mocks]}>
      <AnalyticsAlertsPage />
    </MockedProvider>,
  );

const rows = () => [...document.querySelectorAll('[data-testid="table-row"]')];

beforeEach(() => {
  confirm.mockReset();
  vi.mocked(notify).mockClear();
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
});

describe('Analytics alerts — the list', () => {
  it('shows each alert with its tile, rule, period, audience and last check', async () => {
    await page([]);
    await waitUntil(() => expect(rows()).toHaveLength(3));
    // Sorted by name: Broken tile, Fill rate dip, Revenue floor.
    const [third, first, second] = rows();
    expect(first.textContent).toContain('Fill rate dip');
    expect(first.textContent).toContain(COPY['analytics.kpi.fillRate']);
    expect(first.textContent).toContain(COPY['analytics.alerts.conditionFallsBy']);
    // A change threshold reads as a percentage, a value as a plain number.
    expect(first.textContent).toContain('15');
    expect(first.textContent).toContain(COPY['analytics.alerts.statusTriggered']);
    expect(second.textContent).toContain(COPY['analytics.alerts.paused']);
    expect(second.textContent).toContain(COPY['analytics.alerts.never']);
    // An unknown tile falls back to its raw key; an ERROR check carries its reason.
    expect(third.textContent).toContain('old_tile');
    expect(third.textContent).toContain(COPY['analytics.alerts.statusError']);
  });

  it('retries a failed read instead of showing an empty table', async () => {
    const failing: MockedResponse = { request: { query: ANALYTICS_ALERTS }, result: { errors: [new GraphQLError('Analytics down')] } };
    await mount(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[failing, list(ALERTS), tiles]}>
        <AnalyticsAlertsPage />
      </MockedProvider>,
    );
    await waitUntil(() => expect(document.body.textContent).toContain('Analytics down'));
    expect(queryTestId('duncit-table')).toBeNull();
    const retry = [...document.querySelectorAll('button')].find((b) => b.textContent === COPY['analytics.page.retry']) as HTMLElement;
    await click(retry);
    await waitUntil(() => expect(rows()).toHaveLength(3));
  });
});

describe('Analytics alerts — row actions', () => {
  const press = async (id: string) => {
    await waitUntil(() => expect(queryTestId(`analytics-alert-check-${id}`)).not.toBeNull());
    await click(byTestId(`analytics-alert-check-${id}`));
    await settle(20);
  };

  it('says when a check found nothing wrong', async () => {
    await page([check({ status: 'OK', value: 70, notified: false })]);
    await press('a1');
    await waitUntil(() => expect(notify).toHaveBeenCalledWith(COPY['analytics.alerts.checkedOk'].replace('{name}', 'Fill rate dip')));
  });

  it('says whether a tripped alert reached its people', async () => {
    await page([check({ status: 'TRIGGERED', value: 40, notified: true })]);
    await press('a1');
    await waitUntil(() => expect(notifySuccess).toHaveBeenCalledWith(COPY['analytics.alerts.checkedTripped'].replace('{name}', 'Fill rate dip')));
  });

  it('reports a tripped alert that could not be sent', async () => {
    await page([check({ status: 'TRIGGERED', value: 40, notified: false })]);
    await press('a1');
    await waitUntil(() => expect(notifyError).toHaveBeenCalledWith(COPY['analytics.alerts.checkedNotSent'].replace('{name}', 'Fill rate dip')));
  });

  it('words an error from the check with its own explanation', async () => {
    await page([check({ status: 'ERROR', error: 'NO_COMPARISON', notified: false })]);
    await press('a1');
    await waitUntil(() => expect(notifyError).toHaveBeenCalledWith(COPY['analytics.alerts.errorNoComparison']));
  });

  it('reports a check the server refused', async () => {
    const refused: MockedResponse = { request: { query: CHECK_ANALYTICS_ALERT_NOW, variables: { id: 'a1' } }, result: { errors: [new GraphQLError('Not allowed')] } };
    await page([refused]);
    await press('a1');
    await waitUntil(() => expect(notifyError).toHaveBeenCalled());
  });

  it('removes an alert only after the operator confirms, naming it', async () => {
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const removal: MockedResponse = {
      request: { query: DELETE_ANALYTICS_ALERT, variables: { id: 'a1' } },
      result: { data: { deleteAnalyticsAlert: true } },
    };
    await page([removal]);
    await waitUntil(() => expect(rows()).toHaveLength(3));
    const removeButton = () => rows()[1].querySelector(`button[aria-label="${COPY['analytics.alerts.remove']}"]`) as HTMLElement;
    await click(removeButton());
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0]).toMatchObject({ destructive: true });
    expect(confirm.mock.calls[0][0].message).toContain('Fill rate dip');
    expect(notifySuccess).not.toHaveBeenCalled();
    await click(removeButton());
    await waitUntil(() => expect(notifySuccess).toHaveBeenCalledWith(COPY['analytics.alerts.removed']));
  });
});

describe('Analytics alerts — add dialog', () => {
  const field = (id: string) => byTestId(id) as HTMLInputElement;

  it('names what is missing and sends nothing until the alert is complete', async () => {
    await page([]);
    await waitUntil(() => expect(queryTestId('analytics-alert-add')).not.toBeNull());
    await click(byTestId('analytics-alert-add'));
    await waitUntil(() => expect(queryTestId('analytics-alert-form')).not.toBeNull());
    await click(byTestId('analytics-alert-save'));
    await waitUntil(() => expect(document.body.textContent).toContain(COPY['analytics.alerts.nameRequired']));
    expect(document.body.textContent).toContain(COPY['analytics.alerts.tileRequired']);
    expect(document.body.textContent).toContain(COPY['analytics.alerts.thresholdRequired']);
    expect(document.body.textContent).toContain(COPY['analytics.alerts.recipientsRequired']);
  });

  it('creates an alert from what was typed', async () => {
    const created: MockedResponse = {
      request: {
        query: CREATE_ANALYTICS_ALERT,
        variables: (v: { input: Record<string, unknown> }) => v.input.name === 'Cancel spike' && v.input.threshold === 10 && v.input.slack === true,
      },
      result: { data: { createAnalyticsAlert: alert({ id: 'new', name: 'Cancel spike' }) } },
    };
    await page([created]);
    await waitUntil(() => expect(queryTestId('analytics-alert-add')).not.toBeNull());
    await click(byTestId('analytics-alert-add'));
    await waitUntil(() => expect(queryTestId('analytics-alert-form')).not.toBeNull());
    await typeInto(field('analytics-alert-name'), 'Cancel spike');
    await typeInto(field('analytics-alert-threshold'), '10');
    // The tile list arrives from the dashboard itself.
    await waitUntil(() => expect(document.querySelector('[data-testid="analytics-alert-tile"]')?.closest('.MuiInputBase-root')?.querySelector('[role="combobox"]')).not.toBeNull());
    const tile = byTestId('analytics-alert-tile').closest('.MuiInputBase-root')?.querySelector('[role="combobox"]') as HTMLElement;
    await act2(() => tile.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })));
    await waitUntil(() => expect(document.querySelector('[role="option"]')).not.toBeNull());
    await click([...document.querySelectorAll('[role="option"]')].find((o) => o.textContent === COPY['analytics.kpi.fillRate']) as HTMLElement);
    await typeInto(field('analytics-alert-recipients'), 'ops@duncit.test');
    await act2(() => field('analytics-alert-recipients').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    // Slack is switched on in the form's own switch.
    const slack = [...document.querySelectorAll('input[type="checkbox"]')].find((box) => box.closest('label')?.textContent === COPY['analytics.alerts.slack']) as HTMLElement;
    await click(slack);
    await click(byTestId('analytics-alert-save'));
    await waitUntil(() => expect(notifySuccess).toHaveBeenCalledWith(COPY['analytics.alerts.added']));
  });
});

/** An event dispatched inside React's act, so state updates flush before the next assertion. */
async function act2(run: () => unknown) {
  const { act } = await import('react');
  await act(async () => {
    run();
  });
}
