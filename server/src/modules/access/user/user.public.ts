/**
 * The public user shape and the session payload: `toPublic`, the relation-id
 * loaders it reads, `publishSession` and the signed token. Shared by every
 * `userService` area (composed in user.service.ts).
 */
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import {
  UserRoleModel,
  UserRelationshipModel,
  PodFollowerModel,
  ClubFollowerModel,
  UserSavedPodModel,
  UserInterestModel,
  FollowRequestModel,
} from './relations';
import { emitUserChanged } from '../../../realtime/user.events';
import { syncUserMirrors } from './user.mirrors';
import type { AuthUser } from '@context';
import { USER_SCHEMA_FLAGS } from './user.featureFlags';
import { toPostalAddress } from '@utils/address';

interface RelationIds {
  saved_pod_ids: string[];
  following_pod_ids: string[];
  following_club_ids: string[];
  following_user_ids: string[];
  requested_user_ids: string[];
  interest_category_ids: string[];
  role_keys: string[];
}

/** Group `rows` by their owner field, mapping each to the id it points at. */
function idsByOwner(rows: Array<Record<string, unknown>>, owner: string, field: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const row of rows) {
    const key = String(row[owner]);
    const list = out.get(key) ?? [];
    list.push(String(row[field]));
    out.set(key, list);
  }
  return out;
}

// Resolve relation IDs for many users in seven queries total, whatever the
// count — a page of post authors used to cost seven queries PER author. Each
// list is bounded by an index lookup. Used to materialize the flat GraphQL
// shape during the backward-compat window.
export async function loadRelationIdsMany(userIds: readonly string[]): Promise<Map<string, RelationIds>> {
  const oids = userIds.map((id) => new Types.ObjectId(id));
  const [savedPods, followingPods, followingClubs, followingUsers, requestedUsers, interests, roles] =
    await Promise.all([
      UserSavedPodModel.find({ user_id: { $in: oids } }).select('user_id pod_id').lean(),
      PodFollowerModel.find({ user_id: { $in: oids } }).select('user_id pod_id').lean(),
      ClubFollowerModel.find({ user_id: { $in: oids } }).select('user_id club_id').lean(),
      UserRelationshipModel.find({ follower_id: { $in: oids } }).select('follower_id following_id').lean(),
      // Sent-but-unanswered asks, so every list that renders a Follow button
      // from `me` can show Requested without a per-row query.
      FollowRequestModel.find({ requester_id: { $in: oids }, status: 'PENDING' })
        .select('requester_id target_id')
        .lean(),
      UserInterestModel.find({ user_id: { $in: oids } }).select('user_id interest_category_id').lean(),
      UserRoleModel.find({ user_id: { $in: oids } }).select('user_id role scope').lean(),
    ]);
  const saved = idsByOwner(savedPods, 'user_id', 'pod_id');
  const pods = idsByOwner(followingPods, 'user_id', 'pod_id');
  const clubs = idsByOwner(followingClubs, 'user_id', 'club_id');
  const users = idsByOwner(followingUsers, 'follower_id', 'following_id');
  const requested = idsByOwner(requestedUsers, 'requester_id', 'target_id');
  const interestIds = idsByOwner(interests, 'user_id', 'interest_category_id');
  const roleIds = idsByOwner(roles, 'user_id', 'role');
  return new Map(
    userIds.map((id) => [
      id,
      {
        saved_pod_ids: saved.get(id) ?? [],
        following_pod_ids: pods.get(id) ?? [],
        following_club_ids: clubs.get(id) ?? [],
        following_user_ids: users.get(id) ?? [],
        requested_user_ids: requested.get(id) ?? [],
        interest_category_ids: interestIds.get(id) ?? [],
        role_keys: Array.from(new Set(roleIds.get(id) ?? [])),
      },
    ])
  );
}

// Resolve relation IDs for a single user — the one-user case of the above.
export async function loadRelationIds(userId: string): Promise<RelationIds> {
  return (await loadRelationIdsMany([userId])).get(userId)!;
}

/**
 * The ONE place a Duncit JWT is minted. Exported so the Tech portal can hand CI
 * a token for the signed-in admin — a second signer would be a second chance to
 * disagree with the fallback secret below, and a token that verifies nowhere.
 */
