import { createHash } from 'node:crypto';
import { getUrlConfigs } from '@config/url-configs';
import { PolicyModel } from '@modules/content/policy/policy.model';
import { policyContentHash } from '@modules/content/policyAcceptance/policyAcceptance.model';
import { logs } from '@observability/log';
import {
  PORTAL_SECURITY_LINKED_POLICY_TYPES,
  PORTAL_SECURITY_NOTICE_VERSION,
  PORTAL_SECURITY_RETENTION_DAYS,
} from './portalSecurity.constants';
import { setCurrentPolicyVersion } from './portalSecurity.claims';

/**
 * What the Security Verification screen tells the person before it asks for
 * their consent — the security, access, privacy, location-notice,
 * confidentiality and acceptable-use terms, organised in sections.
 *
 * Served by the server (not baked into each console) so that every portal
 * shows the SAME wording, and so that the version recorded with a consent is
 * the version of the words that were actually on screen. Changing any text
 * here means bumping PORTAL_SECURITY_NOTICE_VERSION.
 *
 * Plain text only: the screen renders it as text, never as HTML.
 */
export interface PolicySection {
  key: string;
  title: string;
  paragraphs: string[];
}

export interface PolicyLink {
  title: string;
  policy_type: string;
  url: string;
}

/** The notice sections, with the values that are configuration spelled in. */
export function noticeSections(supportEmail: string): PolicySection[] {
  const days = PORTAL_SECURITY_RETENTION_DAYS;
  return [
    {
      key: 'security',
      title: 'Security policy',
      paragraphs: [
        'Duncit internal portals hold customer, financial and operational data. Access is restricted to authorised Duncit employees and explicitly approved personnel, and every sign-in to a portal is verified and logged.',
        'Signing in does not replace the role-based permissions, two-step verification or any other control of the portal. It is an additional step, and it can be asked of you again after a new sign-in, a change to these terms or a security event.',
      ],
    },
    {
      key: 'access',
      title: 'Employee and personnel access policy',
      paragraphs: [
        'You may use a portal only if you are a Duncit employee or have been explicitly approved by Duncit for that portal, and only for the duties that approval covers.',
        'Access you were given is personal to you. If your role changes or you leave Duncit, your access ends; you must not use a portal after that.',
      ],
    },
    {
      key: 'credentials',
      title: 'Confidentiality and password sharing',
      paragraphs: [
        'Your login credentials are confidential. Do not share your password, one-time codes or authenticator codes with anyone, including colleagues, and do not let anyone else use a session you signed in to.',
        'If you think your credentials have been seen by someone else, change your password at once and tell Duncit. Information you see in a portal is confidential and must not be copied, shared or used outside your duties.',
      ],
    },
    {
      key: 'acceptable_use',
      title: 'Acceptable use',
      paragraphs: [
        'Use portals only for the work they are meant for. Do not attempt to reach data or functions your role does not allow, do not bypass or probe a security control, and do not use automated tools against a portal unless Duncit has approved it.',
        'Breaking these terms can lead to suspension of your account, a security investigation, and action under applicable laws, including the Information Technology Act, 2000.',
      ],
    },
    {
      key: 'monitoring',
      title: 'Security monitoring and logging',
      paragraphs: [
        'Your IP address, device and browser details, sign-in time, the portal you opened and, with your consent, your location are recorded and stored on Duncit servers for security, monitoring and the investigation of unauthorised access.',
        'Only authorised security and technology administrators can read these records, and every time they are read, that is logged too.',
      ],
    },
    {
      key: 'location_notice',
      title: 'Location tracking and data collection notice',
      paragraphs: [
        'What we collect: your IP address (read by our servers, not sent by your browser), the approximate place that IP address belongs to, your device, browser and operating system, the time, and — only if you allow your browser to share it — the coordinates of your current location with its accuracy.',
        'Why: to confirm that portal access is by an authorised person, to detect and investigate unauthorised use, and to keep a record that can be relied on in a security investigation. We do not use it for anything else, and we do not sell it.',
        'The place worked out from an IP address is only an approximation. It can be a different city, or the location of your internet provider, and it is never a precise position. Only the coordinates from your browser are a location fix, and only if you allow them.',
        `Consent and withdrawal: sharing your location is voluntary and is asked for with a separate tick. If you do not want to share it you can ask an administrator for another way to verify. You can withdraw consent at any time by writing to ${supportEmail}; after you withdraw, you will be asked to verify another way before you use a portal.`,
        `Storage and retention: records are stored encrypted-at-rest for location and IP fields, kept for ${days} days, and then deleted automatically. You may ask what we hold about you, to correct it, or to have it erased where the law allows, by writing to ${supportEmail}.`,
        'This notice follows the Digital Personal Data Protection Act, 2023. If you are not satisfied with how your data is handled, you may complain to Duncit at the address above and then to the Data Protection Board of India.',
      ],
    },
    {
      key: 'privacy',
      title: 'Privacy policy',
      paragraphs: [
        'Your data is processed under the Duncit Privacy Policy and the notice above. The full policies are linked below.',
      ],
    },
  ];
}

const policyUrl = (mwebUrl: string, slug: string): string => `${mwebUrl.replace(/\/+$/, '')}/policies/${slug}`;

interface LinkedPolicyRow {
  slug: string;
  title: string;
  policy_type: string;
  content: string;
}

async function loadLinkedPolicies(): Promise<LinkedPolicyRow[]> {
  return PolicyModel.find({
    is_active: true,
    policy_type: { $in: [...PORTAL_SECURITY_LINKED_POLICY_TYPES] },
  })
    .select('slug title policy_type content sort_order')
    .sort({ sort_order: 1, title: 1 })
    .lean<LinkedPolicyRow[]>();
}

/** The links to the full policies Legal has published for the screen's topics. */
export async function linkedPolicyLinks(): Promise<PolicyLink[]> {
  const [rows, urls] = await Promise.all([loadLinkedPolicies(), getUrlConfigs()]);
  return rows.map((row) => ({
    title: row.title,
    policy_type: row.policy_type,
    url: policyUrl(urls.mwebUrl, row.slug),
  }));
}

/**
 * The version a consent is recorded against.
 *
 * The notice wording's own version, plus a digest of every linked policy's
 * current text: when Legal edits the privacy policy (or any other linked one)
 * the digest changes, every console session is asked to consent again, and the
 * record shows which wording each person agreed to.
 */
export async function computePolicyVersion(): Promise<string> {
  const rows = await loadLinkedPolicies();
  const digest = createHash('sha256')
    .update(JSON.stringify(rows.map((row) => [row.slug, policyContentHash(row.content)])))
    .digest('hex')
    .slice(0, 8);
  return `${PORTAL_SECURITY_NOTICE_VERSION}+${digest}`;
}

/** Recompute the version and publish it to the in-memory check every request makes. */
export async function refreshPolicyVersion(): Promise<string> {
  const version = await computePolicyVersion();
  setCurrentPolicyVersion(version);
  return version;
}

const REFRESH_MS = 60_000;

/**
 * Keep the in-memory version current. A failed read leaves the last known
 * version in place: a database blip must not ask every signed-in console user
 * to verify again. No-op under test.
 */
export function startPolicyVersionRefresh(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  const interval = setInterval(() => {
    refreshPolicyVersion().catch((error) => {
      logs.server.error('portal-security', 'policy-version-refresh', { error });
    });
  }, REFRESH_MS);
  interval.unref?.();
  return () => clearInterval(interval);
}
