import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import EmailVerificationForm, { emailVerificationSchema } from '../email-verification-form/email-verification.form';
import OtpVerifiedDialog from '../email-verification-form/OtpVerifiedDialog';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  request: vi.fn(),
  verify: vi.fn(),
  requestLoading: false,
  verifyLoading: false,
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useMutation: (doc: { loc?: { source: { body: string } } }) =>
    (doc.loc?.source.body ?? '').includes('requestEmailVerificationOtp')
      ? [h.request, { loading: h.requestLoading }]
      : [h.verify, { loading: h.verifyLoading }],
}));
vi.mock('../../../components/PaymentLottie', () => ({
  default: (p: { label: string }) => <div data-testid="lottie" aria-label={p.label} />,
}));

const form = (props: Partial<React.ComponentProps<typeof EmailVerificationForm>> = {}) => {
  const onVerified = vi.fn();
  const view = render(<EmailVerificationForm email="a@x.com" verified={false} onVerified={onVerified} {...props} />);
  return { onVerified, ...view };
};
const type = (otp: string) =>
  fireEvent.change(screen.getByTestId('email-verification-form-otp-input'), { target: { value: otp } });

beforeEach(() => {
  vi.clearAllMocks();
  h.requestLoading = false;
  h.verifyLoading = false;
  h.request.mockResolvedValue({ data: { requestEmailVerificationOtp: { ok: true, dev_otp: null } } });
  h.verify.mockResolvedValue({ data: {} });
});

describe('emailVerificationSchema', () => {
  it('requires a six digit code and trims it', () => {
    expect(emailVerificationSchema.safeParse({ otp: '' }).success).toBe(false);
    expect(emailVerificationSchema.safeParse({ otp: '12ab56' }).success).toBe(false);
    expect(emailVerificationSchema.safeParse({ otp: '12345' }).success).toBe(false);
    const ok = emailVerificationSchema.safeParse({ otp: ' 123456 ' });
    expect(ok.success && ok.data.otp).toBe('123456');
  });
});

