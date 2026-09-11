import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ContactInviteModel, ContactMatchModel, ContactSyncModel } from './contacts.model';
import { keysOfUser, recordInvitable } from './contacts.invite';
import { pageWindow, type ContactsPage } from './contacts.paging';
import { UserModel } from '@modules/access/user/user.model';
import { publicProfilesFromDocs } from '@modules/access/profile/profile.resolver';
import { phoneKey } from '@utils/phone';
import { escapeRegExp } from '@utils/regex';

/** A phone book bigger than this is truncated — nobody keeps more real numbers. */
const MAX_ENTRIES = 5000;
/** Shorter than this is a short code or a typo, never a subscriber number. */
const MIN_KEY_DIGITS = 7;
/** How many matches the unpaged `contactsOnDuncit` renders — kept for app
 * builds that predate `contactsOnDuncitPage`, which reaches every match. */
const MAX_MATCHES = 500;
const LABEL_MAX = 120;

/** What a contact row needs from a user document, and nothing more. */
const PROFILE_FIELDS =
  'profile.first_name profile.last_name profile.username profile.profile_photo profile.bio ' +
  'profile.city profile.zone profile.selected_location_id counters.followers_count ' +
  'counters.following_count metadata.profile_visibility metadata.role_keys';

export interface ContactEntryInput {
  phone_key: string;
  label?: string | null;
}

/** Which slice of a phone book one `syncContacts` request carries. */
export interface ContactSyncBatch {
  /** Absent on the first slice; every later slice passes back the id the first was given. */
  sync_id?: string | null;
  /** The slice that closes the sync. */
  last: boolean;
}

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/**
 * The comparable key of every submitted number, with the first label seen for
 * it. Re-keyed here even though the client already did it: the server is the
 * one place the rule has to hold, whatever a client sent. `room` is how many
 * entries this request may still add to its sync.
 */
function keyedEntries(entries: readonly ContactEntryInput[], room: number): Map<string, string> {
  if (!Array.isArray(entries)) throw badInput('entries must be a list');
  const keyed = new Map<string, string>();
  for (const entry of entries.slice(0, room)) {
    const key = phoneKey(entry?.phone_key);
    if (key.length < MIN_KEY_DIGITS) continue;
    const label = String(entry?.label ?? '').trim().slice(0, LABEL_MAX);
    const seen = keyed.get(key);
    if (seen === undefined || (!seen && label)) keyed.set(key, label);
  }
  return keyed;
}

/**
 * The sync a request belongs to. A first slice arrives without one and is
 * given a fresh id. An ObjectId on purpose: a later sync always sorts after an
 * earlier one, which is what lets a closing slice retire only what OLDER syncs
 * left behind — two syncs racing each other never delete each other's rows.
 */
function syncIdOf(batch?: ContactSyncBatch | null): Types.ObjectId {
  const given = batch?.sync_id;
  if (!given) return new Types.ObjectId();
  if (!Types.ObjectId.isValid(given)) throw badInput('sync_id was not issued by a contacts sync');
  return new Types.ObjectId(given);
}

/** Rows a sync has stamped so far — what holds a sliced phone book to MAX_ENTRIES. */
async function stampedSoFar(owner: Types.ObjectId, syncId: Types.ObjectId): Promise<number> {
  const filter = { owner_id: owner, sync_id: syncId };
  const [matches, invites] = await Promise.all([
    ContactMatchModel.countDocuments(filter),
    ContactInviteModel.countDocuments(filter),
  ]);
  return matches + invites;
}

/** The accounts a slice's numbers reach, on either number an account keeps. */
async function matchAccounts(owner: Types.ObjectId, keys: string[]): Promise<any[]> {
  if (keys.length === 0) return [];
  return UserModel.find({
    $or: [
      { 'auth.phone.number': { $in: keys } },
      { 'communication.whatsapp.number': { $in: keys } },
    ],
    'metadata.status': 'ACTIVE',
    'metadata.deleted_at': null,
    _id: { $ne: owner },
  })
    .select('_id auth.phone.number communication.whatsapp.number')
    .lean();
}

/** Remember who a slice matched, stamped with its sync. Answers how many of
 * them no earlier sync had found. */
