import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { CallSessionProvider, useCallWindow, type CallLead } from '@/components/call-window';
import { CONTROL_CRM_CALL, CRM_CALL_SETUP, MY_ACTIVE_CRM_CALL, RECONCILE_CRM_CALL, START_CRM_PORTAL_CALL, type CallSetup } from '@/api/call.gql';
import { CRM_CALL_EVENT, CRM_CALL_TRANSCRIPT_EVENT, getCallSocket } from '@/lib/callSocket';
import { clearToken, setToken } from '@/lib/session';
import { renderWithApollo } from '../helpers/renderWithApollo';
import type { FakeSocket } from './fakeSocket';

const created = vi.hoisted(() => ({ sockets: [] as FakeSocket[] }));

vi.mock('socket.io-client', async () => {
  const { createFakeSocket } = await import('./fakeSocket');
  return {
    io: vi.fn((_origin: string, options: { auth?: { token?: string } }) => {
      const socket = createFakeSocket(options);
      created.sockets.push(socket);
      return socket;
    }),
  };
});
vi.mock('@wavesurfer/react', () => ({ useWavesurfer: () => ({ wavesurfer: null }) }));

const lead: CallLead = { to: '9812345678', entityType: 'CREATOR_LEAD', entityId: 'creator-1', displayName: 'Asha Rao', contactName: 'Asha Rao' };

const SETUP: CallSetup = {
  configured: true,
  missing: [],
  from_number: '+14155550100',
  agent_number: '+919800000000',
  agent_source: 'PROFILE',
  recording_enabled: true,
  live_transcription: true,
  can_configure: false,
};
const setupMock = (over: Partial<CallSetup> = {}): MockedResponse => ({
  request: { query: CRM_CALL_SETUP },
  result: { data: { crmCallSetup: { ...SETUP, ...over } } },
  maxUsageCount: 10,
});
const activeMock = (call: Record<string, unknown> | null = null): MockedResponse => ({
  request: { query: MY_ACTIVE_CRM_CALL },
  result: { data: { myActiveCrmCall: call } },
});
const startMock = (result: Record<string, unknown>): MockedResponse => ({
  request: {
    query: START_CRM_PORTAL_CALL,
    variables: { entity_type: 'CREATOR_LEAD', id: 'creator-1', contact_number: '9812345678', contact_name: 'Asha Rao' },
  },
  result: { data: { startCrmPortalCall: { ok: true, message: 'Calling', code: null, log_id: 'log-1', external_id: 'CA1', ...result } } },
});
const controlMock = (action: string, result: Record<string, unknown>): MockedResponse => ({
  request: { query: CONTROL_CRM_CALL, variables: { log_id: 'log-1', action } },
  result: { data: { controlCrmCall: { ok: true, message: 'Updated', log_id: 'log-1', status: 'IN_PROGRESS', muted: false, on_hold: false, ...result } } },
});
const reconcileMock: MockedResponse = {
  request: { query: RECONCILE_CRM_CALL, variables: { log_id: 'log-1' } },
  result: { data: { reconcileCrmCall: { ok: true, message: 'Synced', log_id: 'log-1', status: null } } },
  maxUsageCount: 20,
};

function Opener({ target = lead }: Readonly<{ target?: CallLead }>) {
  const calls = useCallWindow();
  return (
    <button type="button" onClick={() => calls?.openCall(target)}>
      open {target.displayName}
    </button>
  );
}

const renderApp = (mocks: MockedResponse[], extra?: ReactNode) =>
  renderWithApollo(
    <CallSessionProvider>
      <Opener />
      {extra}
    </CallSessionProvider>,
    [activeMock(), reconcileMock, ...mocks]
  );

const socket = () => created.sockets.at(-1) as FakeSocket;
const push = (event: string, payload: Record<string, unknown>) => act(() => socket().push(event, payload));

const openAndStart = async (mocks: MockedResponse[]) => {
  renderApp([setupMock(), startMock({}), ...mocks]);
  fireEvent.click(screen.getByRole('button', { name: 'open Asha Rao' }));
  const start = await screen.findByRole('button', { name: 'Start Call' });
  await waitFor(() => expect(start).toBeEnabled());
  fireEvent.click(start);
  await screen.findByText('Connecting…');
};

beforeEach(() => {
  setToken('fixture-agent');
});

afterEach(() => {
  clearToken();
  // Drops the shared socket, so the next test connects a fresh fake one.
  getCallSocket();
  created.sockets.length = 0;
});

