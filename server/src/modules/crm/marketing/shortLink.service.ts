import crypto from 'node:crypto';
import * as yup from 'yup';
import { GraphQLError } from 'graphql';
import type { Types } from 'mongoose';
import QRCode from 'qrcode';
import { ShortLinkModel, SHORT_LINK_MEDIUMS, SHORT_LINK_SOURCES, type IShortLink } from './shortLink.model';
import { MarketingCampaignModel } from './marketing.model';
import { buildDestination, generateShortCode, utmSlug } from './shortLink.codes';
import { mediumUtm, shortLinkOptions, sourceUtm } from './shortLink.options';
import {
  resolveShareDestination,
  shareCampaignById,
  shareCampaignFor,
  shareCampaigns,
  shareKey,
  type ShareDestination,
  type ShareLinkTarget,
} from './shortLink.share';
import { getUrlConfigs } from '@config/url-configs';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { shortLinkClickService } from './shortLinkClick.service';

/**
 * Where a short link is allowed to point.
 *
 * duncit.com/<code> carries our own brand. An admin-authored destination is
 * not the classic open-redirect hole (nothing in the REQUEST picks it), but an
 * unrestricted one still lets a compromised or careless marketing account mint
 * duncit.com links that land on someone else's site. Our own properties plus
 * the two app stores cover every real campaign; anything else is refused with
 * a message that says so.
 */
const ALLOWED_HOSTS = new Set(['play.google.com', 'apps.apple.com']);
const isAllowedHost = (host: string) =>
  host === 'duncit.com' || host.endsWith('.duncit.com') || ALLOWED_HOSTS.has(host);

const inputSchema = yup.object({
  label: yup.string().trim().min(3).max(120).required(),
  destination_url: yup.string().trim().required(),
  source: yup.mixed<(typeof SHORT_LINK_SOURCES)[number]>().oneOf([...SHORT_LINK_SOURCES]).required(),
  source_other: yup.string().trim().max(60).nullable(),
  medium: yup.mixed<(typeof SHORT_LINK_MEDIUMS)[number]>().oneOf([...SHORT_LINK_MEDIUMS]).required(),
  medium_other: yup.string().trim().max(60).nullable(),
  campaign_id: yup.string().trim().nullable(),
});

