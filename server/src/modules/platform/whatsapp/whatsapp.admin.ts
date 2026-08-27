import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import {
  isProjectApiConfigured,
  listCampaigns,
  listTemplates,
  needsMedia,
  type AisensyCampaign,
  type AisensyTemplate,
} from '@modules/platform/aisensy/aisensy.project';
import { WA_EVENTS, isRequiredWaCategory } from './whatsapp.events';
import {
  defaultFor,
  defaultKindFor,
  mediaPair,
  type WaDefaultKind,
  type WaDefaults,
} from './whatsapp.media';
import { WaEventSettingModel, WA_GLOBAL_DEFAULT_ENABLED, WA_GLOBAL_KEY } from './waEventSetting.model';

export interface WaDefaultMedia {
  /** The default IMAGE — stored in the global row's override pair, which is the
   * field it has always lived in. */
  url: string;
  filename: string;
  /** The default DOCUMENT, for the FILE-header templates one picture cannot
   * stand in for. */
  document_url: string;
  document_filename: string;
}

type GlobalRowMedia =
  | {
      override_media_url?: string;
      override_media_filename?: string;
      default_document_url?: string;
      default_document_filename?: string;
    }
  | undefined;

/** The global row's own asset pairs, verbatim — see {@link WA_GLOBAL_KEY}. */
const defaultMediaOf = (global: GlobalRowMedia): WaDefaultMedia => ({
  url: global?.override_media_url ?? '',
  filename: global?.override_media_filename ?? '',
  document_url: global?.default_document_url ?? '',
  document_filename: global?.default_document_filename ?? '',
});

/** The same pairs in the shape the send path picks a default from, so the board
 * and the send agree on which header kinds are covered. */
const defaultsOf = (media: WaDefaultMedia): WaDefaults => ({
  IMAGE: mediaPair(media.url, media.filename),
  DOCUMENT: mediaPair(media.document_url, media.document_filename),
});

/** Which pair on the global row each default kind is stored in. The IMAGE
 * default keeps the override pair it was written to before there were kinds, so
 * no already-uploaded asset has to move. */
const DEFAULT_FIELDS: Readonly<Record<WaDefaultKind, { url: string; filename: string }>> = {
  IMAGE: { url: 'override_media_url', filename: 'override_media_filename' },
  DOCUMENT: { url: 'default_document_url', filename: 'default_document_filename' },
};

/**
 * A media link AiSensy could actually fetch, or a blank one that clears the
 * asset.
 *
 * AiSensy fetches it itself at send time, so anything but an absolute public
 * link fails once per recipient — refused here rather than at the first send.
 */
function publicUrlOrThrow(url: string): string {
  const mediaUrl = url.trim();
  if (mediaUrl && !/^https?:\/\/\S+$/i.test(mediaUrl)) {
    throw new GraphQLError('Media URL must be a full public link that starts with http:// or https://', {
      extensions: { code: 'BAD_REQUEST' },
    });
  }
  return mediaUrl;
}
import { WaMessageLogModel } from './waMessageLog.model';

/**
 * What the Admin console reads: every scenario Duncit can send, checked against
 * what AiSensy actually holds right now.
 *
 * The join is the point. A registry row alone cannot tell you the campaign was
 * never created, or is STOPPED, or points at a template that expects seven
 * values while the code sends six — and each of those is a message that fails,
 * or worse, sends with a literal `{{7}}` in it and bills for the privilege.
 */

/** `bulkWrite` will not cast a string id the way `updateOne` does. */
const actorId = (id?: string | null) => (id ? new Types.ObjectId(id) : null);

