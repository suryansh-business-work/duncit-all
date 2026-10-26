import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import AlertDialog from '../../../src/pages/analytics-alerts/AlertDialog';
import {
  CREATE_ANALYTICS_ALERT,
  UPDATE_ANALYTICS_ALERT,
  type AnalyticsAlert,
} from '../../../src/pages/analytics-alerts/queries';
import { ENTITY_ANALYTICS } from '../../../src/pages/entity-analytics/queries';
import { byTestId, chooseOption, click, mount, queryTestId, settle, typeInto, waitUntil } from '../../dom';
import { COPY, board, kpi } from '../../mocks/analytics';

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
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

/** The dashboard's tiles: two with a previous period, and one live count (previous null) under an unknown key. */
const tiles: MockedResponse = {
  request: { query: ENTITY_ANALYTICS, variables: (v: Record<string, unknown>) => Boolean(v) },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      entityAnalytics: board({
        kpis: [
          kpi({ key: 'fill_rate', format: 'PERCENT' }),
          kpi({ key: 'pods_held' }),
          kpi({ key: 'brand_new_tile', previous: null }),
        ],
      }),
    },
  },
};

const mutation = (query: typeof UPDATE_ANALYTICS_ALERT | typeof CREATE_ANALYTICS_ALERT, result: MockedResponse['result']): MockedResponse => ({
  request: { query, variables: () => true },
  result,
});

const open = async (editing: AnalyticsAlert | null, mocks: MockedResponse[] = []) => {
  const onClose = vi.fn();
  await mount(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[tiles, ...mocks]}>
      <AlertDialog alert={editing} onClose={onClose} />
    </MockedProvider>,
  );
  await waitUntil(() => expect(queryTestId('analytics-alert-form')).not.toBeNull());
  // The tile choices arrive from the dashboard itself.
  await settle(20);
  return onClose;
};
const input = (id: string) => byTestId(id) as HTMLInputElement;
const save = () => click(byTestId('analytics-alert-save'));
const shown = (text: string) => document.body.textContent?.includes(text) ?? false;

beforeEach(() => {
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
});