const SHORT_LINK_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['label', 'code', 'destination_url', 'utm_campaign'],
  sortFields: {
    label: 'label',
    code: 'code',
    source: 'source',
    medium: 'medium',
    click_count: 'click_count',
    last_clicked_at: 'last_clicked_at',
    created_at: 'created_at',
  },
  filterFields: {
    source: { type: 'enum' },
    medium: { type: 'enum' },
    campaign_id: { type: 'string' },
    // The console filters by the frozen tag rather than the id: it is what the
    // Campaign column shows, and it is the same value in a link filed under a
    // share campaign and one filed by hand under the same campaign.
    utm_campaign: { type: 'string' },
    share_target: { type: 'enum' },
    is_active: { type: 'boolean' },
    click_count: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

function validateDestination(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new GraphQLError('Destination must be a full URL, including https://', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new GraphQLError('Destination must be an http or https URL', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (!isAllowedHost(url.hostname)) {
    throw new GraphQLError(
      'A duncit.com short link may only point at a Duncit site or an app store listing',
      { extensions: { code: 'BAD_USER_INPUT' } },
    );
  }
  return url.toString();
}

/** A free-text OTHER that slugs to nothing would silently produce
 * `utm_source=` — refuse it rather than emit an untagged link. */
function requireText(value: string, kind: string) {
  if (!value) {
    throw new GraphQLError(`Say what the ${kind} is when you pick Other`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return value;
}

/** The campaign's name, slugged, frozen onto the link at creation. */
async function campaignUtm(campaignId?: string | null) {
  if (!campaignId) return { campaign_id: null, utm_campaign: null };
  // A share campaign is defined by the platform rather than stored, so it is
  // resolved before the database is asked — that is what lets a marketer file
  // a hand-made link under the same campaign the apps mint into.
  const share = shareCampaignById(campaignId);
  if (share) return { campaign_id: share.campaign_id, utm_campaign: share.utm_campaign };
  const campaign = await MarketingCampaignModel.findOne({ campaign_id: campaignId })
    .select('name')
    .lean()
    .exec();
  if (!campaign) {
    throw new GraphQLError('That campaign no longer exists', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return { campaign_id: campaignId, utm_campaign: utmSlug(campaign.name) };
}

/**
 * Codes are random, so a collision is possible in principle. 62^8 with the
 * shape constraint is ~1.7e14, but retrying costs one indexed lookup and
 * removes the question entirely.
 */
/** One counted click on the link document — shared by the redirect and the
 * landing-side visit so both paths move the same numbers the same way. */
async function countClick(id: Types.ObjectId, now: Date) {
  await ShortLinkModel.updateOne(
    { _id: id },
    { $inc: { click_count: 1 }, $set: { last_clicked_at: now } },
  ).exec();
  // Filtered so the first click can never be overwritten by a later one.
  await ShortLinkModel.updateOne(
    { _id: id, first_clicked_at: null },
    { $set: { first_clicked_at: now } },
  ).exec();
}

async function uniqueCode(attempts = 5): Promise<string> {
  for (let i = 0; i < attempts; i += 1) {
    const code = generateShortCode();
    const clash = await ShortLinkModel.exists({ code });
    if (!clash) return code;
  }
  throw new GraphQLError('Could not allocate a short code, please try again', {
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  });
}

async function toPub(doc: IShortLink) {
  const { websiteUrl } = await getUrlConfigs();
  const shortUrl = shortUrlFor(websiteUrl, doc.code);
  return {
    id: doc._id.toHexString(),
    code: doc.code,
    short_url: shortUrl,
    label: doc.label,
    destination_url: doc.destination_url,
    tagged_url: buildDestination(doc.destination_url, {
      code: doc.code,
      utm_source: doc.utm_source,
      utm_medium: doc.utm_medium,
      utm_campaign: doc.utm_campaign,
      share: !!doc.share_target,
    }),
    source: doc.source,
    source_other: doc.source_other ?? null,
    medium: doc.medium,
    medium_other: doc.medium_other ?? null,
    campaign_id: doc.campaign_id ?? null,
    utm_source: doc.utm_source,
    utm_medium: doc.utm_medium,
    utm_campaign: doc.utm_campaign ?? null,
    is_active: doc.is_active,
    click_count: doc.click_count,
    first_clicked_at: doc.first_clicked_at ? doc.first_clicked_at.toISOString() : null,
    last_clicked_at: doc.last_clicked_at ? doc.last_clicked_at.toISOString() : null,
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at.toISOString(),
  };
}

/**
 * What every automatically minted share link is tagged as: a member handing a
 * link to someone they know. The channel it ends up in — WhatsApp, Instagram,
 * a paste into a group chat — is not knowable at share time and is not guessed
 * here; it is read off each click's referrer instead.
 */
const SHARE_SOURCE = 'DIRECT_LINK_SHARE' as const;
const SHARE_MEDIUM = 'REFERRAL' as const;

const shortUrlFor = (websiteUrl: string, code: string) =>
  `${websiteUrl.replace(/\/$/, '')}/${code}`;

/**
 * What a share hands out: the duncit.com link, or — for a link a marketer has
 * retired — the plain destination. Retiring a share link stops it being
 * counted; it must not stop the pod being shareable.
 */
async function shareResult(doc: IShortLink) {
  if (!doc.is_active) return { url: doc.destination_url, code: null };
  const { websiteUrl } = await getUrlConfigs();
  return { url: shortUrlFor(websiteUrl, doc.code), code: doc.code };
}

/**
 * A share link keeps pointing at the thing it names. A club renamed, a pod
 * moved to another venue, a slug changed — the destination stored when the
 * link was first minted would send everyone who follows it somewhere wrong,
 * and unlike a poster campaign nobody would ever go back and fix it.
 *
 * A thing that no longer resolves keeps its last destination: a link already
 * in circulation is better left pointing where it did than blanked.
 */
async function refreshDestination(doc: IShortLink, destination: ShareDestination | null) {
  if (!destination || destination.url === doc.destination_url) return doc;
  doc.destination_url = destination.url;
  doc.label = destination.label;
  await doc.save();
  return doc;
}

async function createShareLink(
  target: ShareLinkTarget,
  key: string,
  destination: ShareDestination,
  userId?: string | null,
) {
  const campaign = shareCampaignFor(target);
  try {
    return await ShortLinkModel.create({
      code: await uniqueCode(),
      label: destination.label,
      // Built by the server from the thing being shared, never sent by the
      // caller, so the destination allow-list a hand-typed link is held to
      // does not apply — a pod venue map legitimately points at Google Maps.
      destination_url: destination.url,
      source: SHARE_SOURCE,
      medium: SHARE_MEDIUM,
      campaign_id: campaign.campaign_id,
      utm_campaign: campaign.utm_campaign,
      utm_source: sourceUtm(SHARE_SOURCE),
      utm_medium: mediumUtm(SHARE_MEDIUM),
      share_target: target,
      share_key: key,
      created_by: userId ?? null,
    });
  } catch (error: any) {
    // Someone shared the same thing a moment earlier and won the unique index.
    // Their link is the link for this thing, so hand that one back.
    if (error?.code === 11000) {
      const raced = await ShortLinkModel.findOne({ share_key: key }).exec();
      if (raced) return raced;
    }
    throw error;
  }
}

export const shortLinkService = {
  options: shortLinkOptions,

  async create(input: any, userId?: string | null) {
    // A rejected yup validate always carries `errors`, so there is nothing to
    // fall back to here.
    const payload = await inputSchema
      .validate(input, { abortEarly: false, stripUnknown: true })
      .catch((e: yup.ValidationError) => {
        throw new GraphQLError(e.errors.join(', '), {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      });
    const destination = validateDestination(payload.destination_url);
    const utm_source = requireText(sourceUtm(payload.source, payload.source_other), 'source');
    const utm_medium = requireText(mediumUtm(payload.medium, payload.medium_other), 'medium');
    const campaign = await campaignUtm(payload.campaign_id);

    const doc = await ShortLinkModel.create({
      code: await uniqueCode(),
      label: payload.label,
      destination_url: destination,
      source: payload.source,
      source_other: payload.source === 'OTHER' ? payload.source_other : null,
      medium: payload.medium,
      medium_other: payload.medium === 'OTHER' ? payload.medium_other : null,
      ...campaign,
      utm_source,
      utm_medium,
      created_by: userId ?? null,
    });
    return toPub(doc);
  },

  /**
   * The tracked link for something being shared out of mWeb or the app.
   *
   * One link per thing shared, reused by everyone who shares it — a pod that
   * three hundred members pass on has one link carrying three hundred shares
   * worth of clicks, which is the number worth reading. A brand new link is
   * minted the first time, under the campaign its target belongs to.
   *
   * Callers pass what they are sharing, never where it should point.
   */
  async share(target: ShareLinkTarget, ref: string, userId?: string | null) {
    const key = shareKey(target, ref);
    const [existing, destination] = await Promise.all([
      ShortLinkModel.findOne({ share_key: key }).exec(),
      resolveShareDestination(target, ref),
    ]);
    if (existing) return shareResult(await refreshDestination(existing, destination));

    if (!destination) {
      throw new GraphQLError('There is nothing to share at that address', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    return shareResult(await createShareLink(target, key, destination, userId));
  },

  /**
   * Every campaign a link can be filed under: the platform's own share
   * campaigns and every marketing campaign. One list, so the console's
   * dropdown and its campaign filter cannot disagree about what exists.
   */
  async campaigns() {
    const share = shareCampaigns().map((campaign) => ({ ...campaign, kind: 'SHARE' as const }));
    const email = await MarketingCampaignModel.find({})
      .select('campaign_id name')
      .sort({ name: 1 })
      .lean()
      .exec();
    return [
      ...share,
      ...email.map((campaign: any) => ({
        campaign_id: campaign.campaign_id,
        name: campaign.name,
        utm_campaign: utmSlug(campaign.name),
        kind: 'EMAIL' as const,
      })),
    ];
  },

  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IShortLink>(
      ShortLinkModel,
      {},
      input,
      SHORT_LINK_TABLE_CONFIG
    );
    return { rows: await Promise.all(docs.map(toPub)), total, page, page_size };
  },

  async byId(id: string) {
    const doc = await ShortLinkModel.findById(id).exec();
    if (!doc) {
      throw new GraphQLError('Short link not found', { extensions: { code: 'NOT_FOUND' } });
    }
    return toPub(doc);
  },

  /** The QR image for a link, as a data URL. Generated server-side because
   * `qrcode` is a server dependency — no client bundle needs to grow for it. */
  async qrDataUrl(id: string) {
    const link = await this.byId(id);
    return QRCode.toDataURL(link.short_url, { width: 512, margin: 1 });
  },

  async setActive(id: string, isActive: boolean) {
    const doc = await ShortLinkModel.findById(id).exec();
    if (!doc) {
      throw new GraphQLError('Short link not found', { extensions: { code: 'NOT_FOUND' } });
    }
    doc.is_active = isActive;
    await doc.save();
    return toPub(doc);
  },

  async remove(id: string) {
    const doc = await ShortLinkModel.findById(id).exec();
    if (!doc) {
      throw new GraphQLError('Short link not found', { extensions: { code: 'NOT_FOUND' } });
    }
    await doc.deleteOne();
    return true;
  },

  /**
   * Resolve a code for the public redirect. Returns null for an unknown or
   * retired code so the caller can 404 instead of guessing a destination.
   */
  async resolve(code: string, now = new Date(), clickId?: string) {
    const doc = await ShortLinkModel.findOne({ code, is_active: true }).exec();
    if (!doc) return null;
    await countClick(doc._id, now);
    return {
      destination: buildDestination(doc.destination_url, {
        code: doc.code,
        utm_source: doc.utm_source,
        utm_medium: doc.utm_medium,
        utm_campaign: doc.utm_campaign,
        click_id: clickId,
        share: !!doc.share_target,
      }),
      shortLinkId: doc._id.toHexString(),
    };
  },

  /**
   * A landing that arrived WITHOUT the redirect — a shared tagged URL, an app
   * that opened the destination directly, a resolver hop that was skipped.
   * The destination page recognised the `dl` code and reported in, so the
   * click is minted here instead: counted on the link, recorded with the
   * landing already stamped, and its id handed back for the visitor's journey.
   */
  async visit(
    code: string,
    meta: {
      referrer?: string | null;
      userAgent?: string | null;
      forwardedFor?: string | null;
      remoteAddress?: string | null;
    },
    now = new Date(),
  ) {
    const doc = await ShortLinkModel.findOne({ code, is_active: true }).exec();
    if (!doc) return null;
    await countClick(doc._id, now);
    const clickId = crypto.randomUUID();
    await shortLinkClickService.record({
      clickId,
      code,
      shortLinkId: doc._id.toHexString(),
      referrer: meta.referrer,
      userAgent: meta.userAgent,
      forwardedFor: meta.forwardedFor,
      remoteAddress: meta.remoteAddress,
      at: now,
      landed: true,
    });
    return clickId;
  },

  /** Aggregated click analytics for one link. */
  stats(id: string) {
    return shortLinkClickService.stats(id);
  },

  /** A page of individual clicks for one link. */
  clicks(id: string, query?: TableQueryInput | null) {
    return shortLinkClickService.table(id, query);
  },
};
