import {
  CATALOGUE_TEMPLATE_DEFAULTS,
  LIVE,
  PAUSED,
  callout,
  detailRows,
  intro,
  note,
  shell,
  type Tone,
} from '@services/email/catalogue';

/**
 * The templates that ship WITHOUT an on-disk MJML file (CLAUDE.md rule 28).
 *
 * Every one of these was already being SENT by the server while no template
 * existed to render it, so each send failed with `Template "<slug>" does not
 * exist` and the person was told nothing. They are seeded from here for the
 * same reason the nine fragments are seeded from `emailFragment.defaults`:
 * a template a code path depends on has to exist on a fresh database, and a
 * `.mjml` file on disk is exactly what rule 28 says not to add. Once seeded
 * the row is the admin's — Tech > Emails > Templates edits it, and the seed
 * never overwrites it again.
 *
 * Every visible string is a `{{t:…}}` key (rule 38); the substitution is the
 * same applyVars pass that fills the data variables, so these are localized
 * for free. The subjects follow the on-disk templates' house style: plain
 * text with data variables, mirroring what the send site passes as fallback.
 *
 * Nothing here names a fragment or a footer sentence: `TEMPLATE_CATEGORIES`
 * decides the wrap, and leaving a slug out of `TEMPLATE_FOOTER_NOTES` is what
 * gives it its category's localized "why did I get this" line.
 */

export interface TemplateDefault {
  /** Referenced from code — the string passed as `template` to sendEmail. */
  slug: string;
  name: string;
  description: string;
  subject: string;
  mjml: string;
}

/**
 * The MJML pieces below are the SHARED builders, not copies.
 *
 * They moved to `@services/email/catalogue/mjml` when the catalogue started
 * assembling sixty more bodies out of the same parts — two sets of them would
 * be two places to change a padding value, and only one of them would get
 * changed (rule 34).
 */
/**
 * Account and listing status emails share one shape. The entity's label and
 * the two lines of copy are all that differ, so keeping the layout here avoids
 * several copies of the same MJML and colour rules.
 */
function statusTemplate(input: {
  slug: string;
  name: string;
  description: string;
  subject: string;
  /** Namespace holding `.title` and `.body`, e.g. `email.brandDeactivated`. */
  copyKey: string;
  labelKey: string;
  /** The var the send site passes the person's name in. */
  nameVar: string;
  /** The var identifying the account — what the callout shows. */
  valueVar: string;
  tone: Tone;
}): TemplateDefault {
  const titleKey = `${input.copyKey}.title`;
  const helpKey =
    input.tone === LIVE ? 'email.accountStatus.liveHelp' : 'email.accountStatus.pausedHelp';
  const body = [
    intro(titleKey, `${input.copyKey}.body`, input.nameVar),
    callout(input.tone, input.labelKey, input.valueVar),
    note(helpKey),
  ].join('\n');
  return {
    slug: input.slug,
    name: input.name,
    description: input.description,
    subject: input.subject,
    mjml: shell(titleKey, body),
  };
}

