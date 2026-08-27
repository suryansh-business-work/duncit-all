import { z } from 'zod';
import type { RateLimitRuleRow } from '../../queries';

/**
 * The rule editor's shape and its validation.
 *
 * The enum FIELDS are plain strings rather than `z.enum`, because the option
 * lists are served by `rateLimitOptions` — a value the server has and this
 * build has not heard of must still round-trip through the form rather than
 * failing validation on save.
 *
 * The list fields (operations, paths, methods, exempt IPs) are edited as
 * comma-separated text and split on submit, so the form state is what a person
 * typed and the payload is what the server stores.
 */

const listText = z.string().max(600).optional();

/** The validation copy, passed in translated — the schema renders no English. */
export interface RateLimitRuleMessages {
  nameTooShort: string;
  appRequired: string;
  atLeastOne: string;
  wholeNumbers: string;
  burstNeedsTokenBucket: string;
}

export const rateLimitRuleSchema = (messages: RateLimitRuleMessages) =>
  z
    .object({
      name: z.string().trim().min(3, messages.nameTooShort).max(80),
      description: z.string().trim().max(400).optional(),
      enabled: z.boolean(),
      mode: z.string().min(1),
      priority: z.coerce.number().int(messages.wholeNumbers).min(0).max(10000),

      surface: z.string().min(1),
      app: z.string().trim().min(1, messages.appRequired).max(40),
      channel: z.string().min(1),
      audience: z.string().min(1),
      operations: listText,
      operation_type: z.string().min(1),
      paths: listText,
      methods: listText,

      key_by: z.string().min(1),
      algorithm: z.string().min(1),
      limit: z.coerce.number().int(messages.wholeNumbers).min(1, messages.atLeastOne).max(1000000),
      window_seconds: z.coerce
        .number()
        .int(messages.wholeNumbers)
        .min(1, messages.atLeastOne)
        .max(86400),
      burst: z.coerce.number().int(messages.wholeNumbers).min(0).max(1000000),
      block_seconds: z.coerce.number().int(messages.wholeNumbers).min(0).max(86400),

      exempt_roles: z.array(z.string()),
      exempt_ips: listText,

      message: z.string().trim().max(300).optional(),
      notify_slack: z.boolean(),
    })
    /*
      A burst only means anything to the token bucket — the two window
      algorithms have no notion of one. Rejecting it here is what stops a rule
      that reads "60/min with a burst of 20" and quietly enforces 60.
    */
    .refine((v) => v.algorithm === 'TOKEN_BUCKET' || v.burst === 0, {
      path: ['burst'],
      message: messages.burstNeedsTokenBucket,
    });

export type RateLimitRuleForm = z.infer<ReturnType<typeof rateLimitRuleSchema>>;

export const BLANK_RULE: RateLimitRuleForm = {
  name: '',
  description: '',
  enabled: true,
  // A new rule starts by WATCHING. Somebody writing their first ceiling has no
  // idea yet whether the number is right, and the cost of guessing low in
  // ENFORCE is refusing real customers.
  mode: 'MONITOR',
  priority: 100,
  surface: 'ALL',
  app: '*',
  channel: 'ALL',
  audience: 'ALL',
  operations: '',
  operation_type: 'ALL',
  paths: '',
  methods: '',
  key_by: 'IP',
  algorithm: 'SLIDING_WINDOW',
  limit: 100,
  window_seconds: 60,
  burst: 0,
  block_seconds: 0,
  exempt_roles: [],
  exempt_ips: '',
  message: '',
  notify_slack: false,
};

/** Comma/newline separated text to a trimmed list, dropping the blanks. */
export function splitList(text?: string): string[] {
  if (!text) return [];
  return text
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** A stored rule, as the form edits it. */
export function toForm(rule: RateLimitRuleRow): RateLimitRuleForm {
  return {
    name: rule.name,
    description: rule.description ?? '',
    enabled: rule.enabled,
    mode: rule.mode,
    priority: rule.priority,
    surface: rule.surface,
    app: rule.app,
    channel: rule.channel,
    audience: rule.audience,
    operations: rule.operations.join(', '),
    operation_type: rule.operation_type,
    paths: rule.paths.join(', '),
    methods: rule.methods.join(', '),
    key_by: rule.key_by,
    algorithm: rule.algorithm,
    limit: rule.limit,
    window_seconds: rule.window_seconds,
    burst: rule.burst,
    block_seconds: rule.block_seconds,
    exempt_roles: rule.exempt_roles,
    exempt_ips: rule.exempt_ips.join(', '),
    message: rule.message ?? '',
    notify_slack: rule.notify_slack,
  };
}

/** The form, as the mutation's `RateLimitRuleInput`. */
export function toInput(values: RateLimitRuleForm): Record<string, unknown> {
  return {
    ...values,
    description: values.description || null,
    message: values.message || null,
    operations: splitList(values.operations),
    paths: splitList(values.paths),
    methods: splitList(values.methods).map((m) => m.toUpperCase()),
    exempt_ips: splitList(values.exempt_ips),
  };
}
