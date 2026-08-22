import { LIVE, PAUSED, STOPPED, type Tone } from './mjml';
import { CTA, FIELD, FOOTER, HELP, LABEL } from './catalogue.copy';
import { defineEmail, v, type EmailAudience, type EmailDef, type EmailVar } from './catalogue.types';

/**
 * The four onboarding emails, for each of the four partner kinds.
 *
 * Written as one shape × four audiences rather than sixteen hand-written rows:
 * a host, a venue, a brand and a club admin walk the same four steps — booked,
 * scheduled, approved, rejected — and the only thing that differs is who is
 * being addressed and what they get to do next.
 *
 * They are still SIXTEEN templates and not four with a `{{kind}}` variable,
 * because the four are edited by different people for different reasons: the
 * venue team rewrites the venue rejection without touching the brand one, and
 * the WhatsApp side already keeps sixteen campaigns for the same reason. What
 * is shared is the CODE that builds them, which is the part rule 34 is about.
 *
 * The suspend/reactivate pair follows the same argument, and is built here too
 * so a fifth partner kind is one array entry rather than six new files.
 */

/** One partner kind, and the words that change for it. */
interface Party {
  audience: EmailAudience;
  /** Slug prefix, e.g. `host` → `host-onboarding-approved`. */
  slug: string;
  /** Display prefix in Tech > Emails > Templates. */
  label: string;
  /** Copy-key namespace, e.g. `email.hostOnboarding`. */
  ns: string;
  /** The footer sentence for everything this party receives. */
  footer: string;
  /** WhatsApp event prefix, e.g. `HOST` → `HOST_ONBOARDING_APPROVED`. */
  wa: string;
}

const PARTIES: readonly Party[] = [
  { audience: 'HOST', slug: 'host', label: 'Host', ns: 'email.hostOnboarding', footer: FOOTER.onboarding, wa: 'HOST' },
  { audience: 'VENUE', slug: 'venue', label: 'Venue', ns: 'email.venueOnboarding', footer: FOOTER.onboarding, wa: 'VENUE' },
  { audience: 'ECOMM', slug: 'ecomm', label: 'Brand', ns: 'email.ecommOnboarding', footer: FOOTER.onboarding, wa: 'ECOMM' },
  {
    audience: 'CLUB_ADMIN',
    slug: 'club-admin',
    label: 'Club Admin',
    ns: 'email.clubAdminOnboarding',
    footer: FOOTER.onboarding,
    wa: 'CLUB_ADMIN',
  },
];

const MEETING_NOTES = v('notes', 'Anything staff added for the applicant. Blank most of the time.', 'Please keep your GST certificate handy.');

/** `['Recipient name', 'Date', 'Time']` in the WhatsApp event's order, then the
 * email-only note — a 1024-character WhatsApp template has no room for it. */
const MEETING_CORE: readonly EmailVar[] = [
  v('name', 'The applicant’s first name.', 'Meera'),
  v('date', 'The meeting date, already formatted.', '26 Aug 2026'),
  v('time', 'The meeting time, already formatted.', '4:30 PM'),
];

const BOOKED_VARS: readonly EmailVar[] = [...MEETING_CORE, MEETING_NOTES];

/**
 * `['Recipient name', 'Date', 'Time', 'Meet']`, then the note.
 *
 * `meeting_url` sits at index 3 because that is where the WhatsApp event's
 * fourth param is. Appending the note to BOOKED_VARS instead would put it there
 * and send the applicant the staff note as their call link.
 */
const SCHEDULED_VARS: readonly EmailVar[] = [
  ...MEETING_CORE,
  v('meeting_url', 'The video-call link for the interview.', 'https://meet.google.com/abc-defg-hij'),
  MEETING_NOTES,
];

/** `['Recipient name', 'Email']`. */
const APPROVED_VARS: readonly EmailVar[] = [
  v('name', 'The applicant’s first name.', 'Meera'),
  v('email', 'The address their partner access is attached to.', 'meera@example.com'),
  v('portal_url', 'The Partners console to sign in to.', 'https://partners.duncit.com'),
];

