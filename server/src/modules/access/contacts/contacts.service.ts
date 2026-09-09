import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ContactInviteModel, ContactMatchModel, ContactSyncModel } from './contacts.model';
import { keysOfUser, recordInvitable } from './contacts.invite';
import { UserModel } from '@modules/access/user/user.model';
import { publicProfilesFromDocs } from '@modules/access/profile/profile.resolver';
import { phoneKey } from '@utils/phone';
import { escapeRegExp } from '@utils/regex';

/** A phone book bigger than this is truncated — nobody keeps more real numbers. */
const MAX_ENTRIES = 5000;
/** Shorter than this is a short code or a typo, never a subscriber number. */
const MIN_KEY_DIGITS = 7;
/** How many matches one screen renders; a radar past this is a crowd, not a map. */
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

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/**
 * The comparable key of every submitted number, with the first label seen for
 * it. Re-keyed here even though the client already did it: the server is the
 * one place the rule has to hold, whatever a client sent.
 */
function keyedEntries(entries: readonly ContactEntryInput[]): Map<string, string> {
  if (!Array.isArray(entries)) throw badInput('entries must be a list');
  const keyed = new Map<string, string>();
  for (const entry of entries.slice(0, MAX_ENTRIES)) {
    const key = phoneKey(entry?.phone_key);
    if (key.length < MIN_KEY_DIGITS) continue;
    const label = String(entry?.label ?? '').trim().slice(0, LABEL_MAX);
    const seen = keyed.get(key);
    if (seen === undefined || (!seen && label)) keyed.set(key, label);
  }
  return keyed;
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

export const contactsService = {
  async syncContacts(userId: string, entries: readonly ContactEntryInput[]) {
    const owner = new Types.ObjectId(userId);
    const keyed = keyedEntries(entries);
    const keys = [...keyed.keys()];

    const hits: any[] = keys.length
      ? await UserModel.find({
          $or: [
            { 'auth.phone.number': { $in: keys } },
            { 'communication.whatsapp.number': { $in: keys } },
          ],
          'metadata.status': 'ACTIVE',
          'metadata.deleted_at': null,
          _id: { $ne: owner },
        })
          .select('_id auth.phone.number communication.whatsapp.number')
          .lean()
      : [];

    const previous = new Set(
      (await ContactMatchModel.find({ owner_id: owner }).select('contact_id').lean()).map((row) =>
        String(row.contact_id)
      )
    );

    if (hits.length) {
      await ContactMatchModel.bulkWrite(
        hits.map((hit) => {
          const label =
            keyed.get(phoneKey(hit.auth?.phone?.number)) ??
            keyed.get(phoneKey(hit.communication?.whatsapp?.number)) ??
            '';
          return {
            updateOne: {
              filter: { owner_id: owner, contact_id: hit._id },
              update: { $set: { contact_label: label } },
              upsert: true,
            },
          };
        }),
        { ordered: false }
      );
    }
    // A number that left the phone book leaves the list.
    await ContactMatchModel.deleteMany({
      owner_id: owner,
      contact_id: { $nin: hits.map((hit) => hit._id) },
    });

    // Everyone the phone book reached who is NOT here — the invite list. Fed
    // the same keyed book the matcher read, so the two halves cannot disagree.
    const matchedKeys = new Set(hits.flatMap(keysOfUser));
    const invitable = await recordInvitable(owner, keyed, matchedKeys);

    const synced_at = new Date();
    await ContactSyncModel.updateOne(
      { owner_id: owner },
      { $set: { synced_at, submitted: keys.length, matched: hits.length, invitable } },
      { upsert: true }
    );
    return {
      submitted: keys.length,
      matched: hits.length,
      new_matches: hits.filter((hit) => !previous.has(String(hit._id))).length,
      invitable,
      synced_at: synced_at.toISOString(),
    };
  },

  async listMine(userId: string, filter?: { search?: string | null; nearby?: boolean | null }) {
    const owner = new Types.ObjectId(userId);
    const matches = await ContactMatchModel.find({ owner_id: owner })
      .sort({ created_at: -1 })
      .limit(MAX_MATCHES)
      .lean();
    if (matches.length === 0) return [];
    const labelById = new Map(matches.map((row) => [String(row.contact_id), row.contact_label ?? '']));

    const [viewer, docs] = await Promise.all([
      UserModel.findById(owner).select('profile.selected_location_id profile.city').lean(),
      UserModel.find({
        _id: { $in: matches.map((row) => row.contact_id) },
        'metadata.status': 'ACTIVE',
        'metadata.deleted_at': null,
      })
        .select(PROFILE_FIELDS)
        .lean(),
    ]);

    const isNearby = nearbyPredicate(viewer);
    const search = String(filter?.search ?? '').trim();
    const matchesSearch = search ? searchPredicate(search, labelById) : () => true;
    const kept = docs.filter((doc: any) => matchesSearch(doc) && (!filter?.nearby || isNearby(doc)));
    const nearbyById = new Map(kept.map((doc: any) => [String(doc._id), isNearby(doc)]));

    const profiles = await publicProfilesFromDocs(kept, userId);
    return profiles.map((profile) => ({
      profile,
      contact_label: labelById.get(profile.user_id) ?? '',
      is_nearby: nearbyById.get(profile.user_id) ?? false,
    }));
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
