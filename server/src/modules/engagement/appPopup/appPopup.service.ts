import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  AppPopupModel,
  AppPopupSeenModel,
  type AppPopupClientPlatform,
  type AppPopupPlatform,
} from './appPopup.model';
import { audienceListService } from '@modules/crm/marketing/audienceList.service';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'cta_label'],
  sortFields: {
    name: 'name',
    start_at: 'start_at',
    end_at: 'end_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    enabled: { type: 'boolean' },
    platform: { type: 'enum' },
    audience_type: { type: 'enum' },
    start_at: { type: 'date' },
    end_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

export interface AppPopupInput {
  name: string;
  image_url: string;
  start_at: string;
  end_at: string;
  enabled?: boolean | null;
  platform?: AppPopupPlatform | null;
  close_button_enabled?: boolean | null;
  cta_label?: string | null;
  cta_url?: string | null;
  audience_type?: 'ALL_USERS' | 'AUDIENCE_LIST' | null;
  audience_list_id?: string | null;
}

const bad = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

const notFound = () => new GraphQLError('Popup not found', { extensions: { code: 'NOT_FOUND' } });

/** A usable ObjectId, or null — a malformed id is never persisted. */
const toObjectId = (raw?: string | null) =>
  raw && Types.ObjectId.isValid(raw) ? new Types.ObjectId(raw) : null;

/** An ISO timestamp as a Date, rejecting the unparseable rather than storing
 * an Invalid Date that would silently never match a window. */
function parseDate(raw: string, label: string): Date {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw bad(`${label} is not a valid date`);
  return date;
}

const toPub = (doc: any) => ({
  id: String(doc._id),
  name: doc.name,
  image_url: doc.image_url,
  start_at: doc.start_at.toISOString(),
  end_at: doc.end_at.toISOString(),
  enabled: doc.enabled,
  platform: doc.platform,
  close_button_enabled: doc.close_button_enabled,
  cta_label: doc.cta_label,
  cta_url: doc.cta_url,
  audience_type: doc.audience_type,
  audience_list_id: doc.audience_list_id ? String(doc.audience_list_id) : null,
  created_at: doc.created_at.toISOString(),
  updated_at: doc.updated_at.toISOString(),
});

/**
 * The stored shape for a create or an update. Validation lives here so both
 * paths enforce the same contract — a popup that fails these rules can never
 * reach a phone, so the window and the audience are checked, not trusted.
 */
function toDoc(input: AppPopupInput) {
  if (!input.name.trim()) throw bad('Name is required');
  if (!input.image_url.trim()) throw bad('Popup image is required');

  const start = parseDate(input.start_at, 'Start date');
  const end = parseDate(input.end_at, 'End date');
  if (end <= start) throw bad('End date must be after the start date');

  const audienceType = input.audience_type ?? 'ALL_USERS';
  const listId = input.audience_list_id ?? '';
  if (audienceType === 'AUDIENCE_LIST' && !Types.ObjectId.isValid(listId)) {
    throw bad('Pick an audience list');
  }

  const ctaUrl = input.cta_url?.trim() ?? '';
  const ctaLabel = input.cta_label?.trim() ?? '';
  if (ctaUrl && !ctaLabel) throw bad('A CTA link needs a button label');

  return {
    name: input.name.trim(),
    image_url: input.image_url.trim(),
    start_at: start,
    end_at: end,
    enabled: input.enabled ?? true,
    platform: input.platform ?? 'BOTH',
    close_button_enabled: input.close_button_enabled ?? true,
    cta_label: ctaLabel,
    cta_url: ctaUrl,
    audience_type: audienceType,
    // Switching back to ALL_USERS must drop the list, or a later switch to
    // AUDIENCE_LIST would silently reuse a segment nobody re-picked.
    audience_list_id: audienceType === 'AUDIENCE_LIST' ? new Types.ObjectId(listId) : null,
  };
}

/** Which stored targets a client is allowed to see. A desktop browser is
 * neither store build, so it only ever gets the popups aimed at everyone. */
function platformTargets(client: AppPopupClientPlatform): AppPopupPlatform[] {
  if (client === 'WEB') return ['BOTH'];
  return ['BOTH', client];
}

export const appPopupService = {
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<any>(
      AppPopupModel,
      {},
      input,
      TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  async create(input: AppPopupInput, createdBy?: string | null) {
    const doc = await AppPopupModel.create({ ...toDoc(input), created_by: toObjectId(createdBy) });
    return toPub(doc);
  },

  async update(id: string, input: AppPopupInput) {
    if (!Types.ObjectId.isValid(id)) throw notFound();
    const doc = await AppPopupModel.findByIdAndUpdate(id, toDoc(input), { new: true });
    if (!doc) throw notFound();
    return toPub(doc);
  },

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw notFound();
    const deleted = await AppPopupModel.findByIdAndDelete(id);
    if (!deleted) throw notFound();
    return true;
  },

  /**
   * The one popup to show this user on app open, or null.
   *
   * Everything cheap is a query condition — the switch, the date window, the
   * platform, and the popups this user already closed. Only the audience-list
   * test needs a second read, so the candidates are walked newest-first and the
   * first match wins: two overlapping campaigns show one popup, not two.
   */
  async activeFor(userId: string, client: AppPopupClientPlatform) {
    if (!Types.ObjectId.isValid(userId)) return null;
    const now = new Date();
    const seen = await AppPopupSeenModel.find({ user_id: new Types.ObjectId(userId) }).select(
      'popup_id'
    );

    const candidates = await AppPopupModel.find({
      enabled: true,
      start_at: { $lte: now },
      end_at: { $gte: now },
      platform: { $in: platformTargets(client) },
      _id: { $nin: seen.map((row: any) => row.popup_id) },
    }).sort({ created_at: -1 });

    for (const doc of candidates) {
      if (doc.audience_type === 'ALL_USERS') return toPub(doc);
      const listId = doc.audience_list_id?.toHexString() ?? '';
      const inList = await audienceListService.matchesUser(listId, userId);
      if (inList) return toPub(doc);
    }
    return null;
  },

  /**
   * Remember that this user closed this popup. Idempotent by the unique index:
   * closing twice (or from two devices) writes the row once.
   */
  async markSeen(userId: string, popupId: string) {
    if (!Types.ObjectId.isValid(popupId)) throw notFound();
    const row = { user_id: new Types.ObjectId(userId), popup_id: new Types.ObjectId(popupId) };
    await AppPopupSeenModel.updateOne(row, { $setOnInsert: row }, { upsert: true });
    return true;
  },
};
