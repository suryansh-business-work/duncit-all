import type { StatusColorMap } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';

export const WA_STATUS_COLORS: StatusColorMap = {
  SENT: 'success',
  FAILED: 'error',
  SENDING: 'warning',
  SCHEDULED: 'info',
};

export const WA_STATUS_OPTIONS = ['SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED'].map(
  (value) => ({ value, label: value })
);

/** Only a send that has not started can be called off. */
export const canCancel = (status: string) => status === 'SCHEDULED';

export const WA_AUDIENCE_LABELS: Record<string, string> = {
  ALL_USERS: 'All users',
  AUDIENCE_LIST: 'Saved audience list',
  SPECIFIC_USERS: 'Selected people',
  MANUAL_NUMBERS: 'Typed-in contacts',
};

/** What each recipient source actually means at send time — the difference
 * between "resolved when it runs" and "exactly these numbers" is the whole
 * reason there are four. */
export const WA_AUDIENCE_HINTS: Record<string, string> = {
  ALL_USERS: 'Everyone with a usable WhatsApp number, resolved when the send runs.',
  AUDIENCE_LIST: 'A saved Target Audience list. Membership is recomputed when you send.',
  SPECIFIC_USERS: 'Only the people you pick. Their saved WhatsApp number is used.',
  MANUAL_NUMBERS: 'Only the numbers you type in — they need not have an account.',
};

/** Only a name resolves for a typed-in contact: there is no account behind it,
 * so a template asking for {{city}} skips those people. */
export const MANUAL_VARIABLE_NOTE =
  'Typed-in contacts have no account, so only {{first_name}}, {{last_name}} and {{full_name}} resolve for them — a parameter using anything else skips that contact.';

export const WA_AUDIENCE_OPTIONS = Object.entries(WA_AUDIENCE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const WA_RECIPIENT_STATUS_COLORS: StatusColorMap = {
  SENT: 'success',
  SKIPPED: 'warning',
  FAILED: 'error',
};

export const WA_RECIPIENT_STATUS_OPTIONS = ['SENT', 'SKIPPED', 'FAILED'].map((value) => ({
  value,
  label: value,
}));

export const labelFor = (labels: Record<string, string>, value: string) => labels[value] ?? value;

/** The categories WhatsApp bills separately. The order is the settings form's
 * order and the dashboard's, so the rate card reads the same in both. */
export const WA_CATEGORIES = ['MARKETING', 'UTILITY', 'AUTHENTICATION', 'SERVICE'] as const;
export type WaCategory = (typeof WA_CATEGORIES)[number];

export const WA_CATEGORY_LABELS: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utility',
  AUTHENTICATION: 'Authentication',
  SERVICE: 'Service',
};

/** A send whose category AiSensy never told us costs nothing and says so —
 * a blank cell would read as free rather than unknown. */
export const UNCATEGORISED = 'Not categorised';

export const categoryLabel = (category: string) =>
  WA_CATEGORY_LABELS[category] ?? (category || UNCATEGORISED);

export const WA_CATEGORY_OPTIONS = WA_CATEGORIES.map((value) => ({
  value,
  label: WA_CATEGORY_LABELS[value],
}));

/** Money, in the symbol the rate card is kept in. Two places on a bill; three
 * on a per-message rate, because ₹0.145 rounded to ₹0.15 is a different rate. */
export const waMoney = (value: number, symbol: string) =>
  formatMoney(value, { symbol, decimals: 2 });

export const waRate = (value: number, symbol: string) =>
  formatMoney(value, { symbol, decimals: 3 });

/** Deleting mid-send would pull the document out from under the send itself,
 * so the server refuses it — don't offer the action either. */
export const canDelete = (status: string) => status !== 'SENDING';
