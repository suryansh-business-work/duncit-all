import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';
import { CallDetails } from '../lead/CallDetails';
import { CommLogItem, type CommLog } from '../lead/CommLogItem';

const mockPlayer = { play: jest.fn(), pause: jest.fn() };
let mockPlaying = false;
jest.mock('expo-audio', () => ({
  useAudioPlayer: () => mockPlayer,
  useAudioPlayerStatus: () => ({ playing: mockPlaying }),
}));

/** A call or email on a lead's Activity tab: its row, and for a call the recording and transcript. */

const call = (over: Partial<CommLog> = {}): CommLog => ({
  id: 'c1',
  type: 'CALL',
  direction: 'OUTBOUND',
  status: 'COMPLETED',
  subject: '',
  contact_name: 'Rohit',
  contact_value: '9811000001',
  duration_seconds: 0,
  recording_url: 'https://cdn.duncit.com/r.m4a',
  transcript: '',
  transcript_status: 'PENDING',
  summary: { status: 'PENDING', text: '', key_points: [], follow_ups: [] },
  created_at: '2026-11-24T10:00:00.000Z',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPlaying = false;
});

describe('CallDetails', () => {
  it('plays the recording and says the transcript is on its way', () => {
    renderWithTheme(<CallDetails log={call()} />);
    expect(screen.getByText(/Transcribing/)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('comm-play'));
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  it('pauses a playing recording', () => {
    mockPlaying = true;
    renderWithTheme(<CallDetails log={call()} />);
    fireEvent.press(screen.getByTestId('comm-play'));
    expect(mockPlayer.pause).toHaveBeenCalled();
  });

  it('says when the transcript failed, and shows no player without a recording', () => {
    renderWithTheme(<CallDetails log={call({ recording_url: '', transcript_status: 'FAILED' })} />);
    expect(screen.queryByTestId('comm-play')).toBeNull();
    expect(screen.queryByText(/Transcribing/)).toBeNull();
    expect(screen.getByText(/could not be transcribed|Transcript failed/)).toBeOnTheScreen();
  });
});

describe('CommLogItem', () => {
  it('titles an email by its subject and opens no call details for it', () => {
    renderWithTheme(
      <CommLogItem log={call({ type: 'EMAIL', subject: 'Proposal', status: 'SENT' })} />,
    );
    expect(screen.getByText('Proposal')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Proposal'));
    expect(screen.queryByTestId('comm-play')).toBeNull();
  });

  it('opens an outgoing call to its recording', () => {
    renderWithTheme(<CommLogItem log={call()} />);
    fireEvent.press(screen.getByText('Outgoing call'));
    expect(screen.getByTestId('comm-play')).toBeOnTheScreen();
  });
});