describe('EmailVerificationForm', () => {
  it('shows the address and a Send OTP button, with nothing to say yet', () => {
    form();
    expect(screen.getByText('a@x.com')).toBeInTheDocument();
    expect(screen.getByTestId('email-verification-form-send')).toHaveTextContent('Send OTP');
    expect(screen.queryByTestId('email-verification-form-message')).not.toBeInTheDocument();
    expect(screen.queryByTestId('email-verification-form-error')).not.toBeInTheDocument();
  });

  it('asks for an address and cannot send without one', () => {
    form({ email: '' });
    expect(screen.getByText('Add an email address to verify your account.')).toBeInTheDocument();
    expect(screen.getByTestId('email-verification-form-send')).toBeDisabled();
  });

  it('sends the code, says where it went and turns the button into Resend', async () => {
    form();
    fireEvent.click(screen.getByTestId('email-verification-form-send'));
    expect(await screen.findByTestId('email-verification-form-message')).toHaveTextContent('OTP sent to a@x.com');
    expect(screen.getByTestId('email-verification-form-send')).toHaveTextContent('Resend OTP');
    expect(screen.queryByTestId('email-verification-form-dev-otp')).not.toBeInTheDocument();
  });

  it('shows the development code when the server returns one', async () => {
    h.request.mockResolvedValue({ data: { requestEmailVerificationOtp: { ok: true, dev_otp: '424242' } } });
    form();
    fireEvent.click(screen.getByTestId('email-verification-form-send'));
    expect(await screen.findByTestId('email-verification-form-dev-otp')).toHaveTextContent('424242');
  });

  it('copes with an empty answer from the server', async () => {
    h.request.mockResolvedValue({ data: undefined });
    form();
    fireEvent.click(screen.getByTestId('email-verification-form-send'));
    expect(await screen.findByTestId('email-verification-form-message')).toBeInTheDocument();
    expect(screen.queryByTestId('email-verification-form-dev-otp')).not.toBeInTheDocument();
    h.request.mockResolvedValue({ data: { requestEmailVerificationOtp: null } });
    fireEvent.click(screen.getByTestId('email-verification-form-send'));
    await waitFor(() => expect(h.request).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('email-verification-form-dev-otp')).not.toBeInTheDocument();
  });

  it('shows why the code could not be sent, with a plain sentence when the failure has no message', async () => {
    h.request.mockRejectedValueOnce(new Error('Mail limit reached'));
    form();
    fireEvent.click(screen.getByTestId('email-verification-form-send'));
    expect(await screen.findByTestId('email-verification-form-error')).toHaveTextContent('Mail limit reached');
    expect(screen.queryByTestId('email-verification-form-message')).not.toBeInTheDocument();
    h.request.mockRejectedValueOnce(undefined);
    fireEvent.click(screen.getByTestId('email-verification-form-send'));
    await waitFor(() => expect(screen.getByTestId('email-verification-form-error')).toHaveTextContent('Could not send the OTP'));
  });

  it('will not submit an empty or malformed code and says so', async () => {
    form();
    fireEvent.click(screen.getByTestId('email-verification-form-verify'));
    expect(await screen.findByText('OTP is required')).toBeInTheDocument();
    type('12ab');
    fireEvent.click(screen.getByTestId('email-verification-form-verify'));
    expect(await screen.findByText('Enter the OTP we sent')).toBeInTheDocument();
    expect(h.verify).not.toHaveBeenCalled();
  });

  it('verifies the code, tells the page and shows the confirmation dialog', async () => {
    const { onVerified } = form();
    type('123456');
    fireEvent.click(screen.getByTestId('email-verification-form-verify'));
    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));
    expect(h.verify).toHaveBeenCalledWith({ variables: { otp: '123456' } });
    expect(await screen.findByTestId('otp-verified-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('email-verification-form-message')).toHaveTextContent(fallbackT('mweb.common.emailVerified'));
    fireEvent.click(screen.getByTestId('otp-verified-dialog-done'));
    await waitFor(() => expect(screen.queryByTestId('otp-verified-dialog-done')).not.toBeInTheDocument());
  });

  it('shows a wrong code in the server words, and a plain sentence when the failure has no message', async () => {
    h.verify.mockRejectedValueOnce(new Error('Code expired'));
    const { onVerified } = form();
    type('123456');
    fireEvent.click(screen.getByTestId('email-verification-form-verify'));
    expect(await screen.findByTestId('email-verification-form-error')).toHaveTextContent('Code expired');
    expect(onVerified).not.toHaveBeenCalled();
    h.verify.mockRejectedValueOnce(undefined);
    fireEvent.click(screen.getByTestId('email-verification-form-verify'));
    await waitFor(() => expect(screen.getByTestId('email-verification-form-error')).toHaveTextContent('Invalid OTP'));
  });

  it('disables the buttons while a request or verification is running', () => {
    h.requestLoading = true;
    h.verifyLoading = true;
    form();
    expect(screen.getByTestId('email-verification-form-send')).toBeDisabled();
    expect(screen.getByTestId('email-verification-form-verify')).toBeDisabled();
  });

  it('renders only the confirmation dialog, not the form, once verified', () => {
    form({ verified: true });
    expect(screen.queryByTestId('email-verification-form')).not.toBeInTheDocument();
  });

  it('mails the code once on arrival when asked to, and not again on a re-render', async () => {
    const { rerender, onVerified } = form({ autoSend: true });
    await waitFor(() => expect(h.request).toHaveBeenCalledTimes(1));
    await act(async () => {
      rerender(<EmailVerificationForm email="b@x.com" verified={false} onVerified={onVerified} autoSend />);
    });
    expect(h.request).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['not asked to', { autoSend: false }],
    ['already verified', { autoSend: true, verified: true }],
    ['no email on file', { autoSend: true, email: '' }],
  ])('does not mail a code on arrival when %s', async (_name, props) => {
    form(props);
    await act(async () => undefined);
    expect(h.request).not.toHaveBeenCalled();
  });

  it('swallows a failed automatic send because the form already shows the error', async () => {
    h.request.mockRejectedValue(new Error('Mail limit reached'));
    form({ autoSend: true });
    expect(await screen.findByTestId('email-verification-form-error')).toHaveTextContent('Mail limit reached');
  });
});

describe('OtpVerifiedDialog', () => {
  it('names the verified address and closes with Done', () => {
    const onClose = vi.fn();
    render(<OtpVerifiedDialog open email="a@x.com" onClose={onClose} />);
    expect(screen.getByRole('status')).toHaveTextContent(fallbackT('mweb.profile.otpVerifiedBody', { vars: { email: 'a@x.com' } }));
    fireEvent.click(screen.getByTestId('otp-verified-dialog-done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses the no-address wording when there is no email', () => {
    render(<OtpVerifiedDialog open email={null} onClose={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent(fallbackT('mweb.profile.otpVerifiedBodyNoEmail'));
  });
});
