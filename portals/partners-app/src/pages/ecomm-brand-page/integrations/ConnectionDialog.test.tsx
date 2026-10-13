import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import IntegrationsPage from './IntegrationsPage';
import { connection, mountIntegrations } from './__tests__/harness';
import { recordNotices } from '../../../__tests__/groupC-notices';
import type { ScriptedAnswer, SentOperation } from '../../../__tests__/groupC-link';

let notices: ReturnType<typeof recordNotices>;
beforeEach(() => {
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  vi.unstubAllGlobals();
  cleanup();
});
const messages = () => notices.notices.map((n) => n.message);

const razorpay = connection('c1', 'RAZORPAY', 'Main Razorpay');
const shiprocket = connection('c3', 'SHIPROCKET', 'Warehouse account');

const mount = (list: unknown[], answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) =>
  mountIntegrations(<IntegrationsPage />, { MyPartnerIntegrations: { myPartnerIntegrations: list }, ...answers }, sent);

const field = (testId: string) => screen.getByTestId(testId).querySelector('input') as HTMLInputElement;
const type = (testId: string, value: string) => fireEvent.change(field(testId), { target: { value } });

describe('editing a saved Razorpay connection', () => {
  it('opens prefilled with its public half and keeps the secret when it is left blank', async () => {
    const sent: SentOperation[] = [];
    mount([razorpay], { SavePartnerIntegration: { savePartnerIntegration: razorpay } }, sent);
    fireEvent.click(await screen.findByTestId('connection-row-c1-edit'));

    expect(await screen.findByText('Edit Razorpay connection')).toBeTruthy();
    expect(field('connection-razorpay-label').value).toBe('Main Razorpay');
    expect(field('integration-razorpay-key_id').value).toBe('rzp_test_main');
    expect(field('integration-razorpay-key_secret').value).toBe('');
    expect(screen.getAllByText('Leave blank to keep the secret already saved.').length).toBeGreaterThan(0);

    type('connection-razorpay-label', 'Primary Razorpay');
    fireEvent.click(screen.getByTestId('connection-razorpay-save'));
    await waitFor(() => expect(messages()).toContain('Connection saved'));
    const save = sent.find((op) => op.name === 'SavePartnerIntegration');
    expect(save?.variables).toEqual({
      id: 'c1',
      provider: 'RAZORPAY',
      input: { label: 'Primary Razorpay', razorpay: { key_id: 'rzp_test_main' } },
    });
    await waitFor(() => expect(screen.queryByTestId('connection-form-razorpay')).toBeNull());
  });

  it('requires a name and a key id before it saves', async () => {
    const sent: SentOperation[] = [];
    mount([], {}, sent);
    fireEvent.click(await screen.findByTestId('integrations-add-razorpay'));
    expect(await screen.findByText('Add Razorpay connection')).toBeTruthy();
    fireEvent.click(screen.getByTestId('connection-razorpay-save'));

    expect(await screen.findByText('Give this connection a name')).toBeTruthy();
    expect(screen.getAllByText('This field is required.').length).toBeGreaterThanOrEqual(2);
    expect(sent.some((op) => op.name === 'SavePartnerIntegration')).toBe(false);
  });

  it('shows and hides a typed secret', async () => {
    mount([]);
    fireEvent.click(await screen.findByTestId('integrations-add-razorpay'));
    const secret = await screen.findByTestId('integration-razorpay-key_secret');
    expect((secret.querySelector('input') as HTMLInputElement).type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Show Key Secret' }));
    expect(field('integration-razorpay-key_secret').type).toBe('text');
    fireEvent.click(screen.getByRole('button', { name: 'Hide Key Secret' }));
    expect(field('integration-razorpay-key_secret').type).toBe('password');
  });

  it('keeps the dialog open with the server message when the save is refused', async () => {
    mount([razorpay], { SavePartnerIntegration: new Error('Label already used') });
    fireEvent.click(await screen.findByTestId('connection-row-c1-edit'));
    await screen.findByTestId('connection-form-razorpay');
    fireEvent.click(screen.getByTestId('connection-razorpay-save'));
    expect(await screen.findByText('Label already used')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByTestId('connection-form-razorpay')).toBeNull());
  });
});

