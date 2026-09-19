import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import WhatsAppConnectCard from '@/pages/tools/whatsapp/WhatsAppConnectCard';
import {
  WA_CONNECT,
  WA_DISCONNECT,
  WA_GENERATE_API_KEY,
  WA_QR,
  WA_SAVE_CONFIG,
  WA_STATUS,
  type WaConnection,
} from '@/pages/tools/whatsapp/whatsappQueries';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { waConnection } from './fixtures';

const GATEWAY = 'https://open-wa-server.duncit.com';
const MINTED_KEY = 'fixture-minted-key';
const MASTER_KEY = 'fixture-master-key';

const renderCard = (connection: WaConnection, mocks: MockedResponse[] = []) => {
  const onChanged = vi.fn();
  renderWithApollo(<WhatsAppConnectCard connection={connection} onChanged={onChanged} />, mocks);
  return { onChanged };
};

const apiKeyField = () => screen.getByLabelText('API Key');

describe('WhatsAppConnectCard — not connected', () => {
  it('starts from the Duncit gateway and asks for a key when none is saved', () => {
    renderCard(waConnection({ base_url: '' }));

    expect(screen.getByLabelText('Gateway URL')).toHaveValue(GATEWAY);
    expect(apiKeyField()).toHaveAttribute('placeholder', 'Paste the OpenWA API key');
    expect(screen.getByText('DISCONNECTED')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate API key' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save & Connect' })).toBeEnabled();
  });

  it('keeps a saved key out of the field and shows the last gateway error', () => {
    renderCard(waConnection({ has_api_key: true, status: 'ERROR', last_error: 'Session expired on the gateway' }));

    expect(apiKeyField()).toHaveAttribute('placeholder', '•••••• (saved — leave blank to keep)');
    expect(screen.getByText('Session expired on the gateway')).toBeInTheDocument();
  });

  it('mints a dedicated key from the master key and puts it in the field', async () => {
    const { onChanged } = renderCard(waConnection(), [
      {
        request: { query: WA_GENERATE_API_KEY, variables: { base_url: GATEWAY, master_key: MASTER_KEY } },
        result: {
          data: {
            waGenerateApiKey: {
              __typename: 'WaGeneratedKey',
              api_key: MINTED_KEY,
              connection: waConnection({ has_api_key: true }),
            },
          },
        },
      },
    ]);

    fireEvent.change(apiKeyField(), { target: { value: MASTER_KEY } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate API key' }));

    await waitFor(() => expect(apiKeyField()).toHaveValue(MINTED_KEY));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('shows why minting a key failed', async () => {
    const { onChanged } = renderCard(waConnection(), [
      {
        request: { query: WA_GENERATE_API_KEY, variables: { base_url: GATEWAY, master_key: MASTER_KEY } },
        error: new Error('Master key rejected'),
      },
    ]);

    fireEvent.change(apiKeyField(), { target: { value: MASTER_KEY } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate API key' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Master key rejected');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('saves the config, starts a session and reports the change', async () => {
    const connect = vi.fn(() => ({ data: { waConnect: waConnection({ status: 'CONNECTING', has_api_key: true }) } }));
    const { onChanged } = renderCard(waConnection(), [
      {
        request: { query: WA_SAVE_CONFIG, variables: { input: { base_url: GATEWAY, api_key: MINTED_KEY } } },
        result: { data: { waSaveConfig: waConnection({ has_api_key: true }) } },
      },
      { request: { query: WA_CONNECT }, result: connect },
    ]);

    fireEvent.change(apiKeyField(), { target: { value: MINTED_KEY } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & Connect' }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('surfaces a session that fails to start after the config saved', async () => {
    const { onChanged } = renderCard(waConnection({ has_api_key: true }), [
      {
        request: { query: WA_SAVE_CONFIG, variables: { input: { base_url: GATEWAY } } },
        result: { data: { waSaveConfig: waConnection({ has_api_key: true }) } },
      },
      { request: { query: WA_CONNECT }, error: new Error('Gateway refused the session') },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Save & Connect' }));

    expect(await screen.findByText('Gateway refused the session')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('keeps a saved key when the field is left blank, and surfaces a failed save', async () => {
    const { onChanged } = renderCard(waConnection({ has_api_key: true }), [
      {
        request: { query: WA_SAVE_CONFIG, variables: { input: { base_url: 'https://wa.duncit.in' } } },
        error: new Error('Gateway URL unreachable'),
      },
    ]);

    fireEvent.change(screen.getByLabelText('Gateway URL'), { target: { value: 'https://wa.duncit.in' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & Connect' }));

    expect(await screen.findByText('Gateway URL unreachable')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});

describe('WhatsAppConnectCard — scanning', () => {
  const statusMock = (status: WaConnection['status']): MockedResponse => ({
    request: { query: WA_STATUS },
    result: { data: { waStatus: waConnection({ status, has_api_key: true }) } },
    maxUsageCount: 5,
  });
  const qrMock = (qr_code: string | null): MockedResponse => ({
    request: { query: WA_QR },
    result: { data: { waQr: { __typename: 'WaQr', qr_code, status: 'CONNECTING' } } },
    maxUsageCount: 5,
  });

  it('shows the QR to scan while the session is connecting', async () => {
    const { onChanged } = renderCard(waConnection({ status: 'CONNECTING', has_api_key: true }), [
      statusMock('CONNECTING'),
      qrMock('data:image/png;base64,UVI='),
    ]);

    expect(await screen.findByRole('img', { name: 'WhatsApp QR' })).toHaveAttribute('src', 'data:image/png;base64,UVI=');
    expect(screen.getByRole('button', { name: 'Restart connection' })).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('waits for a QR the gateway has not produced yet', async () => {
    renderCard(waConnection({ status: 'CONNECTING', has_api_key: true }), [statusMock('CONNECTING'), qrMock(null)]);

    expect(await screen.findByText('Waiting for QR…')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'WhatsApp QR' })).toBeNull();
  });

  it('reports the change as soon as the polled status leaves CONNECTING', async () => {
    const { onChanged } = renderCard(waConnection({ status: 'CONNECTING', has_api_key: true }), [
      statusMock('CONNECTED'),
      qrMock(null),
    ]);

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });
});

describe('WhatsAppConnectCard — connected', () => {
  it('names the linked number and disconnects it', async () => {
    const disconnect = vi.fn(() => ({ data: { waDisconnect: waConnection() } }));
    const { onChanged } = renderCard(waConnection({ status: 'CONNECTED', phone: '919812345678', has_api_key: true }), [
      { request: { query: WA_DISCONNECT }, result: disconnect },
    ]);

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('+919812345678')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('describes a linked account whose number the gateway did not report', () => {
    renderCard(waConnection({ status: 'CONNECTED', phone: null, has_api_key: true }));
    expect(screen.getByText('WhatsApp account linked')).toBeInTheDocument();
  });
});
