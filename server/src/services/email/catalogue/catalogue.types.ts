import type { EmailCategory } from '../email.provider';
import {
  callout,
  closing,
  cta,
  detailRows,
  intro,
  shell,
  type DetailRow,
  type Tone,
} from './mjml';

/**
 * ONE definition per email the product sends.
 *
 * Before this file the same email was described in four unrelated places: the
 * MJML (a file on disk or a blob in `emailTemplate.defaults`), its category in
 * `template-categories`, its footer sentence in `TEMPLATE_FOOTER_NOTES`, and
 * the variables it fills — which lived nowhere at all, so the Tech portal's
 * variable panel was empty for every template and a preview showed raw braces.
 *
 * A row here is the whole answer, and everything downstream is derived from it:
 *
 *   - `CATALOGUE_TEMPLATE_DEFAULTS` seeds the row into Mongo on boot
 *   - `CATALOGUE_CATEGORIES` / `CATALOGUE_FOOTER_NOTES` feed template-categories
 *   - `CATALOGUE_VARIABLES` is what `migrate:email-chrome` writes onto each
 *     stored template, so Tech > Emails > Templates can document and preview it
 *   - `EMAIL_BY_WA_EVENT` is how `notifyEvent` sends the email leg of a domain
 *     event beside its WhatsApp one, off the SAME positional values
 *
 * `waEvent` links a row to `WA_EVENTS`, and when it is set the FIRST N entries
 * of `vars` — N being that event's param count — MUST be in the same order as
 * its `params`. Anything after those is email-only, which is how an email says
 * more than a 1024-character WhatsApp template can. That single ordering is
 * what lets an existing call site gain an email without repeating one value
 * (rule 34), and it is asserted by a unit test: a silent mismatch would fill
 * the date into the venue's name and nobody would see it until a reader did.
 */

/** Who the email is written for. Mirrors `WaAudience`, plus the staff-only ones. */
export type EmailAudience =
  | 'USER'
  | 'HOST'
  | 'VENUE'
  | 'ECOMM'
  | 'CLUB_ADMIN'
  | 'SUPPORT'
  | 'ADMIN'
  | 'PUBLIC';

/** A variable the template fills, documented for the editor's variable panel. */
export interface EmailVar {
  key: string;
  description: string;
  sample: string;
}

export interface EmailDef {
  /** The slug passed as `template` to sendEmail, and the row's identity. */
  slug: string;
  name: string;
  description: string;
  audience: EmailAudience;
  category: EmailCategory;
  /** What makes it fire, in a sentence — the docs table's trigger column. */
  fires: string;
  /** The `WA_EVENTS` key this mirrors, when the same moment also messages. */
  waEvent?: string;
  /** Fallback subject. The stored row's own subject wins once seeded. */
  subject: string;
  /** This template's "you're receiving this because…" line — a `{{t:…}}` key. */
  footerNote: string;
  /** Declared variables. Ordered to match `waEvent`'s params when linked. */
  vars: readonly EmailVar[];
  /**
   * The MJML body. Absent means the template ships as an on-disk `.mjml` file
   * and this row only carries its metadata — the disk copy stays the source of
   * the body, so seeding it from here would silently replace it.
   */
  mjml?: string;
}

/** The standard body shape almost every one of these emails takes. */
export interface BodySpec {
  /** Namespace holding `.title` and `.body`, e.g. `email.userPodFull`. */
  copyKey: string;
  /** The var the greeting names the reader with. */
  nameVar: string;
  tone: Tone;
  /** The tinted strip: its label key and the var it shows. */
  calloutLabelKey: string;
  calloutVar: string;
  /** The label/value lines under the callout. */
  rows?: readonly DetailRow[];
  /** The button's label key and the var carrying its URL. */
  ctaKey?: string;
  ctaVar?: string;
  /** The quiet closing sentence. Rendered under the CTA, or in its place. */
  helpKey?: string;
}

/**
 * Build the MJML for one standard body.
 *
 * Order is fixed on purpose — heading, callout, details, action, footnote — so
 * every email in the product reads the same way down the page and an admin
 * editing one of them in the Tech portal recognises the shape of the next.
 */
export function standardBody(spec: BodySpec): string {
  const titleKey = `${spec.copyKey}.title`;
  const parts = [
    intro(titleKey, `${spec.copyKey}.body`, spec.nameVar),
    callout(spec.tone, spec.calloutLabelKey, spec.calloutVar),
  ];
  if (spec.rows?.length) parts.push(detailRows(spec.rows));
  if (spec.ctaKey && spec.ctaVar) parts.push(cta(spec.ctaKey, spec.ctaVar));
  if (spec.helpKey) parts.push(closing(spec.helpKey));
  return shell(titleKey, parts.join('\n'));
}

/** One catalogue row plus the body built from its spec. */
export type EmailSpec = Omit<EmailDef, 'mjml'> & { body: BodySpec };

/** Turn a spec into the definition the rest of the catalogue exports. */
export const defineEmail = (spec: EmailSpec): EmailDef => {
  const { body, ...rest } = spec;
  return { ...rest, mjml: standardBody(body) };
};

/** A row for a template whose body is an on-disk `.mjml` file — metadata only. */
export const describeEmail = (def: Omit<EmailDef, 'mjml'>): EmailDef => def;

/** The shorthand every `vars` list is written with. */
export const v = (key: string, description: string, sample: string): EmailVar => ({
  key,
  description,
  sample,
});

/**
 * The variables `sendEmail` supplies to EVERY message, whatever the template.
 *
 * Declared here so the Tech portal's variable panel documents them once per
 * template instead of an admin discovering them by reading a fragment's MJML.
 * They are not part of any row's `vars`: a template does not choose them, and
 * listing them per row would be sixty copies of the same eight lines (rule 34).
 *
 * `footer_note` is in the list because it is the one an admin most often wants
 * to override per send, and the only one whose value comes from the template's
 * own row rather than from the environment.
 */
export const CHROME_VARS: readonly EmailVar[] = [
  v('brand_logo_url', 'The admin’s brand logo, from Admin > Settings > Branding.', 'https://cdn.duncit.com/logo.png'),
  v('app_name', 'The product name on the footer’s copyright line.', 'Duncit'),
  v('app_url', 'The app’s base URL, for a CTA that opens Duncit.', 'https://duncit.com'),
  v('website_url', 'The public website, linked from the footer.', 'https://duncit.com'),
  v('support_email', 'Where the footer tells the reader to write for help.', 'support@duncit.com'),
  v('year', 'The current year, on the copyright line.', '2026'),
  v('unsubscribe_url', 'One-click mail preferences for this recipient.', 'https://duncit.com/mail-preferences?t=…'),
  v('footer_note', 'This template’s “you’re receiving this because…” sentence.', 'You joined this pod on Duncit.'),
];
