import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { EmailVerificationSection } from '@/components/account/EmailVerificationSection';
import { fallbackT } from '@/i18n/fallback';
import {
  requestEmailVerificationOtp,
  verifyEmailVerificationOtp,
} from '@/services/email-verification.service';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/email-verification.service', () => ({
  requestEmailVerificationOtp: jest.fn(),
  verifyEmailVerificationOtp: jest.fn(),
}));

const mockRequestOtp = requestEmailVerificationOtp as jest.Mock;
const mockVerifyOtp = verifyEmailVerificationOtp as jest.Mock;

interface MountProps {
  email?: string | null;
  verified?: boolean;
  autoSend?: boolean;
}

function mount({ email = 'asha@example.com', verified = false, autoSend }: MountProps = {}) {
  const onVerified = jest.fn();
  const view = renderWithProviders(
    <EmailVerificationSection
      email={email}
      verified={verified}
      onVerified={onVerified}
      autoSend={autoSend}
    />,
  );
  return { ...view, onVerified };
}

const sendButton = () => screen.getByTestId('email-verification-send');
const otpInput = () => screen.getByTestId('email-verification-otp');
const submit = () => screen.getByTestId('email-verification-submit');

/** Both controls report their state as `aria-disabled` (the repo idiom). */
type Host = ReturnType<typeof screen.getByTestId>;
const isDisabled = (node: Host) =>
  node.props.accessibilityState?.disabled === true || node.props['aria-disabled'] === true;

beforeEach(() => jest.clearAllMocks());

describe('EmailVerificationSection — rendering', () => {
  it('renders nothing once the email is verified', () => {
    mount({ verified: true });
    expect(screen.queryByTestId('email-verification')).toBeNull();
  });

  it('shows the address and a disabled Verify until a code is typed', () => {
    mount();
    expect(screen.getByText('asha@example.com')).toBeOnTheScreen();
    expect(sendButton()).toHaveTextContent('Send OTP');
    expect(isDisabled(submit())).toBe(true);
    expect(screen.queryByTestId('email-verification-hint')).toBeNull();
  });

  it('asks for an email and disables sending when there is none', () => {
    mount({ email: null });
    expect(screen.getByText('Add an email address to verify your account.')).toBeOnTheScreen();
    expect(isDisabled(sendButton())).toBe(true);
    fireEvent.press(sendButton());
    expect(mockRequestOtp).not.toHaveBeenCalled();
  });

  it('hints at a short code and enables Verify for a full one', () => {
    mount();
    fireEvent.changeText(otpInput(), '12');
    expect(screen.getByTestId('email-verification-hint')).toHaveTextContent(
      'Enter the OTP we sent',
    );
    expect(isDisabled(submit())).toBe(true);

    fireEvent.changeText(otpInput(), '123456');
    expect(screen.queryByTestId('email-verification-hint')).toBeNull();
    expect(isDisabled(submit())).toBe(false);
  });
});

describe('EmailVerificationSection — sending', () => {
  it('mails the code, shows the dev code and offers a resend', async () => {
    let resolve: (v: { devOtp: string | null }) => void = () => undefined;
    mockRequestOtp.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    mount();
    fireEvent.press(sendButton());
    await waitFor(() => expect(sendButton()).toHaveTextContent('Sending…'));
    expect(isDisabled(sendButton())).toBe(true);

    await act(async () => resolve({ devOtp: '424242' }));
    expect(screen.getByTestId('email-verification-message')).toHaveTextContent(
      'OTP sent to asha@example.com',
    );
    expect(screen.getByTestId('email-verification-dev-otp')).toHaveTextContent('Dev OTP: 424242');
    expect(sendButton()).toHaveTextContent('Resend OTP');
  });

  it('shows no dev code when the server sends none', async () => {
    mockRequestOtp.mockResolvedValueOnce({ devOtp: null });
    mount();
    fireEvent.press(sendButton());
    await waitFor(() => expect(screen.getByTestId('email-verification-message')).toBeOnTheScreen());
    expect(screen.queryByTestId('email-verification-dev-otp')).toBeNull();
  });

  it('shows the server’s reason when sending fails', async () => {
    mockRequestOtp.mockRejectedValueOnce(new Error('Too many requests'));
    mount();
    fireEvent.press(sendButton());
    await waitFor(() =>
      expect(screen.getByTestId('email-verification-error')).toHaveTextContent(
        'Too many requests',
      ),
    );
    expect(sendButton()).toHaveTextContent('Send OTP');
  });

  it('falls back to the could-not-send copy for a bare failure', async () => {
    mockRequestOtp.mockRejectedValueOnce('nope');
    mount();
    fireEvent.press(sendButton());
    await waitFor(() =>
      expect(screen.getByTestId('email-verification-error')).toHaveTextContent(
        fallbackT('mweb.account.couldNotSendTheOtp'),
      ),
    );
  });
});

describe('EmailVerificationSection — auto send', () => {
  it('mails the code once on arrival from the Home nudge', async () => {
    mockRequestOtp.mockResolvedValue({ devOtp: null });
    const { rerender, onVerified } = mount({ autoSend: true });
    await waitFor(() => expect(screen.getByTestId('email-verification-message')).toBeOnTheScreen());
    rerender(
      <EmailVerificationSection
        email="asha@example.com"
        verified={false}
        onVerified={onVerified}
        autoSend
      />,
    );
    expect(mockRequestOtp).toHaveBeenCalledTimes(1);
  });

  it('does not auto send without an email or once verified', () => {
    mount({ autoSend: true, email: '' });
    mount({ autoSend: true, verified: true });
    expect(mockRequestOtp).not.toHaveBeenCalled();
  });
});

describe('EmailVerificationSection — verifying', () => {
  it('verifies the trimmed code, confirms and clears the box', async () => {
    mockVerifyOtp.mockResolvedValueOnce(true);
    const { onVerified } = mount();
    fireEvent.changeText(otpInput(), ' 123456 ');
    fireEvent.press(submit());
    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));

    expect(mockVerifyOtp).toHaveBeenCalledWith('123456');
    expect(screen.getByTestId('email-verification-message')).toHaveTextContent(
      fallbackT('mweb.common.emailVerified'),
    );
    expect(otpInput().props.value).toBe('');
  });

  it('keeps the code and shows the reason when verification fails', async () => {
    mockVerifyOtp.mockRejectedValueOnce(new Error('Code expired'));
    const { onVerified } = mount();
    fireEvent.changeText(otpInput(), '123456');
    fireEvent.press(submit());
    await waitFor(() =>
      expect(screen.getByTestId('email-verification-error')).toHaveTextContent('Code expired'),
    );
    expect(onVerified).not.toHaveBeenCalled();
    expect(otpInput().props.value).toBe('123456');
  });

  it('falls back to the invalid-code copy for a bare failure', async () => {
    mockVerifyOtp.mockRejectedValueOnce(undefined);
    mount();
    fireEvent.changeText(otpInput(), '123456');
    fireEvent.press(submit());
    await waitFor(() =>
      expect(screen.getByTestId('email-verification-error')).toHaveTextContent(
        fallbackT('mweb.account.invalidOtp'),
      ),
    );
  });
});
