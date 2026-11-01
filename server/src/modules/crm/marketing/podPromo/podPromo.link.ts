import { getUrlConfigs } from '@config/url-configs';
import { ShortLinkModel } from '../shortLink.model';
import { shortLinkService } from '../shortLink.service';
import type { PodBannerData } from './podPromo.pod';

/**
 * The pod's tracking link — an ordinary Marketing short link (source
 * INSTAGRAM, medium SOCIAL) to the pod page, so its clicks, journeys and
 * attributed payments are counted by the same machinery as every other link
 * and show on Short Links too.
 *
 * One link per pod and campaign: the utm_campaign is derived from the pod id,
 * so making banners, previewing and promoting the same pod all reuse one link
 * and one set of numbers instead of splitting them.
 */
export interface TrackingLink {
  id: string;
  code: string;
  short_url: string;
  utm_campaign: string;
}

/** `<prefix>-<last 8 of the pod id>`, the frozen utm_campaign of the pod's link. */
export const utmCampaignFor = (prefix: string, podId: string) => `${prefix || 'pod-promo'}-${podId.slice(-8)}`;

const LABEL_MAX = 120;

async function shortUrl(code: string): Promise<string> {
  const { websiteUrl } = await getUrlConfigs();
  return `${websiteUrl.replace(/\/$/, '')}/${code}`;
}

export async function ensureTrackingLink(data: PodBannerData, prefix: string, userId: string | null): Promise<TrackingLink> {
  const utm_campaign = utmCampaignFor(prefix, data.id);
  const existing = await ShortLinkModel.findOne({ utm_campaign, source: 'INSTAGRAM', is_active: true }).select('code utm_campaign').lean<{ _id: unknown; code: string }>();
  if (existing) return { id: String(existing._id), code: existing.code, short_url: await shortUrl(existing.code), utm_campaign };
  const created = await shortLinkService.create(
    { label: `Pod promotion · ${data.title}`.slice(0, LABEL_MAX), destination_url: data.url, source: 'INSTAGRAM', medium: 'SOCIAL' },
    userId
  );
  // The campaign tag is not a stored marketing campaign, so it is set here,
  // before the link has been printed anywhere — frozen from then on like any utm.
  await ShortLinkModel.updateOne({ _id: created.id }, { $set: { utm_campaign } });
  return { id: created.id, code: created.code, short_url: created.short_url, utm_campaign };
}
