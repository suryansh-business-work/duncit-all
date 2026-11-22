import { CALM } from './mjml';
import { defineEmail, v, type EmailDef } from './catalogue.types';

/**
 * CRM team emails. A manual log on a lead that @mentions a CRM team member
 * emails them once (an edit only emails the people it adds). Seeded on boot
 * and edited in the Communications portal's Email Templates — never a local .mjml.
 */
const COPY_KEY = 'email.crmLogMention';

export const CRM_LOG_MENTION_TEMPLATE = 'crm-log-mention';

export const CRM_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: CRM_LOG_MENTION_TEMPLATE,
    name: 'CRM: Mentioned in a Manual Log',
    description: 'A CRM team member @mentioned in a manual log on a lead (CRM › lead › Manual Logs).',
    audience: 'ADMIN',
    category: 'internal',
    fires: 'A manual log is saved with a new @mention of an active CRM team member',
    subject: '{{author}} mentioned you on {{lead_name}}',
    footerNote: `{{t:${COPY_KEY}.footer}}`,
    vars: [
      v('name', 'The mentioned team member’s name.', 'Priya Sharma'),
      v('author', 'Who wrote the log.', 'Rahul Verma'),
      v('lead_kind', 'The kind of lead.', 'Venue lead'),
      v('lead_name', 'The lead’s name.', 'The Courtyard Cafe'),
      v('log_title', 'The log’s title, or the start of its text.', 'Follow-up call notes'),
      v('lead_url', 'The lead’s Manual Logs tab in the CRM.', 'https://crm.duncit.com/venue-leads/123/view?selectedtab=manual-logs'),
    ],
    body: {
      copyKey: COPY_KEY,
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: `${COPY_KEY}.lead`,
      calloutVar: 'lead_name',
      rows: [
        { labelKey: `${COPY_KEY}.kind`, valueVar: 'lead_kind' },
        { labelKey: `${COPY_KEY}.author`, valueVar: 'author' },
        { labelKey: `${COPY_KEY}.log`, valueVar: 'log_title' },
      ],
      ctaKey: `${COPY_KEY}.cta`,
      ctaVar: 'lead_url',
    },
  }),
];

/** English copy for the rows above (rule 38), spread into EMAIL_FALLBACK. */
export const CRM_EMAIL_FALLBACK: Record<string, string> = {
  'email.crmLogMention.title': 'You were mentioned in a lead log',
  'email.crmLogMention.body': 'A teammate tagged you in a manual log on a CRM lead. Open the lead to read it and pick up anything that needs you.',
  'email.crmLogMention.lead': 'Lead',
  'email.crmLogMention.kind': 'Lead type',
  'email.crmLogMention.author': 'Mentioned by',
  'email.crmLogMention.log': 'Log',
  'email.crmLogMention.cta': 'Open the lead',
  'email.crmLogMention.footer': "You're receiving this because a CRM teammate mentioned you.",
};