describe('adding a ShipRocket connection', () => {
  const open = async (sent: SentOperation[] = [], answers: Record<string, ScriptedAnswer> = {}) => {
    mount([], { SavePartnerIntegration: { savePartnerIntegration: shiprocket }, ...answers }, sent);
    fireEvent.click(await screen.findByTestId('integrations-add-shiprocket'));
    await screen.findByTestId('connection-form-shiprocket');
  };

  it('saves the production API user with the pickup nickname', async () => {
    const sent: SentOperation[] = [];
    await open(sent);
    type('connection-shiprocket-label', 'Warehouse account');
    type('integration-shiprocket-email', 'ops@brand.example.com');
    type('integration-shiprocket-password', 's3cret-pass');
    type('integration-shiprocket-pickup_location', 'Primary');
    fireEvent.click(screen.getByTestId('connection-shiprocket-save'));

    await waitFor(() => expect(sent.some((op) => op.name === 'SavePartnerIntegration')).toBe(true));
    expect(sent.find((op) => op.name === 'SavePartnerIntegration')?.variables).toMatchObject({
      id: null,
      provider: 'SHIPROCKET',
      input: {
        label: 'Warehouse account',
        shiprocket: { email: 'ops@brand.example.com', password: 's3cret-pass', pickup_location: 'Primary', sandbox: false },
      },
    });
  });

  it('rejects an email that is not an email', async () => {
    const sent: SentOperation[] = [];
    await open(sent);
    type('connection-shiprocket-label', 'Warehouse');
    type('integration-shiprocket-email', 'not-an-email');
    type('integration-shiprocket-password', 'x');
    fireEvent.click(screen.getByTestId('connection-shiprocket-save'));
    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy();
    expect(sent.some((op) => op.name === 'SavePartnerIntegration')).toBe(false);
  });

  it('switches to the sandbox user, parks the production one and checks the sandbox address', async () => {
    const sent: SentOperation[] = [];
    await open(sent);
    expect(screen.queryByTestId('integration-shiprocket-sandbox-section')).toBeNull();
    fireEvent.click(screen.getByTestId('integration-shiprocket-sandbox'));

    expect(await screen.findByTestId('integration-shiprocket-sandbox-warning')).toBeTruthy();
    expect(field('integration-shiprocket-email').disabled).toBe(true);
    expect(field('integration-shiprocket-password').disabled).toBe(true);

    type('connection-shiprocket-label', 'Sandbox account');
    type('integration-shiprocket-sandbox_email', 'sandbox@brand.example.com');
    type('integration-shiprocket-sandbox_password', 'sbx-pass');
    type('integration-shiprocket-sandbox_api_url', 'http://insecure.example.com');
    fireEvent.click(screen.getByTestId('connection-shiprocket-save'));
    expect(await screen.findByText('Enter a full https:// address, or leave it blank.')).toBeTruthy();
    expect(sent.some((op) => op.name === 'SavePartnerIntegration')).toBe(false);

    type('integration-shiprocket-sandbox_api_url', '');
    fireEvent.click(screen.getByTestId('connection-shiprocket-save'));
    await waitFor(() => expect(sent.some((op) => op.name === 'SavePartnerIntegration')).toBe(true));
    expect(sent.find((op) => op.name === 'SavePartnerIntegration')?.variables).toMatchObject({
      input: { shiprocket: { sandbox: true, sandbox_email: 'sandbox@brand.example.com', sandbox_password: 'sbx-pass' } },
    });
  });

  it('shows the how-to steps, the webhook URL to copy and the vendor links', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await open();
    const guide = within(screen.getByTestId('integration-guide-shiprocket'));
    expect(guide.getByText(/Go to Settings → API → Configure/)).toBeTruthy();
    const webhook = guide.getByTestId('integration-guide-shiprocket-webhook').textContent ?? '';
    expect(webhook).toMatch(/^https?:\/\/.+\/webhooks\/courier-updates$/);
    expect(guide.getByTestId('integration-guide-shiprocket-openApi').getAttribute('href')).toContain('shiprocket');

    fireEvent.click(guide.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(messages()).toContain('Copied'));
    expect(writeText).toHaveBeenCalledWith(webhook);
  });

  it('reports a clipboard that refuses', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Clipboard blocked')) } });
    await open();
    fireEvent.click(within(screen.getByTestId('integration-guide-shiprocket')).getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(messages()).toContain('Clipboard blocked'));
  });

  it('shows no webhook URL for Razorpay', async () => {
    mount([]);
    fireEvent.click(await screen.findByTestId('integrations-add-razorpay'));
    const guide = within(await screen.findByTestId('integration-guide-razorpay'));
    expect(guide.queryByTestId('integration-guide-razorpay-webhook')).toBeNull();
    expect(guide.getByText(/Open Account & Settings → API Keys/)).toBeTruthy();
  });
});
