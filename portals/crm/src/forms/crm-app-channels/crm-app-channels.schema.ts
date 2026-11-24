import { z } from 'zod';
import type { Translate } from './crm-app-channels.types';

/**
 * Where each Duncit CRM build is published. A channel is one the Duncit bot
 * can see (the server refuses anything else) or empty, which falls back:
 * staging → production → the Android builds channel.
 */
export const crmAppChannelsSchema = (t: Translate, channelIds: readonly string[]) => {
  const known = new Set(channelIds);
  const channel = z
    .string()
    .trim()
    .refine((id) => id === '' || known.has(id), t('crm.downloadApp.settings.channelUnknown'));
  return z.object({ production_channel: channel, staging_channel: channel });
};

export type CrmAppChannelsValues = z.infer<ReturnType<typeof crmAppChannelsSchema>>;

export const toCrmAppChannelsForm = (settings: {
  production_channel: string | null;
  staging_channel: string | null;
}): CrmAppChannelsValues => ({
  production_channel: settings.production_channel ?? '',
  staging_channel: settings.staging_channel ?? '',
});
