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

/** The tint of the one callout each of these bodies carries. */
interface Tone {
  bg: string;
  border: string;
  label: string;
  value: string;
}

const LIVE: Tone = { bg: '#ecfdf5', border: '#10b981', label: '#047857', value: '#065f46' };
const PAUSED: Tone = { bg: '#fffbeb', border: '#f59e0b', label: '#b45309', value: '#92400e' };

const HEAD_ATTRS = `    <mj-attributes>
      <mj-all font-family="Inter, Helvetica, Arial, sans-serif" />
      <mj-text color="#222222" font-size="14px" line-height="22px" />
      <mj-button background-color="#F82C2E" color="#ffffff" border-radius="8px" font-weight="700" />
    </mj-attributes>`;

/**
 * The document around a body. The header and footer are NOT here — the
 * category's fragment injects those inside `<mj-body>` at render time, and a
 * body that drew its own would double the logo.
 */
function shell(titleKey: string, body: string): string {
  return `<mjml>
  <mj-head>
    <mj-title>{{t:${titleKey}}}</mj-title>
${HEAD_ATTRS}
  </mj-head>
  <mj-body background-color="#f4f4f4">
${body}
  </mj-body>
</mjml>
`;
}

/** The white card every body opens with: heading, greeting, one paragraph. */
function intro(titleKey: string, bodyKey: string, nameVar: string): string {
  return `    <mj-section background-color="#ffffff" padding="24px 20px 8px 20px">
      <mj-column>
        <mj-text font-size="22px" font-weight="bold" color="#222222">{{t:${titleKey}}}</mj-text>
        <mj-text color="#555555">{{t:email.common.greeting}} {{${nameVar}}},</mj-text>
        <mj-text color="#555555">{{t:${bodyKey}}}</mj-text>
      </mj-column>
    </mj-section>`;
}

/** The tinted strip naming the thing this email is about. */
function callout(tone: Tone, labelKey: string, valueVar: string): string {
  return `    <mj-section background-color="${tone.bg}" padding="16px 20px" border-left="4px solid ${tone.border}">
      <mj-column>
        <mj-text font-size="12px" font-weight="bold" color="${tone.label}" text-transform="uppercase" letter-spacing="0.5px">{{t:${labelKey}}}</mj-text>
        <mj-text font-size="18px" font-weight="bold" color="${tone.value}">{{${valueVar}}}</mj-text>
      </mj-column>
    </mj-section>`;
}

/** The quiet closing line under the callout. */
function note(helpKey: string): string {
  return `    <mj-section background-color="#ffffff" padding="12px 20px 24px 20px">
      <mj-column>
        <mj-text font-size="13px" color="#888888">{{t:${helpKey}}}</mj-text>
      </mj-column>
    </mj-section>`;
}

/**
 * Brand, venue and host each send the same email twice — once when an admin
 * switches the account off and once when it comes back. Six templates, one
 * shape: the entity's label and the two lines of copy are all that differ,
 * and writing them out six times would be six places to fix a colour.
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
const PORTAL_ACCESS_DENIED: TemplateDefault = {
  slug: 'portal-access-denied',
  name: 'Portal Access Denied',
  description: 'The requester, when an admin declines their Jump-to-Portal request.',
  subject: 'Your Duncit {{portal_name}} portal access request',
  mjml: shell(
    'email.portalAccess.deniedTitle',
    [
      intro('email.portalAccess.deniedTitle', 'email.portalAccess.deniedBody', 'name'),
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

export const TEMPLATE_DEFAULTS: TemplateDefault[] = [
  PORTAL_ACCESS_APPROVED,
  PORTAL_ACCESS_DENIED,
  POLICY_ACCEPTANCE,
  ...STATUS_TEMPLATES,
];
