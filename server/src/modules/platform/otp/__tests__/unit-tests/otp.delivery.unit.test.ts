import { deliverOtp, hasOtpTransport } from '../../otp.delivery';
import type { OtpMedium } from '../../otp.model';
import { sendLoginOtpEmail } from '@services/email/email.service';
import {
  isAisensyConfigured,
  sendCampaign,
} from '@modules/platform/aisensy/aisensy.gateway';
import { recordManualSend } from '@modules/platform/whatsapp/whatsapp.manualLog';
import {
  e2eOverrides,
  MUTED_REASON,
  OTP_BYPASS_REASON,
} from '@modules/platform/e2eRun/e2eRun.mute';

jest.mock('@services/email/email.service', () => ({
  sendLoginOtpEmail: jest.fn(),
  sendPasswordResetOtpEmail: jest.fn(),
}));

/*
  The two E2E switches are asked for BEFORE any medium is chosen, and they are
  read from the database. This is a unit suite with no connection, so the read
  buffers until mongoose gives up — every case here timed out at the first line
  of the function under test rather than at anything it was written to check.
  Neither switch is on in a normal run, which is the state being unit-tested.
*/
jest.mock('@modules/platform/e2eRun/e2eRun.mute', () => ({
  ...jest.requireActual('@modules/platform/e2eRun/e2eRun.mute'),
  e2eOverrides: jest.fn().mockResolvedValue({ muted: false, otpBypass: false }),
}));

// The WhatsApp provider and the log every WhatsApp message is filed in — both
// reach the network or the database, and neither is what this suite is about.
jest.mock('@modules/platform/aisensy/aisensy.gateway', () => ({
  isAisensyConfigured: jest.fn().mockResolvedValue(true),
  otpCampaign: jest.fn().mockResolvedValue('duncit_otp'),
  sendCampaign: jest.fn().mockResolvedValue('msg-1'),
}));
jest.mock('@modules/platform/whatsapp/whatsapp.manualLog', () => ({
  WA_OTP_EVENT_KEY: 'AUTH_ONE_TIME_CODE',
  recordManualSend: jest.fn().mockResolvedValue(undefined),
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

  it('reports FAILED with a stand-in reason when the throw was not an Error', async () => {
    mockedSend.mockRejectedValue('nope');

    await expect(deliverOtp(input)).resolves.toMatchObject({
      status: 'FAILED',
      reason: 'The mail could not be sent',
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

/*
  Re-exported from here so callers have ONE import for "how does a code leave".
  `commPreferenceService` reads it upstream of the mailer, which is why the
  table itself lives in its own module rather than in otp.delivery.
*/
describe('hasOtpTransport, through the delivery module', () => {
  it('answers for every medium', () => {
    expect(hasOtpTransport('SMS')).toBe(false);
    expect(hasOtpTransport('WHATSAPP')).toBe(true);
    expect(hasOtpTransport('EMAIL')).toBe(true);
  });

  // A medium read back off an old challenge document need not still be one of
  // the three. Unwired is the only safe answer for a name nothing carries.
  it('treats a medium it has never heard of as unwired', () => {
    expect(hasOtpTransport('PIGEON' as OtpMedium)).toBe(false);
  });
});

describe('deliverOtp — SMS', () => {
  it('is STUBBED, because no provider is wired for it', async () => {
    await expect(
      deliverOtp({ ...input, medium: 'SMS', phone_extension: '+91', phone_number: '9876543210' })
    ).resolves.toMatchObject({ medium: 'SMS', status: 'STUBBED' });
  });
});

const wa = {
  ...input,
  medium: 'WHATSAPP' as const,
  email: '',
  phone_extension: '+91',
  phone_number: '9876543210',
};

describe('deliverOtp — WHATSAPP', () => {
  it('sends over the authentication template and files the send', async () => {
    await expect(deliverOtp(wa)).resolves.toEqual({
      medium: 'WHATSAPP',
      status: 'SENT',
      reason: '',
    });
    expect(sendCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        campaign_name: 'duncit_otp',
        destination: '919876543210',
        // Meta's own contract for an authentication template: the code travels
        // in the body AND in the copy-code button.
        template_params: [wa.code],
        buttons: [{ index: 0, value: wa.code }],
      })
    );
    // The number and the outcome, never the code itself.
    expect(recordManualSend).toHaveBeenCalledWith(
      expect.objectContaining({ destination: '919876543210' })
    );
  });

  it('names the recipient when the caller had no name for them', async () => {
    await deliverOtp({ ...wa, recipient_name: '' });

    expect(sendCampaign).toHaveBeenCalledWith(expect.objectContaining({ user_name: 'there' }));
  });

  /*
    The regression this guards. A platform with no AiSensy key used to report
    FAILED here while SMS reported STUBBED beside it, so `otpService` saw a
    mixed pair, withheld the test code, and every one-time code on a fresh
    install was one nobody could type. Nothing is wired yet is not an outage.
  */
  it('is STUBBED when no WhatsApp provider is configured at all', async () => {
    (isAisensyConfigured as jest.Mock).mockResolvedValueOnce(false);

    await expect(deliverOtp(wa)).resolves.toMatchObject({
      medium: 'WHATSAPP',
      status: 'STUBBED',
    });
    expect(sendCampaign).not.toHaveBeenCalled();
  });

  it('reports FAILED when a configured provider refuses', async () => {
    (sendCampaign as jest.Mock).mockRejectedValueOnce(new Error('Template param count mismatch!'));

    await expect(deliverOtp(wa)).resolves.toMatchObject({
      status: 'FAILED',
      reason: 'Template param count mismatch!',
    });
    // Filed either way, so "my code never arrived" has an answer in the log.
    expect(recordManualSend).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'Template param count mismatch!' })
    );
  });

  it('reports FAILED with a stand-in reason when the refusal was not an Error', async () => {
    (sendCampaign as jest.Mock).mockRejectedValueOnce('nope');

    await expect(deliverOtp(wa)).resolves.toMatchObject({
      status: 'FAILED',
      reason: 'AiSensy rejected the message',
    });
  });
});

/*
  The two E2E switches, asked before any medium is chosen. They are kept apart
  on purpose: holding traffic is not a decision to reveal a secret, so muting
  alone must never hand the code back.
*/
describe('deliverOtp — the E2E switches', () => {
  it('hands the code back for every medium while the OTP bypass is on', async () => {
    (e2eOverrides as jest.Mock).mockResolvedValueOnce({ muted: false, otpBypass: true });

    await expect(deliverOtp(wa)).resolves.toMatchObject({
      status: 'STUBBED',
      reason: OTP_BYPASS_REASON,
    });
    expect(sendCampaign).not.toHaveBeenCalled();
  });

  it('holds a code without revealing it while communications are muted', async () => {
    (e2eOverrides as jest.Mock).mockResolvedValueOnce({ muted: true, otpBypass: false });

    await expect(deliverOtp(wa)).resolves.toMatchObject({
      status: 'FAILED',
      reason: MUTED_REASON,
    });
    expect(sendCampaign).not.toHaveBeenCalled();
  });
});
