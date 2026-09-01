import { deliverOtp } from '../../otp.delivery';
import { sendLoginOtpEmail } from '@services/email/email.service';

jest.mock('@services/email/email.service', () => ({
  sendLoginOtpEmail: jest.fn(),
  sendPasswordResetOtpEmail: jest.fn(),
}));

const mockedSend = sendLoginOtpEmail as jest.Mock;

const input = {
  medium: 'EMAIL' as const,
  phone_extension: '',
  phone_number: '',
  email: 'riya@duncit.com',
  recipient_name: 'Riya',
  code: '482913',
  purpose: 'LOGIN' as const,
};

const delivered = (over: Record<string, unknown> = {}) => ({
  messageId: 'm-1',
  provider: 'smtp',
  accepted: ['riya@duncit.com'],
  rejected: [],
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('deliverOtp — EMAIL', () => {
  it('reports SENT when the mailer actually took the message', async () => {
    mockedSend.mockResolvedValue(delivered());

    await expect(deliverOtp(input)).resolves.toEqual({
      medium: 'EMAIL',
      status: 'SENT',
      reason: '',
    });
  });

  /*
    The bug this guards. sendEmail REFUSES without throwing — an opted-out
    recipient, a switched-off template, a channel preference that carries codes
    elsewhere, an address every mail server rejected — and reports it in
    `skipped`. Awaiting it and reporting SENT regardless is what moved somebody
    to the "type the code" screen for a code that was never sent.
  */
  it('reports FAILED with the reason when the mailer refused without throwing', async () => {
    mockedSend.mockResolvedValue(
      delivered({
        accepted: [],
        skipped: true,
        reason: 'Recipient receives one-time codes on another channel',
      })
    );

    await expect(deliverOtp(input)).resolves.toEqual({
      medium: 'EMAIL',
      status: 'FAILED',
      reason: 'Recipient receives one-time codes on another channel',
    });
  });

  it('still reports FAILED when a refusal carried no reason', async () => {
    mockedSend.mockResolvedValue(delivered({ accepted: [], skipped: true }));

    await expect(deliverOtp(input)).resolves.toMatchObject({
      status: 'FAILED',
      reason: 'The mail was not sent',
    });
  });

  it('reports FAILED when the mailer throws', async () => {
    mockedSend.mockRejectedValue(new Error('SMTP host unreachable'));

    await expect(deliverOtp(input)).resolves.toMatchObject({
      status: 'FAILED',
      reason: 'SMTP host unreachable',
    });
  });

  /*
    A purpose with no mail behind it cannot ask for EMAIL: the copy in a code's
    mail says what typing it will DO, so there is no generic one to fall back on.
  */
  it('refuses a purpose with no email template wired', async () => {
    await expect(deliverOtp({ ...input, purpose: 'ATTENDANCE' })).resolves.toMatchObject({
      status: 'FAILED',
    });
    expect(mockedSend).not.toHaveBeenCalled();
  });
});

describe('deliverOtp — SMS', () => {
  it('is STUBBED, because no provider is wired for it', async () => {
    await expect(
      deliverOtp({ ...input, medium: 'SMS', phone_extension: '+91', phone_number: '9876543210' })
    ).resolves.toMatchObject({ medium: 'SMS', status: 'STUBBED' });
  });
});
