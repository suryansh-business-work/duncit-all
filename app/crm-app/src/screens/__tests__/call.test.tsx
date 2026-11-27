import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import * as docs from '@/graphql/call';
import { dialNumber } from '@/services/dialer';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { CallScreen } from '../call/CallScreen';
import { CallLineCard } from '../settings/CallLineCard';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
jest.mock('@/services/dialer', () => ({ dialNumber: jest.fn() }));
type Listener = (event: { preventDefault: () => void; data: { action: unknown } }) => void;
const mockListeners: Record<string, Listener> = {};
const mockNav = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
  dispatch: jest.fn(),
  addListener: jest.fn((name: string, fn: Listener) => {
    mockListeners[name] = fn;
    return () => undefined;
  }),
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({
    params: {
      kind: 'VENUE_LEAD',
      id: 'v1',
      to: '9811000001',
      leadName: 'Smash Arena',
      contactName: 'Rohit',
    },
  }),
}));

/** A call on the CRM call line: the portal's call window, step for step. */

const request = gqlRequest as jest.Mock;
const dial = dialNumber as jest.Mock;
const SETUP = {
  configured: true,
  missing: [],
  from_number: '+15550100',
  agent_number: '+919811000009',
  agent_source: 'PROFILE',
  recording_enabled: true,
  live_transcription: true,
  can_configure: false,
};
const ACTIVE = {
  id: 'log1',
  entity_type: 'VENUE_LEAD',
  entity_id: 'v1',
  status: 'IN_PROGRESS',
  answered_at: new Date().toISOString(),
  muted: false,
  on_hold: false,
  transcript_segments: [{ seq: 1, speaker: 'AGENT', text: 'Hello from Duncit', at: null }],
};

type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppCallSetupDocument) return { crmCallSetup: SETUP };
    if (doc === docs.CrmAppActiveCallDocument) return { myActiveCrmCall: null };
    if (doc === docs.CrmAppStartCallDocument)
      return { startCrmPortalCall: { ok: true, message: '', code: null, log_id: 'log1' } };
    if (doc === docs.CrmAppReconcileCallDocument)
      return { reconcileCrmCall: { ok: true, status: 'RINGING' } };
    if (doc === docs.CrmAppControlCallDocument)
      return {
        controlCrmCall: {
          ok: true,
          message: '',
          status: 'IN_PROGRESS',
          muted: vars.action === 'MUTE',
          on_hold: false,
        },
      };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);

const startCall = async () => {
  renderWithTheme(<CallScreen />);
  const start = await screen.findByTestId('call-start');
  await waitFor(() => expect(start).not.toBeDisabled());
  await act(async () => fireEvent.press(start));
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  serve();
});

