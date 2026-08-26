import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import {
  isProjectApiConfigured,
  listCampaigns,
  listTemplates,
  type AisensyCampaign,
  type AisensyTemplate,
} from '@modules/platform/aisensy/aisensy.project';
import { WA_EVENTS, isRequiredWaCategory } from './whatsapp.events';
import { WaEventSettingModel, WA_GLOBAL_DEFAULT_ENABLED, WA_GLOBAL_KEY } from './waEventSetting.model';
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
  overrideMediaUrl: string
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
  // API cannot attach one), not cached, not set by an admin — is the one case
  // nothing can bind, because there is nothing to bind. Only an operator can
  // fix it.
  if (template.needs_media && !campaign.media_url && !cachedMediaUrl && !overrideMediaUrl) {
    return 'Template needs a header asset — set media on this row, or attach it to the campaign in the AiSensy console';
  }
  return '';
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
        .select('event_key enabled template_category media_url media_filename override_media_url override_media_filename')
        .lean(),
    ]);
    const byKey = new Map(settings.map((row) => [row.event_key, row]));
    const global = byKey.get(WA_GLOBAL_KEY);

    const rows = WA_EVENTS.map((event) => {
      const campaign = live.campaigns.get(event.campaign);
      const template = campaign ? live.templates.get(campaign.template_name) : undefined;
      const setting = byKey.get(event.key);
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
        media_url: campaign?.media_url ?? '',
        override_media_url: setting?.override_media_url ?? '',
        override_media_filename: setting?.override_media_filename ?? '',
        needs_media: template?.needs_media ?? false,
        blocker: live.ok
          ? blockerFor(
              event.campaign,
              campaign,
              template,
              event.params.length,
              setting?.media_url ?? '',
              setting?.override_media_url ?? ''
            )
          : '',
      };
    });

    return {
      global_enabled: global?.enabled ?? WA_GLOBAL_DEFAULT_ENABLED,
      catalogue_ok: live.ok,
      catalogue_error: live.error,
      rows,
    };
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
   * Set or clear (empty url) the admin's own header asset for one scenario.
   *
   * It writes ONLY the override pair. The campaign cache (`media_url` /
   * `media_filename`) belongs to reconcile, which overwrites it wholesale on
   * every run — an admin asset stored there would be wiped by the next
   * Reconcile, which is exactly the trap the override pair exists to close.
   */
  async setMedia(eventKey: string, url: string, filename: string, actor?: string | null) {
    const mediaUrl = url.trim();
    // AiSensy fetches the asset itself at send time, so anything but an
    // absolute public link fails once per recipient — refuse it here rather
    // than at the first send.
    if (mediaUrl && !/^https?:\/\/\S+$/i.test(mediaUrl)) {
      throw new GraphQLError('Media URL must be a full public link that starts with http:// or https://', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    await WaEventSettingModel.updateOne(
      { event_key: eventKey },
      {
        $set: {
          override_media_url: mediaUrl,
          // A filename without a url is meaningless, so clearing clears both.
          override_media_filename: mediaUrl ? filename.trim() : '',
          updated_by: actorId(actor),
        },
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
