import mongoose, { Schema, type Types } from 'mongoose';

/**
 * The admin switches: one row per scenario, plus a single global one.
 *
 * The CATALOGUE is code (`whatsapp.events.ts`) and only the STATE is stored, so
 * a scenario works the moment it is wired without anybody having to create a
 * row first, and a scenario deleted from the registry stops sending even if its
 * row survives. An absent row means ON — the same "absent document = default"
 * trick `MailPreference` uses, which keeps the send-path lookup to one query
 * over a handful of rows.
 */
export interface IWaEventSetting {
  _id: Types.ObjectId;
  /** The registry key. `__global__` is the kill switch (see GLOBAL_KEY). */
  event_key: string;
  enabled: boolean;
  /**
   * Meta's category for the campaign's template, refreshed by the console's
   * reconcile. Cached here because it decides the per-message RATE, and reading
   * it from AiSensy on every send would put a network call in front of every
   * domain event.
   */
  template_category: string;
  /**
   * The header asset the campaign was built with, cached from the same
   * reconcile.
   *
   * A media campaign REJECTS a send that omits it — `Media URL Missing (HTTP
   * 400)` — and the requirement is invisible on the template, which reports no
   * header at all. Caching it here means the send path can satisfy the campaign
   * without a Project API call in front of every domain event, and a caller
   * with a better asset (this pod's own image) can still override it.
   *
   * RECONCILE-OWNED: every reconcile overwrites this pair wholesale with
   * whatever the campaign holds — including blank. Nothing an admin types may
   * ever land here, or the next Reconcile silently wipes it.
   */
  media_url: string;
  media_filename: string;
  /**
   * The header asset an ADMIN set for this scenario in the console.
   *
   * ADMIN-OWNED: written only by `setMedia`, NEVER touched by reconcile — the
   * whole reason it is a second pair rather than a write into the cache above.
   * The send path prefers it over the campaign cache; an empty url means no
   * override.
   */
  override_media_url: string;
  override_media_filename: string;
  updated_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * The one row that is not a scenario. Stored in the same collection rather than
 * its own singleton so the send path reads ONE collection: a second collection
 * would mean a second round trip in front of every message.
 */
export const WA_GLOBAL_KEY = '__global__';

const waEventSettingSchema = new Schema<IWaEventSetting>(
  {
    event_key: { type: String, required: true, unique: true, trim: true },
    enabled: { type: Boolean, default: true },
    template_category: { type: String, default: '' },
    media_url: { type: String, default: '' },
    media_filename: { type: String, default: '' },
    override_media_url: { type: String, default: '' },
    override_media_filename: { type: String, default: '' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const WaEventSettingModel =
  (mongoose.models.WaEventSetting as mongoose.Model<IWaEventSetting>) ||
  mongoose.model<IWaEventSetting>('WaEventSetting', waEventSettingSchema);

/**
 * Automatic WhatsApp starts OFF.
 *
 * 67 scenarios wired at once against a catalogue nobody has reconciled yet is a
 * bill and an apology. The global row is seeded disabled on first read; turning
 * it on is a deliberate act in the console.
 */
export const WA_GLOBAL_DEFAULT_ENABLED = false;
