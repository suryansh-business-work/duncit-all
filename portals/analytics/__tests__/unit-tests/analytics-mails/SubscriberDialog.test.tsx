import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import SubscriberDialog from '../../../src/pages/analytics-mails/SubscriberDialog';
import {
  CREATE_ANALYTICS_MAIL_SUBSCRIPTION,
  UPDATE_ANALYTICS_MAIL_SUBSCRIPTION,
  type AnalyticsMailSubscription,
} from '../../../src/pages/analytics-mails/queries';
import { ANALYTICS_PAGES } from '../../../src/pages/entity-analytics/pages';
import { byTestId, click, mount, queryTestId, typeInto, waitUntil } from '../../dom';
import { COPY } from '../../mocks/analytics';

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

const subscriber = (over: Partial<AnalyticsMailSubscription> = {}): AnalyticsMailSubscription => ({
  __typename: 'AnalyticsMailSubscription',
  id: 's1',
  name: 'Asha Rao',
  email: 'asha@duncit.test',
  pages: ['PODS', 'USERS'] as AnalyticsMailSubscription['pages'],
  frequency: 'WEEKLY',
  days: 30,
  ai_summary: false,
  is_active: true,
  last_sent_at: null,
  last_status: null,
  last_error: null,
  next_send_at: null,
  created_at: '2026-09-01T09:00:00.000Z',
  ...over,
});

/** Captures what a mutation is sent, and answers with the subscriber. */
const capture = (query: typeof CREATE_ANALYTICS_MAIL_SUBSCRIPTION | typeof UPDATE_ANALYTICS_MAIL_SUBSCRIPTION, field: string) => {
  const sent: { value: unknown } = { value: null };
  const mock: MockedResponse = {
    request: { query, variables: () => true },
    result: (variables: unknown) => {
      sent.value = variables;
      return { data: { [field]: subscriber() } };
    },
  };
  return { sent, mock };
};
const refused = (query: MockedResponse['request']['query']): MockedResponse => ({
  request: { query, variables: () => true },
  result: { errors: [new GraphQLError('Not allowed')] },
});

