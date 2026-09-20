import { z } from 'zod';
import { fallbackT, type Translate } from '@duncit/shell';
import type { ShortLinkPolicy } from '../queries';

/**
 * The retention window's bounds, stated here as well as on the server so the
 * marketer is told before they submit. The server refuses anything outside
 * them either way — see shortLinkPolicy.model.ts, which owns the real rule.
 */
export const MIN_RETENTION_DAYS = 30;
export const MAX_RETENTION_DAYS = 1095;

/**
 * Blocked domains are typed one per line, which is how somebody maintaining a
 * list actually edits one — a comma-separated field turns a twenty-entry list
 * into an unreadable ribbon.
 */
const linesToDomains = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export const linkPrivacySchema = (t: Translate = fallbackT) =>
  z.object({
    retention_days: z.coerce
      .number({ message: t('marketing.externalLinks.retentionNotANumber') })
      .int(t('marketing.externalLinks.retentionNotWhole'))
      .min(
        MIN_RETENTION_DAYS,
        t('marketing.externalLinks.retentionTooShort', {
          vars: { min: String(MIN_RETENTION_DAYS) },
        }),
      )
      .max(
        MAX_RETENTION_DAYS,
        t('marketing.externalLinks.retentionTooLong', {
          vars: { max: String(MAX_RETENTION_DAYS) },
        }),
      ),
    honour_consent_signals: z.boolean(),
    blocked_domains: z
      .string()
      .trim()
      .default('')
      .refine(
        (value) => linesToDomains(value).every((line) => !line.includes(' ')),
        t('marketing.externalLinks.domainsOnePerLine'),
      ),
  });

export type LinkPrivacyFormValues = z.infer<ReturnType<typeof linkPrivacySchema>>;

export function policyToValues(policy: ShortLinkPolicy): LinkPrivacyFormValues {
  return {
    retention_days: policy.retention_days,
    honour_consent_signals: policy.honour_consent_signals,
    blocked_domains: policy.blocked_domains.join('\n'),
  };
}

export function toPolicyInput(values: LinkPrivacyFormValues) {
  return {
    retention_days: values.retention_days,
    honour_consent_signals: values.honour_consent_signals,
    blocked_domains: linesToDomains(values.blocked_domains),
  };
}

export interface LinkPrivacyFormProps {
  policy: ShortLinkPolicy;
  busy: boolean;
  errorMessage?: string | null;
  onSubmit: (values: LinkPrivacyFormValues) => Promise<void> | void;
}