describe('CallScreen', () => {
  it('shows the numbers and what the call records, then places it on the CRM call line', async () => {
    await startCall();
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Call · Smash Arena' });
    expect(callsTo(docs.CrmAppStartCallDocument)[0]?.[1]).toEqual({
      entity_type: 'VENUE_LEAD',
      id: 'v1',
      contact_number: '9811000001',
      contact_name: 'Rohit',
    });
    expect(await screen.findByText('Connecting…')).toBeOnTheScreen();
    expect(screen.getByText('+15550100')).toBeOnTheScreen();
    expect(screen.getByTestId('call-end')).toBeOnTheScreen();
  });

  it('follows the live call — its transcript, mute — and offers Call again once it is over', async () => {
    jest.useFakeTimers();
    await startCall();
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppReconcileCallDocument,
          () => ({ reconcileCrmCall: { ok: true, status: 'IN_PROGRESS' } }),
        ],
        [docs.CrmAppActiveCallDocument, () => ({ myActiveCrmCall: ACTIVE })],
      ]),
    );
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(await screen.findByText('Hello from Duncit')).toBeOnTheScreen();
    expect(screen.getByText('In call')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('call-mute')));
    expect(callsTo(docs.CrmAppControlCallDocument)[0]?.[1]).toEqual({
      log_id: 'log1',
      action: 'MUTE',
    });
    expect(screen.getByText('Unmute')).toBeOnTheScreen();

    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppReconcileCallDocument,
          () => ({ reconcileCrmCall: { ok: true, status: 'COMPLETED' } }),
        ],
      ]),
    );
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(await screen.findByText('Call over')).toBeOnTheScreen();
    expect(screen.getByText(/saved to this lead’s Communication Log/)).toBeOnTheScreen();
    expect(screen.queryByTestId('call-end')).toBeNull();
    expect(screen.getByTestId('call-again')).toBeOnTheScreen();
  });

  it('says live updates are reconnecting when a status check fails', async () => {
    jest.useFakeTimers();
    await startCall();
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppReconcileCallDocument,
          () => {
            throw new Error('offline');
          },
        ],
      ]),
    );
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(await screen.findByTestId('call-connection-lost')).toBeOnTheScreen();
  });

  it('picks a live call for this lead back up, transcript so far included', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppActiveCallDocument,
          () => ({ myActiveCrmCall: { ...ACTIVE, status: 'RINGING' } }),
        ],
      ]),
    );
    renderWithTheme(<CallScreen />);
    expect(await screen.findByText('Ringing…')).toBeOnTheScreen();
    expect(screen.getByText('Hello from Duncit')).toBeOnTheScreen();
  });

  it('says why a call was not placed, in the server’s words or the portal’s', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppStartCallDocument,
          () => ({
            startCrmPortalCall: {
              ok: false,
              message: 'Finish your current call first.',
              code: 'BUSY_AGENT',
              log_id: null,
            },
          }),
        ],
      ]),
    );
    await startCall();
    expect(await screen.findByText('Finish your current call first.')).toBeOnTheScreen();

    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppStartCallDocument, () => Promise.reject(new Error('net'))],
      ]),
    );
    await act(async () => fireEvent.press(screen.getByTestId('call-start')));
    expect(await screen.findByTestId('call-error')).toBeOnTheScreen();
  });

  it('names what Twilio is missing, links an administrator to it, and offers a call from this phone', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppCallSetupDocument,
          () => ({
            crmCallSetup: {
              ...SETUP,
              configured: false,
              missing: ['auth_token'],
              can_configure: true,
            },
          }),
        ],
      ]),
    );
    dial.mockResolvedValue('dialer');
    renderWithTheme(<CallScreen />);
    expect(await screen.findByText('Twilio is not configured')).toBeOnTheScreen();
    expect(screen.getByText('Missing: Auth Token')).toBeOnTheScreen();
    expect(screen.getByTestId('call-start')).toBeDisabled();
    // Configure Twilio opens the settings inside the app, not the Tech portal.
    fireEvent.press(screen.getByTestId('twilio-configure'));
    expect(mockNav.navigate).toHaveBeenCalledWith('TwilioSetup');
    expect(Linking.openURL).not.toHaveBeenCalled();
    await act(async () => fireEvent.press(screen.getByTestId('call-sim')));
    expect(dial).toHaveBeenCalledWith('9811000001');
    expect(screen.getByText(/Your phone’s dialer opened/)).toBeOnTheScreen();
  });

  it('asks before leaving a live call: keep it, or end it and leave', async () => {
    await startCall();
    await screen.findByText('Connecting…');
    const leave = () =>
      act(() =>
        mockListeners.beforeRemove?.({
          preventDefault: jest.fn(),
          data: { action: { type: 'GO_BACK' } },
        }),
      );
    leave();
    fireEvent.press(await screen.findByTestId('call-leave-dialog-cancel'));
    expect(callsTo(docs.CrmAppControlCallDocument)).toHaveLength(0);
    leave();
    await act(async () => fireEvent.press(await screen.findByTestId('call-leave-dialog-confirm')));
    expect(callsTo(docs.CrmAppControlCallDocument)[0]?.[1]).toEqual({
      log_id: 'log1',
      action: 'END',
    });
    expect(mockNav.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
  });
});

describe('CallLineCard', () => {
  it('shows the call line’s numbers and that calls are recorded and transcribed', async () => {
    renderWithTheme(<CallLineCard />);
    expect(await screen.findByText('+15550100')).toBeOnTheScreen();
    expect(screen.getByText('Recorded')).toBeOnTheScreen();
    expect(screen.getByText('Live transcript')).toBeOnTheScreen();
    expect(screen.queryByTestId('twilio-setup-notice')).toBeNull();
  });

  it('asks a user who cannot configure Twilio to ask an administrator', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppCallSetupDocument,
          () => ({
            crmCallSetup: {
              ...SETUP,
              configured: false,
              from_number: null,
              agent_number: null,
              recording_enabled: false,
              live_transcription: false,
            },
          }),
        ],
      ]),
    );
    renderWithTheme(<CallLineCard />);
    expect(
      await screen.findByText('Ask a Tech portal administrator to configure Twilio.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('No Number Configured')).toBeOnTheScreen();
  });
});
