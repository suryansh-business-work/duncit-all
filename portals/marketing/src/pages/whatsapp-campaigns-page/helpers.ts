import type { StatusColorMap } from '@duncit/ui';

export const WA_STATUS_COLORS: StatusColorMap = {
  SENT: 'success',
  FAILED: 'error',
  SENDING: 'warning',
};

export const WA_STATUS_OPTIONS = ['SENDING', 'SENT', 'FAILED'].map((value) => ({
  value,
  label: value,
}));

export const WA_AUDIENCE_LABELS: Record<string, string> = {
  ALL_USERS: 'All users',
  AUDIENCE_LIST: 'Saved audience list',
};

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

/** Deleting mid-send would pull the document out from under the send itself,
 * so the server refuses it — don't offer the action either. */
export const canDelete = (status: string) => status !== 'SENDING';
