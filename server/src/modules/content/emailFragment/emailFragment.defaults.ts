import { EMAIL_CATEGORIES, type EmailCategory } from '@services/email/email.provider';

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

/** What each category's footer says about why the email arrived. */
const NOTE_KEY: Record<EmailCategory, string> = {
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
    'Campaigns and announcements. Add your unsubscribe link here — a campaign records any link containing the word "unsubscribe" as an opt-out.',
  service: 'A person writing to a person. Invites a reply.',
  notification: 'Something changed on the recipient’s account or booking.',
  support: 'Part of a support conversation — tickets, chats, transcripts.',
  billing: 'Invoices, payouts and refunds. Worth keeping for records.',
  legal: 'Policy and account notices that have to be sent.',
  internal: 'Staff-only. Never reaches a customer.',
};

/** The brand mark. One image, the admin's logo, on every email. */
const header = () => `    <mj-section padding="24px 0 8px 0">
      <mj-column>
        <mj-image src="{{brand_logo_url}}" alt="{{app_name}}" width="120px" align="center" padding="0" />
      </mj-column>
    </mj-section>`;

/**
 * The footer: why this arrived, where to get help, and the copyright line.
 * `support_email`, `website_url`, `app_name` and `year` are supplied by
 * `sendEmail` on every send, so a fragment never has to be told them.
 */
const footer = (noteKey: string) => `    <mj-section padding="8px 0 28px 0">
      <mj-column>
        <mj-divider border-width="1px" border-color="#e5e7eb" padding="0 0 16px 0" />
        <mj-text align="center" font-size="12px" color="#6b7280" padding="0 0 6px 0">{{t:${noteKey}}}</mj-text>
        <mj-text align="center" font-size="12px" color="#6b7280" padding="0 0 6px 0">
          {{t:email.fragment.help}} <a href="mailto:{{support_email}}" style="color:#2563eb;text-decoration:none">{{support_email}}</a>
        </mj-text>
        <mj-text align="center" font-size="11px" color="#9ca3af" padding="0">
          &copy; {{year}} <a href="{{website_url}}" style="color:#9ca3af;text-decoration:none">{{app_name}}</a>. {{t:email.fragment.rights}}
        </mj-text>
      </mj-column>
    </mj-section>`;

export const FRAGMENT_DEFAULTS: FragmentDefault[] = EMAIL_CATEGORIES.map((category) => ({
  category,
  name: LABELS[category],
  description: DESCRIPTIONS[category],
  header_mjml: header(),
  footer_mjml: footer(NOTE_KEY[category]),
}));

export const FRAGMENT_LABELS = LABELS;
