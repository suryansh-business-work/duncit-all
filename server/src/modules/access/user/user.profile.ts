/**
 * `userService` — the signed-in user's own profile (fields, username,
 * visibility, location, locale, interests) and the public user reads.
 * Composed into `userService` in user.service.ts.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from './user.model';
import { UserRoleModel, UserInterestModel } from './relations';
import { userAuditService } from '@modules/access/userAudit/userAudit.service';
import type { UpdateMyProfileDTO, PetProfileDTO } from '@modules/access/profile/profile.validator';
import { CategoryModel } from '@modules/pods/category/category.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { LocaleModel } from '@modules/platform/localization/localization.model';
import { checkUsername, normalizeUsername } from './username';
import { toPostalAddress } from '@utils/address';
import { loadRelationIds, loadRelationIdsMany, publishSession, toPublic } from './user.public';
import { ensureUsername, usernameOwner } from './user.accounts';

const cleanProfileLinks = (links: UpdateMyProfileDTO['profile_links'] = []) =>
  (links ?? [])
    .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
    .filter((link) => link.label && link.url)
    .slice(0, 5);

/** What a public profile card reads — the nested fields plus the legacy flat
 * copies `toPublic` still falls back to while dualWrite is on. */
const PUBLIC_CARD_FIELDS =
  'profile counters metadata.profile_visibility metadata.role_keys ' +
  'first_name last_name profile_photo bio city zone roles';

/** Map the self-service UpdateMyProfileDTO field names onto their document dot-paths. */
const MY_PROFILE_PATHS: Record<string, string> = {
  first_name: 'profile.first_name',
  last_name: 'profile.last_name',
  bio: 'profile.bio',
  gender: 'profile.gender',
  profile_photo: 'profile.profile_photo',
  city: 'profile.city',
  state: 'profile.state',
  zone: 'profile.zone',
  country: 'profile.country',
};

// The phone and WhatsApp paths that used to sit here are gone with the write
// that used them: those two numbers now move only through
// contactChangeService, which owns their dot-paths alongside the code that
// proves them.

/** Copy every supplied field of `paths` onto the `$set` doc, blanking empties to null. */
function assignMappedFields(
  set: Record<string, any>,
  input: UpdateMyProfileDTO,
  paths: Record<string, string>
) {
  for (const [field, path] of Object.entries(paths)) {
    if ((input as any)[field] !== undefined) set[path] = (input as any)[field] || null;
  }
}

/**
 * Refuse a self-service profile save that would move a contact detail.
 *
 * Phone and WhatsApp change from mWeb and the native app ONLY through
 * `contactChangeService`. This guard is what makes that true rather than merely
 * customary: WhatsApp is behind a one-time code sent to the new number, and the
 * edit-profile screen's own save mutation would otherwise be a way straight
 * past it. The contact number needs no code any more, but it still belongs to
 * that service — the one place that refuses a number already reaching another
 * account — so this guard keeps holding both.
 *
 * An unchanged value passes silently, because a client sends the whole form on
 * every save — including the app versions already on people's phones, which
 * have no change flow to use instead. Only a value that actually moved is
 * refused, and it is refused with the sentence that says what to do instead.
 *
 * Extensions are not compared and never written: a country code without its
 * number means nothing, and one that moved on its own would silently redirect
 * a number somebody already proved.
 */