const STATUS_TEMPLATES: TemplateDefault[] = [
  statusTemplate({
    slug: 'brand-activated',
    name: 'Brand Activated',
    description: 'The brand owner, when their brand is switched back on and returns to the marketplace.',
    subject: '{{brand_name}} is active on Duncit again',
    copyKey: 'email.brandActivated',
    labelKey: 'email.accountStatus.brandLabel',
    nameVar: 'contact_person',
    valueVar: 'brand_name',
    tone: LIVE,
  }),
  statusTemplate({
    slug: 'brand-deactivated',
    name: 'Brand Deactivated',
    description: 'The brand owner, when their brand and its products are hidden from the marketplace.',
    subject: '{{brand_name}} has been deactivated',
    copyKey: 'email.brandDeactivated',
    labelKey: 'email.accountStatus.brandLabel',
    nameVar: 'contact_person',
    valueVar: 'brand_name',
    tone: PAUSED,
  }),
  statusTemplate({
    slug: 'product-activated',
    name: 'Product Activated',
    description: 'The product owner, when their product is switched back on and returns to the marketplace.',
    subject: '{{product_name}} is active on Duncit again',
    copyKey: 'email.productActivated',
    labelKey: 'email.accountStatus.productLabel',
    nameVar: 'name',
    valueVar: 'product_name',
    tone: LIVE,
  }),
  statusTemplate({
    slug: 'product-deactivated',
    name: 'Product Deactivated',
    description: 'The product owner, when their product is temporarily hidden from the marketplace.',
    subject: '{{product_name}} has been deactivated',
    copyKey: 'email.productDeactivated',
    labelKey: 'email.accountStatus.productLabel',
    nameVar: 'name',
    valueVar: 'product_name',
    tone: PAUSED,
  }),
  statusTemplate({
    slug: 'venue-activated',
    name: 'Venue Activated',
    description: 'The venue owner, when their venue is discoverable and bookable again.',
    subject: '{{venue_name}} is active on Duncit again',
    copyKey: 'email.venueActivated',
    labelKey: 'email.accountStatus.venueLabel',
    nameVar: 'owner_name',
    valueVar: 'venue_name',
    tone: LIVE,
  }),
  statusTemplate({
    slug: 'venue-deactivated',
    name: 'Venue Deactivated',
    description: 'The venue owner, when their venue is hidden from search and slot requests.',
    subject: '{{venue_name}} has been deactivated',
    copyKey: 'email.venueDeactivated',
    labelKey: 'email.accountStatus.venueLabel',
    nameVar: 'owner_name',
    valueVar: 'venue_name',
    tone: PAUSED,
  }),
  statusTemplate({
    slug: 'host-activated',
    name: 'Host Activated',
    description: 'The host, when their account can create and run pods again.',
    subject: 'Your Duncit host account is active again',
    copyKey: 'email.hostActivated',
    labelKey: 'email.accountStatus.hostLabel',
    nameVar: 'host_name',
    valueVar: 'host_email',
    tone: LIVE,
  }),
  statusTemplate({
    slug: 'host-deactivated',
    name: 'Host Deactivated',
    description: 'The host, when their account can no longer create pods and their profile is hidden.',
    subject: 'Your Duncit host account has been deactivated',
    copyKey: 'email.hostDeactivated',
    labelKey: 'email.accountStatus.hostLabel',
    nameVar: 'host_name',
    valueVar: 'host_email',
    tone: PAUSED,
  }),
];

/** The console is open — the link is the whole point of the email. */
const PORTAL_ACCESS_APPROVED: TemplateDefault = {
  slug: 'portal-access-approved',
  name: 'Portal Access Approved',
  description:
    'The requester, when an admin approves their Jump-to-Portal request. Carries the console link.',
  subject: 'Your Duncit {{portal_name}} portal access is live 🎉',
  mjml: shell(
    'email.portalAccess.approvedTitle',
    [
      intro('email.portalAccess.approvedTitle', 'email.portalAccess.approvedBody', 'name'),
      callout(LIVE, 'email.portalAccess.portalLabel', 'portal_name'),
      `    <mj-section background-color="#ffffff" padding="16px 20px 24px 20px">
      <mj-column>
        <mj-button href="{{portal_url}}">{{t:email.portalAccess.openPortal}}</mj-button>
        <mj-text font-size="13px" color="#888888" align="center">{{portal_url}}</mj-text>
      </mj-column>
    </mj-section>`,
    ].join('\n')
  ),
};

/** No link and no button: there is nothing for them to open. */
const PORTAL_ACCESS_DECLINED: TemplateDefault = {
  slug: 'portal-access-declined',
  name: 'Portal Access Declined',
  description: 'The requester, when an admin declines their Jump-to-Portal request.',
  subject: 'Your Duncit {{portal_name}} portal access request',
  mjml: shell(
    'email.portalAccess.declinedTitle',
    [
      intro('email.portalAccess.declinedTitle', 'email.portalAccess.declinedBody', 'name'),
      callout(PAUSED, 'email.portalAccess.portalLabel', 'portal_name'),
    ].join('\n')
  ),
};

/**
 * The signup receipt for what someone agreed to. `policies` is the accepted
 * TITLES joined by the service — API data, not copy, which is why it is the
 * one string in this file with no translation key around it.
 */
const POLICY_ACCEPTANCE: TemplateDefault = {
  slug: 'policy-acceptance',
  name: 'Policy Acceptance',
  description: 'Sent on signup: the record of which policies the account holder accepted.',
  subject: 'Your Duncit policy acceptance',
  mjml: shell(
    'email.policyAcceptance.title',
    [
      intro('email.policyAcceptance.heading', 'email.policyAcceptance.intro', 'name'),
      callout(LIVE, 'email.policyAcceptance.listLabel', 'policies'),
      `    <mj-section background-color="#ffffff" padding="16px 20px 24px 20px">
      <mj-column>
        <mj-text color="#555555">{{t:email.policyAcceptance.revisit}}</mj-text>
        <mj-button href="{{policies_url}}">{{t:email.policyAcceptance.cta}}</mj-button>
      </mj-column>
    </mj-section>`,
    ].join('\n')
  ),
};

