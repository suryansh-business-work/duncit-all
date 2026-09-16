import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  OfficialStatusModel,
  OfficialStatusSeenModel,
  type OfficialStatusMediaType,
  type OfficialStatusScope,
} from './officialStatus.model';
import type { OfficialStatusDTO } from './officialStatus.validator';
import { LocationModel } from '@modules/platform/location/location.model';
import { validateMediaUrl } from '@utils/media';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['title', 'caption'],
  sortFields: {
    title: 'title',
    created_at: 'created_at',
    expires_at: 'expires_at',
  },
  filterFields: {
    title: { type: 'string' },
    scope: { type: 'enum' },
    is_active: { type: 'boolean' },
    created_at: { type: 'date' },
    expires_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const DAY_MS = 24 * 60 * 60 * 1000;

const bad = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

const notFound = () => new GraphQLError('Status not found', { extensions: { code: 'NOT_FOUND' } });

/**
 * What the marketer picked, as the date the rail compares against.
 *
 * The choice itself is never stored: a row that kept "24 hours" would expire
 * 24 hours after every edit, so the deadline is fixed once, here, and the
 * table shows the date rather than the answer that produced it.
 */
function expiresAtFor(expiry: string, custom: string | null | undefined): Date | null {
  if (expiry === 'NEVER') return null;
  if (expiry === 'HOURS_24') return new Date(Date.now() + DAY_MS);
  const raw = (custom ?? '').trim();
  const date = new Date(raw);
  if (!raw || Number.isNaN(date.getTime())) throw bad('Pick a valid expiry date and time');
  if (date.getTime() <= Date.now()) throw bad('The expiry date and time must be in the future');
  return date;
}

/**
 * The chosen cities, checked against the cities that actually exist.
 *
 * A LOCATION status whose city was deleted (or whose id was never real) is
 * published to nobody while still reading as live in the table — so the save
 * is refused instead, at the one moment somebody is there to fix it.
 */
async function resolveLocationIds(raw: readonly string[]): Promise<Types.ObjectId[]> {
  const unique = [...new Set(raw.map(String))].filter((id) => Types.ObjectId.isValid(id));
  if (unique.length === 0) throw bad('Pick at least one city for a city-wide status');
  const found = await LocationModel.countDocuments({ _id: { $in: unique } });
  if (found !== unique.length) throw bad('One of the chosen cities no longer exists');
  return unique.map((id) => new Types.ObjectId(id));
}

/** The stored shape for a create or an update — both paths enforce it. */
async function toDoc(input: OfficialStatusDTO) {
  // yup's oneOf() already refused anything else; its InferType simply does not
  // narrow a string schema to the union the model stores.
  const scope = input.scope as OfficialStatusScope;
  validateMediaUrl(input.media_url, 'media_url');

  return {
    title: input.title,
    media_url: input.media_url,
    media_type: input.media_type as OfficialStatusMediaType,
    caption: input.caption,
    link_url: input.link_url,
    scope,
    // GLOBAL drops the list, so flipping the scope back cannot silently reuse
    // cities nobody re-picked.
    location_ids: scope === 'LOCATION' ? await resolveLocationIds(input.location_ids) : [],
    expires_at: expiresAtFor(input.expiry, input.custom_expires_at),
    is_active: input.is_active,
  };
}

/** Which of these statuses this viewer has already watched. Empty when signed out. */
async function seenIdsFor(
  viewerId: string | null | undefined,
  statusIds: readonly Types.ObjectId[]
): Promise<Set<string>> {
  if (!viewerId || !Types.ObjectId.isValid(viewerId) || statusIds.length === 0) return new Set();
  const rows = await OfficialStatusSeenModel.find({
    user_id: new Types.ObjectId(viewerId),
    status_doc_id: { $in: statusIds },
  })
    .select('status_doc_id')
    .lean();
  return new Set(rows.map((row: any) => String(row.status_doc_id)));
}

/**
 * The API shape.
 *
 * `location_names`, `view_count` and `created_by` are deliberately absent:
 * they cost a second read each and only the Marketing table asks for them, so
 * the resolver resolves them per field rather than making the apps' rail pay
 * for three lookups it never renders. `created_by_id` is what that field
 * resolver reads — it is not part of the GraphQL type.
 */
const toPub = (doc: any, seen: ReadonlySet<string>) => {
  const id = String(doc._id);
  const expiresAt: Date | null = doc.expires_at ?? null;
  return {
    id,
    title: doc.title,
    media_url: doc.media_url,
    media_type: doc.media_type,
    caption: doc.caption ?? '',
    link_url: doc.link_url ?? '',
    scope: doc.scope,
    location_ids: (doc.location_ids ?? []).map(String),
    expires_at: expiresAt ? expiresAt.toISOString() : null,
    is_active: doc.is_active,
    is_live: Boolean(doc.is_active) && (!expiresAt || expiresAt > new Date()),
    seen_by_me: seen.has(id),
    created_by_id: doc.created_by ? String(doc.created_by) : '',
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at.toISOString(),
  };
};

export const officialStatusService = {
  /** Marketing > Status. Every row, expired ones included — this is where an
   * expired status is reviewed and switched back on. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<any>(
      OfficialStatusModel,
      {},
      input,
      TABLE_CONFIG
    );
    return { rows: docs.map((doc) => toPub(doc, new Set<string>())), total, page, page_size };
  },

  async create(input: OfficialStatusDTO, createdBy?: string | null) {
    const created_by = createdBy && Types.ObjectId.isValid(createdBy) ? createdBy : null;
    const doc = await OfficialStatusModel.create({ ...(await toDoc(input)), created_by });
    return toPub(doc, new Set<string>());
  },

  async update(id: string, input: OfficialStatusDTO) {
    if (!Types.ObjectId.isValid(id)) throw notFound();
    const doc = await OfficialStatusModel.findByIdAndUpdate(id, await toDoc(input), { new: true });
    if (!doc) throw notFound();
    return toPub(doc, new Set<string>());
  },

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw notFound();
    const deleted = await OfficialStatusModel.findByIdAndDelete(id);
    if (!deleted) throw notFound();
    // The watch rows have nothing left to point at, and one row per viewer per
    // status is exactly the kind of orphan that grows without ever being read.
    await OfficialStatusSeenModel.deleteMany({ status_doc_id: deleted._id });
    return true;
  },

  /**
   * What the apps' rail shows, newest first.
   *
   * The expiry is a query condition rather than a sweep, so a status leaves
   * the rail the second it lapses. `expires_at: null` is the never case and
   * matches on its own. Signing in only adds the seen flags — the list itself
   * is the same for everybody browsing one city, and a signed-out viewer gets
   * it with every ring unseen.
   */
  async liveFor(locationDocId?: string | null, viewerId?: string | null) {
    const now = new Date();
    const audience: Record<string, unknown>[] = [{ scope: 'GLOBAL' }];
    if (locationDocId && Types.ObjectId.isValid(locationDocId)) {
      audience.push({ scope: 'LOCATION', location_ids: new Types.ObjectId(locationDocId) });
    }

    const docs = await OfficialStatusModel.find({
      is_active: true,
      $and: [{ $or: [{ expires_at: null }, { expires_at: { $gt: now } }] }, { $or: audience }],
    }).sort({ created_at: -1 });

    const seen = await seenIdsFor(
      viewerId,
      docs.map((doc) => doc._id)
    );
    return docs.map((doc) => toPub(doc, seen));
  },

  /**
   * Remember that this user watched this slide. Idempotent by the unique
   * index: a rail that reports the same slide twice writes the row once, so
   * `view_count` stays people rather than replays.
   */
  async markSeen(userId: string, statusId: string) {
    if (!Types.ObjectId.isValid(statusId)) throw notFound();
    const row = {
      user_id: new Types.ObjectId(userId),
      status_doc_id: new Types.ObjectId(statusId),
    };
    await OfficialStatusSeenModel.updateOne(row, { $setOnInsert: row }, { upsert: true });
    return true;
  },

  /** How many people have watched one status. */
  viewCount(statusId: string) {
    if (!Types.ObjectId.isValid(statusId)) return Promise.resolve(0);
    return OfficialStatusSeenModel.countDocuments({ status_doc_id: new Types.ObjectId(statusId) });
  },

  /** The chosen cities by name, in the order they were saved. A city deleted
   * since the save drops out rather than rendering as a blank chip. */
  async locationNames(ids: readonly string[]): Promise<string[]> {
    const valid = ids.filter((id) => Types.ObjectId.isValid(id));
    if (valid.length === 0) return [];
    const docs: any[] = await LocationModel.find({ _id: { $in: valid } })
      .select('location_name')
      .lean();
    const byId = new Map(docs.map((doc) => [String(doc._id), String(doc.location_name ?? '')]));
    return valid.map((id) => byId.get(id) ?? '').filter(Boolean);
  },
};