const open = async (editing: AnalyticsMailSubscription | null, mocks: MockedResponse[] = []) => {
  const onClose = vi.fn();
  await mount(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <SubscriberDialog subscriber={editing} onClose={onClose} />
    </MockedProvider>,
  );
  await waitUntil(() => expect(queryTestId('analytics-mail-subscriber-form')).not.toBeNull());
  return onClose;
};
const input = (id: string) => byTestId(id) as HTMLInputElement;
const save = () => click(byTestId('analytics-mail-subscriber-save'));
const shown = (text: string) => document.body.textContent?.includes(text) ?? false;
const box = (label: string) =>
  [...document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find((el) => el.closest('label')?.textContent === label) as HTMLInputElement;

beforeEach(() => {
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
});

describe('SubscriberDialog - adding', () => {
  it('starts with everyone on every dashboard, weekly, and sends what was typed, normalised', async () => {
    const { sent, mock } = capture(CREATE_ANALYTICS_MAIL_SUBSCRIPTION, 'createAnalyticsMailSubscription');
    const onClose = await open(null, [mock]);
    expect(shown(COPY['analytics.mails.addSubscriber'])).toBe(true);
    await typeInto(input('analytics-mail-name'), '  Ravi Kumar ');
    await typeInto(input('analytics-mail-email'), ' Ravi@Duncit.Test ');
    await save();
    await waitUntil(() => expect(notifySuccess).toHaveBeenCalledWith(COPY['analytics.mails.subscriberAdded']));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(sent.value).toEqual({
      input: {
        name: 'Ravi Kumar',
        email: 'ravi@duncit.test',
        pages: ANALYTICS_PAGES.map((page) => page.entity),
        frequency: 'WEEKLY',
        days: 7,
        ai_summary: true,
        is_active: true,
      },
    });
  });

  it('reports a refused add and stays open', async () => {
    const onClose = await open(null, [refused(CREATE_ANALYTICS_MAIL_SUBSCRIPTION)]);
    await typeInto(input('analytics-mail-name'), 'Ravi Kumar');
    await typeInto(input('analytics-mail-email'), 'ravi@duncit.test');
    await save();
    await waitUntil(() => expect(notifyError).toHaveBeenCalledTimes(1));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('names every missing field and sends nothing', async () => {
    const onClose = await open(null);
    await click(box(COPY['analytics.mails.allDashboards']));
    await save();
    await waitUntil(() => expect(shown(COPY['analytics.mails.nameRequired'])).toBe(true));
    expect(shown(COPY['analytics.mails.emailFormat'])).toBe(true);
    expect(shown(COPY['analytics.mails.pagesRequired'])).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe('SubscriberDialog - editing', () => {
  it('is titled for editing and starts from the subscriber as saved', async () => {
    await open(subscriber());
    expect(shown(COPY['analytics.mails.editSubscriber'])).toBe(true);
    expect(input('analytics-mail-name').value).toBe('Asha Rao');
    expect(input('analytics-mail-email').value).toBe('asha@duncit.test');
  });

  it('updates the one being edited, says so, and closes', async () => {
    const { sent, mock } = capture(UPDATE_ANALYTICS_MAIL_SUBSCRIPTION, 'updateAnalyticsMailSubscription');
    const onClose = await open(subscriber(), [mock]);
    await typeInto(input('analytics-mail-name'), 'Asha R');
    await save();
    await waitUntil(() => expect(notifySuccess).toHaveBeenCalledWith(COPY['analytics.mails.subscriberSaved']));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(sent.value).toEqual({
      id: 's1',
      input: {
        name: 'Asha R',
        email: 'asha@duncit.test',
        pages: ['PODS', 'USERS'],
        frequency: 'WEEKLY',
        days: 30,
        ai_summary: false,
        is_active: true,
      },
    });
  });

  it('reports a refused update and stays open', async () => {
    const onClose = await open(subscriber(), [refused(UPDATE_ANALYTICS_MAIL_SUBSCRIPTION)]);
    await save();
    await waitUntil(() => expect(notifyError).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('SubscriberDialog - the dashboards picked', () => {
  const pods = () => box(COPY['analytics.page.pods.title']);

  it('ticks and unticks one dashboard, keeping the console order', async () => {
    const { sent, mock } = capture(UPDATE_ANALYTICS_MAIL_SUBSCRIPTION, 'updateAnalyticsMailSubscription');
    await open(subscriber({ pages: ['CLUBS'] as AnalyticsMailSubscription['pages'] }), [mock]);
    expect(pods().checked).toBe(false);
    await click(pods());
    expect(pods().checked).toBe(true);
    await save();
    await waitUntil(() => expect(sent.value).not.toBeNull());
    expect((sent.value as { input: { pages: string[] } }).input.pages).toEqual(['PODS', 'CLUBS']);
  });

  it('unticks a dashboard, and shows "all" as partly ticked', async () => {
    await open(subscriber({ pages: ['PODS', 'CLUBS'] as AnalyticsMailSubscription['pages'] }));
    const all = box(COPY['analytics.mails.allDashboards']);
    expect(all.checked).toBe(false);
    expect(all.dataset.indeterminate).toBe('true');
    await click(pods());
    expect(pods().checked).toBe(false);
  });

  it('ticks every dashboard at once, then clears them all', async () => {
    await open(subscriber({ pages: [] as AnalyticsMailSubscription['pages'] }));
    const all = () => box(COPY['analytics.mails.allDashboards']);
    expect(all().dataset.indeterminate).toBe('false');
    await click(all());
    expect(all().checked).toBe(true);
    expect(pods().checked).toBe(true);
    await click(all());
    expect(all().checked).toBe(false);
    expect(pods().checked).toBe(false);
  });

  it('ties each box to the error message once there is one', async () => {
    await open(subscriber({ pages: ['PODS'] as AnalyticsMailSubscription['pages'] }));
    expect(pods().getAttribute('aria-describedby')).toBeNull();
    await click(pods());
    await save();
    await waitUntil(() => expect(shown(COPY['analytics.mails.pagesRequired'])).toBe(true));
    expect(pods().getAttribute('aria-describedby')).toBe('analytics-mail-dashboards-error');
    expect(document.getElementById('analytics-mail-dashboards-error')?.textContent).toBe(COPY['analytics.mails.pagesRequired']);
  });
});
