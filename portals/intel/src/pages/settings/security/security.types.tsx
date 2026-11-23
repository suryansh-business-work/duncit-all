import { z } from 'zod';
import { isHostname } from '@duncit/regex';
import { intField, type Translate } from '../fields';

/** Settings › Security (Super Admin only) — the same bounds the server enforces. */

/** "a.com, b.com" or one per line → a clean, de-duplicated list. */
export const splitHosts = (text: string): string[] => [...new Set(text.split(/[\s,]+/).map((h) => h.trim().toLowerCase()).filter(Boolean))];

export const makeSecuritySchema = (t: Translate) =>
  z.object({
    four_eyes_production: z.boolean(),
    approval_expiry_hours: intField(t, 1, 168),
    messages_per_minute: intField(t, 1, 120),
    mcp_allowed_hosts: z
      .string()
      .transform(splitHosts)
      .refine((hosts) => hosts.length <= 50, t('intel.settings.common.max', { vars: { max: 50 } }))
      .refine((hosts) => hosts.every((h) => isHostname(h)), t('intel.settings.security.hostsInvalid')),
    block_injection: z.boolean(),
  });

export type SecurityValues = z.input<ReturnType<typeof makeSecuritySchema>>;
export type SecurityOutput = z.output<ReturnType<typeof makeSecuritySchema>>;