export async function signToken(payload: AuthUser): Promise<string> {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  // Intentionally NO `expiresIn`: Duncit sessions do not expire on their own.
  // The same fallback secret is used by every `jwt.verify` site (context.ts,
  // realtime/io.ts, index.ts) so a token signed here always verifies there.
  return jwt.sign(payload, secret);
}

// Build the public GraphQL User shape. Storage is nested; consumers and the
// frontends still expect the flat shape, so this adapter projects nested →
// flat. Counts come from users.counters (denormalized), IDs from the relation
// collections (materialized for backward compatibility).
export async function toPublic(u: any, preloaded?: Awaited<ReturnType<typeof loadRelationIds>>) {
  if (!u) return null;
  const userId = String(u._id);
  const relations = preloaded ?? (await loadRelationIds(userId));
  // Backward-compat read path. While dualWrite is on, the legacy flat fields
  // are still present on rows that have not been migrated yet. Falling back
  // to them lets the API keep serving traffic mid-cutover. After
  // verification the flag flips off and the only valid source is the nested
  // storage.
  const legacy = USER_SCHEMA_FLAGS.dualWrite ? u : {};
  const auth = u.auth ?? {};
  const profile = u.profile ?? {};
  const meta = u.metadata ?? {};
  const counters = u.counters ?? {};
  const wa = (u.communication?.whatsapp) ?? {};
  const phone = auth.phone ?? {};
  const roleKeys = relations.role_keys.length
    ? relations.role_keys
    : (meta.role_keys ?? legacy.roles ?? []);

  const authProviders = [
    auth.password ? 'EMAIL' : null,
    auth.google_id ? 'GOOGLE' : null,
  ].filter(Boolean) as Array<'EMAIL' | 'GOOGLE'>;

  const firstName = profile.first_name ?? legacy.first_name ?? '';
  const lastName = profile.last_name ?? legacy.last_name ?? '';
  const legacyDob = legacy.dob ? new Date(legacy.dob).toISOString() : '';
  const dob = profile.dob ? new Date(profile.dob).toISOString() : legacyDob;
  return {
    user_id: userId,
    first_name: firstName,
    last_name: lastName,
    full_name: `${firstName} ${lastName}`.trim(),
    email: auth.email ?? legacy.email ?? null,
    is_email_verified: !!(auth.is_email_verified ?? legacy.is_email_verified),
    phone_number: phone.number ?? legacy.phone_number ?? '',
    phone_extension: phone.extension ?? legacy.phone_extension ?? '',
    is_phone_verified: !!(phone.is_verified ?? legacy.is_phone_verified),
    auth_providers: authProviders.length ? authProviders : ['EMAIL'],
    // Accounts created by Google signup predate `auth.google_email`, and their
    // Google address is the address they signed up with — so a linked account
    // with no stored Gmail reads as its account email rather than as "not
    // connected", which is what the admin list would otherwise show.
    google_email: auth.google_id ? (auth.google_email ?? auth.email ?? null) : null,
    last_login_provider: auth.last_login_provider ?? legacy.last_login_provider ?? null,
    last_login_at:
      (auth.last_login_at ?? legacy.last_login_at)?.toISOString?.() ?? null,
    dob,
    country: profile.country ?? legacy.country ?? 'India',
    city: profile.city ?? legacy.city ?? null,
    state: profile.state ?? null,
    pincode: profile.pincode ?? null,
    zone: profile.zone ?? legacy.zone ?? null,
    address: toPostalAddress(profile.address),
    selected_location_id: profile.selected_location_id
      ? String(profile.selected_location_id)
      : null,
    roles: roleKeys,
    assigned_city: profile.assigned_city ?? legacy.assigned_city ?? null,
    assigned_zones: meta.assigned_zones ?? legacy.assigned_zones ?? [],
    profile_photo: profile.profile_photo ?? legacy.profile_photo ?? null,
    // Null only for accounts that predate the field and have not been
    // migrated yet; every reader falls back to the id for those.
    username: profile.username ?? null,
    bio: profile.bio ?? legacy.bio ?? null,
    gender: profile.gender ?? null,
    is_pet_owner: profile.is_pet_owner ?? null,
    // Dormant since the schema was written; now the users language choice.
    locale: profile.locale ?? 'en-IN',
    // Documents written before the field existed have none; '' tells the client
    // to use the device zone rather than guessing one for them.
    timezone: profile.timezone ?? '',
    profile_links: (u.profile_links ?? []).map((link: any) => ({
      label: link.label ?? '',
      url: link.url ?? '',
    })),
    pet_profile: u.pet_profile
      ? {
          name: u.pet_profile.name ?? null,
          species: u.pet_profile.species ?? null,
          breed: u.pet_profile.breed ?? null,
          age: u.pet_profile.age ?? null,
          photo_url: u.pet_profile.photo_url ?? null,
          bio: u.pet_profile.bio ?? null,
        }
      : null,
    saved_pod_ids: relations.saved_pod_ids,
    following_pod_ids: relations.following_pod_ids,
    following_club_ids: relations.following_club_ids,
    following_user_ids: relations.following_user_ids,
    requested_user_ids: relations.requested_user_ids,
    followers_count: counters.followers_count ?? 0,
    following_count: counters.following_count ?? 0,
    interest_category_ids: relations.interest_category_ids,
    onboarding_survey_completed: !!(meta.onboarding_survey_completed ?? legacy.onboarding_survey_completed),
    whatsapp_extension: wa.extension ?? legacy.whatsapp_extension ?? '',
    whatsapp_number: wa.number ?? legacy.whatsapp_number ?? '',
    whatsapp_verified_at:
      (wa.verified_at ?? legacy.whatsapp_verified_at)?.toISOString?.() ?? null,
    is_first_time_user: !!(meta.is_first_time_user ?? legacy.is_first_time_user),
    status: meta.status ?? legacy.status ?? 'ACTIVE',
    profile_visibility: meta.profile_visibility ?? 'PUBLIC',
    host_share_pct: u.finance?.host_share_pct ?? 0,
    host_commission_pct: u.finance?.host_commission_pct ?? 0,
    created_at:
      (meta.created_at ?? legacy.created_at)?.toISOString?.() ?? '',
    updated_at:
      (meta.updated_at ?? legacy.updated_at)?.toISOString?.() ?? '',
  };
}