/** `['Recipient name', 'Reason']`. */
const REJECTED_VARS: readonly EmailVar[] = [
  v('name', 'The applicant’s first name.', 'Meera'),
  v('reason', 'Why the application was not approved, in the reviewer’s words.', 'We are not onboarding in your city yet.'),
];

/** `['Recipient name']` — the account emails carry nothing else. */
const ACCOUNT_VARS: readonly EmailVar[] = [
  v('name', 'The partner’s first name.', 'Meera'),
  v('email', 'The account’s address, named in the callout.', 'meera@example.com'),
];

const MEETING_ROWS = [
  { labelKey: FIELD.date, valueVar: 'date' },
  { labelKey: FIELD.time, valueVar: 'time' },
] as const;

/** The four steps, as data. Everything about one email except who it is for. */
interface Step {
  /** Slug suffix, e.g. `onboarding-approved`. */
  suffix: string;
  /** WhatsApp event suffix, e.g. `ONBOARDING_APPROVED`. */
  wa: string;
  /** Display suffix and copy-key suffix. */
  name: string;
  key: string;
  /** Overrides the party's namespace — an account notice is not an onboarding one. */
  ns?: string;
  category: 'notification';
  subject: string;
  tone: Tone;
  vars: readonly EmailVar[];
  rows?: readonly { labelKey: string; valueVar: string }[];
  ctaKey?: string;
  ctaVar?: string;
  helpKey?: string;
  fires: string;
  calloutLabelKey: string;
  calloutVar: string;
}

const STEPS: readonly Step[] = [
  {
    suffix: 'onboarding-booked',
    wa: 'ONBOARDING_BOOKED',
    name: 'Onboarding Interview Booked',
    key: 'Booked',
    category: 'notification',
    subject: 'Your Duncit {party} onboarding interview is booked',
    tone: PAUSED,
    vars: BOOKED_VARS,
    rows: [...MEETING_ROWS, { labelKey: FIELD.notes, valueVar: 'notes' }],
    helpKey: HELP.onboardingNext,
    fires: 'The applicant picks an onboarding interview slot',
    calloutLabelKey: LABEL.meeting,
    calloutVar: 'date',
  },
  {
    suffix: 'onboarding-interview',
    wa: 'ONBOARDING_INTERVIEW',
    name: 'Onboarding Interview Scheduled',
    key: 'Scheduled',
    category: 'notification',
    subject: 'Your Duncit {party} onboarding interview is confirmed',
    tone: LIVE,
    vars: SCHEDULED_VARS,
    rows: [
      ...MEETING_ROWS,
      { labelKey: FIELD.meetingLink, valueVar: 'meeting_url' },
      { labelKey: FIELD.notes, valueVar: 'notes' },
    ],
    ctaKey: CTA.joinMeeting,
    ctaVar: 'meeting_url',
    fires: 'Staff confirms the interview and attaches the call link',
    calloutLabelKey: LABEL.meeting,
    calloutVar: 'date',
  },
  {
    suffix: 'onboarding-approved',
    wa: 'ONBOARDING_APPROVED',
    name: 'Onboarding Approved',
    key: 'Approved',
    category: 'notification',
    subject: 'Your Duncit {party} application is approved 🎉',
    tone: LIVE,
    vars: APPROVED_VARS,
    rows: [{ labelKey: FIELD.email, valueVar: 'email' }],
    ctaKey: CTA.openPartners,
    ctaVar: 'portal_url',
    fires: 'The application is approved after the interview',
    calloutLabelKey: LABEL.application,
    calloutVar: 'email',
  },
  {
    suffix: 'onboarding-rejected',
    wa: 'ONBOARDING_REJECTED',
    name: 'Onboarding Rejected',
    key: 'Rejected',
    category: 'notification',
    subject: 'About your Duncit {party} application',
    tone: STOPPED,
    vars: REJECTED_VARS,
    rows: [{ labelKey: FIELD.reason, valueVar: 'reason' }],
    fires: 'The application is not approved',
    calloutLabelKey: LABEL.application,
    calloutVar: 'reason',
  },
];

