import { logs } from '@observability/log';
import { E2E_SETTINGS_KEY, E2eRunSettingsModel } from './e2eRun.model';
import { runAccountMatcher, type RunAccountMatcher } from './e2eRun.identity';

/**
 * The E2E-only overrides, and the ONE read that answers for all of them.
 *
 * They live here rather than on `e2eRun.service` because every seam that asks —
 * `sendEmail`, `whatsappService.send`, `otpService.request` and the rate
 * limiter — is UPSTREAM of that service's own imports; asking here costs one
 * indexed read and closes no cycle. One read, so a send can never see the
 * switches and the run account disagree.
 *
 * They are DELIBERATELY separate switches, because only one of them is about
 * secrecy:
 *
 *  - `muted` is about traffic. Nothing leaves the platform, and every mail and
 *    message is recorded with the reason it did not go.
 *  - `otpBypass` ("one-time codes for the run account") is about a code being
 *    READABLE. While it is on, a code addressed to a run account is held and
 *    recorded for the suite (e2eRun.codes) instead of sent; every other
 *    address is untouched. It is also what declares this database an e2e
 *    target, so it must never be on for production.
 */
export const MUTED_REASON = 'Communications are held for E2E (Tech > E2E Tests > Settings)';

export interface E2eOverrides {
  /** Hold every outbound email and WhatsApp message. */
  muted: boolean;
  /** Hold and record one-time codes addressed to a run account. */
  otpBypass: boolean;
  /** Which addresses and number are run accounts; null when the identity is unset. */
  account: RunAccountMatcher | null;
}

const OFF: E2eOverrides = { muted: false, otpBypass: false, account: null };

/**
 * How long an answer is trusted.
 *
 * Every mail and every message asks, so an uncached read would put a query in
 * front of each one. Ten seconds is short enough that switching a flag takes
 * effect while somebody is still looking at the page, and long enough that a
 * fan-out to forty attendees pays for one read rather than forty.
 */
const TTL_MS = 10_000;

let cachedAt = 0;
let cached: E2eOverrides = OFF;

/**
 * Fails OPEN — both flags read false when the database cannot be reached.
 *
 * The other way round, one blip would silence every booking confirmation on the
 * platform, or start handing out one-time codes, with nothing downstream saying
 * why. Either override is a deliberate act by an operator, so it must take a
 * successful read to be true.
 */
export async function e2eOverrides(): Promise<E2eOverrides> {
  const now = Date.now();
  if (now - cachedAt < TTL_MS) return cached;
  try {
    const doc = await E2eRunSettingsModel.findOne({ key: E2E_SETTINGS_KEY })
      .select('mute_communications otp_bypass email_prefix email_domain identity_phone')
      .lean();
    cached = {
      muted: Boolean(doc?.mute_communications),
      otpBypass: Boolean(doc?.otp_bypass),
      account: doc
        ? runAccountMatcher({
            email_prefix: doc.email_prefix ?? '',
            email_domain: doc.email_domain ?? '',
            identity_phone: doc.identity_phone ?? '',
            password: '',
          })
        : null,
    };
    cachedAt = now;
  } catch (error) {
    logs.server.warn('e2e.overrides', 'e2eOverrides', { error });
    // Deliberately NOT stamped: the next send retries the read rather than
    // trusting a stale answer for ten seconds because one query failed.
    return OFF;
  }
  return cached;
}

/** The traffic half, for the two seams that only care about that one. */
export async function communicationsMuted(): Promise<boolean> {
  return (await e2eOverrides()).muted;
}

/** Drop the cache so the next ask re-reads. Called when either flag is saved,
 * so switching one is immediate rather than up to ten seconds late. */
export function forgetMuteCache(): void {
  cachedAt = 0;
}
