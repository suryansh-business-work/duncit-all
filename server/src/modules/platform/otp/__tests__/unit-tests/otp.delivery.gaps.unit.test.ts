/**
 * The parts of one-time-code delivery the main suite leaves out: a WhatsApp
 * number that cannot be one, and SMS through MSG91 when it is configured —
 * sent, refused (with only the end of the number logged), and unreachable.
 */
import { logs } from '@observability/log';
import { isAisensyConfigured, sendCampaign } from '@modules/platform/aisensy/aisensy.gateway';
import { recordManualSend } from '@modules/platform/whatsapp/whatsapp.manualLog';
import { communicationsMuted } from '@modules/platform/e2eRun/e2eRun.mute';
import { msg91SendOtp, runtimeMsg91Credentials } from '@modules/platform/msg91/msg91.gateway';
import { deliverOtp, type OtpDeliveryInput } from '../../otp.delivery';

jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn() } } }));
jest.mock('@services/email/email.service', () => ({ sendLoginOtpEmail: jest.fn(), sendPasswordResetOtpEmail: jest.fn(), sendEnvAccessOtpEmail: jest.fn() }));
jest.mock('@modules/platform/e2eRun/e2eRun.mute', () => ({
  ...jest.requireActual('@modules/platform/e2eRun/e2eRun.mute'),
  communicationsMuted: jest.fn().mockResolvedValue(false),
}));
jest.mock('@modules/platform/aisensy/aisensy.gateway', () => ({
  INVALID_NUMBER_REASON: 'Not a valid WhatsApp mobile number',
  isAisensyConfigured: jest.fn().mockResolvedValue(true),
  otpCampaign: jest.fn().mockResolvedValue('duncit_otp'),
  sendCampaign: jest.fn(),
}));
jest.mock('@modules/platform/msg91/msg91.gateway', () => ({
  ...jest.requireActual('@modules/platform/msg91/msg91.gateway'),
  msg91SendOtp: jest.fn(),
  runtimeMsg91Credentials: jest.fn(),
}));
jest.mock('@modules/platform/whatsapp/whatsapp.manualLog', () => ({
  WA_OTP_EVENT_KEY: 'AUTH_ONE_TIME_CODE',
  recordManualSend: jest.fn().mockResolvedValue(undefined),
}));

const sms = (over: Partial<OtpDeliveryInput> = {}): OtpDeliveryInput => ({
  medium: 'SMS', phone_extension: '+91', phone_number: '9876543210', email: '', recipient_name: '', code: '482913', purpose: 'LOGIN', ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  (communicationsMuted as jest.Mock).mockResolvedValue(false);
  (isAisensyConfigured as jest.Mock).mockResolvedValue(true);
});

describe('WhatsApp to a number that cannot be one', () => {
  it('is refused before AiSensy is asked, and filed in the log with the reason', async () => {
    const out = await deliverOtp(sms({ medium: 'WHATSAPP', phone_extension: '+91', phone_number: '12345' }));
    expect(out).toEqual({ medium: 'WHATSAPP', status: 'FAILED', reason: 'Not a valid WhatsApp mobile number' });
    expect(sendCampaign).not.toHaveBeenCalled();
    expect(recordManualSend).toHaveBeenCalledWith(expect.objectContaining({ key: 'AUTH_ONE_TIME_CODE', reason: 'Not a valid WhatsApp mobile number', duration_ms: 0 }));
  });

  it('files an AiSensy rejection with the reason, never the code, and reports it failed', async () => {
    (sendCampaign as jest.Mock).mockRejectedValue(new Error('AiSensy error: template paused (HTTP 400)'));
    const out = await deliverOtp(sms({ medium: 'WHATSAPP' }));
    expect(out).toEqual({ medium: 'WHATSAPP', status: 'FAILED', reason: 'AiSensy error: template paused (HTTP 400)' });
    expect(JSON.stringify((recordManualSend as jest.Mock).mock.calls)).not.toContain('482913');
  });

  it('files a rejection that is not an Error under a generic reason', async () => {
    (sendCampaign as jest.Mock).mockRejectedValue('plain');
    await expect(deliverOtp(sms({ medium: 'WHATSAPP' }))).resolves.toMatchObject({ status: 'FAILED', reason: 'AiSensy rejected the message' });
  });
});

describe('SMS through MSG91', () => {
  it('is a stub, not a failure, while no provider is configured', async () => {
    (runtimeMsg91Credentials as jest.Mock).mockResolvedValue(null);
    await expect(deliverOtp(sms())).resolves.toMatchObject({ medium: 'SMS', status: 'STUBBED' });
    expect(msg91SendOtp).not.toHaveBeenCalled();
  });

  it('asks MSG91 to send, and keeps its request id as the handle on the code it made', async () => {
    (runtimeMsg91Credentials as jest.Mock).mockResolvedValue({ authkey: 'k' });
    (msg91SendOtp as jest.Mock).mockResolvedValue({ ok: true, message: 'req-42' });
    await expect(deliverOtp(sms())).resolves.toEqual({ medium: 'SMS', status: 'SENT', reason: '', request_id: 'req-42' });
    expect(msg91SendOtp).toHaveBeenCalledWith({ authkey: 'k' }, expect.stringContaining('9876543210'));
  });

  it('is a failure when MSG91 refuses, logging only the end of the number', async () => {
    (runtimeMsg91Credentials as jest.Mock).mockResolvedValue({ authkey: 'k' });
    (msg91SendOtp as jest.Mock).mockResolvedValue({ ok: false, code: '311', message: 'insufficient balance' });
    await expect(deliverOtp(sms())).resolves.toEqual({ medium: 'SMS', status: 'FAILED', reason: 'insufficient balance' });
    const logged = (logs.server.warn as jest.Mock).mock.calls[0][2];
    expect(logged).toMatchObject({ code: '311', purpose: 'LOGIN', phone_suffix: '3210' });
    expect(JSON.stringify(logged)).not.toContain('9876543210');
  });

  it('is a failure when MSG91 cannot be reached, by its own words or a generic one', async () => {
    (runtimeMsg91Credentials as jest.Mock).mockResolvedValue({ authkey: 'k' });
    (msg91SendOtp as jest.Mock).mockRejectedValueOnce(new Error('ECONNRESET'));
    await expect(deliverOtp(sms())).resolves.toEqual({ medium: 'SMS', status: 'FAILED', reason: 'ECONNRESET' });
    (msg91SendOtp as jest.Mock).mockRejectedValueOnce('weird');
    await expect(deliverOtp(sms())).resolves.toEqual({ medium: 'SMS', status: 'FAILED', reason: 'MSG91 could not be reached' });
  });
});