/** Why this scenario cannot send right now, or '' when it can. */
function blockerFor(
  campaignName: string,
  campaign: AisensyCampaign | undefined,
  template: AisensyTemplate | undefined,
  declaredParams: number,
  cachedMediaUrl: string,
  overrideMediaUrl: string,
  /** The platform defaults, one per header kind an operator can set. */
  defaults: WaDefaults
): string {
  if (!campaign) return `No AiSensy campaign named "${campaignName}"`;
  if (campaign.status && campaign.status !== 'LIVE') return `Campaign is ${campaign.status}`;
  if (!template) return `Campaign points at a template that no longer exists (${campaign.template_name})`;
  if (template.status !== 'APPROVED') return `Template is ${template.status}`;
  if (template.param_count !== declaredParams) {
    return `Template takes ${template.param_count} value(s), the code sends ${declaredParams}`;
  }
  // A campaign that carries media needs no blocker: an unsynced row binds the
  // asset off AiSensy on its first send (`bindCampaignMedia`), so Reconcile is
  // an optimisation rather than something an operator has to remember.
  //
  // A media-header template with NO asset anywhere — not on the campaign (the
  // API cannot attach one), not cached, not set on the row, and no platform
  // default — is the one case nothing can bind, because there is nothing to
  // bind. Only an operator can fix it, and the default is the one-click fix.
  if (!template.needs_media || campaign.media_url || cachedMediaUrl || overrideMediaUrl) return '';
  if (defaultFor(template.header_format, defaults)) return '';
  // A kind the platform holds no default FOR — a video — can only be answered
  // on this row; a kind whose default is merely unset is one upload away.
  const kind = defaultKindFor(template.header_format);
  if (!kind) {
    return `Template needs its own header ${template.header_format.toLowerCase()} — set media on this row`;
  }
  return `Template needs a header ${kind.toLowerCase()} — set the default under Settings, or set media on this row`;
}

/** The live catalogue, or empty when AiSensy cannot be read. Never throws: a
 * refused Project API must still let the console render the registry and say
 * so, rather than showing an error page with no information in it. */
async function catalogue(): Promise<{
  ok: boolean;
  error: string;
  campaigns: Map<string, AisensyCampaign>;
  templates: Map<string, AisensyTemplate>;
}> {
  const empty = { campaigns: new Map(), templates: new Map() };
  if (!(await isProjectApiConfigured())) {
    return { ok: false, error: 'AiSensy Project API is not configured in the Tech portal', ...empty };
  }
  try {
    const [campaigns, templates] = await Promise.all([listCampaigns(), listTemplates()]);
    // A live project holds both. Zero of each is a payload shape this reader did
    // not recognise rather than an empty AiSensy — and taking it at face value
    // would let Reconcile write a blank header kind over all 67 rows and unbind
    // every asset in one button press.
    if (campaigns.length === 0 && templates.length === 0) {
      return { ok: false, error: 'AiSensy returned no campaigns and no templates', ...empty };
    }
    return {
      ok: true,
      error: '',
      campaigns: new Map(campaigns.map((row) => [row.name, row])),
      templates: new Map(templates.map((row) => [row.name, row])),
    };
  } catch (error) {
    logs.server.warn('whatsapp', 'catalogue', { error });
    return { ok: false, error: error instanceof Error ? error.message : 'AiSensy read failed', ...empty };
  }
}

