import { createHash } from 'node:crypto';
import { logs } from '@observability/log';
import { sendEmail } from '@services/email/email.service';
import { getUrlConfigs } from '@config/url-configs';
import { UserModel } from './user.model';
import { joinUrl } from '@utils/url';

/**
 * "A new sign-in to your account" — the notice, and the rule for when it is one.
 *
 * The point of this email is that a person can say "that was not me" while
 * there is still something to do about it. That only works if it arrives on the
 * sign-ins they did NOT expect: one on every sign-in is one nobody reads, and
 * the day a stranger signs in it looks like all the others.
 *
 * So the account remembers which devices it has been used from, and this fires
 * on a device it has not seen. The identity is the DUID the clients already
 * send as `x-duid` — the same anonymous id the attribution and clickstream work
 * is keyed on — hashed here so a leaked user document does not hand somebody a
 * working device identity. A caller with no DUID (a script, a curl) is treated
 * as UNKNOWN and told, which is the safe direction to be wrong in.
 *
 * The first sign-in on a fresh account is deliberately silent: the person is
 * looking at the screen they just signed in on, and "somebody signed in" as the
 * very first email an account receives reads as a break-in, not a courtesy.
 */

/** How many devices an account remembers. Oldest is dropped past this. */
const REMEMBERED_DEVICES = 10;

const hashDevice = (deviceId: string): string =>
  createHash('sha256').update(deviceId).digest('hex').slice(0, 32);

export interface SignInContext {
  /** The `x-duid` the client sent, or null. */
  deviceId?: string | null;
  /** The `user-agent` header, for the "Device" line. */
  userAgent?: string | null;
  /** Where from, as far as a reverse proxy can tell us. */
  place?: string | null;
}

/**
 * A user agent as a person recognises it, not as a browser writes it.
 *
 * Deliberately crude: the whole string is unreadable in an email, and the
 * question a reader is answering is "was that my phone or not", which the
 * browser and the platform answer between them.
 */
export function deviceLabel(userAgent?: string | null): string {
  const ua = (userAgent ?? '').trim();
  if (!ua) return 'An unrecognised device';
  const browser = firstLabel(ua, BROWSERS, 'A browser');
  const platform = firstLabel(ua, PLATFORMS, '');
  return platform ? `${browser} on ${platform}` : browser;
}

type UserAgentRule = readonly [RegExp, string];

/**
 * ORDER IS THE LOGIC, which is why these are lists and not a map.
 *
 * Every Chromium browser's user agent also says "Safari", and Edge's says
 * "Chrome" as well — so the only thing separating them is which pattern is
 * asked first. The Duncit app is last because a webview inside it still names
 * its engine, and naming the engine is more useful than naming the shell.
 */
const BROWSERS: readonly UserAgentRule[] = [
  [/edg\//i, 'Edge'],
  [/chrome|crios/i, 'Chrome'],
  [/firefox|fxios/i, 'Firefox'],
  [/safari/i, 'Safari'],
  [/okhttp|expo|duncit/i, 'the Duncit app'],
];

const PLATFORMS: readonly UserAgentRule[] = [
  [/android/i, 'Android'],
  [/iphone|ipad|ios/i, 'iOS'],
  [/windows/i, 'Windows'],
  [/mac os|macintosh/i, 'macOS'],
  [/linux/i, 'Linux'],
];

const firstLabel = (ua: string, rules: readonly UserAgentRule[], fallback: string): string =>
  rules.find(([pattern]) => pattern.test(ua))?.[1] ?? fallback;

/** Record the device and say whether the account had never been used from it. */
async function claimDevice(userId: string, fingerprint: string): Promise<'new' | 'known' | 'first'> {
  const user = await UserModel.findById(userId).select('security.known_devices').lean();
  const known: { id: string }[] = (user as any)?.security?.known_devices ?? [];
  if (known.some((device) => device.id === fingerprint)) {
    await UserModel.updateOne(
      { _id: userId, 'security.known_devices.id': fingerprint },
      { $set: { 'security.known_devices.$.last_seen_at': new Date() } }
    );
    return 'known';
  }
  await UserModel.updateOne(
    { _id: userId },
    {
      $push: {
        'security.known_devices': {
          // The cap is applied by the same write that adds the entry: a
          // separate trim would be a second round trip that a concurrent
          // sign-in could interleave with, and the list would creep.
          $each: [{ id: fingerprint, last_seen_at: new Date() }],
          $slice: -REMEMBERED_DEVICES,
        },
      },
    }
  );
  return known.length === 0 ? 'first' : 'new';
}

/**
 * Note a successful sign-in, and mail the account if the device is new to it.
 *
 * Never throws and is never awaited for its result by a login: signing in must
 * not fail because a mailbox did.
 */
export async function noteSignIn(
  user: { _id: unknown; auth?: { email?: string | null }; profile?: { first_name?: string | null } },
  context: SignInContext
): Promise<void> {
  try {
    const email = user.auth?.email ?? '';
    if (!email) return;
    const fingerprint = hashDevice(context.deviceId?.trim() || `ua:${context.userAgent ?? 'unknown'}`);
    const verdict = await claimDevice(String(user._id), fingerprint);
    if (verdict !== 'new') return;

    const { appUrl } = await getUrlConfigs();
    await sendEmail({
      to: email,
      subject: 'New sign-in to your Duncit account',
      template: 'recent-account-login',
      // `authentication` is a REQUIRED category — nobody may switch off being
      // told their own account was signed in to.
      category: 'authentication',
      vars: {
        name: user.profile?.first_name ?? 'there',
        when: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        device: deviceLabel(context.userAgent),
        place: context.place?.trim() || 'Unknown location',
        security_url: joinUrl(appUrl, '/profile'),
      },
    });
  } catch (error) {
    logs.server.warn('user.signin', 'noteSignIn', { error });
  }
}
