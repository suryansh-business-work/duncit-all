import crypto from 'node:crypto';
import { z } from 'zod';
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
import { classifyDestination, isDuncitHost } from './shortLink.destination';
import { shortLinkPolicyService } from './shortLinkPolicy.service';
import { metaOverrideFrom, NO_META_OVERRIDE, type StoredMetaOverride } from './shortLink.meta';
import { destinationMeta, type DestinationMeta, type MetaOverride } from './shortLink.preview';

/** The ShortLinkUpdateInput GraphQL input. */
export interface ShortLinkUpdateInput extends MetaOverride {
  label: string;
  destination_url: string;
}
import type { ConsentSignal } from './shortLinkClick.model';
import { filled, maxLen, messagesOf, minLen, mixed, obj, shape, str, trim } from '@utils/zod-fields';

const optionalTrimmed = (...checks: z.core.$ZodCheck<string>[]) =>
  str(z.string().check(...checks).nullable().optional(), { transforms: [trim] });

const labelField = str(z.string().check(minLen(3), maxLen(120), filled()), { required: true, transforms: [trim] });
const destinationField = str(z.string().check(filled()), { required: true, transforms: [trim] });

const inputSchema = obj(
  shape({
    label: labelField,
    destination_url: destinationField,
    source: mixed(z.enum(SHORT_LINK_SOURCES), { oneOf: SHORT_LINK_SOURCES, required: true }),
    source_other: optionalTrimmed(maxLen(60)),
    medium: mixed(z.enum(SHORT_LINK_MEDIUMS), { oneOf: SHORT_LINK_MEDIUMS, required: true }),
    medium_other: optionalTrimmed(maxLen(60)),
    campaign_id: optionalTrimmed(),
  })
);

/** What an edit may change: the name, where it goes and its preview card.
 * The utm tags stay frozen — a link already printed keeps its attribution. */
const updateSchema = obj(shape({ label: labelField, destination_url: destinationField }));

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

const NO_DESTINATION_META: DestinationMeta = {
  title: null,
  description: null,
  image_url: null,
  site_name: null,
};

const SHORT_LINK_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['label', 'code', 'destination_url', 'utm_campaign'],
  sortFields: {
    label: 'label',
    code: 'code',
    source: 'source',
    medium: 'medium',
    utm_campaign: 'utm_campaign',
    click_count: 'click_count',
    last_clicked_at: 'last_clicked_at',
    is_active: 'is_active',
    created_at: 'created_at',
  },
  filterFields: {
    label: { type: 'string' },
    source: { type: 'enum' },
    medium: { type: 'enum' },
    campaign_id: { type: 'string' },
    // The console filters by the frozen tag rather than the id: it is what the
    // Campaign column shows, and it is the same value in a link filed under a
    // share campaign and one filed by hand under the same campaign.
    utm_campaign: { type: 'enum' },
    share_target: { type: 'enum' },
    // What the External Links page filters on: a link pointing somewhere that
    // is not ours is a different thing to manage, even though it is the same
    // row in the same table.
    is_external: { type: 'boolean' },
    is_active: { type: 'boolean' },
    click_count: { type: 'number' },
    last_clicked_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

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
      external: !!doc.is_external,
    }),
    source: doc.source,
    source_other: doc.source_other ?? null,
    medium: doc.medium,
    medium_other: doc.medium_other ?? null,
    campaign_id: doc.campaign_id ?? null,
    utm_source: doc.utm_source,
    utm_medium: doc.utm_medium,
    utm_campaign: doc.utm_campaign ?? null,
    is_external: !!doc.is_external,
    share_target: doc.share_target ?? null,
    meta_override_enabled: !!doc.meta_override_enabled,
    meta_title: doc.meta_title ?? null,
    meta_description: doc.meta_description ?? null,
    meta_image_url: doc.meta_image_url ?? null,
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

/**
 * Whether a destination the SERVER built points off our own properties — the
 * venue map a shared pod carries is the one that does. Never throws: this URL
 * was not typed by anyone, so there is nothing to refuse, only to classify.
 */
function isExternalUrl(raw: string): boolean {
  try {
    return !isDuncitHost(new URL(raw).hostname.toLowerCase());
  } catch {
    return false;
  }
}

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
  // Re-derived with the URL rather than left as it was: a pod that moves to a
  // venue we do not host turns its map link external, and the flag is what the
  // External Links page and the dl/dlc tagging both read.
  doc.is_external = isExternalUrl(destination.url);
  doc.label = destination.label;
  await doc.save();
  return doc;
}

/**
 * Validate a new destination for an existing link and set it. Refused for a
 * share link and for a change of class (Duncit <-> external) — see update().
 */
async function applyDestination(doc: IShortLink, raw: string) {
  const { blocked_domains } = await shortLinkPolicyService.rules();
  const destination = classifyDestination(raw, blocked_domains);
  if (destination.url === doc.destination_url) return;
  if (doc.share_target) {
    throw badInput('A shared link follows the thing it was made for, so its destination cannot be changed');
  }
  if (destination.is_external !== !!doc.is_external) {
    throw badInput(
      doc.is_external
        ? 'This is an external link — a Duncit destination belongs on the Short Links page'
        : 'This is a Duncit short link — an outside destination belongs on the External Links page',
    );
  }
  doc.destination_url = destination.url;
}

