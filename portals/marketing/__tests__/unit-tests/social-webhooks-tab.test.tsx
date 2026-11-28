import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../testkit';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn(), confirm: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
  useConfirm: () => dialogsMock.confirm,
}));
const userCtx = vi.hoisted(() => ({ value: { user: { user_id: 'u-1', roles: ['MARKETING_MANAGER'] } } as { user: { user_id: string; roles: string[] } | null } }));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => userCtx.value,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
}));

import WebhooksTab from '../../src/pages/social-accounts-page/webhooks/WebhooksTab';
import DeliveryBodyDialog, { prettyBody } from '../../src/pages/social-accounts-page/webhooks/DeliveryBodyDialog';
import { deliveryColumns, outcomeText } from '../../src/pages/social-accounts-page/webhooks/deliveryColumns';
import {
  REGISTER_SOCIAL_WEBHOOK,
  SOCIAL_WEBHOOK_DELIVERIES,
  SOCIAL_WEBHOOK_SETUP,
  type WebhookAppStatus,
  type WebhookDelivery,
} from '../../src/pages/social-accounts-page/webhooks/webhooks.queries';

const HOOK_URL = 'https://server.duncit.com/social/webhook';
const object = (name: string, over: Partial<WebhookAppStatus['objects'][number]> = {}) => ({
  __typename: 'SocialWebhookObjectStatus',
  object: name,
  registered: false,
  active: false,
  callback_url: '',
  callback_matches: false,
  fields: [],
  missing_fields: [],
  ...over,
});
const app = (over: Partial<WebhookAppStatus> = {}): WebhookAppStatus => ({
  entry_id: 'e-1',
  name: 'Duncit Social',
  app_id: '2706',
  secret_set: true,
  verify_token_set: true,
  callback_url: HOOK_URL,
  error: '',
  objects: [
    object('instagram'),
    object('page', { registered: true, active: true, callback_url: HOOK_URL, callback_matches: true, fields: ['messages'], missing_fields: ['feed'] }),
  ],
  ...over,
});
const delivery = (over: Partial<WebhookDelivery> = {}): WebhookDelivery => ({
  id: 'd-1',
  object: 'instagram',
  entry_ids: ['17841'],
  fields: ['messaging'],
  status: 'PROCESSED',
  attempts: 1,
  outcome: { events: 2, stored: 1, duplicates: 1, echoes: 0, unknown_account: 0, failed: 0 },
  error: '',
  body: '{"object":"instagram","entry":[]}',
  received_at: '2026-11-28T07:00:00.000Z',
  processed_at: '2026-11-28T07:00:01.000Z',
  ...over,
});

const typed = (a: WebhookAppStatus) => ({ __typename: 'SocialWebhookAppStatus', ...a });
const setupMock = (apps: WebhookAppStatus[]): MockedResponse => ({ request: { query: SOCIAL_WEBHOOK_SETUP }, result: { data: { socialWebhookSetup: apps.map(typed) } } });
const deliveriesMock = (rows: WebhookDelivery[] = []): MockedResponse => ({
  request: { query: SOCIAL_WEBHOOK_DELIVERIES, variables: { limit: 50 } },
  result: {
    data: {
      socialWebhookDeliveries: rows.map((row) => ({ __typename: 'SocialWebhookDelivery', ...row, outcome: { __typename: 'SocialWebhookOutcome', ...row.outcome } })),
    },
  },
});

beforeEach(() => {
  dialogsMock.notify.mockReset();
  dialogsMock.confirm.mockReset();
  userCtx.value = { user: { user_id: 'u-1', roles: ['MARKETING_MANAGER'] } };
});

