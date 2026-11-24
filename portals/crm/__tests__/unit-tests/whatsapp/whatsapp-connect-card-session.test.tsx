import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  WA_MAX_ERROR_RESTARTS,
  WA_POLL_MS,
  WA_STUCK_RESTART_MS,
} from '@/pages/tools/whatsapp/WhatsAppConnectCard/useWaConnect';
import { WA_DISCONNECT } from '@/pages/tools/whatsapp/whatsappQueries';
import { waConnection } from './fixtures';
import { advance, connectMock, qrMock, renderCard, statusMock, statusSequence } from './connectCardMocks';

afterEach(() => {
  vi.useRealTimers();
});

describe('WhatsAppConnectCard — failed starts', () => {
  it('restarts a booting session that fails while the page is open', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const restart = connectMock(true);
    renderCard(waConnection({ status: 'CONNECTING' }), [statusSequence(['CONNECTING', 'ERROR']), qrMock(null), restart.mock]);

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
  it('opens a booting session on the Link step with its QR', async () => {
    renderCard(waConnection({ status: 'CONNECTING', has_api_key: true }), [
      statusMock('CONNECTING'),
      qrMock('data:image/png;base64,UVI='),
    ]);

    expect(await screen.findByRole('img', { name: 'WhatsApp QR' })).toHaveAttribute('src', 'data:image/png;base64,UVI=');
    expect(screen.getByText('Connecting')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save & continue' })).toBeNull();
  });

  it('waits for a QR the gateway has not produced yet', async () => {
    renderCard(waConnection({ status: 'CONNECTING', has_api_key: true }), [statusMock('CONNECTING'), qrMock(null)]);

    expect(await screen.findByText('Waiting for QR…')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'WhatsApp QR' })).toBeNull();
  });

  it('restarts a stuck session by hand', async () => {
    const restart = connectMock(true);
    renderCard(waConnection({ status: 'CONNECTING', has_api_key: true }), [statusMock('CONNECTING'), qrMock(null), restart.mock]);

    fireEvent.click(screen.getByRole('button', { name: 'Restart connection' }));
    await waitFor(() => expect(restart.fn).toHaveBeenCalledTimes(1));
  });

  it('restarts once by itself when no QR arrives in time', async () => {
    // Only simulated time moves here: with shouldAdvanceTime a slow runner's wall clock
    // pushes the timer past the 1 s margin and the restart fires "early".
    vi.useFakeTimers();
    const restart = connectMock(true);
    renderCard(waConnection({ status: 'CONNECTING', has_api_key: true }), [statusMock('CONNECTING'), qrMock(null), restart.mock]);

    await advance(WA_STUCK_RESTART_MS - 1000);
    expect(restart.fn).not.toHaveBeenCalled();
    await advance(2000);
    expect(restart.fn).toHaveBeenCalledTimes(1);
    await advance(WA_STUCK_RESTART_MS + WA_POLL_MS);
    expect(restart.fn).toHaveBeenCalledTimes(1);
  });
});

describe('WhatsAppConnectCard — connected', () => {
  it('names the linked number, says the session is saved, and disconnects it', async () => {
    const disconnect = vi.fn(() => ({ data: { waDisconnect: waConnection() } }));
    const { onChanged } = renderCard(waConnection({ status: 'CONNECTED', phone: '919812345678', has_api_key: true }), [
      statusMock('CONNECTED'),
      { request: { query: WA_DISCONNECT }, result: disconnect },
    ]);

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('+919812345678')).toBeInTheDocument();
    expect(screen.getByText('Session saved. It stays linked when you leave this page.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('describes a linked account whose number the gateway did not report', () => {
    renderCard(waConnection({ status: 'CONNECTED', phone: null, has_api_key: true }), [statusMock('CONNECTED')]);
    expect(screen.getByText('WhatsApp account linked')).toBeInTheDocument();
  });
});