describe('call window — before the call', () => {
  it('shows Call From, the contact, the agent phone and what is recorded, then starts the call', async () => {
    renderApp([setupMock(), startMock({})]);
    fireEvent.click(screen.getByRole('button', { name: 'open Asha Rao' }));

    const win = await screen.findByRole('dialog', { name: 'Call · Asha Rao' });
    expect(await within(win).findByText('+14155550100')).toBeInTheDocument();
    expect(within(win).getByText('9812345678')).toBeInTheDocument();
    expect(within(win).getByText('+919800000000')).toBeInTheDocument();
    expect(within(win).getByText('Recorded')).toBeInTheDocument();
    expect(within(win).getByText('Live transcript')).toBeInTheDocument();

    fireEvent.click(within(win).getByRole('button', { name: 'Start Call' }));

    expect(await within(win).findByText('Connecting…')).toBeInTheDocument();
    expect(within(win).getByRole('button', { name: 'End call' })).toBeEnabled();
    // Mute and hold wait for the contact to pick up.
    expect(within(win).getByRole('button', { name: 'Mute' })).toBeDisabled();
  });

  it('keeps Start Call disabled and explains the setup while Twilio is not configured', async () => {
    renderApp([setupMock({ configured: false, missing: ['account_sid', 'phone_number', 'other_field'], from_number: null })]);
    fireEvent.click(screen.getByRole('button', { name: 'open Asha Rao' }));

    const notice = await screen.findByTestId('twilio-setup-notice');
    expect(within(notice).getByText('Twilio is not configured')).toBeInTheDocument();
    expect(within(notice).getByText('Missing: Account SID, Phone Number, other_field')).toBeInTheDocument();
    expect(within(notice).getByText('Ask a Tech portal administrator to configure Twilio.')).toBeInTheDocument();
    expect(screen.getByText('No Number Configured')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Call' })).toBeDisabled();
  });

  it('links an administrator straight to the Twilio section of the Tech portal', async () => {
    renderApp([setupMock({ configured: false, missing: [], can_configure: true })]);
    fireEvent.click(screen.getByRole('button', { name: 'open Asha Rao' }));

    const link = await screen.findByRole('link', { name: /Configure Twilio/ });
    expect(link.getAttribute('href')).toMatch(/^https?:\/\/[^/]+\/\?section=TWILIO$/);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('keeps Start Call disabled when there is no phone to ring the agent on', async () => {
    renderApp([setupMock({ agent_number: null, agent_source: null, recording_enabled: false, live_transcription: false })]);
    fireEvent.click(screen.getByRole('button', { name: 'open Asha Rao' }));

    expect(await screen.findByText(/No phone to ring you on/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Call' })).toBeDisabled();
    expect(screen.queryByText('Recorded')).not.toBeInTheDocument();
  });

  it('shows Configure Twilio when the server refused the call for missing setup', async () => {
    renderApp([setupMock(), startMock({ ok: false, code: 'TWILIO_NOT_CONFIGURED', message: 'Twilio is not configured.', log_id: null })]);
    fireEvent.click(screen.getByRole('button', { name: 'open Asha Rao' }));
    const start = await screen.findByRole('button', { name: 'Start Call' });
    await waitFor(() => expect(start).toBeEnabled());

    fireEvent.click(start);

    expect(await screen.findByTestId('twilio-setup-notice')).toBeInTheDocument();
    expect(screen.queryByText('Twilio is not configured.')).not.toBeInTheDocument();
  });

  it("shows the server's reason for any other refusal, and lets the agent retry", async () => {
    renderApp([setupMock(), startMock({ ok: false, code: 'INVALID_CONTACT_NUMBER', message: 'The customer number is not valid', log_id: null })]);
    fireEvent.click(screen.getByRole('button', { name: 'open Asha Rao' }));
    const start = await screen.findByRole('button', { name: 'Start Call' });
    await waitFor(() => expect(start).toBeEnabled());

    fireEvent.click(start);

    expect(await screen.findByText('The customer number is not valid')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Start Call' })).toBeEnabled());
  });

  it('closes straight away when no call was placed', async () => {
    renderApp([setupMock()]);
    fireEvent.click(screen.getByRole('button', { name: 'open Asha Rao' }));
    await screen.findByRole('dialog', { name: 'Call · Asha Rao' });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog', { name: 'Call · Asha Rao' })).not.toBeInTheDocument();
  });
});

describe('call window — during the call', () => {
  it('follows the live status, mutes and holds, and shows the transcript as it is spoken', async () => {
    await openAndStart([controlMock('MUTE', { muted: true }), controlMock('HOLD', { muted: true, on_hold: true })]);

    push(CRM_CALL_EVENT, { log_id: 'other', status: 'COMPLETED' });
    expect(screen.getByText('Connecting…')).toBeInTheDocument();
    push(CRM_CALL_EVENT, { log_id: 'log-1', status: 'IN_PROGRESS', answered_at: new Date().toISOString() });
    expect(screen.getByText('In call')).toBeInTheDocument();
    expect(screen.getByTestId('call-duration')).toHaveTextContent(/Duration 0:0\d/);

    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
    expect(await screen.findByRole('button', { name: 'Unmute' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Hold' }));
    expect(await screen.findByText('On hold')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();

    expect(screen.getByText(/appears here as the call goes on/)).toBeInTheDocument();
    push(CRM_CALL_TRANSCRIPT_EVENT, { log_id: 'log-1', seq: 2, speaker: 'LEAD', text: 'Weekends work best', confidence: 0.9, at: null });
    push(CRM_CALL_TRANSCRIPT_EVENT, { log_id: 'log-1', seq: 1, speaker: 'AGENT', text: 'When suits you?', confidence: 0.9, at: '2026-11-22T10:00:00.000Z' });
    push(CRM_CALL_TRANSCRIPT_EVENT, { log_id: 'log-1', seq: 1, speaker: 'AGENT', text: 'When suits you?', confidence: 0.9, at: null });
    push(CRM_CALL_TRANSCRIPT_EVENT, { log_id: 'other', seq: 9, speaker: 'LEAD', text: 'Not this call', confidence: 0.9, at: null });

    const transcript = screen.getByTestId('call-transcript');
    const lines = within(transcript).getAllByRole('listitem');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveTextContent('When suits you?');
    expect(lines[0]).toHaveTextContent('You');
    expect(lines[1]).toHaveTextContent('Contact');

    fireEvent.change(screen.getByRole('textbox', { name: 'Search transcript' }), { target: { value: 'WEEKEND' } });
    expect(within(transcript).getAllByRole('listitem')).toHaveLength(1);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search transcript' }), { target: { value: 'pricing' } });
    expect(within(transcript).getByText('Nothing in the transcript matches “pricing”.')).toBeInTheDocument();
  });

  it('shows why a control was refused', async () => {
    await openAndStart([controlMock('MUTE', { ok: false, message: 'Twilio did not accept the change. Try again.' })]);
    push(CRM_CALL_EVENT, { log_id: 'log-1', status: 'IN_PROGRESS' });

    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));

    expect(await screen.findByText('Twilio did not accept the change. Try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mute' })).toBeInTheDocument();
  });

  it('keeps the call going in a compact window when minimized, and restores it', async () => {
    await openAndStart([controlMock('MUTE', { muted: true })]);
    push(CRM_CALL_EVENT, { log_id: 'log-1', status: 'IN_PROGRESS', answered_at: new Date().toISOString() });

    fireEvent.click(screen.getByRole('button', { name: 'Minimize' }));

    const bar = screen.getByTestId('call-window-minimized');
    expect(within(bar).getByText('In call')).toBeInTheDocument();
    expect(within(bar).getByText(/^0:0\d$/)).toBeInTheDocument();
    fireEvent.click(within(bar).getByRole('button', { name: 'Mute' }));
    expect(await within(bar).findByRole('button', { name: 'Unmute' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(screen.getByTestId('call-window')).toHaveAttribute('data-mode', 'normal');
    expect(screen.getByRole('button', { name: 'Unmute' })).toBeInTheDocument();
  });

  it('maximizes and restores without losing the call', async () => {
    await openAndStart([]);

    fireEvent.click(screen.getByRole('button', { name: 'Maximize' }));
    expect(screen.getByTestId('call-window')).toHaveAttribute('data-mode', 'maximized');
    expect(screen.getByText('Connecting…')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(screen.getByTestId('call-window')).toHaveAttribute('data-mode', 'normal');
  });

  it('moves with the arrow keys from the Move window button, which a maximized window does not offer', async () => {
    await openAndStart([]);
    const win = screen.getByTestId('call-window');
    const before = win.style.left;

    fireEvent.keyDown(screen.getByRole('button', { name: 'Move window' }), { key: 'ArrowLeft' });
    expect(win.style.left).not.toBe(before);

    fireEvent.click(screen.getByRole('button', { name: 'Maximize' }));
    expect(screen.queryByRole('button', { name: 'Move window' })).not.toBeInTheDocument();
  });

  it('warns before closing a live call, and Continue keeps it', async () => {
    await openAndStart([]);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    const confirm = await screen.findByRole('dialog', { name: 'The call is still active' });
    // The safe choice comes first in the dialog's tab order.
    expect(within(confirm).getAllByRole('button')[0]).toHaveTextContent('Continue call');

    fireEvent.click(within(confirm).getByRole('button', { name: 'Continue call' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'The call is still active' })).not.toBeInTheDocument());
    expect(screen.getByRole('dialog', { name: 'Call · Asha Rao' })).toBeInTheDocument();
  });

  it('ends the call and closes only on "End call and close"', async () => {
    await openAndStart([controlMock('END', { status: 'IN_PROGRESS' })]);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(await screen.findByRole('button', { name: 'End call and close' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Call · Asha Rao' })).not.toBeInTheDocument());
  });

  it('keeps the window open when the call could not be ended', async () => {
    await openAndStart([controlMock('END', { ok: false, message: 'Twilio could not end the call. Try again.' })]);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(await screen.findByRole('button', { name: 'End call and close' }));

    expect(await screen.findByText('Twilio could not end the call. Try again.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Call · Asha Rao' })).toBeInTheDocument();
  });

  it('says the call is saved once it ends, offers Call again, and closes without asking', async () => {
    await openAndStart([startMock({ log_id: 'log-2' })]);
    push(CRM_CALL_EVENT, { log_id: 'log-1', status: 'COMPLETED', error_message: 'The agent phone did not join the call (busy).' });

    expect(screen.getByText('Call over')).toBeInTheDocument();
    expect(screen.getByText(/saved to this lead’s Communication Log/)).toBeInTheDocument();
    expect(screen.getByText('The agent phone did not join the call (busy).')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'End call' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Call again' }));
    expect(await screen.findByText('Connecting…')).toBeInTheDocument();
    push(CRM_CALL_EVENT, { log_id: 'log-2', status: 'BUSY' });
    expect(screen.getByText('Busy')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Call · Asha Rao' })).not.toBeInTheDocument();
  });

  it('tells the agent when live updates are reconnecting', async () => {
    await openAndStart([]);

    act(() => {
      socket().connected = false;
      socket().push('disconnect', undefined);
    });
    expect(screen.getByTestId('call-connection-lost')).toBeInTheDocument();

    act(() => socket().push('connect', undefined));
    expect(screen.queryByTestId('call-connection-lost')).not.toBeInTheDocument();
  });

  it('brings the live call forward instead of starting a second one', async () => {
    const other: CallLead = { ...lead, entityId: 'creator-2', displayName: 'Ravi' };
    renderApp([setupMock(), startMock({})], <Opener target={other} />);
    fireEvent.click(screen.getByRole('button', { name: 'open Asha Rao' }));
    const start = await screen.findByRole('button', { name: 'Start Call' });
    await waitFor(() => expect(start).toBeEnabled());
    fireEvent.click(start);
    await screen.findByText('Connecting…');

    fireEvent.click(screen.getByRole('button', { name: 'open Ravi' }));

    expect(await screen.findByText('Finish your current call before starting another.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Call · Asha Rao' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'open Asha Rao' }));
    expect(screen.getByRole('dialog', { name: 'Call · Asha Rao' })).toBeInTheDocument();
  });
});

describe('call window — after a reload', () => {
  it('brings back a call that is still live, with its controls and transcript so far', async () => {
    renderWithApollo(
      <CallSessionProvider>
        <Opener />
      </CallSessionProvider>,
      [
        activeMock({
          id: 'log-1',
          entity_type: 'VENUE_LEAD',
          entity_id: 'venue-1',
          contact_name: null,
          contact_value: '+919812345678',
          from_number: '+14155550100',
          status: 'IN_PROGRESS',
          answered_at: new Date(Date.now() - 65_000).toISOString(),
          muted: true,
          on_hold: false,
          transcript_segments: [{ seq: 1, speaker: 'LEAD', text: 'Hello again', confidence: null, at: null }],
        }),
        setupMock(),
        reconcileMock,
      ]
    );

    const win = await screen.findByRole('dialog', { name: 'Call · +919812345678' });
    expect(within(win).getByText('In call')).toBeInTheDocument();
    expect(within(win).getByRole('button', { name: 'Unmute' })).toBeInTheDocument();
    expect(within(win).getByText('Hello again')).toBeInTheDocument();
    expect(within(win).getByTestId('call-duration')).toHaveTextContent(/Duration 1:0\d/);
  });

  it('does not look for a live call while signed out', async () => {
    clearToken();
    renderWithApollo(
      <CallSessionProvider>
        <Opener />
      </CallSessionProvider>,
      []
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
