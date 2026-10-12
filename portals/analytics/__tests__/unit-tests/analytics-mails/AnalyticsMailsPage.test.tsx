import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import AnalyticsMailsPage from '../../../src/pages/analytics-mails/AnalyticsMailsPage';
import {
  ANALYTICS_MAIL_SETTINGS,
  ANALYTICS_MAIL_SUBSCRIPTIONS,
  DELETE_ANALYTICS_MAIL_SUBSCRIPTION,
  SEND_ANALYTICS_MAIL_NOW,
  UPDATE_ANALYTICS_MAIL_SETTINGS,
  type AnalyticsMailSubscription,
} from '../../../src/pages/analytics-mails/queries';
import { byTestId, click, mount, queryTestId, settle, waitUntil } from '../../dom';
import { COPY } from '../../mocks/analytics';

const confirm = vi.hoisted(() => vi.fn());

vi.mock('@duncit/table', () => import('../../mocks/table'));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  useConfirm: () => confirm,
}));

const subscriber = (over: Partial<AnalyticsMailSubscription> = {}): AnalyticsMailSubscription => ({
  __typename: 'AnalyticsMailSubscription',
  id: 's1',
  name: 'Asha Rao',
  email: 'asha@duncit.test',
  pages: ['PODS', 'USERS'],
  frequency: 'WEEKLY',
  days: 30,
  ai_summary: true,
  is_active: true,
  last_sent_at: '2026-10-01T09:00:00.000Z',
  last_status: 'SENT',
  last_error: null,
  next_send_at: '2026-10-08T09:00:00.000Z',
  created_at: '2026-09-01T09:00:00.000Z',
  ...over,
});

const SUBSCRIBERS = [
  subscriber(),
  subscriber({ id: 's2', name: 'Ravi Kumar', email: 'ravi@duncit.test', frequency: 'DAILY', is_active: false, last_sent_at: null, last_status: null, next_send_at: null }),
];

const SETTINGS = { __typename: 'AnalyticsMailSettings', enabled: true, time_of_day: '09:00', weekday: 1, time_zone: 'Asia/Kolkata' };

const settings = (over: Partial<typeof SETTINGS> = {}): MockedResponse => ({
  request: { query: ANALYTICS_MAIL_SETTINGS },
  result: { data: { analyticsMailSettings: { ...SETTINGS, ...over } } },
});

const subscribers = (rows: AnalyticsMailSubscription[]): MockedResponse => ({
  request: { query: ANALYTICS_MAIL_SUBSCRIPTIONS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { analyticsMailSubscriptions: rows } },
});

const page = (mocks: MockedResponse[]) =>
  mount(
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
        <AnalyticsMailsPage />
      </MockedProvider>
    </LocalizationProvider>,
  );

const rows = () => [...document.querySelectorAll('[data-testid="table-row"]')];

beforeEach(() => {
  confirm.mockReset();
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
});