/**
 * The attendee's own copy of a mark the host is paid on.
 *
 * Attendance stopped being a private note the host keeps the moment it started
 * deciding the payout, so the person it is about is told in writing — with the
 * booking named, so a mark made in error can be pointed at and contested before
 * completion freezes it. Every path that marks somebody present sends this one
 * email: the door scan, the host's manual mark, the Club Admin override and the
 * admin check-in all funnel through `notifyAttendanceMarked`.
 */
const ATTENDANCE_MARKED: TemplateDefault = {
  slug: 'attendance-marked',
  name: 'Attendance Marked',
  description:
    'The attendee, when a door scan, a host’s manual mark, a Club Admin override or an admin check-in records them present at a pod.',
  subject: 'Attendance marked — {{pod_title}}',
  mjml: shell(
    'email.attendanceMarked.title',
    [
      intro('email.attendanceMarked.title', 'email.attendanceMarked.body', 'name'),
      callout(LIVE, 'email.attendanceMarked.podLabel', 'pod_title'),
      detailRows([
        { labelKey: 'email.attendanceMarked.markedAtLabel', valueVar: 'marked_at' },
        { labelKey: 'email.attendanceMarked.placeLabel', valueVar: 'place_line' },
        { labelKey: 'email.attendanceMarked.ticketLabel', valueVar: 'ticket_code' },
        { labelKey: 'email.attendanceMarked.seatsLabel', valueVar: 'seats_count' },
      ]),
      `    <mj-section background-color="#ffffff" padding="8px 20px 24px 20px">
      <mj-column>
        <mj-button href="{{booking_url}}">{{t:email.attendanceMarked.cta}}</mj-button>
        <mj-text font-size="13px" color="#888888">{{t:email.attendanceMarked.disputeNote}}</mj-text>
      </mj-column>
    </mj-section>`,
    ].join('\n')
  ),
};

/**
 * The notice sent when Legal changes a policy somebody has already accepted.
 *
 * It carries the LINK rather than the new wording: a policy is the whole
 * document or it is nothing, and pasting a paragraph of it into an email is how
 * a reader ends up agreeing to a summary. `summary` is Legal's own optional
 * note on what changed — API data, not copy, which is why it is unkeyed.
 */
const POLICY_UPDATED: TemplateDefault = {
  slug: 'policy-updated',
  name: 'Policy Updated',
  description:
    'Everyone who has accepted a policy, when Legal publishes new wording for it.',
  subject: 'We’ve updated the {{policy_title}}',
  mjml: shell(
    'email.policyUpdated.title',
    [
      intro('email.policyUpdated.heading', 'email.policyUpdated.intro', 'name'),
      callout(PAUSED, 'email.policyUpdated.policyLabel', 'policy_title'),
      detailRows([
        { labelKey: 'email.policyUpdated.updatedLabel', valueVar: 'updated_at' },
        { labelKey: 'email.policyUpdated.summaryLabel', valueVar: 'summary' },
      ]),
      `    <mj-section background-color="#ffffff" padding="8px 20px 24px 20px">
      <mj-column>
        <mj-button href="{{policy_url}}">{{t:email.policyUpdated.cta}}</mj-button>
        <mj-text font-size="13px" color="#888888" align="center">{{policy_url}}</mj-text>
        <mj-text font-size="13px" color="#888888">{{t:email.policyUpdated.reaccept}}</mj-text>
      </mj-column>
    </mj-section>`,
    ].join('\n')
  ),
};

export const TEMPLATE_DEFAULTS: TemplateDefault[] = [
  ATTENDANCE_MARKED,
  PORTAL_ACCESS_APPROVED,
  PORTAL_ACCESS_DECLINED,
  POLICY_ACCEPTANCE,
  POLICY_UPDATED,
  ...STATUS_TEMPLATES,
  // The catalogue's own bodies — every email that mirrors a WhatsApp scenario,
  // plus the security, ads and refund ones that have no WhatsApp twin. They are
  // appended rather than merged so the five above stay the code that is easiest
  // to read when somebody wants to see what a body looks like.
  ...CATALOGUE_TEMPLATE_DEFAULTS,
];
