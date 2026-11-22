import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import WhatsAppConnectCard from '@/pages/tools/whatsapp/WhatsAppConnectCard';
import {
  WA_MAX_ERROR_RESTARTS,
  WA_POLL_MS,
  WA_STUCK_RESTART_MS,
} from '@/pages/tools/whatsapp/WhatsAppConnectCard/useWaConnect';
import {
  WA_CONNECT,
  WA_DISCONNECT,
  WA_QR,
  WA_SAVE_CONFIG,
  WA_STATUS,
  type WaConnection,
} from '@/pages/tools/whatsapp/whatsappQueries';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { waConnection } from './fixtures';

const renderCard = (connection: WaConnection, mocks: MockedResponse[] = []) => {
  const onChanged = vi.fn();
  renderWithApollo(<WhatsAppConnectCard connection={connection} onChanged={onChanged} />, mocks);
  return { onChanged };
};

const statusMock = (status: WaConnection['status'], extra: Partial<WaConnection> = {}): MockedResponse => ({
  request: { query: WA_STATUS },
  result: { data: { waStatus: waConnection({ status, has_api_key: true, ...extra }) } },
  maxUsageCount: 200,
});
const qrMock = (qr_code: string | null): MockedResponse => ({
  request: { query: WA_QR },
  result: { data: { waQr: { __typename: 'WaQr', qr_code, status: 'CONNECTING' } } },
  maxUsageCount: 200,
});
const connectMock = (restart: boolean, fn = vi.fn(() => ({ data: { waConnect: waConnection({ status: 'CONNECTING' }) } }))) => ({
  mock: { request: { query: WA_CONNECT, variables: { restart } }, result: fn, maxUsageCount: 5 } as MockedResponse,
  fn,
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WhatsAppConnectCard — automatic start', () => {
  it('starts the session on its own when the live status is DISCONNECTED', async () => {
    const connect = connectMock(false);
    const { onChanged } = renderCard(waConnection(), [statusMock('DISCONNECTED'), connect.mock]);

    await waitFor(() => expect(connect.fn).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('restarts the engine when the live status is ERROR', async () => {
    const restart = connectMock(true);
    renderCard(waConnection({ status: 'ERROR', last_error: 'Session failed' }), [statusMock('ERROR'), restart.mock]);

    await waitFor(() => expect(restart.fn).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Session failed')).toBeInTheDocument();
  });

  it('does not start a session that is already linked, and refreshes a stale stored status', async () => {
    const connect = connectMock(false);
    const { onChanged } = renderCard(waConnection({ status: 'CONNECTING' }), [
      statusMock('CONNECTED'),
      qrMock(null),
      connect.mock,
    ]);

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(connect.fn).not.toHaveBeenCalled();
  });

  it('shows why the automatic start failed', async () => {
    renderCard(waConnection(), [
      statusMock('DISCONNECTED'),
      { request: { query: WA_CONNECT, variables: { restart: false } }, error: new Error('Gateway refused the session') },
    ]);

    expect(await screen.findByText('Gateway refused the session')).toBeInTheDocument();
  });
});

// Step one poll interval per act: a single long jump resolves dozens of polls in
// one React batch and trips the nested-update limit.
const advance = async (ms: number) => {
  for (let elapsed = 0; elapsed < ms; elapsed += WA_POLL_MS) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(WA_POLL_MS, ms - elapsed));
    });
  }
};

/** The live status answering each poll in turn; the last one repeats. */
const statusSequence = (statuses: WaConnection['status'][]): MockedResponse => {
  let call = 0;
  return {
    request: { query: WA_STATUS },
    result: () => {
      const status = statuses[Math.min(call, statuses.length - 1)];
      call += 1;
      return { data: { waStatus: waConnection({ status, has_api_key: true }) } };
    },
    maxUsageCount: 200,
  };
};

