import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import {
  completePasswordReset,
  requestPasswordResetCode,
  verifyPasswordResetCode,
} from '@/services/auth.service';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/auth.service', () => ({
  requestPasswordResetCode: jest.fn(),
  verifyPasswordResetCode: jest.fn(),
  completePasswordReset: jest.fn(),
}));
jest.mock('@/hooks/useBranding', () => ({
  useBranding: () => ({ data: undefined, isLoading: false }),
}));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: undefined }),
}));

const mockedRequest = requestPasswordResetCode as jest.Mock;
const mockedVerify = verifyPasswordResetCode as jest.Mock;
const mockedComplete = completePasswordReset as jest.Mock;

const SENT = {
  registered: true,
  resendAfterSeconds: 30,
  expiresInMinutes: 10,
  testCode: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedRequest.mockResolvedValue(SENT);
  mockedVerify.mockResolvedValue('challenge.secret');
  mockedComplete.mockResolvedValue(true);
});

/** Step one, on the default (email) channel. */
async function sendCodeToEmail(email = 'riya@duncit.com') {
  fireEvent.changeText(screen.getByTestId('field-email'), email);
  await waitFor(() => expect(screen.getByTestId('recovery-send-code')).toBeTruthy());
  fireEvent.press(screen.getByTestId('recovery-send-code'));
}

describe('ForgotPasswordScreen', () => {
  it('sends an email code and moves to the code step', async () => {
    renderWithProviders(<ForgotPasswordScreen />);
    await sendCodeToEmail();

    await waitFor(() =>
      expect(mockedRequest).toHaveBeenCalledWith({
        channel: 'EMAIL',
        email: 'riya@duncit.com',
      }),
    );
    await waitFor(() => expect(screen.getByTestId('recovery-verify-code')).toBeTruthy());
  });

  it('sends a WhatsApp code when the phone channel is chosen', async () => {
    renderWithProviders(<ForgotPasswordScreen />);
    fireEvent.press(screen.getByTestId('recovery-channel-PHONE'));

    fireEvent.changeText(screen.getByTestId('field-number'), '9876543210');
    await waitFor(() => expect(screen.getByTestId('recovery-send-code')).toBeTruthy());
    fireEvent.press(screen.getByTestId('recovery-send-code'));

    await waitFor(() =>
      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'PHONE', phone_number: '9876543210' }),
      ),
    );
  });

  it('says so when no account matches, and offers to create one', async () => {
    mockedRequest.mockResolvedValueOnce({ ...SENT, registered: false });
    renderWithProviders(<ForgotPasswordScreen />);
    await sendCodeToEmail('ghost@duncit.com');

    await waitFor(() =>
      expect(screen.getByTestId('recovery-not-found')).toHaveTextContent(
        'We couldn’t find an account with these details.',
      ),
    );
    expect(screen.getByTestId('recovery-create-account')).toBeTruthy();
  });

  it('surfaces an error from the request', async () => {
    mockedRequest.mockRejectedValueOnce(new Error('server down'));
    renderWithProviders(<ForgotPasswordScreen />);
    await sendCodeToEmail();

    await waitFor(() =>
      expect(screen.getByTestId('recovery-error')).toHaveTextContent('server down'),
    );
  });

  it('verifies the code, sets a new password and offers the login CTA', async () => {
    renderWithProviders(<ForgotPasswordScreen />);
    await sendCodeToEmail();

    await waitFor(() => expect(screen.getByTestId('field-otp')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('field-otp'), '123456');
    fireEvent.press(screen.getByTestId('recovery-verify-code'));

    await waitFor(() =>
      expect(mockedVerify).toHaveBeenCalledWith(
        { channel: 'EMAIL', email: 'riya@duncit.com' },
        '123456',
      ),
    );

    await waitFor(() => expect(screen.getByTestId('field-new_password')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('field-new_password'), 'StrongPass123');
    fireEvent.changeText(screen.getByTestId('field-confirm_password'), 'StrongPass123');
    fireEvent.press(screen.getByTestId('recovery-save-password'));

    await waitFor(() =>
      expect(mockedComplete).toHaveBeenCalledWith('challenge.secret', 'StrongPass123'),
    );
    await waitFor(() => expect(screen.getByTestId('recovery-go-login')).toBeTruthy());

    fireEvent.press(screen.getByTestId('recovery-go-login'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('goes back from the code step to the channel step', async () => {
    renderWithProviders(<ForgotPasswordScreen />);
    await sendCodeToEmail();

    await waitFor(() => expect(screen.getByTestId('recovery-back')).toBeTruthy());
    fireEvent.press(screen.getByTestId('recovery-back'));

    await waitFor(() => expect(screen.getByTestId('recovery-send-code')).toBeTruthy());
  });
});