describe('WebhooksTab', () => {
  it('shows each object’s registration state, the HOOK_URL Meta calls and the fields it lacks', async () => {
    renderWithProviders(<WebhooksTab />, { mocks: [setupMock([app()]), deliveriesMock()] });
    const card = await screen.findByTestId('webhook-app-2706');
    expect(within(card).getByTestId('webhook-state-instagram')).toHaveTextContent('Not registered');
    expect(within(card).getByTestId('webhook-state-page')).toHaveTextContent('Registered');
    expect(within(card).getByTestId('webhook-object-page')).toHaveTextContent(`Meta calls ${HOOK_URL}`);
    expect(within(card).getByTestId('webhook-object-page')).toHaveTextContent('Missing fields: feed');
    expect(within(card).getByTestId('webhook-register-2706')).toBeEnabled();
  });

  it('names another HOOK_URL, a paused registration, missing keys and Meta’s refusal', async () => {
    const other = app({
      app_id: '99',
      verify_token_set: false,
      error: 'Facebook: (#100) bad app',
      objects: [object('instagram', { registered: true, callback_url: 'https://old.example/hook' }), object('page', { registered: true, callback_matches: true })],
    });
    renderWithProviders(<WebhooksTab />, { mocks: [setupMock([other]), deliveriesMock()] });
    const card = await screen.findByTestId('webhook-app-99');
    expect(within(card).getByTestId('webhook-state-instagram')).toHaveTextContent('Registered to another HOOK_URL');
    expect(within(card).getByTestId('webhook-state-page')).toHaveTextContent('Paused');
    expect(within(card).getByTestId('webhook-app-not-ready')).toBeInTheDocument();
    expect(within(card).getByTestId('webhook-app-error')).toHaveTextContent('(#100) bad app');
    expect(within(card).getByTestId('webhook-register-99')).toBeDisabled();
  });

  it('registers after a yes, says so and reads the setup again', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    const registered = app({ objects: [object('instagram', { registered: true, active: true, callback_url: HOOK_URL, callback_matches: true }), object('page', { registered: true, active: true, callback_url: HOOK_URL, callback_matches: true })] });
    const register = vi.fn(() => ({ data: { registerSocialWebhook: typed(registered) } }));
    renderWithProviders(<WebhooksTab />, {
      mocks: [setupMock([app()]), deliveriesMock(), { request: { query: REGISTER_SOCIAL_WEBHOOK, variables: { entry_id: 'e-1' } }, result: register }, setupMock([registered])],
    });
    fireEvent.click(await screen.findByTestId('webhook-register-2706'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Webhook registered with Meta.', 'success'));
    expect(register).toHaveBeenCalled();
    expect(dialogsMock.confirm.mock.calls[0][0]).toMatchObject({ message: expect.stringContaining(HOOK_URL) });
  });

  it('sends nothing when the person says no, and shows Meta’s refusal when it fails', async () => {
    dialogsMock.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderWithProviders(<WebhooksTab />, {
      mocks: [
        setupMock([app()]),
        deliveriesMock(),
        { request: { query: REGISTER_SOCIAL_WEBHOOK, variables: { entry_id: 'e-1' } }, result: { errors: [new GraphQLError('Meta did not register the webhook — (#2200) Callback verification failed')] } },
      ],
    });
    const button = await screen.findByTestId('webhook-register-2706');
    fireEvent.click(button);
    await waitFor(() => expect(dialogsMock.confirm).toHaveBeenCalledTimes(1));
    expect(dialogsMock.notify).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith(expect.stringContaining('Callback verification failed'), 'error'));
  });

  it('says when no Meta app is set up', async () => {
    renderWithProviders(<WebhooksTab />, { mocks: [setupMock([]), deliveriesMock()] });
    expect(await screen.findByTestId('webhooks-no-apps')).toHaveTextContent('Settings › Integrations');
  });

  it('asks nothing of the server for someone who is not a manager', () => {
    userCtx.value = { user: { user_id: 'u-2', roles: ['MARKETING_EDITOR'] } };
    renderWithProviders(<WebhooksTab />, { mocks: [] });
    expect(screen.getByTestId('webhooks-managers-only')).toBeInTheDocument();
    expect(screen.queryByTestId('webhooks-tab')).not.toBeInTheDocument();
  });
});

describe('the delivery list', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) => (options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key);

  it('reads each column as the person sees it', () => {
    const columns = deliveryColumns(t, (d) => `fmt:${d}`);
    const row = delivery({ entry_ids: ['a', 'b'], fields: ['messaging', 'comments'], status: 'FAILED' });
    const value = (field: string) => columns.find((column) => column.field === field)?.valueGetter?.(row);
    expect(value('received_at')).toBe('fmt:2026-11-28T07:00:00.000Z');
    expect(value('entry_ids')).toBe('a, b');
    expect(value('fields')).toBe('messaging, comments');
    expect(value('status')).toBe('marketing.socialWebhooks.statusFailed');
    expect(value('outcome')).toBe(outcomeText(t, row.outcome));
  });

  it('indents the raw JSON for reading, and keeps a body that is not JSON as it came', () => {
    expect(prettyBody('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(prettyBody('{oops')).toBe('{oops');
  });

  it('opens one delivery with what it came to, its error and the payload', () => {
    const onClose = vi.fn();
    renderWithProviders(<DeliveryBodyDialog delivery={delivery({ error: 'boom', status: 'FAILED' })} onClose={onClose} />);
    expect(screen.getByTestId('webhook-delivery-body')).toHaveTextContent('"object": "instagram"');
    expect(screen.getByRole('dialog')).toHaveTextContent('boom');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing while no delivery is open', () => {
    renderWithProviders(<DeliveryBodyDialog delivery={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('webhook-delivery-body')).not.toBeInTheDocument();
  });
});
