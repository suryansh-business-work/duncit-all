import { logs } from '@observability/log';
import type { IOtpDelivery, OtpMedium, OtpPurpose } from './otp.model';

export interface OtpDeliveryInput {
  medium: OtpMedium;
  phone_extension: string;
  phone_number: string;
  recipient_name: string;
  code: string;
  purpose: OtpPurpose;
}

/**
 * The ONE seam a one-time code leaves Duncit through.
 *
 * Nothing actually sends yet — SMS has no provider on this platform at all, and
 * the WhatsApp funnel only carries pre-approved AiSensy templates, so a code
 * would be dropped rather than delivered. Until both exist this returns
 * STUBBED, the caller hands the fixed development code back to the client, and
 * the whole flow above it — challenge, expiry, attempt limit, single use — is
 * the real one.
 *
 * Wiring a medium up is adding ONE branch here. Deliberately not `if (isDev)`:
 * that would make the shipped behaviour depend on an environment variable
 * instead of on whether a transport exists.
 */
export async function deliverOtp(input: Readonly<OtpDeliveryInput>): Promise<IOtpDelivery> {
  const reason =
    input.medium === 'SMS'
      ? 'No SMS provider is configured yet — use the displayed test code'
      : 'WhatsApp one-time codes are not live yet — use the displayed test code';
  logs.server.info('otp.delivery', 'deliverOtp', {
    msg: 'one-time code not transmitted (no transport wired)',
    medium: input.medium,
    purpose: input.purpose,
    // NEVER the code itself, and never the full number.
    phone_suffix: input.phone_number.slice(-4),
  });
  return { medium: input.medium, status: 'STUBBED', reason };
}