describe('AlertDialog - editing', () => {
  it('is titled for editing and starts from the alert as it is saved', async () => {
    await open(alert());
    expect(shown(COPY['analytics.alerts.editAlert'])).toBe(true);
    expect(input('analytics-alert-name').value).toBe('Fill rate dip');
    expect(input('analytics-alert-threshold').value).toBe('15');
  });

  it('sends the changed alert to the one being edited, says so, and closes', async () => {
    let sent: unknown = null;
    const updated: MockedResponse = {
      request: { query: UPDATE_ANALYTICS_ALERT, variables: () => true },
      result: (variables: unknown) => {
        sent = variables;
        return { data: { updateAnalyticsAlert: alert({ name: 'Renamed' }) } };
      },
    };
    const onClose = await open(alert(), [updated]);
    await typeInto(input('analytics-alert-name'), '  Renamed  ');
    await save();
    await waitUntil(() => expect(notifySuccess).toHaveBeenCalledWith(COPY['analytics.alerts.saved']));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(sent).toEqual({
      id: 'a1',
      input: {
        name: 'Renamed',
        entity: 'PODS',
        kpi_key: 'fill_rate',
        condition: 'FALLS_BY',
        threshold: 15,
        days: 7,
        emails: ['ops@duncit.test'],
        slack: false,
        is_active: true,
      },
    });
  });

  it('reports a refused update and stays open', async () => {
    const onClose = await open(alert(), [mutation(UPDATE_ANALYTICS_ALERT, { errors: [new GraphQLError('Not allowed')] })]);
    await save();
    await waitUntil(() => expect(notifyError).toHaveBeenCalledTimes(1));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('refuses a change alert whose threshold is not above zero', async () => {
    const onClose = await open(alert({ threshold: 0 }));
    await save();
    await waitUntil(() => expect(shown(COPY['analytics.alerts.thresholdPositive'])).toBe(true));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('allows a zero threshold when the alert compares with a value', async () => {
    const onClose = await open(alert({ condition: 'BELOW', threshold: 0 }), [
      mutation(UPDATE_ANALYTICS_ALERT, { data: { updateAnalyticsAlert: alert({ condition: 'BELOW', threshold: 0 }) } }),
    ]);
    await save();
    await waitUntil(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(shown(COPY['analytics.alerts.thresholdPositive'])).toBe(false);
  });
});

describe('AlertDialog - creating', () => {
  it('is titled for adding, starts blank, and reports a refused create', async () => {
    const onClose = await open(null, [mutation(CREATE_ANALYTICS_ALERT, { errors: [new GraphQLError('Too many alerts')] })]);
    expect(shown(COPY['analytics.alerts.addAlert'])).toBe(true);
    expect(input('analytics-alert-name').value).toBe('');
    await typeInto(input('analytics-alert-name'), 'Cancel spike');
    await typeInto(input('analytics-alert-threshold'), '10');
    await chooseOption('analytics-alert-tile', COPY['analytics.kpi.fillRate']);
    const slack = [...document.querySelectorAll('input[type="checkbox"]')].find((box) => box.closest('label')?.textContent === COPY['analytics.alerts.slack']) as HTMLElement;
    await click(slack);
    await save();
    await waitUntil(() => expect(notifyError).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('clears the chosen tile when another dashboard is picked, since the old one names none of its tiles', async () => {
    await open(alert());
    await chooseOption('analytics-alert-dashboard', COPY['analytics.page.clubs.title']);
    await waitUntil(() => expect(shown(COPY['analytics.alerts.tileHint']) || shown(COPY['analytics.alerts.tilesLoading'])).toBe(true));
    await save();
    await waitUntil(() => expect(shown(COPY['analytics.alerts.tileRequired'])).toBe(true));
  });
});

describe('AlertDialog - the rule', () => {
  it('measures a change in percent, and a value in the number\'s own units', async () => {
    await open(alert());
    expect(shown(COPY['analytics.alerts.thresholdChangeHint'])).toBe(true);
    expect(byTestId('analytics-alert-threshold').closest('.MuiInputBase-root')?.textContent).toContain('%');
    await chooseOption('analytics-alert-condition', COPY['analytics.alerts.conditionAbove']);
    await waitUntil(() => expect(shown(COPY['analytics.alerts.thresholdValueHint'])).toBe(true));
    expect(byTestId('analytics-alert-threshold').closest('.MuiInputBase-root')?.textContent).not.toContain('%');
  });

  it('explains that a live count has no earlier period, and disables the change conditions for it', async () => {
    await open(alert({ kpi_key: 'brand_new_tile', condition: 'ABOVE' }));
    expect(shown(COPY['analytics.alerts.liveTileHint'])).toBe(true);
    const combobox = byTestId('analytics-alert-condition').closest('.MuiInputBase-root')?.querySelector('[role="combobox"]') as HTMLElement;
    await act(async () => {
      combobox.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    });
    await waitUntil(() => expect(document.querySelector('[role="option"]')).not.toBeNull());
    const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
    const state = (text: string) => options.find((o) => o.textContent === text)?.getAttribute('aria-disabled');
    expect(state(COPY['analytics.alerts.conditionRisesBy'])).toBe('true');
    expect(state(COPY['analytics.alerts.conditionFallsBy'])).toBe('true');
    expect(state(COPY['analytics.alerts.conditionAbove'])).toBeNull();
    expect(state(COPY['analytics.alerts.conditionBelow'])).toBeNull();
  });

  it('names a tile by its raw key when the console has no words for it', async () => {
    await open(alert({ kpi_key: 'brand_new_tile', condition: 'ABOVE' }));
    expect(byTestId('analytics-alert-tile').closest('.MuiInputBase-root')?.querySelector('[role="combobox"]')?.textContent).toBe('brand_new_tile');
  });
});

describe('AlertDialog - recipients', () => {
  const addRecipient = async (text: string) => {
    await typeInto(input('analytics-alert-recipients'), text);
    await act(async () => {
      input('analytics-alert-recipients').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
  };

  it('says which problem keeps an invalid address from being saved', async () => {
    const onClose = await open(alert({ emails: [], slack: true }));
    await addRecipient('not-an-email');
    await save();
    await waitUntil(() => expect(shown(COPY['analytics.alerts.emailFormat'])).toBe(true));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('says when more addresses were pasted than one alert may mail', async () => {
    const onClose = await open(alert({ emails: [], slack: true }));
    const pasted = Array.from({ length: 21 }, (_unused, index) => `person${index}@duncit.test`).join(', ');
    await addRecipient(pasted);
    await save();
    await waitUntil(() => expect(shown(COPY['analytics.alerts.tooManyRecipients'].replace('{max}', '20'))).toBe(true));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('says why an alert with nobody to tell cannot be saved', async () => {
    await open(alert({ emails: [], slack: false }));
    await save();
    await waitUntil(() => expect(shown(COPY['analytics.alerts.recipientsRequired'])).toBe(true));
  });
});
