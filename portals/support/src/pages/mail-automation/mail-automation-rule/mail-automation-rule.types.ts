import { z } from 'zod';
import type { MailAutomationAccount, MailTicketType } from '../../../graphql/mail-automation';

/** The placeholder the reply must carry. Named once: it appears in the schema,
 * in the hint text and in the server's own check. */
export const TICKET_TOKEN = '{{ticket_no}}';

/** Every placeholder an operator may use, for the hint under the field. */
export const TEMPLATE_TOKENS = [
  TICKET_TOKEN,
  '{{sender_name}}',
  '{{sla}}',
  '{{subject}}',
  '{{mailbox}}',
] as const;

const MIN_HOURS = 1;
const MAX_HOURS = 720;

/** Error copy comes from the caller so the schema stays localized (rule 38) —
 * a zod message written here would be the one hardcoded string on the page. */
export interface RuleMessages {
  required: string;
  needsTicket: string;
  range: string;
  order: string;
}

export function buildRuleSchema(messages: RuleMessages) {
  return z
    .object({
      reply_template: z
        .string()
        .trim()
        .min(1, messages.required)
        .refine((value) => value.includes(TICKET_TOKEN), messages.needsTicket),
      ai_enabled: z.boolean(),
      ticket_type: z.enum(['SUPPORT', 'GRIEVANCE', 'REPORT_PROBLEM']),
      is_active: z.boolean(),
      sla_min_hours: z.coerce.number().int().min(MIN_HOURS, messages.range).max(MAX_HOURS, messages.range),
      sla_max_hours: z.coerce.number().int().min(MIN_HOURS, messages.range).max(MAX_HOURS, messages.range),
    })
    .refine((values) => values.sla_min_hours <= values.sla_max_hours, {
      path: ['sla_max_hours'],
      message: messages.order,
    });
}

export type MailAutomationRuleValues = z.infer<ReturnType<typeof buildRuleSchema>>;

/** Which step each field belongs to, so "Next" can validate only what is on
 * screen instead of jumping the operator back to a step they have not reached. */
export const STEP_FIELDS: ReadonlyArray<ReadonlyArray<keyof MailAutomationRuleValues>> = [
  [],
  ['reply_template', 'ai_enabled'],
  ['ticket_type', 'sla_min_hours', 'sla_max_hours'],
];

export const TICKET_TYPE_OPTIONS: ReadonlyArray<{
  value: MailTicketType;
  labelKey: string;
  hintKey: string;
}> = [
  {
    value: 'SUPPORT',
    labelKey: 'support.mailAutomation.ticketSupport',
    hintKey: 'support.mailAutomation.ticketSupportHint',
  },
  {
    value: 'GRIEVANCE',
    labelKey: 'support.mailAutomation.ticketGrievance',
    hintKey: 'support.mailAutomation.ticketGrievanceHint',
  },
  {
    value: 'REPORT_PROBLEM',
    labelKey: 'support.mailAutomation.ticketReport',
    hintKey: 'support.mailAutomation.ticketReportHint',
  },
];

/** The saved rule as form values. */
export function accountToValues(account: MailAutomationAccount): MailAutomationRuleValues {
  return {
    reply_template: account.reply_template,
    ai_enabled: account.ai_enabled,
    ticket_type: account.ticket_type,
    is_active: account.is_active,
    sla_min_hours: account.sla_min_hours,
    sla_max_hours: account.sla_max_hours,
  };
}
