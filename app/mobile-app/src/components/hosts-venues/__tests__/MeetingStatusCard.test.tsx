import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { MeetingStatusCard } from '@/components/hosts-venues/MeetingStatusCard';
import { useMyMeeting } from '@/hooks/useMyMeeting';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useMyMeeting', () => ({ useMyMeeting: jest.fn() }));
const mockHook = useMyMeeting as jest.Mock;

const meeting = (over: Record<string, unknown> = {}) => ({
  meeting: {
    id: 'm',
    request_no: 'DUN-VEN-000007',
    status: 'SCHEDULED',
    requested_at: '2026-07-01T10:00:00Z',
    scheduled_at: '2026-07-03T09:00:00Z',
    meeting_link: 'https://meet/x',
    ...over,
  },
  isLoading: false,
});

beforeEach(() => jest.clearAllMocks());

describe('MeetingStatusCard', () => {
  it('renders nothing when there is no meeting', () => {
    mockHook.mockReturnValue({ meeting: null, isLoading: false });
    renderWithProviders(<MeetingStatusCard kind="HOST" />);
    expect(screen.queryByTestId('meeting-card-HOST')).toBeNull();
  });

  it('shows a scheduled venue meeting and opens the join link', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    mockHook.mockReturnValue(meeting());
    renderWithProviders(<MeetingStatusCard kind="VENUE" />);
    expect(screen.getByText('Your Venue onboarding meeting')).toBeOnTheScreen();
    expect(screen.getByTestId('meeting-request-no-VENUE')).toHaveTextContent(
      'Request ID: DUN-VEN-000007',
    );
    fireEvent.press(screen.getByTestId('meeting-join-VENUE'));
    expect(open).toHaveBeenCalledWith('https://meet/x');
  });

  it('handles a link-only schedule and a time-only schedule', () => {
    mockHook.mockReturnValue(meeting({ scheduled_at: null }));
    const { rerender } = renderWithProviders(<MeetingStatusCard kind="HOST" />);
    expect(screen.getByTestId('meeting-join-HOST')).toBeOnTheScreen();

    mockHook.mockReturnValue(meeting({ meeting_link: null }));
    rerender(<MeetingStatusCard kind="HOST" />);
    expect(screen.queryByTestId('meeting-join-HOST')).toBeNull();
  });

  it('shows a pending state when only requested and hides the id when absent', () => {
    mockHook.mockReturnValue(
      meeting({ status: 'REQUESTED', scheduled_at: null, meeting_link: null, request_no: null }),
    );
    renderWithProviders(<MeetingStatusCard kind="HOST" />);
    expect(screen.getByText(/confirm a time soon/)).toBeOnTheScreen();
    expect(screen.queryByTestId('meeting-request-no-HOST')).toBeNull();
  });
});
