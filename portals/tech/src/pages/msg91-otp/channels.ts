import type { Translate } from '@duncit/forms/schemas';

/** The per-channel message counts both MSG91 reports carry. */
export interface ChannelCounts {
  sms: number;
  whatsapp: number;
  email: number;
  voice: number;
}

export type ChannelKey = keyof ChannelCounts;

/** Each channel with the word the portal shows for it, in MSG91's own order. */
export const channelLabels = (t: Translate): ReadonlyArray<{ key: ChannelKey; label: string }> => [
  { key: 'sms', label: t('tech.msg91.channelSms') },
  { key: 'whatsapp', label: t('tech.msg91.channelWhatsapp') },
  { key: 'email', label: t('tech.msg91.channelEmail') },
  { key: 'voice', label: t('tech.msg91.channelVoice') },
];

/** "SMS ×2 · WhatsApp ×1" — only the channels that carried something; '—' for none. */
export function channelSummary(
  counts: Readonly<ChannelCounts>,
  labels: ReadonlyArray<{ key: ChannelKey; label: string }>
): string {
  const used = labels.filter(({ key }) => counts[key] > 0).map(({ key, label }) => `${label} ×${counts[key]}`);
  return used.length > 0 ? used.join(' · ') : '—';
}