async function recordMatches(
  owner: Types.ObjectId,
  hits: readonly any[],
  keyed: ReadonlyMap<string, string>,
  syncId: Types.ObjectId
): Promise<number> {
  if (hits.length === 0) return 0;
  const result = await ContactMatchModel.bulkWrite(
    hits.map((hit) => {
      const label =
        keyed.get(phoneKey(hit.auth?.phone?.number)) ??
        keyed.get(phoneKey(hit.communication?.whatsapp?.number)) ??
        '';
      return {
        updateOne: {
          filter: { owner_id: owner, contact_id: hit._id },
          update: { $set: { contact_label: label, sync_id: syncId } },
          upsert: true,
        },
      };
    }),
    { ordered: false }
  );
  return result.upsertedCount ?? 0;
}

/**
 * Close a sync: forget every row an older sync stamped — a number that left
 * the phone book leaves both lists — and record what is left.
 */
async function finishSync(owner: Types.ObjectId, syncId: Types.ObjectId, syncedAt: Date) {
  const older: Record<string, unknown> = {
    owner_id: owner,
    $or: [{ sync_id: { $lt: syncId } }, { sync_id: null }],
  };
  await Promise.all([ContactMatchModel.deleteMany(older), ContactInviteModel.deleteMany(older)]);
  const [matched, invitable] = await Promise.all([
    ContactMatchModel.countDocuments({ owner_id: owner }),
    ContactInviteModel.countDocuments({ owner_id: owner }),
  ]);
  await ContactSyncModel.updateOne(
    { owner_id: owner },
    { $set: { synced_at: syncedAt, submitted: matched + invitable, matched, invitable } },
    { upsert: true }
  );
}

const lower = (value: unknown) => String(value ?? '').trim().toLowerCase();

/**
 * Same city as the viewer. The selected location wins when both sides have
 * picked one; the free-text city is the fallback for accounts that never did.
 */
function nearbyPredicate(viewer: any): (doc: any) => boolean {
  const viewerLocation = String(viewer?.profile?.selected_location_id ?? '');
  const viewerCity = lower(viewer?.profile?.city);
  return (doc) => {
    const location = String(doc?.profile?.selected_location_id ?? '');
    if (viewerLocation && location) return location === viewerLocation;
    const city = lower(doc?.profile?.city);
    return Boolean(viewerCity) && city === viewerCity;
  };
}

function searchPredicate(search: string, labelById: Map<string, string>): (doc: any) => boolean {
  const pattern = new RegExp(escapeRegExp(search.trim()), 'i');
  return (doc) => {
    const profile = doc?.profile ?? {};
    const haystack = [
      profile.first_name,
      profile.last_name,
      `${profile.first_name ?? ''} ${profile.last_name ?? ''}`,
      profile.username,
      labelById.get(String(doc._id)),
    ];
    return haystack.some((value) => value && pattern.test(String(value)));
  };
}

const viewerPlace = (owner: Types.ObjectId) =>
  UserModel.findById(owner).select('profile.selected_location_id profile.city').lean();

const activeProfiles = (ids: Types.ObjectId[]): Promise<any[]> =>
  UserModel.find({ _id: { $in: ids }, 'metadata.status': 'ACTIVE', 'metadata.deleted_at': null })
    .select(PROFILE_FIELDS)
    .lean();

const labelsOf = (matches: readonly { contact_id: Types.ObjectId; contact_label?: string }[]) =>
  new Map(matches.map((row) => [String(row.contact_id), row.contact_label ?? '']));

/** One row per doc, in the docs' order, carrying the viewer's follow state. */
async function contactRows(
  docs: readonly any[],
  labelById: ReadonlyMap<string, string>,
  isNearby: (doc: any) => boolean,
  viewerId: string
) {
  const nearbyById = new Map(docs.map((doc) => [String(doc._id), isNearby(doc)]));
  const profiles = await publicProfilesFromDocs(docs, viewerId);
  return profiles.map((profile) => ({
    profile,
    contact_label: labelById.get(profile.user_id) ?? '',
    is_nearby: nearbyById.get(profile.user_id) ?? false,
  }));
}

type ContactOnDuncitRow = Awaited<ReturnType<typeof contactRows>>[number];

