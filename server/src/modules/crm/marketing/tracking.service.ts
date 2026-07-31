import { MarketingCampaignModel, type TrackedLinkKind } from './marketing.model';

/** A 1×1 transparent GIF — the smallest thing a mail client will fetch. */
export const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

const trimSlashes = (url: string) => {
  let out = url;
  while (out.endsWith('/')) out = out.slice(0, -1);
  return out;
};

/**
 * What kind of thing a link is, from the markup around it.
 *
 * MJML renders `<mj-button>` as an anchor carrying `display:inline-block` —
 * that inline style IS the button, so it is the only signal available in the
 * output. Anything whose destination mentions unsubscribing is counted as
 * such, so an opt-out never reads as ordinary engagement.
 */
function linkKind(anchorTag: string, url: string): TrackedLinkKind {
  if (/unsubscribe|opt[-_]?out/i.test(url)) return 'UNSUBSCRIBE';
  if (anchorTag.includes('display:inline-block')) return 'CTA';
  return 'LINK';
}

interface Instrumented {
  html: string;
  links: { url: string; kind: TrackedLinkKind }[];
  images: { url: string }[];
}

/**
 * Turns a rendered campaign into a tracked one.
 *
 * Every http(s) link becomes a redirect through this server, every remote
 * image becomes a redirect too, and an open pixel is appended. Proxying the
 * real images matters as much as the pixel does: a 1×1 hidden image is the
 * first thing a mail client blocks, while the pictures the recipient actually
 * wanted to see are the first thing it loads — so the content images are the
 * open signal that survives.
 *
 * Both redirects take an INDEX, never a destination. The campaign stores the
 * URL tables and the endpoints resolve against them; a `?url=` parameter would
 * turn this domain into an open redirect anyone could aim at a phishing page.
 */
export function instrumentCampaignHtml(
  html: string,
  campaignId: string,
  serverUrl: string,
): Instrumented {
  const links: Instrumented['links'] = [];
  const images: Instrumented['images'] = [];
  const base = trimSlashes(serverUrl);

  const withLinks = html.replaceAll(/<a\b[^>]*>/gi, (tag: string) => {
    const href = /href="(https?:\/\/[^"]+)"/i.exec(tag);
    if (!href) return tag;
    const url = href[1];
    const existing = links.findIndex((link) => link.url === url);
    const index = existing === -1 ? links.push({ url, kind: linkKind(tag, url) }) - 1 : existing;
    return tag.replace(href[0], `href="${base}/t/c/${campaignId}/${index}"`);
  });

  const withImages = withLinks.replaceAll(/<img\b[^>]*>/gi, (tag: string) => {
    const src = /src="(https?:\/\/[^"]+)"/i.exec(tag);
    if (!src) return tag;
    const url = src[1];
    const existing = images.findIndex((image) => image.url === url);
    const index = existing === -1 ? images.push({ url }) - 1 : existing;
    return tag.replace(src[0], `src="${base}/t/i/${campaignId}/${index}"`);
  });

  // Deliberately NOT display:none — several clients skip loading hidden
  // images, which is the usual reason a campaign reports clicks but no opens.
  const pixel = `<img src="${base}/t/o/${campaignId}" width="1" height="1" alt="" style="border:0;width:1px;height:1px;max-height:1px;overflow:hidden;" />`;
  return { html: withImages.replace('</body>', `${pixel}</body>`), links, images };
}

/**
 * Stamp the first open, once and only once.
 *
 * The filter does the work: only a campaign whose `first_opened_at` is still
 * unset matches, so a later open cannot overwrite it. (`$min` looks like the
 * obvious operator here and is wrong — Mongo orders null below every date, so
 * `$min` against an unset field keeps the null forever.)
 */
async function stampFirstOpen(campaignId: string, now: Date) {
  await MarketingCampaignModel.updateOne(
    { campaign_id: campaignId, first_opened_at: null },
    { $set: { first_opened_at: now } },
  ).exec();
}

export const campaignTrackingService = {
  /** The pixel loaded. Counts every load, so a recipient who reads the mail
   * twice counts twice — this is a total, not a headcount. */
  async recordOpen(campaignId: string, now = new Date()) {
    await MarketingCampaignModel.updateOne(
      { campaign_id: campaignId },
      { $inc: { open_count: 1 }, $set: { last_opened_at: now } },
    ).exec();
    await stampFirstOpen(campaignId, now);
  },

  /**
   * A tracked image was fetched. Counted per image, and it also stamps the
   * open times: loading a picture from the email is proof somebody opened it,
   * even when the pixel never made it through. It deliberately does NOT
   * increment open_count — a five-image email would otherwise report five
   * opens for one read.
   */
  async recordImageLoad(campaignId: string, index: number, now = new Date()) {
    const doc = await MarketingCampaignModel.findOne({ campaign_id: campaignId }).exec();
    const image = doc?.tracked_images[index];
    if (!image) return null;
    await MarketingCampaignModel.updateOne(
      { campaign_id: campaignId },
      {
        $inc: { image_load_count: 1, [`tracked_images.${index}.load_count`]: 1 },
        $set: { last_opened_at: now },
      },
    ).exec();
    await stampFirstOpen(campaignId, now);
    return image.url;
  },

  /** The destination behind a tracked link, counted on the way through.
   * Returns null for a campaign or index that does not exist, so the caller
   * can 404 rather than redirect somewhere arbitrary. */
  async resolveClick(campaignId: string, index: number, now = new Date()) {
    const doc = await MarketingCampaignModel.findOne({ campaign_id: campaignId }).exec();
    const link = doc?.tracked_links[index];
    if (!link) return null;
    // A click proves an open even more firmly than an image load does.
    await MarketingCampaignModel.updateOne(
      { campaign_id: campaignId },
      {
        $inc: { click_count: 1, [`tracked_links.${index}.click_count`]: 1 },
        $set: { last_opened_at: now },
      },
    ).exec();
    await stampFirstOpen(campaignId, now);
    return link.url;
  },
};
