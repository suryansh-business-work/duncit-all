import { fireEvent, screen } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { Linking } from 'react-native';

import { syncDeviceCalls } from '@/services/call-sync';
import { requestPermission } from '@/services/permissions';
import { STORAGE_KEYS } from '@/services/secure-storage';
import { renderWithTheme } from '@/test-utils';
import { CallingCard } from '../CallingCard';

const mockPhone = {
  diagnostics: jest.fn(),
  recordingFolders: jest.fn(),
  requestRedirectionRole: jest.fn(),
  testCallerCard: jest.fn(),
};
jest.mock('crm-telephony', () => ({
  get CrmTelephony() {
    return mockPhone;
  },
}));
jest.mock('@/services/call-sync', () => ({ syncDeviceCalls: jest.fn() }));
const mockAudio = { granted: true };
jest.mock('@/services/permissions', () => ({
  hasAudioAccess: jest.fn(async () => mockAudio.granted),
  requestPermission: jest.fn(async () => {
    mockAudio.granted = true;
  }),
}));

/** Settings › Calling & recording: each gap with its fix, the two tests, and the sync health. */

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const diagnostics = {
  manufacturer: 'samsung',
  model: 'SM-S921B',
  sdk: 35,
  phoneState: true,
  callLog: true,
  overlay: true,
  notifications: true,
  defaultDialer: 'Phone',
  dialerIsDuncit: false,
  redirectionAvailable: true,
  redirectionHeld: false,
  batteryUnrestricted: false,
  backgroundRestricted: false,
  callerIdOn: true,
  autoLogOn: true,
  directoryNumbers: 40,
};

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
  mockAudio.granted = true;
  mockPhone.diagnostics.mockReturnValue(diagnostics);
  mockPhone.recordingFolders.mockResolvedValue([
    { relativePath: 'Recordings/Call/', count: 4, latestMs: 1 },
  ]);
});

it('names the default dialer, the found recording folder, and what still needs fixing', async () => {
  renderWithTheme(<CallingCard />);
  expect(await screen.findByText('Phone')).toBeOnTheScreen();
  expect(screen.getByText('Recordings/Call/')).toBeOnTheScreen();
  expect(
    screen.getByText('4 call recordings found on this samsung phone in the last 30 days.'),
  ).toBeOnTheScreen();
  expect(screen.getByTestId('calling-outgoing-value')).toHaveTextContent('Off');
  expect(screen.getByTestId('calling-battery-value')).toHaveTextContent('Optimised');
  expect(screen.getByText('Calls last synced: never')).toBeOnTheScreen();
  expect(screen.getByText('Recordings waiting to upload: 0')).toBeOnTheScreen();
});

it('asks Android for the call-redirecting role, and says so when the phone cannot offer it', async () => {
  mockPhone.requestRedirectionRole.mockReturnValueOnce(true).mockReturnValueOnce(false);
  renderWithTheme(<CallingCard />);
  const allow = await screen.findByTestId('calling-outgoing-action');
  fireEvent.press(allow);
  expect(mockPhone.requestRedirectionRole).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('calling-message')).toBeNull();
  fireEvent.press(allow);
  expect(screen.getByTestId('calling-message')).toHaveTextContent(
    'This phone cannot make Duncit CRM the call redirecting app.',
  );
});

it('opens App info for battery use', async () => {
  const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
  renderWithTheme(<CallingCard />);
  fireEvent.press(await screen.findByTestId('calling-battery-action'));
  expect(open).toHaveBeenCalledTimes(1);
  open.mockRestore();
});

it.each([
  ['overlay', 'The caller card is showing for 8 seconds.'],
  ['notification', /showed as a notification/],
  ['empty', /directory is empty/],
] as const)('reports how the test caller card showed (%s)', async (result, text) => {
  mockPhone.testCallerCard.mockReturnValue(result);
  renderWithTheme(<CallingCard />);
  fireEvent.press(await screen.findByTestId('calling-test-card'));
  expect(screen.getByTestId('calling-message')).toHaveTextContent(text);
});

it('runs a recording sync and says what was attached and what still waits', async () => {
  (syncDeviceCalls as jest.Mock).mockResolvedValue({ recordings: 2, pendingRecordings: 1 });
  renderWithTheme(<CallingCard />);
  fireEvent.press(await screen.findByTestId('calling-test-recordings'));
  expect(
    await screen.findByText('2 recordings attached · 1 waiting for their file'),
  ).toBeOnTheScreen();
});

it('says the sync failed when the recording test cannot reach the CRM', async () => {
  (syncDeviceCalls as jest.Mock).mockRejectedValue(new Error('offline'));
  renderWithTheme(<CallingCard />);
  fireEvent.press(await screen.findByTestId('calling-test-recordings'));
  expect(await screen.findByText(/Sync failed/)).toBeOnTheScreen();
});

it('lists the calls and recordings that could not be sent, newest first', async () => {
  store.set(
    STORAGE_KEYS.syncStatus,
    JSON.stringify({
      callAt: null,
      recordingAt: null,
      recent: [],
      failures: [
        { at: Date.UTC(2026, 10, 20, 6, 0), code: 'NOT_FOUND', what: 'call' },
        { at: Date.UTC(2026, 10, 21, 6, 0), code: 'HTTP_413', what: 'recording' },
      ],
    }),
  );
  renderWithTheme(<CallingCard />);
  const lines = await screen.findAllByText(/(call not logged|recording not attached)/);
  expect(lines[0]).toHaveTextContent(/recording not attached \(HTTP_413\)/);
  expect(lines[1]).toHaveTextContent(/call not logged \(NOT_FOUND\)/);
});

it('asks for audio access when the phone hides its recordings, then shows the folder', async () => {
  mockAudio.granted = false;
  renderWithTheme(<CallingCard />);
  expect(await screen.findByText('Audio access needed')).toBeOnTheScreen();
  expect(screen.queryByText('Recordings/Call/')).toBeNull();
  fireEvent.press(screen.getByTestId('calling-recordings-action'));
  expect(requestPermission).toHaveBeenCalledWith('audio');
  expect(await screen.findByText('Recordings/Call/')).toBeOnTheScreen();
});
