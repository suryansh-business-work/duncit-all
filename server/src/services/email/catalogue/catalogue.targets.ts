import { PAUSED } from './mjml';
import { defineEmail, v, type EmailDef } from './catalogue.types';

/**
 * Monthly employee targets (Targets console > Employee Targets). The month-end
 * reminder goes to an employee whose target for the month is still waiting for
 * a progress report. Staff are never reminded on WhatsApp, so it has no
 * `waEvent`. Seeded on boot and edited in the Communications portal's Email
 * Templates (rule 28) — never a local .mjml.
 */
const COPY_KEY = 'email.employeeTargetReminder';

export const TARGETS_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'employee-target-reminder',
    name: 'Employee: Submit Monthly Target Progress',
    description:
      'An employee whose monthly target is still unsubmitted, once a day inside the month-end window (Targets > Settings).',
    audience: 'ADMIN',
    category: 'internal',
    fires: 'The reminder sweep finds an assigned, unsubmitted target for a month whose reminder window is open',
    subject: 'Submit your target progress for {{month}}',
    footerNote: `{{t:${COPY_KEY}.footer}}`,
    vars: [
      v('name', 'The employee’s name.', 'Priya Sharma'),
      v('month', 'The month the target is for.', 'November 2026'),
      v('due_on', 'The last day reminders go out for it.', '03 Dec 2026'),
      v('goal_count', 'How many goals the month has.', '4'),
      v('targets_url', 'The Employee console’s My Targets page.', 'https://employee.duncit.com/targets'),
    ],
    body: {
      copyKey: COPY_KEY,
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: `${COPY_KEY}.month`,
      calloutVar: 'month',
      rows: [
        { labelKey: `${COPY_KEY}.dueOn`, valueVar: 'due_on' },
        { labelKey: `${COPY_KEY}.goals`, valueVar: 'goal_count' },
      ],
      ctaKey: `${COPY_KEY}.cta`,
      ctaVar: 'targets_url',
    },
  }),
];

/** English copy for the rows above (rule 38), spread into EMAIL_FALLBACK. */
export const TARGETS_EMAIL_FALLBACK: Record<string, string> = {
  'email.employeeTargetReminder.title': 'Time to report on your monthly target',
  'email.employeeTargetReminder.body':
    'The month is closing. Share your completion percentage, your achievements and any updates for the month below so your manager can review them.',
  'email.employeeTargetReminder.month': 'Month',
  'email.employeeTargetReminder.dueOn': 'Submit by',
  'email.employeeTargetReminder.goals': 'Goals',
  'email.employeeTargetReminder.cta': 'Submit progress',
  'email.employeeTargetReminder.footer': "You're receiving this because Duncit set you a monthly target.",
};
