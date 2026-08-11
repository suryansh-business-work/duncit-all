import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { AudienceListModel } from './audienceList.model';
import { audienceMatchesUser, audienceUserIds, countAudience } from './audience.service';
import { UserModel } from '@modules/access/user/user.model';
import { PORTAL_ROLE_REQUIREMENTS } from '@modules/portals';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const LIST_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'description', 'owner'],
  sortFields: {
    name: 'name',
    owner: 'owner',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    owner: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

export interface AudienceListInput {
  name: string;
  description?: string | null;
  owner: string;
  owner_user_id?: string | null;
  filters?: { field: string; op: string; value?: string | null; values?: string[] | null }[] | null;
  search?: string | null;
}

/** A usable ObjectId, or null — a malformed id is never persisted. */
const toObjectId = (raw?: string | null) =>
  raw && Types.ObjectId.isValid(raw) ? new Types.ObjectId(raw) : null;

const notFound = () =>
  new GraphQLError('Audience list not found', { extensions: { code: 'NOT_FOUND' } });

const bad = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/**
 * The stored criteria as the shape the audience query expects. Every field the
 * mappers touch has a schema default, so no `??` guards here — the only real
 * conversion is a stored null `value` back to `undefined`, which is what the
 * shared filter engine treats as "not supplied".
 */
const toQueryInput = (doc: any): TableQueryInput => ({
  search: doc.search,
  filters: doc.filters.map((f: any) => ({
    field: f.field,
    op: f.op,
    value: f.value ?? undefined,
    values: f.values,
  })),
});

const toPub = (doc: any, memberCount: number) => ({
  id: String(doc._id),
  name: doc.name,
  description: doc.description,
  owner: doc.owner,
  owner_user_id: doc.owner_user_id ? String(doc.owner_user_id) : null,
  filters: doc.filters.map((f: any) => ({
    field: f.field,
    op: f.op,
    value: f.value,
    values: f.values,
  })),
  search: doc.search,
  member_count: memberCount,
  created_at: doc.created_at.toISOString(),
  updated_at: doc.updated_at.toISOString(),
});

function assertInput(input: AudienceListInput) {
  if (!input.name.trim()) throw bad('List name is required');
  if (!input.owner.trim()) throw bad('List owner is required');
}

/** Counting is one query per list. The lists page is small (a page of 25), but
 * this is the thing to revisit first if it ever gets big. */
const withCounts = (docs: any[]) =>
  Promise.all(docs.map(async (doc) => toPub(doc, await countAudience(toQueryInput(doc)))));

export const audienceListService = {
  /**
   * Who a list can be assigned to: everybody who can actually open this portal.
   * Derived from the same PORTAL_ROLE_REQUIREMENTS map the login gate uses (plus
   * SUPER_ADMIN, which passes every portal), so the picker cannot drift from
   * who really has access.
   */
  async ownerOptions() {
    const roles = [...PORTAL_ROLE_REQUIREMENTS.marketing, 'SUPER_ADMIN'];
    const users = await UserModel.find({
      'metadata.role_keys': { $in: roles },
      'metadata.deleted_at': null,
    })
      .select('profile.first_name profile.last_name auth.email metadata.role_keys')
      .sort({ 'profile.first_name': 1 });

    return users.map((u: any) => ({
      id: String(u._id),
      name: [u.profile.first_name, u.profile.last_name].filter(Boolean).join(' '),
      email: u.auth.email ?? '',
      is_admin: u.metadata.role_keys.includes('SUPER_ADMIN'),
    }));
  },

  /** Every saved list, newest first — the audience dropdowns are short lists,
   * so they take the whole set rather than a page. */
  async list() {
    const docs = await AudienceListModel.find().sort({ created_at: -1 });
    return withCounts(docs);
  },

  /**
   * Who is in a saved list right now. Recomputed on every send: the list stores
   * criteria, so a campaign built last month reaches this month's matches.
   */
  async memberIds(id: string) {
    if (!Types.ObjectId.isValid(id)) throw notFound();
    const doc = await AudienceListModel.findById(id);
    if (!doc) throw notFound();
    return audienceUserIds(toQueryInput(doc));
  },

  /**
   * Whether one person is in a saved list right now. A deleted list matches
   * nobody rather than everybody — an app popup aimed at a list that no longer
   * exists must go quiet, not go global.
   */
  async matchesUser(id: string, userId: string) {
    if (!Types.ObjectId.isValid(id)) return false;
    const doc = await AudienceListModel.findById(id);
    if (!doc) return false;
    return audienceMatchesUser(toQueryInput(doc), userId);
  },

  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<any>(
      AudienceListModel,
      {},
      input,
      LIST_TABLE_CONFIG
    );
    return { rows: await withCounts(docs), total, page, page_size };
  },

  async get(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await AudienceListModel.findById(id);
    if (!doc) return null;
    return toPub(doc, await countAudience(toQueryInput(doc)));
  },

  async create(input: AudienceListInput, createdBy?: string | null) {
    assertInput(input);
    const doc = await AudienceListModel.create({
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      owner: input.owner.trim(),
      owner_user_id: toObjectId(input.owner_user_id),
      filters: input.filters ?? [],
      search: input.search?.trim() ?? '',
      created_by: toObjectId(createdBy),
    });
    return toPub(doc, await countAudience(toQueryInput(doc)));
  },

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw notFound();
    const deleted = await AudienceListModel.findByIdAndDelete(id);
    if (!deleted) throw notFound();
    return true;
  },
};
