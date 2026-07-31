import * as yup from 'yup';
import { GraphQLError } from 'graphql';
import QRCode from 'qrcode';
import { ShortLinkModel, SHORT_LINK_MEDIUMS, SHORT_LINK_SOURCES, type IShortLink } from './shortLink.model';
import { MarketingCampaignModel } from './marketing.model';
import { buildDestination, generateShortCode, utmSlug } from './shortLink.codes';
import { mediumUtm, shortLinkOptions, sourceUtm } from './shortLink.options';
import { getUrlConfigs } from '@config/url-configs';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

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
  const shortUrl = `${websiteUrl.replace(/\/$/, '')}/${doc.code}`;
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
  async resolve(code: string, now = new Date()) {
    const doc = await ShortLinkModel.findOne({ code, is_active: true }).exec();
    if (!doc) return null;
    await ShortLinkModel.updateOne(
      { _id: doc._id },
      { $inc: { click_count: 1 }, $set: { last_clicked_at: now } },
    ).exec();
    // Filtered so the first click can never be overwritten by a later one.
    await ShortLinkModel.updateOne(
      { _id: doc._id, first_clicked_at: null },
      { $set: { first_clicked_at: now } },
    ).exec();
    return buildDestination(doc.destination_url, {
      code: doc.code,
      utm_source: doc.utm_source,
      utm_medium: doc.utm_medium,
      utm_campaign: doc.utm_campaign,
    });
  },
};
