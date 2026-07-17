import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/screens/ResetPasswordScreen';
import { requestPasswordResetOtp, resetPasswordWithOtp } from '@/services/auth.service';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/auth.service', () => ({
  requestPasswordResetOtp: jest.fn(),
  resetPasswordWithOtp: jest.fn(),
}));
jest.mock('@/hooks/useBranding', () => ({
  useBranding: () => ({ data: undefined, isLoading: false }),
}));
const mockNavigate = jest.fn();
let mockRouteParams: { email: string } | undefined = { email: 'riya@duncit.com' };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));

const mockedRequest = requestPasswordResetOtp as jest.Mock;
const mockedReset = resetPasswordWithOtp as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = { email: 'riya@duncit.com' };
  mockedRequest.mockResolvedValue({ registered: true });
  mockedReset.mockResolvedValue(true);
});

describe('ForgotPasswordScreen', () => {
  it('requests an OTP and navigates to the reset step', async () => {
    renderWithProviders(<ForgotPasswordScreen />);
    fireEvent.changeText(screen.getByTestId('field-email'), 'riya@duncit.com');
    fireEvent.press(screen.getByTestId('forgot-password-submit'));
    await waitFor(() => expect(mockedRequest).toHaveBeenCalledWith('riya@duncit.com'));
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('ResetPassword', { email: 'riya@duncit.com' }),
    );
  });

  it('surfaces an error from the request', async () => {
    mockedRequest.mockRejectedValueOnce(new Error('server down'));
    renderWithProviders(<ForgotPasswordScreen />);
    fireEvent.changeText(screen.getByTestId('field-email'), 'riya@duncit.com');
    fireEvent.press(screen.getByTestId('forgot-password-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('forgot-password-error')).toHaveTextContent('server down'),
    );
  });

  it('flags an unregistered email and offers Create Account instead of the reset step', async () => {
    mockedRequest.mockResolvedValueOnce({ registered: false });
    renderWithProviders(<ForgotPasswordScreen />);
    fireEvent.changeText(screen.getByTestId('field-email'), 'ghost@duncit.com');
    fireEvent.press(screen.getByTestId('forgot-password-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('forgot-email-error')).toHaveTextContent('Unregistered User'),
    );
    expect(screen.getByText('New to Duncit?')).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalledWith('ResetPassword', expect.anything());
    fireEvent.press(screen.getByTestId('forgot-create-account'));
    expect(mockNavigate).toHaveBeenCalledWith('Signup');
  });

  it('links back to login', () => {
    renderWithProviders(<ForgotPasswordScreen />);
    fireEvent.press(screen.getByTestId('forgot-back-login'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});

describe('ResetPasswordScreen', () => {
  function fill() {
    fireEvent.changeText(screen.getByTestId('field-otp'), '123456');
    fireEvent.changeText(screen.getByTestId('field-new_password'), 'BrandNew123');
    fireEvent.changeText(screen.getByTestId('field-confirm_password'), 'BrandNew123');
  }

  it('resets the password then shows the success screen', async () => {
    renderWithProviders(<ResetPasswordScreen />);
    fill();
    fireEvent.press(screen.getByTestId('reset-password-submit'));
    await waitFor(() =>
      expect(mockedReset).toHaveBeenCalledWith({
        email: 'riya@duncit.com',
        otp: '123456',
        new_password: 'BrandNew123',
      }),
    );
    await waitFor(() => expect(screen.getByTestId('reset-password-success')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('reset-go-login'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('surfaces a reset error', async () => {
    mockedReset.mockRejectedValueOnce(new Error('Invalid OTP'));
    renderWithProviders(<ResetPasswordScreen />);
    fill();
    fireEvent.press(screen.getByTestId('reset-password-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('reset-password-error')).toHaveTextContent('Invalid OTP'),
    );
  });

  it('resends the OTP', () => {
    renderWithProviders(<ResetPasswordScreen />);
    fireEvent.press(screen.getByTestId('reset-resend'));
    expect(mockedRequest).toHaveBeenCalledWith('riya@duncit.com');
  });

  it('handles a missing email param (resend is a no-op)', () => {
    mockRouteParams = undefined;
    renderWithProviders(<ResetPasswordScreen />);
    fireEvent.press(screen.getByTestId('reset-resend'));
    expect(mockedRequest).not.toHaveBeenCalled();
  });
});