/**
 * The fields the shared session context actually renders.
 *
 * Kept as an explicit list rather than "the whole public user" because this
 * goes out on a socket to every tab the account has open: `saved_pod_ids` and
 * the follow graphs can be thousands of ids, and none of them is session state.
 */
const SESSION_FIELDS = [
  'first_name',
  'last_name',
  'full_name',
  'email',
  'phone_number',
  'phone_extension',
  'profile_photo',
  'bio',
  'roles',
  'locale',
  'timezone',
  'country',
  'city',
  'state',
  'zone',
  'assigned_city',
  'assigned_zones',
  'selected_location_id',
  'is_email_verified',
  'is_phone_verified',
  'onboarding_survey_completed',
  'updated_at',
] as const;

/**
 * Announce a profile change to the account's other surfaces, then hand the
 * public user straight back so a resolver can `return publishSession(pub)`.
 */
export function publishSession<T extends Record<string, any> | null>(pub: T): T {
  if (!pub?.user_id) return pub;
  const patch: Record<string, unknown> = {};
  for (const key of SESSION_FIELDS) {
    if (pub[key] !== undefined) patch[key] = pub[key];
  }
  emitUserChanged(String(pub.user_id), patch);
  // A handful of admin tables search and sort on the person's name, which Mongo
  // cannot do against a value that lives only on the user document — so those
  // collections keep a mirrored copy, refreshed here. Fire-and-forget: the
  // profile save has already succeeded, and a slow fan-out must not hold it up.
  syncUserMirrors(String(pub.user_id)).catch(() => undefined);
  return pub;
}

export async function authPayload(u: any) {
  const pub = (await toPublic(u))!;
  const token = await signToken({
    id: pub.user_id,
    email: pub.email ?? null,
    roles: pub.roles,
    assigned_city: pub.assigned_city,
    assigned_zones: pub.assigned_zones,
  });
  return { token, user: pub };
}