async function assertContactsUnchanged(user_id: string, input: UpdateMyProfileDTO) {
  const incomingPhone = (input as any).phone_number as string | undefined;
  const incomingWhatsApp = (input as any).whatsapp_number as string | undefined;
  if (incomingPhone === undefined && incomingWhatsApp === undefined) return;

  const current = await UserModel.findById(user_id)
    .select('auth.phone.number communication.whatsapp.number')
    .lean();
  const moved = (incoming: string | undefined, stored: string | null | undefined) =>
    incoming !== undefined && incoming.trim() !== (stored ?? '').trim();

  if (moved(incomingPhone, (current as any)?.auth?.phone?.number)) {
    throw new GraphQLError('Change your phone number from Contact details.', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (moved(incomingWhatsApp, (current as any)?.communication?.whatsapp?.number)) {
    throw new GraphQLError('Verify your new WhatsApp number to change it.', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

/** Parse the optional date of birth onto the `$set` doc. Throws on an unparsable value. */
function assignMyDob(set: Record<string, any>, input: UpdateMyProfileDTO) {
  if ((input as any).dob === undefined) return;
  const raw = (input as any).dob;
  const d = raw ? new Date(raw) : null;
  if (raw && (!d || Number.isNaN(d.getTime()))) {
    throw new GraphQLError('Invalid date of birth', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  set['profile.dob'] = d;
}

/**
 * Apply a `$set` to a user and append one change-log row per field it moved.
 *
 * EVERY profile write goes through here. The alternative — logging at each
 * call site — is one chance per site to forget, and the admin trail is only
 * worth reading if it cannot be missing an edit. The before-image is read
 * first because `{ new: true }` hands back the after value, and a diff needs
 * both. The actor and the surface are not passed in: the audit service reads
 * them from the request already in flight.
 */
async function applyUserUpdate(user_id: string, set: Record<string, any>) {
  const before = await UserModel.findById(user_id).lean();
  const updated = await UserModel.findByIdAndUpdate(user_id, { $set: set }, { new: true });
  if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
  await userAuditService.record({ userId: user_id, before, after: updated });
  return updated;
}

export const userProfileMethods = {
  // Backward-compat helper used by other modules. Returns the materialized
  // flat shape (toPublic) for a given doc.
  toPublic,

  async updateMyProfile(user_id: string, input: UpdateMyProfileDTO) {
    const set: Record<string, any> = {};
    assignMappedFields(set, input, MY_PROFILE_PATHS);
    // Email, phone and WhatsApp are NOT written here. They move only through
    // contactChangeService, behind a one-time code sent to the new value.
    await assertContactsUnchanged(user_id, input);
    if (input.profile_links !== undefined) set.profile_links = cleanProfileLinks(input.profile_links);
    // Set directly, not through assignMappedFields: its blank-to-null would turn "No" into unanswered.
    if (input.is_pet_owner !== undefined) set['profile.is_pet_owner'] = input.is_pet_owner;
    assignMyDob(set, input);
    // Save the whole main address as a normalized object (partial inputs fill in).
    if ((input as any).address !== undefined) {
      set['profile.address'] = toPostalAddress((input as any).address);
    }
    const updated = await applyUserUpdate(user_id, set);
    return publishSession(await toPublic(updated));
  },

  async updateMyInterests(user_id: string, categoryIds: string[]) {
    const uniqueIds = Array.from(new Set(categoryIds.filter(Boolean)));
    if (!uniqueIds.every((id) => Types.ObjectId.isValid(id))) {
      throw new GraphQLError('Invalid category selection', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const count = await CategoryModel.countDocuments({ _id: { $in: uniqueIds }, is_active: true });
    if (count !== uniqueIds.length) {
      throw new GraphQLError('One or more selected categories are unavailable', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const oid = new Types.ObjectId(user_id);
    const session = await UserModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        await UserInterestModel.deleteMany({ user_id: oid }, { session });
        if (uniqueIds.length) {
          await UserInterestModel.insertMany(
            uniqueIds.map((id) => ({ user_id: oid, interest_category_id: new Types.ObjectId(id) })),
            { session }
          );
        }
        await UserModel.updateOne(
          { _id: oid },
          {
            $set: {
              'metadata.onboarding_survey_completed': true,
              'counters.interests_count': uniqueIds.length,
            },
          },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }
    const fresh = await UserModel.findById(user_id);
    if (!fresh) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(fresh);
  },

  async getInterestCategories(categoryIds: string[]) {
    const validIds = categoryIds.filter((id) => Types.ObjectId.isValid(id));
    if (!validIds.length) return [];
    const docs = await CategoryModel.find({ _id: { $in: validIds } });
    const byId = new Map(docs.map((doc: any) => [String(doc._id), doc]));
    return validIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((doc: any) => ({
        id: String(doc._id),
        name: doc.name,
        slug: doc.slug,
        icon: doc.icon ?? '',
        description: doc.description ?? '',
        media: (doc.media ?? []).map((m: any) => ({ url: m.url, type: m.type ?? 'IMAGE' })),
        level: doc.level,
        parent_id: doc.parent_id ? String(doc.parent_id) : null,
        is_active: !!doc.is_active,
        is_system: !!doc.is_system,
        sort_order: doc.sort_order ?? 0,
        created_at: doc.created_at?.toISOString?.() ?? '',
        updated_at: doc.updated_at?.toISOString?.() ?? '',
      }));
  },

  /**
   * Resolve what sits in `/u/<handle>` — a username, or a raw user id.
   *
   * Both, deliberately and in that order: every link shared before handles
   * existed carries an id, and those links are in inboxes and chat threads
   * that nobody can go back and rewrite. The handle is tried first because it
   * is the only one a person could have typed.
   */
  async getByHandle(handle: string) {
    const clean = normalizeUsername(handle);
    if (!clean) return null;
    const byUsername = await UserModel.findOne({ 'profile.username': clean });
    if (byUsername) return toPublic(byUsername);
    if (!Types.ObjectId.isValid(handle)) return null;
    return toPublic(await UserModel.findById(handle));
  },

  /**
   * Can this account take this handle?
   *
   * Answers with a REASON rather than a sentence: the client renders the copy
   * (rule 38), and the field is checked on every keystroke, so an English
   * string would be shipped hundreds of times per edit for nothing.
   *
   * The viewer's OWN handle reads as available, so re-typing what you already
   * have never renders as taken.
   */
  async usernameAvailability(raw: string, viewerId: string | null) {
    const username = normalizeUsername(raw);
    const rejection = checkUsername(username);
    if (rejection) return { username, available: false, reason: rejection };
    const ownerId = await usernameOwner(username);
    if (!ownerId || ownerId === viewerId) {
      return { username, available: true, reason: null };
    }
    return { username, available: false, reason: 'TAKEN' };
  },

  /**
   * Change the signed-in account's handle.
   *
   * Re-validated here rather than trusted from the availability check: the two
   * are separate round trips, and between them somebody else can take the
   * handle. The unique index is what finally decides — the E11000 below is the
   * race actually happening, not a defensive branch.
   */
  async setMyUsername(user_id: string, raw: string) {
    const username = normalizeUsername(raw);
    const rejection = checkUsername(username);
    if (rejection === 'FORMAT') {
      throw new GraphQLError(
        'A username is 3-30 characters: lowercase letters, numbers and single hyphens.',
        { extensions: { code: 'BAD_USER_INPUT', reason: 'FORMAT' } }
      );
    }
    if (rejection === 'RESERVED') {
      throw new GraphQLError('That username is reserved.', {
        extensions: { code: 'BAD_USER_INPUT', reason: 'RESERVED' },
      });
    }
    try {
      const updated = await applyUserUpdate(user_id, { 'profile.username': username });
      // The handle is on the session card and in every share link, so the
      // other devices have to hear about it — the same reason the language
      // switch publishes.
      return publishSession(await toPublic(updated));
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new GraphQLError('That username is already taken.', {
          extensions: { code: 'CONFLICT', reason: 'TAKEN' },
        });
      }
      throw error;
    }
  },

  async updateMyProfileVisibility(user_id: string, visibility: 'PUBLIC' | 'PRIVATE') {
    if (visibility !== 'PUBLIC' && visibility !== 'PRIVATE') {
      throw new GraphQLError('Invalid visibility', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const updated = await applyUserUpdate(user_id, {
      'metadata.profile_visibility': visibility,
    });
    return toPublic(updated);
  },

  // Persist the user's selected header location. A null/empty id clears it.
  // A non-empty id must reference an existing location, so a stale/invalid id
  // can never be stored.
  async setMySelectedLocation(user_id: string, location_id: string | null, zone_name: string | null = null) {
    let value: Types.ObjectId | null = null;
    if (location_id) {
      if (!Types.ObjectId.isValid(location_id)) {
        throw new GraphQLError('Invalid location', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      const exists = await LocationModel.exists({ _id: new Types.ObjectId(location_id) });
      if (!exists) {
        throw new GraphQLError('Location not found', { extensions: { code: 'NOT_FOUND' } });
      }
      value = new Types.ObjectId(location_id);
    }
    // The area only means something inside its city, so a cleared city clears it too.
    const zone = value ? (zone_name ?? '').trim().slice(0, 120) : '';
    const updated = await applyUserUpdate(user_id, {
      'profile.selected_location_id': value,
      'profile.selected_zone_name': zone,
    });
    return toPublic(updated);
  },

  /** Persist the user's language. Validated against the ACTIVE locales so a
   * removed or disabled language can never be stored. */
  async setMyLocale(user_id: string, locale: string) {
    const code = (locale ?? '').trim();
    if (!code) {
      throw new GraphQLError('A locale is required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const exists = await LocaleModel.exists({ code, is_active: true });
    if (!exists) {
      throw new GraphQLError('Unsupported locale', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const updated = await applyUserUpdate(user_id, { 'profile.locale': code });
    // The one change a user makes on one device and expects to see on the next:
    // the language switch is exactly what `user:changed` exists for.
    return publishSession(await toPublic(updated));
  },

  async updateMyPetProfile(user_id: string, input: PetProfileDTO) {
    const updated = await applyUserUpdate(user_id, { pet_profile: input });
    return toPublic(updated);
  },

  async me(id: string) {
    // The relation lists key on the id alone, so they load beside the user
    // document rather than one round trip after it — `me` is on every
    // surface's boot path, and each trip to the database is ~250 ms.
    const [u, relations] = await Promise.all([UserModel.findById(id), loadRelationIds(id)]);
    // Handles are assigned, never typed — see ensureUsername.
    return toPublic(await ensureUsername(u), relations);
  },

  /**
   * `me`, announced to the account's other open surfaces.
   *
   * For a mutation that changed something on the SESSION — the name, the email,
   * the phone — rather than one that only read it back. Email and phone are in
   * SESSION_FIELDS, so a change proved in one tab has to reach the header in
   * the others; without this they show the old address until a reload.
   */
  async publishMe(id: string) {
    return publishSession(await this.me(id));
  },

  async getById(id: string) {
    const u = await UserModel.findById(id);
    return toPublic(u);
  },

  /**
   * `getById` for a whole page of ids: the same public shape, in eight queries
   * however many users — the batch behind the per-request user loader.
   * Invalid and unknown ids are simply absent, as `getById`'s cast error and
   * null were for one id.
   */
  async getPublicByIds(ids: readonly string[]) {
    const valid = ids.filter((id) => Types.ObjectId.isValid(id));
    const out = new Map<string, NonNullable<Awaited<ReturnType<typeof toPublic>>>>();
    if (valid.length === 0) return out;
    const [docs, relations] = await Promise.all([
      UserModel.find({ _id: { $in: valid } }),
      loadRelationIdsMany(valid),
    ]);
    for (const doc of docs) {
      const id = String(doc._id);
      const pub = await toPublic(doc, relations.get(id));
      if (pub) out.set(id, pub);
    }
    return out;
  },

  /**
   * The documents and role-relation keys behind a list of public profile
   * cards, in two reads for the whole list. `getById` per row also loaded
   * seven relation lists per user, so a 50-person follow rail was ~400
   * concurrent queries. Invalid ids drop out, as `getById`'s cast error did.
   */
  async listPublicCardSources(ids: readonly string[]) {
    const oids = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    const rolesByUser = new Map<string, string[]>();
    if (oids.length === 0) return { docs: [] as any[], rolesByUser };
    const [docs, roleRows] = await Promise.all([
      UserModel.find({ _id: { $in: oids } }).select(PUBLIC_CARD_FIELDS).lean(),
      UserRoleModel.find({ user_id: { $in: oids } }).select('user_id role').lean(),
    ]);
    for (const row of roleRows as any[]) {
      const key = String(row.user_id);
      const roles = rolesByUser.get(key) ?? [];
      if (!roles.includes(row.role)) roles.push(row.role);
      rolesByUser.set(key, roles);
    }
    return { docs, rolesByUser };
  },
};
