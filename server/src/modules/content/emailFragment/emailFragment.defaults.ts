import { EMAIL_CATEGORIES, type EmailCategory } from '@services/email/email.provider';
import { isOptionalMailCategory } from '@modules/content/mailPreference/mailPreference.categories';
import {
  EMAIL_COLOR as C,
  EMAIL_SPACE as S,
  EMAIL_TYPE as F,
} from '@services/email/catalogue/tokens';
import { CATEGORY_ICON } from '@services/email/catalogue/icons';
import { badge } from '@services/email/catalogue/mjml';

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

/** The words beside the header's badge, naming what kind of email this is. */
export const CATEGORY_LABEL_KEY: Record<EmailCategory, string> = {
  transactional: 'email.fragment.transactional.label',
  authentication: 'email.fragment.authentication.label',
  marketing: 'email.fragment.marketing.label',
  service: 'email.fragment.service.label',
  notification: 'email.fragment.notification.label',
  support: 'email.fragment.support.label',
  billing: 'email.fragment.billing.label',
  legal: 'email.fragment.legal.label',
  internal: 'email.fragment.internal.label',
};

/** The header's label: a caption, uppercase and quiet. */
const LABEL_STYLE = `font-size:${F.caption.size};line-height:${F.caption.line};font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${C.muted}`;

/** The card's side edges — the body's wrapper draws the same two between them. */
const SIDES = `border-left="1px solid ${C.border}" border-right="1px solid ${C.border}"`;

/**
 * The top of the card: the brand stripe, the admin's logo (linked to the
 * website, as a reader expects a logo to be) and, opposite it, a badge naming
 * the kind of email — "Security", "Billing" — so a reader knows what this is
 * before reading a word of it. An `<mj-group>` keeps the two side by side on a
 * phone instead of stacking them.
 */
const header = (category: EmailCategory) => `    <mj-wrapper padding="24px 0 0 0">
      <mj-section css-class="gutter" background-color="${C.surface}" border-top="4px solid ${C.brand}" ${SIDES} border-radius="${S.cardRadius} ${S.cardRadius} 0 0" padding="24px ${S.gutter} 20px ${S.gutter}">
        <mj-group>
          <mj-column width="45%" vertical-align="middle">
            <mj-image src="{{brand_logo_url}}" alt="{{app_name}}" href="{{website_url}}" width="${S.logoWidth}" align="left" padding="0" />
          </mj-column>
          <mj-column width="55%" vertical-align="middle">
            <mj-text align="right" padding="0"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right"><tr><td valign="middle">${badge(CATEGORY_ICON[category])}</td><td valign="middle" style="padding-left:10px;${LABEL_STYLE}">{{t:${CATEGORY_LABEL_KEY[category]}}}</td></tr></table></mj-text>
          </mj-column>
        </mj-group>
      </mj-section>
      <mj-section css-class="gutter" background-color="${C.surface}" ${SIDES} padding="0 ${S.gutter}">
        <mj-column>
          <mj-divider border-color="${C.border}" border-width="1px" padding="0" />
        </mj-column>
      </mj-section>
    </mj-wrapper>`;

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
const footer = (optOutable: boolean) => `    <mj-wrapper padding="0 0 32px 0">
      <mj-section css-class="gutter" background-color="${C.panel}" border-top="1px solid ${C.border}" ${SIDES} border-bottom="1px solid ${C.border}" border-radius="0 0 ${S.cardRadius} ${S.cardRadius}" padding="24px ${S.gutter} 28px ${S.gutter}">
        <mj-column>
${footerText('{{footer_note}}', '10px')}
${footerText(`{{t:email.fragment.help}} ${footerLink('mailto:{{support_email}}', '{{support_email}}')}`)}${optOutable ? unsubscribeLine() : ''}
        <mj-divider border-width="1px" border-color="${C.border}" width="64px" padding="8px 0 16px 0" />
${footerText(`&copy; {{year}} ${footerLink('{{website_url}}', '{{app_name}}')}. {{t:email.fragment.rights}}`, '0')}
        </mj-column>
      </mj-section>
    </mj-wrapper>`;

export const FRAGMENT_DEFAULTS: FragmentDefault[] = EMAIL_CATEGORIES.map((category) => ({
  category,
  name: LABELS[category],
  description: DESCRIPTIONS[category],
  header_mjml: header(category),
  footer_mjml: footer(isOptionalMailCategory(category)),
}));

export const FRAGMENT_LABELS = LABELS;
