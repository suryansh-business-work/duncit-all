import { logs } from '@observability/log';
import { otpCampaign, sendCampaign } from '@modules/platform/aisensy/aisensy.gateway';
import { recordManualSend, WA_OTP_EVENT_KEY } from '@modules/platform/whatsapp/whatsapp.manualLog';
import { sendLoginOtpEmail, sendPasswordResetOtpEmail } from '@services/email/email.service';
import { OTP_TTL_MINUTES } from './otp.constants';
import type { IOtpDelivery, OtpMedium, OtpPurpose } from './otp.model';

export { hasOtpTransport } from './otp.transports';

export interface OtpDeliveryInput {
  medium: OtpMedium;
  phone_extension: string;
  phone_number: string;
  /** Blank for a code addressed to a number. */
  email: string;
  recipient_name: string;
  code: string;
  purpose: OtpPurpose;
}

/** AiSensy takes the country code and the number as one run of digits. */
const destinationOf = (input: Readonly<OtpDeliveryInput>): string =>
  `${input.phone_extension}${input.phone_number}`.replaceAll(/\D/g, '');

/** AiSensy records a name against every send and rejects an empty one. */
const nameOf = (input: Readonly<OtpDeliveryInput>): string => input.recipient_name || 'there';

const sent = (medium: OtpMedium): IOtpDelivery => ({ medium, status: 'SENT', reason: '' });
const failed = (medium: OtpMedium, reason: string): IOtpDelivery =>
  ({ medium, status: 'FAILED', reason });

/**
 * WhatsApp, over the approved AUTHENTICATION template.
 *
 * The code travels TWICE, which is Meta's own contract for an authentication
 * template rather than belt-and-braces: the body's `{{1}}` is the code the
 * message reads out, and the copy-code button carries the same value in its own
 * `buttons` field. AiSensy rejects a `templateParams` of the wrong length
 * outright ("Template param count mismatch!"), so the button value is NEVER
 * folded into that array — see `campaignPayload`.
 *
 * The campaign name is configuration (Tech portal -> AiSensy -> OTP Campaign
 * Name), because the template behind it is renamed and re-approved at Meta on
 * its own schedule and a redeploy must not be what a new version needs.
 */
async function deliverWhatsApp(input: Readonly<OtpDeliveryInput>): Promise<IOtpDelivery> {
  const campaign_name = await otpCampaign();
  const destination = destinationOf(input);
  const startedAt = Date.now();
  try {
    const submitted_message_id = await sendCampaign({
      campaign_name,
      destination,
      user_name: nameOf(input),
      template_params: [input.code],
      buttons: [{ index: 0, value: input.code }],
    });
    // Filed in the same log every other WhatsApp message lands in, so "my code
    // never arrived" has an answer in Marketing > WhatsApp > Logs. The code
    // itself is never written there — `params` is deliberately left empty.
    await recordManualSend({
      key: WA_OTP_EVENT_KEY,
      campaign: campaign_name,
      destination,
      submitted_message_id,
      duration_ms: Date.now() - startedAt,
    });
    return sent('WHATSAPP');
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'AiSensy rejected the message';
    await recordManualSend({
      key: WA_OTP_EVENT_KEY,
      campaign: campaign_name,
      destination,
      reason,
      duration_ms: Date.now() - startedAt,
    });
    return failed('WHATSAPP', reason);
  }
}

/**
 * Email, over the platform's own mailer, with the mail chosen by the purpose.
 *
 * `sendEmail` REFUSES without throwing — an opted-out recipient, a switched-off
 * template, a channel preference that sends codes elsewhere, an address every
 * mail server rejected — and says so in `skipped`, whose own comment is
 * "callers read `skipped` to decide whether to tell a user their email is on the
 * way". Awaiting it and reporting SENT regardless is how a code nobody could
 * receive still moved the person to the "type the code" screen, with no error
 * anywhere they could see it.
 */
async function deliverEmail(input: Readonly<OtpDeliveryInput>): Promise<IOtpDelivery> {
  const send = EMAIL_SENDERS[input.purpose];
  if (!send) {
    return failed('EMAIL', `No email template is wired for ${input.purpose} codes`);
  }
  try {
    const result = await send({
      to: input.email,
      name: nameOf(input),
      otp: input.code,
      expiresMinutes: String(OTP_TTL_MINUTES),
    });
    if (result.skipped) {
      return failed('EMAIL', result.reason || 'The mail was not sent');
    }
    return sent('EMAIL');
  } catch (error) {
    return failed('EMAIL', error instanceof Error ? error.message : 'The mail could not be sent');
  }
}

/**
 * Which mail carries which purpose's code. A purpose absent here cannot ask
 * for EMAIL — the copy in a code's mail says what typing it will DO, so a
 * generic one-size message would promise the wrong thing.
 */
const EMAIL_SENDERS: Partial<Record<OtpPurpose, typeof sendPasswordResetOtpEmail>> = {
  PASSWORD_RESET: sendPasswordResetOtpEmail,
  LOGIN: sendLoginOtpEmail,
};

/**
 * The ONE seam a one-time code leaves Duncit through.
 *
 * Two of the three mediums are live. SMS has no provider on this platform at
 * all, so a code asked for over it is reported STUBBED and the server hands the
 * fixed development code back to the client — the whole flow above it
 * (challenge, expiry, attempt limit, single use) is the real one either way.
 *
 * Wiring the third one up is adding ONE branch here. Deliberately not
 * `if (isDev)`: that would make the shipped behaviour depend on an environment
 * variable instead of on whether a transport exists.
 */
export async function deliverOtp(input: Readonly<OtpDeliveryInput>): Promise<IOtpDelivery> {
  if (input.medium === 'WHATSAPP') return deliverWhatsApp(input);
  if (input.medium === 'EMAIL') return deliverEmail(input);

  logs.server.info('otp.delivery', 'deliverOtp', {
    msg: 'one-time code not transmitted (no transport wired)',
    medium: input.medium,
    purpose: input.purpose,
    // NEVER the code itself, and never the full number.
    phone_suffix: input.phone_number.slice(-4),
  });
  return {
    medium: input.medium,
    status: 'STUBBED',
    reason: 'No SMS provider is configured yet — use the displayed test code',
  };
}
