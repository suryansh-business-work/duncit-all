import { EMAIL_CATEGORIES, type EmailCategory } from '@services/email/email.provider';
import { isOptionalMailCategory } from '@modules/content/mailPreference/mailPreference.categories';
import {
  EMAIL_COLOR as C,
  EMAIL_SPACE as S,
  EMAIL_TYPE as F,
} from '@services/email/catalogue/tokens';

/**
 * The nine fragments as they are first seeded.
 *
 * Built from one shared shell rather than nine hand-written blobs: the header
 * is the same brand mark everywhere, and the footers differ only in the line
 * that says WHY this email arrived. Writing them out nine times would mean nine
 * places to fix a colour.
 *
 * Every visible string is a `{{t:…}}` key (rule 38); the substitution is the
 * same pass that fills every other variable, so a fragment is localized for
 * free. The values are seeded ONCE — an admin's edits are never overwritten.
 */

export interface FragmentDefault {
  category: EmailCategory;
  name: string;
  description: string;
  header_mjml: string;
  footer_mjml: string;
}

/** Human labels for the nine, so the portal never hardcodes them. */
const LABELS: Record<EmailCategory, string> = {
  transactional: 'Transactional',
  authentication: 'Authentication',
  marketing: 'Marketing',
  service: 'Service',
  notification: 'Notification',
  support: 'Support',
  billing: 'Billing',
  legal: 'Legal',
  internal: 'Internal',
};

/**
 * The generic "why did I get this" line per category — the fallback for a
 * template with no sentence of its own. A translation key, so the fallback is
 * localized like everything else.
 */
export const CATEGORY_NOTE_KEY: Record<EmailCategory, string> = {
  transactional: 'email.fragment.transactional.note',
  authentication: 'email.fragment.authentication.note',
  marketing: 'email.fragment.marketing.note',
  service: 'email.fragment.service.note',
  notification: 'email.fragment.notification.note',
  support: 'email.fragment.support.note',
  billing: 'email.fragment.billing.note',
  legal: 'email.fragment.legal.note',
  internal: 'email.fragment.internal.note',
};

const DESCRIPTIONS: Record<EmailCategory, string> = {
  transactional: 'Receipts and confirmations for something the recipient did.',
  authentication: 'Codes and credentials. Carries the "never share this" warning.',
  marketing:
    'Campaigns and announcements. Carries the unsubscribe line — a campaign records any link containing the word "unsubscribe" as an opt-out.',
  service: 'A person writing to a person. Invites a reply.',
  notification: 'Something changed on the recipient’s account or booking.',
  support: 'Part of a support conversation — tickets, chats, transcripts.',
  billing: 'Invoices, payouts and refunds. Worth keeping for records.',
  legal: 'Policy and account notices that have to be sent.',
  internal: 'Staff-only. Never reaches a customer.',
};

/**
 * The brand mark, centred on the canvas above the card — the admin's logo on
 * every email, linked to the website so it does what a reader expects a logo
 * to do.
 */
const header = () => `    <mj-section padding="32px 0 20px 0">
      <mj-column>
        <mj-image src="{{brand_logo_url}}" alt="{{app_name}}" href="{{website_url}}" width="${S.logoWidth}" align="center" padding="0" />
      </mj-column>
    </mj-section>`;

/** One centred line of the footer. */
const footerText = (content: string, bottom = '8px') =>
  `        <mj-text align="center" font-size="${F.caption.size}" line-height="${F.caption.line}" color="${C.muted}" padding="0 0 ${bottom} 0">${content}</mj-text>`;

const footerLink = (href: string, label: string) =>
  `<a href="${href}" style="color:${C.primary};font-weight:600;text-decoration:none">${label}</a>`;

/**
 * The way out, for the categories that have one.
 *
 * Only the opt-out-able categories carry it. A footer offering to unsubscribe
 * somebody from their own sign-in code is not a courtesy, it is a trap — the
 * link would take them to a screen where that row is locked, which reads as the
 * product ignoring them.
 *
 * `unsubscribe_url` is supplied on every send: one-click and signed when the
 * recipient is known, the same screen behind a sign-in for a bcc'd campaign
 * batch, which has no single recipient to sign for.
 */
const unsubscribeLine = () => {
  const link = footerLink('{{unsubscribe_url}}', '{{t:email.fragment.unsubscribeLink}}');
  const line = footerText(`{{t:email.fragment.unsubscribe}} ${link}`);
  return `\n${line}`;
};

/**
 * The footer, on the canvas under the card: why this arrived, where to get
 * help, the opt-out where there is one, and the copyright line.
 *
 * The first line is `{{footer_note}}` — the TEMPLATE's own sentence, because
 * every template had a different one ("you made a booking", "you backed out of
 * this pod") and collapsing fifteen of those into nine generic ones would be a
 * downgrade nobody asked for. The render path falls back to the category's
 * note when a template has none.
 * `support_email`, `website_url`, `app_name` and `year` are supplied by
 * `sendEmail` on every send, so a fragment never has to be told them. Every
 * colour clears 4.5:1 on the canvas; the old grey copyright line did not.
 */
const footer = (optOutable: boolean) => `    <mj-section padding="24px ${S.gutter} 40px ${S.gutter}">
      <mj-column>
${footerText('{{footer_note}}', '10px')}
${footerText(`{{t:email.fragment.help}} ${footerLink('mailto:{{support_email}}', '{{support_email}}')}`)}${optOutable ? unsubscribeLine() : ''}
        <mj-divider border-width="1px" border-color="${C.border}" width="48px" padding="8px 0 16px 0" />
${footerText(`&copy; {{year}} ${footerLink('{{website_url}}', '{{app_name}}')}. {{t:email.fragment.rights}}`, '0')}
      </mj-column>
    </mj-section>`;

export const FRAGMENT_DEFAULTS: FragmentDefault[] = EMAIL_CATEGORIES.map((category) => ({
  category,
  name: LABELS[category],
  description: DESCRIPTIONS[category],
  header_mjml: header(),
  footer_mjml: footer(isOptionalMailCategory(category)),
}));

export const FRAGMENT_LABELS = LABELS;
