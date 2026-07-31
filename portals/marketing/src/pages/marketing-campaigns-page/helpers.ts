import type { StatusColorMap } from '@duncit/ui';
import type { CampaignAudienceList } from './marketing-campaign-form';

export const CAMPAIGN_STATUS_COLORS: StatusColorMap = {
  SENT: 'success',
  FAILED: 'error',
  SCHEDULED: 'info',
  SENDING: 'warning',
};

export const STATUS_OPTIONS = ['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED'].map((value) => ({
  value,
  label: value,
}));

/** Email is the only channel. The raw-value fallback still matters: campaigns
 * stored before WhatsApp was removed keep that value until
 * migrate:drop-whatsapp-campaigns has been run. */
export const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: 'Email',
};

export const CHANNEL_OPTIONS = Object.entries(CHANNEL_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const AUDIENCE_LABELS: Record<string, string> = {
  ALL_USERS: 'All users',
  NEWSLETTER_SUBSCRIBERS: 'Newsletter subscribers',
  AUDIENCE_LIST: 'Saved audience list',
};

export const AUDIENCE_OPTIONS = Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const labelFor = (labels: Record<string, string>, value: string) => labels[value] ?? value;

/** A campaign already sent has nothing left to send; one mid-flight is busy. */
export const canSend = (status: string) => status !== 'SENT' && status !== 'SENDING';

/** Deleting mid-send would pull the document out from under the send itself,
 * so the server refuses it — don't offer the action either. */
export const canDelete = (status: string) => status !== 'SENDING';

/** The list a campaign targets, by id. Written branch-free so an unknown id
 * resolves to an empty string without a second code path. */
export const listNameFor = (id: string | null | undefined, lists: CampaignAudienceList[]) =>
  lists.filter((list) => list.id === id).map((list) => list.name).join('');