export const contactsService = {
  /**
   * Match one slice of a phone book and remember what it reached.
   *
   * A phone book too big for one request arrives in slices chained by
   * `sync_id`; the slice marked `last` closes the sync — that is when numbers
   * that left the phone book leave both lists and the summary is recorded. A
   * request with no `batch` (every app build from before slicing) is a whole
   * sync in one slice. The counts returned describe THIS slice.
   */
  async syncContacts(
    userId: string,
    entries: readonly ContactEntryInput[],
    batch?: ContactSyncBatch | null
  ) {
    const owner = new Types.ObjectId(userId);
    const syncId = syncIdOf(batch);
    // A later slice may only fill what the earlier ones left of the cap.
    const used = batch?.sync_id ? await stampedSoFar(owner, syncId) : 0;
    const keyed = keyedEntries(entries, Math.max(0, MAX_ENTRIES - used));
    const keys = [...keyed.keys()];

    const hits = await matchAccounts(owner, keys);
    const newMatches = await recordMatches(owner, hits, keyed, syncId);
    // Everyone the slice reached who is NOT here — the invite list. Fed the
    // same keyed book the matcher read, so the two halves cannot disagree.
    const matchedKeys = new Set(hits.flatMap(keysOfUser));
    const invitable = await recordInvitable(owner, keyed, matchedKeys, syncId);

    const syncedAt = new Date();
    if (!batch || batch.last) await finishSync(owner, syncId, syncedAt);
    return {
      submitted: keys.length,
      matched: hits.length,
      new_matches: newMatches,
      invitable,
      synced_at: syncedAt.toISOString(),
      sync_id: syncId.toHexString(),
    };
  },

  /** The unpaged list older app builds read: the first matches, narrowed on the server. */
  async listMine(userId: string, filter?: { search?: string | null; nearby?: boolean | null }) {
    const owner = new Types.ObjectId(userId);
    const matches = await ContactMatchModel.find({ owner_id: owner })
      .sort({ created_at: -1 })
      .limit(MAX_MATCHES)
      .lean();
    if (matches.length === 0) return [];
    const labelById = labelsOf(matches);

    const [viewer, docs] = await Promise.all([
      viewerPlace(owner),
      activeProfiles(matches.map((row) => row.contact_id)),
    ]);

    const isNearby = nearbyPredicate(viewer);
    const search = String(filter?.search ?? '').trim();
    const matchesSearch = search ? searchPredicate(search, labelById) : () => true;
    const kept = docs.filter((doc: any) => matchesSearch(doc) && (!filter?.nearby || isNearby(doc)));
    return contactRows(kept, labelById, isNearby, userId);
  },

  /**
   * One page of every match, newest first. Ordered on the match rows
   * themselves (created, then id) so a page never shifts under a follow. A
   * match whose account has since been suspended drops out of its page rather
   * than being backfilled — a client walks by the page size it asked for,
   * never by the rows it got.
   */
  async listPage(
    userId: string,
    offset?: number | null,
    limit?: number | null
  ): Promise<ContactsPage<ContactOnDuncitRow>> {
    const owner = new Types.ObjectId(userId);
    const { skip, take } = pageWindow(offset, limit);
    const [total, matches, viewer] = await Promise.all([
      ContactMatchModel.countDocuments({ owner_id: owner }),
      ContactMatchModel.find({ owner_id: owner })
        .sort({ created_at: -1, _id: -1 })
        .skip(skip)
        .limit(take)
        .select('contact_id contact_label')
        .lean(),
      viewerPlace(owner),
    ]);
    if (matches.length === 0) return { total, rows: [] };

    const order = new Map(matches.map((row, index) => [String(row.contact_id), index]));
    const docs = await activeProfiles(matches.map((row) => row.contact_id));
    docs.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
    const rows = await contactRows(docs, labelsOf(matches), nearbyPredicate(viewer), userId);
    return { total, rows };
  },

  async syncStatus(userId: string) {
    const row = await ContactSyncModel.findOne({ owner_id: new Types.ObjectId(userId) }).lean();
    if (!row) return null;
    return {
      synced_at: row.synced_at.toISOString(),
      submitted: row.submitted ?? 0,
      matched: row.matched ?? 0,
      invitable: row.invitable ?? 0,
    };
  },

  async clearMine(userId: string) {
    const owner = new Types.ObjectId(userId);
    await Promise.all([
      ContactMatchModel.deleteMany({ owner_id: owner }),
      ContactInviteModel.deleteMany({ owner_id: owner }),
      ContactSyncModel.deleteOne({ owner_id: owner }),
    ]);
    return true;
  },
};