describe('Analytics mails — schedule', () => {
  it('shows the schedule and saves it, which also refreshes each subscriber next send', async () => {
    const save: MockedResponse = {
      request: { query: UPDATE_ANALYTICS_MAIL_SETTINGS, variables: { input: { enabled: true, time_of_day: '09:00', weekday: 1 } } },
      result: { data: { updateAnalyticsMailSettings: SETTINGS } },
    };
    await page([settings(), subscribers(SUBSCRIBERS), subscribers(SUBSCRIBERS), save]);
    await waitUntil(() => expect(queryTestId('analytics-mail-schedule-form')).not.toBeNull());
    expect(queryTestId('analytics-mail-enabled')).not.toBeNull();
    await click(byTestId('analytics-mail-schedule-save'));
    await waitUntil(() => expect(notifySuccess).toHaveBeenCalledWith(COPY['analytics.mails.scheduleSaved']));
  });

  it('says reports are paused while the schedule is off', async () => {
    await page([settings({ enabled: false }), subscribers([])]);
    await waitUntil(() => expect(document.body.textContent).toContain(COPY['analytics.mails.pausedHint']));
  });

  it('reports a schedule that could not be read, and a save the server refused', async () => {
    const failing: MockedResponse = { request: { query: ANALYTICS_MAIL_SETTINGS }, result: { errors: [new GraphQLError('Settings down')] } };
    await page([failing, subscribers([])]);
    await waitUntil(() => expect(document.body.textContent).toContain('Settings down'));
    expect(queryTestId('analytics-mail-schedule-form')).toBeNull();
  });

  it('surfaces a refused schedule save', async () => {
    const refused: MockedResponse = {
      request: { query: UPDATE_ANALYTICS_MAIL_SETTINGS, variables: { input: { enabled: true, time_of_day: '09:00', weekday: 1 } } },
      result: { errors: [new GraphQLError('Not allowed')] },
    };
    await page([settings(), subscribers([]), refused]);
    await waitUntil(() => expect(queryTestId('analytics-mail-schedule-save')).not.toBeNull());
    await click(byTestId('analytics-mail-schedule-save'));
    await waitUntil(() => expect(notifyError).toHaveBeenCalled());
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe('Analytics mails — subscribers', () => {
  it('lists who receives the report, how often, and how the last send went', async () => {
    await page([settings(), subscribers(SUBSCRIBERS)]);
    await waitUntil(() => expect(rows()).toHaveLength(2));
    const [first, second] = rows();
    expect(first.textContent).toContain('Asha Rao');
    expect(first.textContent).toContain('asha@duncit.test');
    expect(first.textContent).toContain(COPY['analytics.mails.weekly']);
    expect(first.textContent).toContain(COPY['analytics.mails.statusSent']);
    expect(second.textContent).toContain(COPY['analytics.mails.daily']);
    expect(second.textContent).toContain(COPY['analytics.mails.paused']);
    expect(second.textContent).toContain(COPY['analytics.mails.never']);
  });

  it('sends the report now and says who got it', async () => {
    const send: MockedResponse = {
      request: { query: SEND_ANALYTICS_MAIL_NOW, variables: { id: 's1' } },
      result: { data: { sendAnalyticsMailNow: { __typename: 'AnalyticsMailSendResult', ok: true, message: '' } } },
    };
    await page([settings(), subscribers(SUBSCRIBERS), send]);
    await waitUntil(() => expect(queryTestId('analytics-mail-send-s1')).not.toBeNull());
    await click(byTestId('analytics-mail-send-s1'));
    await waitUntil(() => expect(notifySuccess).toHaveBeenCalledWith(COPY['analytics.mails.sent'].replace('{email}', 'asha@duncit.test')));
  });

  it('shows the server reason when a report did not go', async () => {
    const send: MockedResponse = {
      request: { query: SEND_ANALYTICS_MAIL_NOW, variables: { id: 's1' } },
      result: { data: { sendAnalyticsMailNow: { __typename: 'AnalyticsMailSendResult', ok: false, message: 'Mailbox full' } } },
    };
    await page([settings(), subscribers(SUBSCRIBERS), send]);
    await waitUntil(() => expect(queryTestId('analytics-mail-send-s1')).not.toBeNull());
    await click(byTestId('analytics-mail-send-s1'));
    await waitUntil(() => expect(notifyError).toHaveBeenCalledWith('Mailbox full'));
  });

  it('falls back to the console sentence when the server gives no reason', async () => {
    const send: MockedResponse = {
      request: { query: SEND_ANALYTICS_MAIL_NOW, variables: { id: 's1' } },
      result: { data: { sendAnalyticsMailNow: { __typename: 'AnalyticsMailSendResult', ok: false, message: '' } } },
    };
    await page([settings(), subscribers(SUBSCRIBERS), send]);
    await waitUntil(() => expect(queryTestId('analytics-mail-send-s1')).not.toBeNull());
    await click(byTestId('analytics-mail-send-s1'));
    await waitUntil(() => expect(notifyError).toHaveBeenCalledWith(COPY['analytics.mails.sendFailed']));
  });

  it('removes a subscriber only after the operator confirms, naming them', async () => {
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const removal: MockedResponse = {
      request: { query: DELETE_ANALYTICS_MAIL_SUBSCRIPTION, variables: { id: 's1' } },
      result: { data: { deleteAnalyticsMailSubscription: true } },
    };
    await page([settings(), subscribers(SUBSCRIBERS), removal]);
    await waitUntil(() => expect(rows()).toHaveLength(2));
    const removeButton = () => rows()[0].querySelector(`button[aria-label="${COPY['analytics.mails.remove']}"]`) as HTMLElement;
    await click(removeButton());
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0].message).toContain('Asha Rao');
    expect(confirm.mock.calls[0][0].message).toContain('asha@duncit.test');
    expect(notifySuccess).not.toHaveBeenCalled();
    await click(removeButton());
    await waitUntil(() => expect(notifySuccess).toHaveBeenCalledWith(COPY['analytics.mails.removed']));
  });

  it('opens the add dialog and closes it again on cancel', async () => {
    await page([settings(), subscribers([])]);
    await waitUntil(() => expect(queryTestId('analytics-mail-add')).not.toBeNull());
    await click(byTestId('analytics-mail-add'));
    await waitUntil(() => expect(document.querySelector('[role="dialog"]')).not.toBeNull());
    const cancel = [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent === COPY['analytics.mails.cancel']) as HTMLElement;
    await click(cancel);
    await settle(400);
    await waitUntil(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
  });
});