export const whatsappAdminService = {
  /** Every scenario, its switch, and whether AiSensy can actually deliver it. */
  async scenarios() {
    const [live, settings] = await Promise.all([
      catalogue(),
      WaEventSettingModel.find()
        .select(
          'event_key enabled template_category media_url media_filename template_header_format override_media_url override_media_filename default_document_url default_document_filename'
        )
        .lean(),
    ]);
    const byKey = new Map(settings.map((row) => [row.event_key, row]));
    const global = byKey.get(WA_GLOBAL_KEY);
    const defaultMedia = defaultMediaOf(global);
    const defaults = defaultsOf(defaultMedia);

    const rows = WA_EVENTS.map((event) => {
      const campaign = live.campaigns.get(event.campaign);
      const template = campaign ? live.templates.get(campaign.template_name) : undefined;
      const setting = byKey.get(event.key);
      // The row's own cached kind stands in when AiSensy cannot be read — the
      // send path writes it there the moment AiSensy rejects a send for a
      // missing header. Without it a console that lost the Project API reports
      // every media scenario as needing nothing, which is the exact state that
      // hid 52 failing rows behind a green board.
      const headerFormat = template?.header_format || setting?.template_header_format || '';
      return {
        event_key: event.key,
        campaign: event.campaign,
        audience: event.audience,
        category: event.category,
        fires: event.fires,
        params: [...event.params],
        // Absent row means ON — a newly wired scenario works without setup.
        enabled: setting?.enabled ?? true,
        can_disable: !isRequiredWaCategory(event.category),
        campaign_status: campaign?.status ?? '',
        template_name: campaign?.template_name ?? '',
        template_status: template?.status ?? '',
        template_category: template?.category ?? '',
        template_params: template?.param_count ?? 0,
        template_header_format: headerFormat,
        media_url: campaign?.media_url ?? '',
        override_media_url: setting?.override_media_url ?? '',
        override_media_filename: setting?.override_media_filename ?? '',
        needs_media: template?.needs_media ?? needsMedia(headerFormat),
        blocker: live.ok
          ? blockerFor(
              event.campaign,
              campaign,
              template,
              event.params.length,
              setting?.media_url ?? '',
              setting?.override_media_url ?? '',
              defaults
            )
          : '',
      };
    });

    return {
      global_enabled: global?.enabled ?? WA_GLOBAL_DEFAULT_ENABLED,
      default_media_url: defaultMedia.url,
      default_media_filename: defaultMedia.filename,
      default_document_url: defaultMedia.document_url,
      default_document_filename: defaultMedia.document_filename,
      catalogue_ok: live.ok,
      catalogue_error: live.error,
      rows,
    };
  },

  /**
   * The platform default header asset alone — what the Settings tab reads.
   *
   * Separate from `scenarios()` on purpose: that one joins the whole registry
   * against two AiSensy reads, and a settings card that only wants to show one
   * URL must not pay for them.
   */
  async defaultMedia(): Promise<WaDefaultMedia> {
    const global = await WaEventSettingModel.findOne({ event_key: WA_GLOBAL_KEY })
      .select(
        'override_media_url override_media_filename default_document_url default_document_filename'
      )
      .lean();
    return defaultMediaOf(global ?? undefined);
  },

  /**
   * Set or clear (empty url) ONE of the platform default header assets — what
   * every media-header scenario falls back to when neither it nor its campaign
   * carries one.
   *
   * One per header kind, because a single picture cannot stand in for a
   * document header: 54 of this project's templates carry an image header and 5
   * carry a file one, and before there was a document default those five failed
   * every send with `Media URL Missing` and no screen to fix it on.
   */
  async setDefaultMedia(
    kind: WaDefaultKind,
    url: string,
    filename: string,
    actor?: string | null
  ) {
    const mediaUrl = publicUrlOrThrow(url);
    const fields = DEFAULT_FIELDS[kind];
    await WaEventSettingModel.updateOne(
      { event_key: WA_GLOBAL_KEY },
      {
        $set: {
          [fields.url]: mediaUrl,
          // A filename without a url is meaningless, so clearing clears both.
          [fields.filename]: mediaUrl ? filename.trim() : '',
          updated_by: actorId(actor),
        },
        // The schema default for `enabled` is true, which is right for a scenario
        // row (absent means ON) and wrong for the global row (absent means
        // nobody has turned WhatsApp on). Without this, setting a default asset
        // on a fresh database would flip the kill switch on.
        $setOnInsert: { enabled: WA_GLOBAL_DEFAULT_ENABLED },
      },
      { upsert: true }
    );
    return this.scenarios();
  },

  /** Flip one scenario, or the global switch when `event_key` is `__global__`. */
  async setEnabled(eventKey: string, enabled: boolean, actor?: string | null) {
    await WaEventSettingModel.updateOne(
      { event_key: eventKey },
      { $set: { enabled, updated_by: actorId(actor) } },
      { upsert: true }
    );
    return this.scenarios();
  },

  /**
   * Set or clear (empty url) the admin's own header asset for one scenario —
   * or, with `__global__` as the key, the platform DEFAULT every media-header
   * scenario falls back to.
   *
   * It writes ONLY the override pair. The campaign cache (`media_url` /
   * `media_filename`) belongs to reconcile, which overwrites it wholesale on
   * every run — an admin asset stored there would be wiped by the next
   * Reconcile, which is exactly the trap the override pair exists to close.
   */
  async setMedia(eventKey: string, url: string, filename: string, actor?: string | null) {
    // The global row holds the platform DEFAULTS, which are one per header kind
    // and not an override of anything. Delegated rather than refused so each
    // stored pair keeps exactly one writer.
    if (eventKey === WA_GLOBAL_KEY) return this.setDefaultMedia('IMAGE', url, filename, actor);
    const mediaUrl = publicUrlOrThrow(url);
    await WaEventSettingModel.updateOne(
      { event_key: eventKey },
      {
        $set: {
          override_media_url: mediaUrl,
          // A filename without a url is meaningless, so clearing clears both.
          override_media_filename: mediaUrl ? filename.trim() : '',
          updated_by: actorId(actor),
        },
        // Absent means ON for a scenario row, which is the schema default too;
        // stated so a row this creates cannot read as switched off.
        $setOnInsert: { enabled: true },
      },
      { upsert: true }
    );
    return this.scenarios();
  },

  /**
   * Copy each campaign's live Meta category onto its setting row.
   *
   * That category decides the per-message RATE, and reading it from AiSensy on
   * every send would put a network call in front of every domain event. It is
   * refreshed here, deliberately by hand, so the number a message is billed at
   * is one an operator saw.
   */
  async reconcile(actor?: string | null) {
    const live = await catalogue();
    if (!live.ok) return this.scenarios();
    const writes = WA_EVENTS.map((event) => {
      const campaign = live.campaigns.get(event.campaign);
      const template = campaign ? live.templates.get(campaign.template_name) : undefined;
      return {
        updateOne: {
          filter: { event_key: event.key },
          update: {
            $set: {
              template_category: template?.category ?? '',
              // Cached from the CAMPAIGN, not the template: a media campaign
              // rejects a send that omits its asset, and the template reports
              // no header at all. The override pair is deliberately NOT here —
              // it is admin-owned (`setMedia`), and writing the campaign's
              // blank over it is how a custom asset would silently vanish.
              media_url: campaign?.media_url ?? '',
              media_filename: campaign?.media_filename ?? '',
              // The header KIND, because the platform default is one image and
              // the send path cannot ask AiSensy per message.
              template_header_format: template?.header_format ?? '',
              // Stamped so the send path knows a blank asset means "this
              // campaign has none" rather than "nobody has looked yet".
              media_synced_at: new Date(),
              updated_by: actorId(actor),
            },
          },
          upsert: true,
        },
      };
    });
    await WaEventSettingModel.bulkWrite(writes);
    return this.scenarios();
  },

  /**
   * One attempt in full — the detail view behind a row of the merged log.
   *
   * The list itself is `waLogService`, which spans campaign sends too; this
   * reads the fields that list has no column for (the values sent, the id
   * AiSensy returned, how long it took) and so exists only per row.
   */
  async logById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await WaMessageLogModel.findById(id).lean();
    if (!doc) return null;
    return {
      id: String(doc._id),
      event_key: doc.event_key,
      campaign: doc.campaign,
      category: doc.category,
      audience: doc.audience,
      entity_id: doc.entity_id ?? '',
      recipient_user_id: doc.recipient_user_id ? String(doc.recipient_user_id) : null,
      destination: doc.destination ?? '',
      status: doc.status,
      reason: doc.reason ?? '',
      params: doc.params ?? [],
      media_url: doc.media_url ?? '',
      media_filename: doc.media_filename ?? '',
      submitted_message_id: doc.submitted_message_id ?? '',
      template_category: doc.template_category ?? '',
      msg_rate: doc.msg_rate ?? 0,
      duration_ms: doc.duration_ms ?? 0,
      created_at: doc.created_at?.toISOString() ?? null,
    };
  },
};