/**
 * Suspend and reactivate, for the ONE party that has no email for it yet.
 *
 * Host, venue and brand already ship `host-activated`/`host-deactivated`,
 * `venue-*` and `brand-*` — wired, seeded and edited in the Tech portal. A
 * second `host-account-suspended` beside them would be the duplicate rule 34
 * exists to stop, and would leave an admin editing whichever of the two they
 * happened to open. Only the club admin was never given one.
 */
const ACCOUNT_STEPS: readonly Step[] = [
  {
    suffix: 'account-suspended',
    wa: 'ACCOUNT_SUSPENDED',
    name: 'Account Suspended',
    key: 'Suspended',
    ns: 'email.clubAdminAccount',
    category: 'notification',
    subject: 'Your Duncit club admin access has been suspended',
    tone: STOPPED,
    vars: ACCOUNT_VARS,
    helpKey: HELP.accountPaused,
    fires: 'The club admin is deactivated',
    calloutLabelKey: LABEL.account,
    calloutVar: 'email',
  },
  {
    suffix: 'account-reactivated',
    wa: 'ACCOUNT_REACTIVATED',
    name: 'Account Reactivated',
    key: 'Reactivated',
    ns: 'email.clubAdminAccount',
    category: 'notification',
    subject: 'Your Duncit club admin access is active again',
    tone: LIVE,
    vars: ACCOUNT_VARS,
    ctaKey: CTA.openPartners,
    ctaVar: 'app_url',
    helpKey: HELP.accountLive,
    fires: 'A suspended club admin is restored',
    calloutLabelKey: LABEL.account,
    calloutVar: 'email',
  },
];

/** The club admin is the last entry in {@link PARTIES}. */
const CLUB_ADMIN = PARTIES.at(-1) as Party;

/**
 * `email.hostOnboarding` + `Approved` → `email.hostOnboardingApproved`, the
 * namespace holding that one email's `.title` and `.body`.
 */
const copyKeyFor = (party: Party, step: Step): string => `${step.ns ?? party.ns}${step.key}`;

const build = (party: Party, step: Step): EmailDef => {
  const who = party.label.toLowerCase();
  return defineEmail({
    slug: `${party.slug}-${step.suffix}`,
    name: `${party.label}: ${step.name}`,
    description: `The ${who} applicant or partner. ${step.fires}.`,
    audience: party.audience,
    category: step.category,
    fires: `${step.fires} (${who})`,
    waEvent: `${party.wa}_${step.wa}`,
    subject: step.subject.replace('{party}', party.label),
    footerNote: party.footer,
    vars: step.vars,
    body: {
      copyKey: copyKeyFor(party, step),
      nameVar: 'name',
      tone: step.tone,
      calloutLabelKey: step.calloutLabelKey,
      calloutVar: step.calloutVar,
      rows: step.rows,
      ctaKey: step.ctaKey,
      ctaVar: step.ctaVar,
      helpKey: step.helpKey,
    },
  });
};

export const ONBOARDING_EMAILS: readonly EmailDef[] = [
  ...PARTIES.flatMap((party) => STEPS.map((step) => build(party, step))),
  ...ACCOUNT_STEPS.map((step) => build(CLUB_ADMIN, step)),
];

/** Every `email.<party><step>` namespace this file renders, for the bundle. */
export const ONBOARDING_COPY_KEYS: readonly string[] = [
  ...PARTIES.flatMap((party) => STEPS.map((step) => copyKeyFor(party, step))),
  ...ACCOUNT_STEPS.map((step) => copyKeyFor(CLUB_ADMIN, step)),
];
