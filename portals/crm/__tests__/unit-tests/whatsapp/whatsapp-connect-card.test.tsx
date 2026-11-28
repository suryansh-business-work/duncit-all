import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { WA_CONNECT, WA_GENERATE_API_KEY } from '@/pages/tools/whatsapp/whatsappQueries';
import { waConnection } from './fixtures';
import { LINKED_AT, connectMock, qrMock, renderCard, saveMock, statusMock } from './connectCardMocks';

afterEach(() => {
  vi.useRealTimers();
});

describe('WhatsAppConnectCard — stepper start', () => {
  it('opens a first connect on the Gateway step and starts nothing by itself', async () => {
    const connect = connectMock(false);
    const { onChanged } = renderCard(waConnection(), [statusMock('DISCONNECTED'), connect.mock]);

    expect(screen.getByText('Gateway URL & API key')).toBeInTheDocument();
    expect(screen.getByText('Link WhatsApp')).toBeInTheDocument();
    expect(screen.getByLabelText(/Gateway URL/)).toHaveValue('https://open-wa-server.duncit.com');
    expect(screen.getByText('How do I get the API key?')).toBeInTheDocument();
    await waitFor(() => expect(onChanged).not.toHaveBeenCalled());
    expect(connect.fn).not.toHaveBeenCalled();
  });

  it('opens a failed session on Link WhatsApp with its reason, and does not restart it by itself', async () => {
    const restart = connectMock(true);
    renderCard(waConnection({ status: 'ERROR', last_error: 'auth timeout' }), [statusMock('ERROR'), restart.mock]);

    expect(await screen.findByText('Error')).toBeInTheDocument();
    expect(screen.getByText('auth timeout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restart connection' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save & continue' })).toBeNull();
    expect(restart.fn).not.toHaveBeenCalled();
  });

  it('says what to do when the gateway kept no reason for the failure', async () => {
    renderCard(waConnection({ status: 'ERROR' }), [statusMock('ERROR')]);

    expect(await screen.findByText(/WhatsApp stopped after an earlier error/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restart connection' })).toBeInTheDocument();
  });
});

describe('WhatsAppConnectCard — Gateway step', () => {
  it('saves the URL and key, then moves to Link WhatsApp without connecting', async () => {
    const connect = connectMock(false);
    const { onChanged } = renderCard(waConnection(), [
      statusMock('DISCONNECTED'),
      saveMock({ base_url: 'https://wa.example.test', api_key: 'own-key' }),
      connect.mock,
    ]);

    fireEvent.change(screen.getByLabelText(/Gateway URL/), { target: { value: 'https://wa.example.test' } });
    fireEvent.change(screen.getByLabelText(/API Key/), { target: { value: 'own-key' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));

    expect(await screen.findByRole('button', { name: 'Connect' })).toBeInTheDocument();
    expect(screen.getByText(/Press Connect to start WhatsApp/)).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
    expect(connect.fn).not.toHaveBeenCalled();
  });

  it('stays on the Gateway step and shows why the gateway refused the key', async () => {
    renderCard(waConnection({ has_api_key: true }), [
      statusMock('DISCONNECTED'),
      saveMock({ base_url: 'https://open-wa-server.duncit.com' }, new Error('The WhatsApp gateway refused this API key.')),
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));

    expect(await screen.findByText('The WhatsApp gateway refused this API key.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull();
  });

  it('generates a key on the server and says it was saved', async () => {
    const generate = vi.fn(() => ({
      data: { waGenerateApiKey: { __typename: 'WaGeneratedKey', connection: waConnection({ has_api_key: true }) } },
    }));
    const { onChanged } = renderCard(waConnection(), [
      statusMock('DISCONNECTED'),
      { request: { query: WA_GENERATE_API_KEY, variables: { base_url: 'https://open-wa-server.duncit.com' } }, result: generate },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Generate API key' }));

    expect(await screen.findByText('A new API key was created on the gateway and saved here.')).toBeInTheDocument();
    expect(generate).toHaveBeenCalledTimes(1);
    expect(onChanged).toHaveBeenCalled();
  });

  it('shows a failed key generation', async () => {
    renderCard(waConnection(), [
      statusMock('DISCONNECTED'),
      {
        request: { query: WA_GENERATE_API_KEY, variables: { base_url: 'https://open-wa-server.duncit.com' } },
        error: new Error('No gateway master key'),
      },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Generate API key' }));
    expect(await screen.findByText('No gateway master key')).toBeInTheDocument();
  });
});

/** Saves step 1 with the saved key kept, landing on step 2. */
const toLinkStep = async (extraMocks: MockedResponse[]) => {
  const rendered = renderCard(waConnection({ has_api_key: true }), [
    statusMock('DISCONNECTED'),
    saveMock({ base_url: 'https://open-wa-server.duncit.com' }),
    ...extraMocks,
  ]);
  fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
  await screen.findByRole('button', { name: 'Connect' });
  return rendered;
};

describe('WhatsAppConnectCard — Link step', () => {
  it('starts the session only when Connect is pressed', async () => {
    const connect = connectMock(false);
    const { onChanged } = await toLinkStep([connect.mock]);
    expect(connect.fn).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

    await waitFor(() => expect(connect.fn).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(2)); // after the save, then after the start
  });

  it('shows the QR spinner and locks Connect while the start request is in flight', async () => {
    // A delayed mock only answers (and calls its result function) after the delay: the
    // request is still out when these assertions run.
    await toLinkStep([{ ...connectMock(false).mock, delay: 30_000 }]);

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

    expect(await screen.findByText('Waiting for QR…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled();
  });

  it('shows why a start failed', async () => {
    await toLinkStep([
      { request: { query: WA_CONNECT, variables: { restart: false } }, error: new Error('Gateway refused the session') },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    expect(await screen.findByText('Gateway refused the session')).toBeInTheDocument();
  });

  it('goes back to the Gateway step', async () => {
    await toLinkStep([]);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('button', { name: 'Save & continue' })).toBeInTheDocument();
  });
});

describe('WhatsAppConnectCard — saved session', () => {
  it('resumes a linked session that dropped on its own, without a restart', async () => {
    const connect = connectMock(false);
    renderCard(waConnection({ connected_at: LINKED_AT, has_api_key: true }), [
      statusMock('DISCONNECTED', { connected_at: LINKED_AT }),
      connect.mock,
    ]);

    await waitFor(() => expect(connect.fn).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: 'Save & continue' })).toBeNull();
  });

  it('says it is reconnecting the saved session while the resume is in flight', async () => {
    renderCard(waConnection({ connected_at: LINKED_AT, has_api_key: true }), [
      statusMock('DISCONNECTED', { connected_at: LINKED_AT }),
      { ...connectMock(false).mock, delay: 30_000 },
    ]);

    expect(await screen.findByText('Reconnecting your saved WhatsApp session…')).toBeInTheDocument();
  });

  it('restarts a linked session whose engine failed', async () => {
    const restart = connectMock(true);
    renderCard(waConnection({ status: 'ERROR', connected_at: LINKED_AT, has_api_key: true }), [
      statusMock('ERROR', { connected_at: LINKED_AT }),
      restart.mock,
    ]);

    await waitFor(() => expect(restart.fn).toHaveBeenCalledTimes(1));
  });

  it('refreshes a stale stored status without starting a session that is already linked', async () => {
    const connect = connectMock(false);
    const { onChanged } = renderCard(waConnection({ status: 'CONNECTING' }), [statusMock('CONNECTED'), qrMock(null), connect.mock]);

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(connect.fn).not.toHaveBeenCalled();
  });
});

