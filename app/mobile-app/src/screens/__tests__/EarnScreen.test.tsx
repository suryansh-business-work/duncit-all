import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { EarnScreen } from '@/screens/EarnScreen';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));
const mockUseMe = jest.fn();
jest.mock('@/hooks/useMe', () => ({ useMe: () => mockUseMe() }));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseMe.mockReturnValue({ data: { me: { roles: ['HOST'] } } });
  mockRequest.mockResolvedValue({ myMeetings: [] });
});

describe('EarnScreen', () => {
  it('disables held-role boxes and navigates from an available one', async () => {
    renderWithProviders(<EarnScreen />);
    expect(screen.getByTestId('earn-box-HOST-enabled')).toBeOnTheScreen();
    expect(screen.queryByTestId('earn-box-VENUE_OWNER-enabled')).toBeNull();
    fireEvent.press(screen.getByTestId('earn-box-VENUE_OWNER'));
    expect(mockNavigate).toHaveBeenCalledWith('RegisterVenue');
  });

  it('treats a user with no roles as all-available', async () => {
    mockUseMe.mockReturnValue({ data: {} });
    renderWithProviders(<EarnScreen />);
    expect(screen.queryByTestId('earn-box-HOST-enabled')).toBeNull();
    fireEvent.press(screen.getByTestId('earn-box-ECOMM_MANAGER'));
    expect(mockNavigate).toHaveBeenCalledWith('ListProduct');
  });

  it('disables a box while its onboarding meeting is pending, with the notice', async () => {
    mockUseMe.mockReturnValue({ data: { me: { roles: [] } } });
    mockRequest.mockResolvedValue({
      myMeetings: [
        {
          id: 'm1',
          kind: 'VENUE',
          status: 'SCHEDULED',
          requested_at: null,
          scheduled_at: '2027-01-04T04:30:00.000Z',
        },
        {
          id: 'm2',
          kind: 'HOST',
          status: 'DONE',
          requested_at: '2027-01-01T04:30:00.000Z',
          scheduled_at: null,
        },
      ],
    });
    renderWithProviders(<EarnScreen />);
    await waitFor(() => expect(screen.getByText('Meeting scheduled')).toBeOnTheScreen());
    expect(screen.getByText(/unlocks once the meeting is done/)).toBeOnTheScreen();
    // Pending venue meeting blocks the venue box…
    fireEvent.press(screen.getByTestId('earn-box-VENUE_OWNER'));
    expect(mockNavigate).not.toHaveBeenCalled();
    // …but a DONE host meeting leaves the host box available again.
    fireEvent.press(screen.getByTestId('earn-box-HOST'));
    expect(mockNavigate).toHaveBeenCalledWith('BecomeHost');
  });

  it('shows the notice without a time when the meeting has no date', async () => {
    mockUseMe.mockReturnValue({ data: { me: { roles: [] } } });
    mockRequest.mockResolvedValue({
      myMeetings: [
        { id: 'm1', kind: 'ECOMM', status: 'REQUESTED', requested_at: null, scheduled_at: null },
      ],
    });
    renderWithProviders(<EarnScreen />);
    await waitFor(() =>
      expect(
        screen.getByText(/You already have an onboarding meeting scheduled for this\./),
      ).toBeOnTheScreen(),
    );
  });

  it('survives a failed meetings load', async () => {
    mockRequest.mockRejectedValue(new Error('down'));
    renderWithProviders(<EarnScreen />);
    fireEvent.press(screen.getByTestId('earn-box-VENUE_OWNER'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('RegisterVenue'));
  });
});
