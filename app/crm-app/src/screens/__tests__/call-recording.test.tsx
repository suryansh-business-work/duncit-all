import { AccessibilityInfo } from 'react-native';
import { screen, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';

import { IDLE_CALL, type CallSetup } from '@/features/calls/callLine';
import type { CallLine } from '@/features/calls/useCallLine';
import { renderWithTheme } from '@/test-utils';
import { LiveCallSection } from '../call/LiveCallSection';
import { RecordingIndicator } from '../call/RecordingIndicator';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));

/** The recording indicator: on while a recorded call is connected, still when motion is reduced. */

const SETUP: CallSetup = {
  configured: true,
  missing: [],
  from_number: '+15550100',
  agent_number: '+919811000009',
  recording_enabled: true,
  live_transcription: true,
  can_configure: false,
};
const line = (over: Partial<CallLine> = {}): CallLine => ({
  ...IDLE_CALL,
  logId: 'log1',
  status: 'IN_PROGRESS',
  live: true,
  starting: false,
  busy: null,
  start: jest.fn(async () => undefined),
  control: jest.fn(async () => true),
  ...over,
});

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('LiveCallSection recording indicator', () => {
  it('shows "Recording" once the contact is joined in on a recorded line', () => {
    renderWithTheme(<LiveCallSection call={line()} setup={SETUP} to="9811000001" />);
    expect(screen.getByTestId('call-recording')).toBeOnTheScreen();
    expect(screen.getByText('Recording')).toBeOnTheScreen();
  });

  it('shows nothing while it still rings, after it ends, or when the line does not record', () => {
    const { rerender } = renderWithTheme(
      <LiveCallSection call={line({ status: 'RINGING' })} setup={SETUP} to="9811000001" />,
    );
    expect(screen.queryByTestId('call-recording')).toBeNull();
    rerender(
      <LiveCallSection
        call={line({ status: 'COMPLETED', live: false })}
        setup={SETUP}
        to="9811000001"
      />,
    );
    expect(screen.queryByTestId('call-recording')).toBeNull();
    rerender(
      <LiveCallSection
        call={line()}
        setup={{ ...SETUP, recording_enabled: false }}
        to="9811000001"
      />,
    );
    expect(screen.queryByTestId('call-recording')).toBeNull();
  });
});

describe('RecordingIndicator', () => {
  it('asks whether motion is reduced, and stays readable either way', async () => {
    const reduce = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    renderWithTheme(<RecordingIndicator />);
    await waitFor(() => expect(reduce).toHaveBeenCalled());
    expect(screen.getByLabelText('Recording')).toBeOnTheScreen();
  });

  it('pulses when motion is allowed', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    renderWithTheme(<RecordingIndicator />);
    expect(await screen.findByLabelText('Recording')).toBeOnTheScreen();
  });

  it('logs a failed motion check and keeps the dot still', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockRejectedValue(new Error('no a11y'));
    const warn = jest.spyOn(logs.mobileApp, 'warn').mockImplementation(() => undefined);
    renderWithTheme(<RecordingIndicator />);
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        'crm-app/RecordingIndicator',
        'reduceMotion',
        expect.anything(),
      ),
    );
    expect(screen.getByText('Recording')).toBeOnTheScreen();
  });
});
