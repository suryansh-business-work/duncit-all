import type { CrmTone } from '@duncit/utils';

import type { Translate } from '@/i18n/fallback';

/** The theme colour each shared tone is drawn in — the same mapping the app's ToneChip uses. */
export const WA_TONE_COLOR = {
  success: 'success',
  error: 'danger',
  warning: 'warning',
  info: 'info',
  default: 'muted',
} as const satisfies Record<CrmTone, string>;

/** A WhatsApp number as the portal prints it: with its +, and "· Business" for a business account. */
export const waNumberLine = (t: Translate, phone: string, business: boolean): string =>
  business ? t('crm.tools.businessNumber', { vars: { phone: `+${phone}` } }) : `+${phone}`;

/** A contact's name, or their number when WhatsApp has no name for them. */
export const waDisplayName = (name: string, phone: string): string => name || `+${phone}`;