/** The override an edit stores: what it sent, or — when the link moved and it
 * sent nothing — none at all. Null leaves the stored override as it is. */
function overrideForUpdate(input: MetaOverride, moved: boolean): StoredMetaOverride | null {
  if (typeof input.meta_override_enabled === 'boolean') return metaOverrideFrom(input);
  return moved ? NO_META_OVERRIDE : null;
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
      is_external: isExternalUrl(destination.url),
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
    const parsed = await inputSchema.safeParseAsync(input);
    if (!parsed.success) {
      throw new GraphQLError(messagesOf(parsed.error).join(', '), {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const payload = parsed.data;
    const { blocked_domains } = await shortLinkPolicyService.rules();
    const destination = classifyDestination(payload.destination_url, blocked_domains);
    const utm_source = requireText(sourceUtm(payload.source, payload.source_other), 'source');
    const utm_medium = requireText(mediumUtm(payload.medium, payload.medium_other), 'medium');
    const campaign = await campaignUtm(payload.campaign_id);

    const doc = await ShortLinkModel.create({
      code: await uniqueCode(),
      label: payload.label,
      destination_url: destination.url,
      is_external: destination.is_external,
      source: payload.source,
      source_other: payload.source === 'OTHER' ? payload.source_other : null,
      medium: payload.medium,
      medium_other: payload.medium === 'OTHER' ? payload.medium_other : null,
      ...campaign,
      utm_source,
      utm_medium,
      ...metaOverrideFrom(input),
      created_by: userId ?? null,
    });
    return toPub(doc);
  },

  /**
   * Re-point a link, rename it, or change its preview card.
   *
   * A link stays on the page it was made on: one to a Duncit site cannot be
   * turned into an external one (or back), because the two are tagged and
   * measured differently. A share link's destination is not editable at all —
   * it follows the thing it was minted for and would be re-pointed on the
   * next share anyway.
   *
   * Moving a link without sending an override clears the old one: a card
   * forced for the previous destination must never go on describing the new.
   */
  async update(id: string, input: ShortLinkUpdateInput) {
    const parsed = await updateSchema.safeParseAsync(input);
    if (!parsed.success) throw badInput(messagesOf(parsed.error).join(', '));
    const doc = await ShortLinkModel.findById(id).exec();
    if (!doc) {
      throw new GraphQLError('Short link not found', { extensions: { code: 'NOT_FOUND' } });
    }
    const moved = parsed.data.destination_url !== doc.destination_url;
    if (moved) await applyDestination(doc, parsed.data.destination_url);
    doc.label = parsed.data.label;
    const override = overrideForUpdate(input, doc.isModified('destination_url'));
    if (override) Object.assign(doc, override);
    await doc.save();
    return toPub(doc);
  },

  /**
   * The card a destination would get with no override — what the console
   * loads under the destination field so the marketer sees it before forcing
   * anything. The same function the crawler card is built from, so what is
   * shown here is what an unfurler gets.
   */
  async previewDestination(raw: string): Promise<DestinationMeta> {
    const { blocked_domains } = await shortLinkPolicyService.rules();
    const { url } = classifyDestination(raw, blocked_domains);
    return (await destinationMeta(url, { readPage: true })) ?? NO_DESTINATION_META;
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
   * The link already minted for a share, or null — read-only, so a page that
   * only shows a link's numbers never mints one as a side effect.
   */
  async existingShare(target: ShareLinkTarget, ref: string) {
    const doc = await ShortLinkModel.findOne({ share_key: shareKey(target, ref) }).exec();
    if (!doc) return null;
    return { id: doc._id.toHexString(), ...(await shareResult(doc)) };
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
   * The destination WITHOUT counting a click — what a link-preview crawler is
   * answered from. An unfurler fetches every link that passes through a chat,
   * so counting those would report an audience that was never there.
   */
  async peek(code: string) {
    const doc = await ShortLinkModel.findOne({ code, is_active: true }).lean().exec();
    if (!doc) return null;
    const destination = buildDestination(doc.destination_url, {
      code: doc.code,
      utm_source: doc.utm_source,
      utm_medium: doc.utm_medium,
      utm_campaign: doc.utm_campaign,
      share: !!doc.share_target,
      external: !!doc.is_external,
    });
    return { destination, link: doc };
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
        external: !!doc.is_external,
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
      consentSignal?: ConsentSignal | null;
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
      consentSignal: meta.consentSignal ?? null,
      at: now,
      landed: true,
    });
    return clickId;
  },

  /**
   * Aggregated click analytics for one link. `days` of 0 — the default — is
   * all time, which is the number the link's own lifetime counter shows.
   */
  stats(id: string, days = 0) {
    return shortLinkClickService.stats(id, days);
  },

  /**
   * Answer an erasure request for one link: every click row goes, the link
   * and its lifetime count stay. Returns how many rows were removed, so the
   * console can say what it did rather than only that it did something.
   */
  async eraseClicks(id: string) {
    await this.byId(id);
    return shortLinkClickService.erase(id);
  },

  /** A page of individual clicks for one link. */
  clicks(id: string, query?: TableQueryInput | null) {
    return shortLinkClickService.table(id, query);
  },
};
