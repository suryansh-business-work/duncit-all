import { z } from 'zod';
import { splitList } from '../rules/rate-limit-rule';

/** The platform settings form. Address lists are typed as text, split on save. */
export interface RateLimitSettingsMessages {
  retentionRange: string;
  messageRequired: string;
}

export const rateLimitSettingsSchema = (messages: RateLimitSettingsMessages) =>
  z.object({
    enabled: z.boolean(),
    monitor_only: z.boolean(),
    default_message: z.string().trim().min(5, messages.messageRequired).max(300),
    send_headers: z.boolean(),
    log_blocks: z.boolean(),
    notify_slack: z.boolean(),
    exempt_roles: z.array(z.string()),
    allow_ips: z.string().max(2000).optional(),
    block_ips: z.string().max(2000).optional(),
    event_retention_days: z.coerce
      .number()
      .int(messages.retentionRange)
      .min(1, messages.retentionRange)
      .max(90, messages.retentionRange),
  });

export type RateLimitSettingsForm = z.infer<ReturnType<typeof rateLimitSettingsSchema>>;

export interface RateLimitSettingsData {
  enabled: boolean;
  monitor_only: boolean;
  default_message: string;
  send_headers: boolean;
  log_blocks: boolean;
  notify_slack: boolean;
  exempt_roles: string[];
  allow_ips: string[];
  block_ips: string[];
  event_retention_days: number;
  store: string;
  rule_count: number;
  active_rule_count: number;
  event_count: number;
  updated_at: string | null;
}

export function toSettingsForm(data: RateLimitSettingsData): RateLimitSettingsForm {
  return {
    enabled: data.enabled,
    monitor_only: data.monitor_only,
    default_message: data.default_message,
    send_headers: data.send_headers,
    log_blocks: data.log_blocks,
    notify_slack: data.notify_slack,
    exempt_roles: data.exempt_roles,
    allow_ips: data.allow_ips.join(', '),
    block_ips: data.block_ips.join(', '),
    event_retention_days: data.event_retention_days,
  };
}

export function toSettingsInput(values: RateLimitSettingsForm): Record<string, unknown> {
  return {
    ...values,
    allow_ips: splitList(values.allow_ips),
    block_ips: splitList(values.block_ips),
  };
}
