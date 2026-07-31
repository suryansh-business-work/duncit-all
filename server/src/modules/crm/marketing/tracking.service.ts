import { MarketingCampaignModel } from './marketing.model';

/** A 1×1 transparent GIF — the smallest thing a mail client will fetch. */
export const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

const trimSlashes = (url: string) => url.replace(/\/+$/, '');

/**
 * Turns a rendered campaign into a tracked one: every http(s) link becomes a
 * redirect through this server, and an invisible pixel is appended so opening
 * the email registers.
 *
 * The redirect takes an INDEX, never a destination — the campaign stores the
 * URLs and the endpoint resolves against that list. A `?url=` parameter would
 * turn the domain into an open redirect anyone could aim at a phishing page.
 */
export function instrumentCampaignHtml(html: string, campaignId: string, serverUrl: string) {
  const links: string[] = [];
  const base = trimSlashes(serverUrl);
  const tracked = html.replaceAll(/href="(https?:\/\/[^"]+)"/gi, (_match, url: string) => {
    const existing = links.indexOf(url);
    const index = existing === -1 ? links.push(url) - 1 : existing;
    return `href="${base}/t/c/${campaignId}/${index}"`;
  });
  const pixel = `<img src="${base}/t/o/${campaignId}" width="1" height="1" alt="" style="display:none" />`;
  return { html: tracked.replace('</body>', `${pixel}</body>`), links };
}

export const campaignTrackingService = {
  /** One more view of this campaign. Counts every open, so a recipient who
   * reads the mail twice counts twice — this is a total, not a headcount. */
  async recordOpen(campaignId: string) {
    await MarketingCampaignModel.updateOne(
      { campaign_id: campaignId },
      { $inc: { open_count: 1 } },
    ).exec();
  },

  /** The destination behind a tracked link, counted on the way through.
   * Returns null for a campaign or index that does not exist, so the caller
   * can 404 rather than redirect somewhere arbitrary. */
  async resolveClick(campaignId: string, index: number) {
    const doc = await MarketingCampaignModel.findOne({ campaign_id: campaignId }).exec();
    const url = doc?.tracked_links[index];
    if (!url) return null;
    await MarketingCampaignModel.updateOne(
      { campaign_id: campaignId },
      { $inc: { click_count: 1 } },
    ).exec();
    return url;
  },
};
