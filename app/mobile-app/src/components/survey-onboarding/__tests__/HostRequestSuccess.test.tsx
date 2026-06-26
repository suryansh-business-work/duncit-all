import { fireEvent, screen } from '@testing-library/react-native';

import { HostRequestSuccess } from '@/components/survey-onboarding/HostRequestSuccess';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockCanGoBack = true;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    canGoBack: () => mockCanGoBack,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack = true;
});

describe('HostRequestSuccess', () => {
  it('shows the confirmation copy', () => {
    renderWithProviders(<HostRequestSuccess />);
    expect(screen.getByText('Your Request Has Been Submitted')).toBeOnTheScreen();
    expect(screen.getByText(/expanding your hosting journey with Duncit/)).toBeOnTheScreen();
  });

  it('goes back when there is history', () => {
    renderWithProviders(<HostRequestSuccess />);
    fireEvent.press(screen.getByTestId('host-request-done'));
    expect(mockGoBack).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to Host Studio when there is no history', () => {
    mockCanGoBack = false;
    renderWithProviders(<HostRequestSuccess />);
    fireEvent.press(screen.getByTestId('host-request-done'));
    expect(mockNavigate).toHaveBeenCalledWith('HostManage');
  });
});
