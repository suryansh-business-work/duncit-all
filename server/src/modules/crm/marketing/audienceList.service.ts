import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { AudienceListModel } from './audienceList.model';
import {
  audienceFilter,
  audienceMatchesUser,
  audienceTablePage,
  audienceUserIds,
  countAudience,
  notInAudience,
} from './audience.service';
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

/** The people this list holds by hand, as ids the audience filter can use. */
const manualIds = (doc: any): Types.ObjectId[] => doc.manual_user_ids ?? [];

/** The people taken out of this list by hand, subtracted from the union. */
const excludedIds = (doc: any): Types.ObjectId[] => doc.excluded_user_ids ?? [];

/** Every id argument `audienceFilter` takes for one list, in one place — the
 * count, the members page, the send list and the popup check all read the same
 * membership, so none of them can forget the subtraction. */
const membershipOf = (doc: any) => [toQueryInput(doc), manualIds(doc), excludedIds(doc)] as const;

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
  manual_member_count: manualIds(doc).length,
  excluded_member_count: excludedIds(doc).length,
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
  Promise.all(
    docs.map(async (doc) => toPub(doc, await countAudience(...membershipOf(doc))))
  );

/** The list, or a NOT_FOUND. `matchesUser` deliberately does not use it: a
 * list that no longer exists must match nobody there, not throw at an app
 * launch. */
async function loadList(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound();
  const doc = await AudienceListModel.findById(id);
  if (!doc) throw notFound();
  return doc;
}

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
    const doc = await loadList(id);
    return audienceUserIds(...membershipOf(doc));
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
    return audienceMatchesUser(toQueryInput(doc), userId, manualIds(doc), excludedIds(doc));
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
    return toPub(doc, await countAudience(...membershipOf(doc)));
  },

  /**
   * Who is in one list right now — the criteria re-run, plus everyone added by
   * hand. The detail page reads this rather than the open audience table: the
   * union rule lives on the server, so the page cannot show a membership the
   * next campaign send disagrees with.
   */
  async membersTable(listId: string, input?: TableQueryInput | null) {
    const doc = await loadList(listId);
    return audienceTablePage(await audienceFilter(...membershipOf(doc)), input);
  },

  /**
   * Who the Add-user picker may offer: the whole audience MINUS whoever this
   * list already holds. Derived from the same membership filter the members
   * page renders, so the picker cannot offer somebody the list already has —
   * which is exactly what listing the open audience did.
   */
  async candidatesTable(listId: string, input?: TableQueryInput | null) {
    const doc = await loadList(listId);
    return audienceTablePage(notInAudience(await audienceFilter(...membershipOf(doc))), input);
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
    return toPub(doc, await countAudience(...membershipOf(doc)));
  },

  /**
   * Add hand-picked people to a list. Ids that are malformed, unknown or belong
   * to a closed account are dropped before the write — a send list must never
   * carry an id that resolves to nobody — and `$addToSet` makes adding the same
   * person twice a no-op rather than a duplicate row.
   *
   * The same write LIFTS a previous removal: somebody taken out by hand is
   * offered by the picker again, so adding them back has to clear the
   * exclusion, or the list would accept the add and still not hold them.
   */
  async addMembers(id: string, userIds: string[]) {
    if (!Types.ObjectId.isValid(id)) throw notFound();
    const candidates = userIds.filter((raw) => Types.ObjectId.isValid(raw));
    if (candidates.length === 0) throw bad('Select at least one person to add');

    const users = await UserModel.find({
      _id: { $in: candidates.map((raw) => new Types.ObjectId(raw)) },
      'metadata.deleted_at': null,
    }).select('_id');
    if (users.length === 0) throw bad('None of those accounts exist any more');

    const ids = users.map((u: any) => u._id);
    const doc = await AudienceListModel.findByIdAndUpdate(
      id,
      { $addToSet: { manual_user_ids: { $each: ids } }, $pull: { excluded_user_ids: { $in: ids } } },
      { new: true }
    );
    if (!doc) throw notFound();
    return toPub(doc, await countAudience(...membershipOf(doc)));
  },

  /**
   * Take one person out of a list.
   *
   * Both halves of the membership have to be written, because a list can hold
   * somebody either way: `$pull` drops a hand-picked person, and the exclusion
   * covers the criteria, which re-run on every read and would otherwise put a
   * matching person straight back. Doing only one of the two is the bug this
   * pair exists to prevent.
   *
   * Removing somebody the list never held is left as a success: the caller
   * asked for them to be out, and they are.
   */
  async removeMember(id: string, userId: string) {
    if (!Types.ObjectId.isValid(id)) throw notFound();
    if (!Types.ObjectId.isValid(userId)) throw bad('That is not a person we can remove');

    const memberId = new Types.ObjectId(userId);
    const doc = await AudienceListModel.findByIdAndUpdate(
      id,
      { $pull: { manual_user_ids: memberId }, $addToSet: { excluded_user_ids: memberId } },
      { new: true }
    );
    if (!doc) throw notFound();
    return toPub(doc, await countAudience(...membershipOf(doc)));
  },

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw notFound();
    const deleted = await AudienceListModel.findByIdAndDelete(id);
    if (!deleted) throw notFound();
    return true;
  },
};