describe('WhatsAppConnectCard — nothing to set up by hand', () => {
  it('offers no API key step: the server keeps the key', () => {
    renderCard(waConnection({ status: 'CONNECTING' }), [statusMock('CONNECTING'), qrMock(null)]);
    expect(screen.queryByRole('button', { name: 'Generate API key' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Generate new API key' })).toBeNull();
    expect(screen.queryByText('No API key yet')).toBeNull();
  });

  it('shows the QR spinner as soon as the start request goes out', async () => {
    const connect = connectMock(false);
    renderCard(waConnection(), [statusMock('DISCONNECTED'), { ...connect.mock, delay: 30_000 }]);

    // The stored status is still DISCONNECTED: only the in-flight start shows the spinner.
    expect(await screen.findByText('Waiting for QR…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled();
  });
});

describe('WhatsAppConnectCard — failed starts', () => {
  it('restarts a start that fails while the page is open', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const restart = connectMock(true);
    renderCard(waConnection({ status: 'CONNECTING' }), [
      statusSequence(['CONNECTING', 'ERROR']),
      qrMock(null),
      restart.mock,
    ]);

    await advance(WA_POLL_MS * 2);
    await waitFor(() => expect(restart.fn).toHaveBeenCalledTimes(1));
  });

  it(`gives up after ${WA_MAX_ERROR_RESTARTS} automatic restarts`, async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const restart = connectMock(true);
    renderCard(waConnection({ status: 'CONNECTING' }), [
      statusSequence(['CONNECTING', 'ERROR', 'CONNECTING', 'ERROR', 'CONNECTING', 'ERROR', 'CONNECTING', 'ERROR']),
      qrMock(null),
      restart.mock,
    ]);

    await advance(WA_POLL_MS * 10);
    expect(restart.fn).toHaveBeenCalledTimes(WA_MAX_ERROR_RESTARTS);
  });
});

describe('WhatsAppConnectCard — scanning', () => {
  it('shows the QR to scan while the session is connecting', async () => {
    renderCard(waConnection({ status: 'CONNECTING', has_api_key: true }), [
      statusMock('CONNECTING'),
      qrMock('data:image/png;base64,UVI='),
    ]);

    expect(await screen.findByRole('img', { name: 'WhatsApp QR' })).toHaveAttribute('src', 'data:image/png;base64,UVI=');
    expect(screen.getByText('Connecting')).toBeInTheDocument();
  });

  it('waits for a QR the gateway has not produced yet', async () => {
    renderCard(waConnection({ status: 'CONNECTING', has_api_key: true }), [statusMock('CONNECTING'), qrMock(null)]);

    expect(await screen.findByText('Waiting for QR…')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'WhatsApp QR' })).toBeNull();
  });

  it('restarts a stuck session by hand', async () => {
    const restart = connectMock(true);
    renderCard(waConnection({ status: 'CONNECTING', has_api_key: true }), [
      statusMock('CONNECTING'),
      qrMock(null),
      restart.mock,
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Restart connection' }));
    await waitFor(() => expect(restart.fn).toHaveBeenCalledTimes(1));
  });

  it('restarts once by itself when no QR arrives in time', async () => {
    // Only simulated time moves here: with shouldAdvanceTime a slow runner's wall clock
    // pushes the timer past the 1 s margin and the restart fires "early".
    vi.useFakeTimers();
    const restart = connectMock(true);
    renderCard(waConnection({ status: 'CONNECTING', has_api_key: true }), [
      statusMock('CONNECTING'),
      qrMock(null),
      restart.mock,
    ]);

    await advance(WA_STUCK_RESTART_MS - 1000);
    expect(restart.fn).not.toHaveBeenCalled();
    await advance(2000);
    expect(restart.fn).toHaveBeenCalledTimes(1);
    await advance(WA_STUCK_RESTART_MS + WA_POLL_MS);
    expect(restart.fn).toHaveBeenCalledTimes(1);
  });
});

describe('WhatsAppConnectCard — advanced settings', () => {
  it('saves a custom gateway URL and key, then connects', async () => {
    const connect = connectMock(false);
    const { onChanged } = renderCard(waConnection({ status: 'CONNECTING' }), [
      statusMock('CONNECTING'),
      qrMock(null),
      {
        request: { query: WA_SAVE_CONFIG, variables: { input: { base_url: 'https://wa.example.test', api_key: 'own-key' } } },
        result: { data: { waSaveConfig: waConnection({ has_api_key: true }) } },
      },
      connect.mock,
    ]);

    fireEvent.click(screen.getByText('Advanced settings'));
    fireEvent.change(screen.getByLabelText('Gateway URL'), { target: { value: 'https://wa.example.test' } });
    fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'own-key' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & Connect' }));

    await waitFor(() => expect(connect.fn).toHaveBeenCalledTimes(1));
    expect(onChanged).toHaveBeenCalled();
  });

  it('keeps a saved key when the field is left blank, and surfaces a failed save', async () => {
    renderCard(waConnection({ status: 'CONNECTING', has_api_key: true }), [
      statusMock('CONNECTING'),
      qrMock(null),
      {
        request: { query: WA_SAVE_CONFIG, variables: { input: { base_url: 'https://open-wa-server.duncit.com' } } },
        error: new Error('Gateway URL unreachable'),
      },
    ]);

    fireEvent.click(screen.getByText('Advanced settings'));
    expect(screen.getByLabelText('API Key')).toHaveAttribute('placeholder', 'Saved — leave blank to keep it');
    fireEvent.click(screen.getByRole('button', { name: 'Save & Connect' }));

    expect(await screen.findByText('Gateway URL unreachable')).toBeInTheDocument();
  });
});

describe('WhatsAppConnectCard — connected', () => {
  it('names the linked number and disconnects it', async () => {
    const disconnect = vi.fn(() => ({ data: { waDisconnect: waConnection() } }));
    const { onChanged } = renderCard(waConnection({ status: 'CONNECTED', phone: '919812345678', has_api_key: true }), [
      statusMock('CONNECTED'),
      { request: { query: WA_DISCONNECT }, result: disconnect },
    ]);

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('+919812345678')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('describes a linked account whose number the gateway did not report', () => {
    renderCard(waConnection({ status: 'CONNECTED', phone: null, has_api_key: true }), [statusMock('CONNECTED')]);
    expect(screen.getByText('WhatsApp account linked')).toBeInTheDocument();
  });
});
