import { fireEvent, screen } from '@testing-library/react-native';

import { IDLE_CALL, type CallSetup } from '@/features/calls/callLine';
import type { CallLine } from '@/features/calls/useCallLine';
import { renderWithTheme } from '@/test-utils';
import { CallControls } from '../call/CallControls';
import { CallSetupSection } from '../call/CallSetupSection';
import { CallTranscript } from '../call/CallTranscript';

const mockNav = { navigate: jest.fn() };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNav }));

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));

/** The call screen's parts on their own: controls, transcript and every setup state. */

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
  live: false,
  starting: false,
  busy: null,
  start: jest.fn(async () => undefined),
  control: jest.fn(async () => true),
  ...over,
});
const setupSection = (props: Partial<Parameters<typeof CallSetupSection>[0]> = {}) =>
  renderWithTheme(
    <CallSetupSection
      setup={SETUP}
      loading={false}
      setupError={null}
      call={line()}
      to="9811000001"
      onSimCall={jest.fn()}
      {...props}
    />,
  );

describe('CallControls', () => {
  it('while the call rings, only End works, and it says why', () => {
    const onControl = jest.fn();
    renderWithTheme(
      <CallControls
        muted={false}
        onHold={false}
        connected={false}
        busy={null}
        onControl={onControl}
      />,
    );
    expect(screen.getByTestId('call-mute')).toBeDisabled();
    expect(screen.getByTestId('call-hold')).toBeDisabled();
    expect(screen.getByText('Mute and hold work once the call is connected.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('call-end'));
    expect(onControl).toHaveBeenCalledWith('END');
  });

  it('mutes and holds a connected call, and undoes each once it is on', () => {
    const onControl = jest.fn();
    const { rerender } = renderWithTheme(
      <CallControls muted={false} onHold={false} connected busy={null} onControl={onControl} />,
    );
    fireEvent.press(screen.getByTestId('call-mute'));
    fireEvent.press(screen.getByTestId('call-hold'));
    expect(onControl.mock.calls).toEqual([['MUTE'], ['HOLD']]);
    expect(screen.queryByText('Mute and hold work once the call is connected.')).toBeNull();

    rerender(<CallControls muted onHold connected busy={null} onControl={onControl} />);
    fireEvent.press(screen.getByText('Unmute'));
    fireEvent.press(screen.getByText('Resume'));
    expect(onControl.mock.calls.slice(2)).toEqual([['UNMUTE'], ['RESUME']]);
  });

  it('locks every control while one is in flight, and says it is ending', () => {
    renderWithTheme(
      <CallControls muted={false} onHold={false} connected busy="END" onControl={jest.fn()} />,
    );
    expect(screen.getByText('Ending…')).toBeOnTheScreen();
    expect(screen.getByTestId('call-end')).toBeDisabled();
    expect(screen.getByTestId('call-mute')).toBeDisabled();
  });
});

describe('CallTranscript', () => {
  const lines = [
    { seq: 1, speaker: 'AGENT', text: 'Hello from Duncit' },
    { seq: 2, speaker: 'LEAD', text: 'Hi, this is the cafe' },
  ];

  it('says live transcription is off when it is, and waits for words when it is on', () => {
    const { rerender } = renderWithTheme(<CallTranscript segments={[]} enabled={false} />);
    expect(screen.getByText(/Live transcription is switched off/)).toBeOnTheScreen();
    rerender(<CallTranscript segments={[]} enabled />);
    expect(screen.getByText(/appears here as the call goes on/)).toBeOnTheScreen();
    expect(screen.queryByTestId('transcript-search')).toBeNull();
  });

  it('names who spoke and searches what was said', () => {
    renderWithTheme(<CallTranscript segments={lines} enabled />);
    expect(screen.getByText('You')).toBeOnTheScreen();
    expect(screen.getByText('Contact')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('transcript-search'), 'CAFE');
    expect(screen.queryByText('Hello from Duncit')).toBeNull();
    expect(screen.getByText('Hi, this is the cafe')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('transcript-search'), ' pizza ');
    expect(screen.getByText('Nothing in the transcript matches “pizza”.')).toBeOnTheScreen();
  });
});

describe('CallSetupSection', () => {
  it('waits for the setup before showing anything', () => {
    setupSection({ setup: null, loading: true });
    expect(screen.getByText('Loading…')).toBeOnTheScreen();
    expect(screen.queryByTestId('call-start')).toBeNull();
  });

  it('names the numbers that are missing and will not start without them', () => {
    setupSection({ setup: { ...SETUP, from_number: null, agent_number: null } });
    expect(screen.getByText('No Number Configured')).toBeOnTheScreen();
    expect(screen.getByText(/No phone to ring you on/)).toBeOnTheScreen();
    expect(screen.getByTestId('call-start')).toBeDisabled();
  });

  it('shows a failed setup read, and the Twilio notice when the server said it is not configured', () => {
    setupSection({
      setupError: 'Could not load',
      call: line({ error: 'Twilio is not configured.', errorCode: 'TWILIO_NOT_CONFIGURED' }),
    });
    expect(screen.getByTestId('call-setup-error')).toBeOnTheScreen();
    expect(screen.getByTestId('twilio-setup-notice')).toBeOnTheScreen();
    expect(screen.queryByTestId('call-error')).toBeNull();
  });

  it('lists only what the call does: recorded without a live transcript', () => {
    setupSection({ setup: { ...SETUP, live_transcription: false } });
    expect(screen.getByText('Recorded')).toBeOnTheScreen();
    expect(screen.queryByText('Live transcript')).toBeNull();
  });

  it('says nothing about recording when the call is neither recorded nor transcribed', () => {
    setupSection({ setup: { ...SETUP, recording_enabled: false, live_transcription: false } });
    expect(screen.queryByTestId('call-media')).toBeNull();
  });
});
