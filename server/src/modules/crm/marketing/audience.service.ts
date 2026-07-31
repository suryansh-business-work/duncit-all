import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { UserInterestModel } from '@modules/access/user/relations/userInterest.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import {
  ExpoPushTokenModel,
  PushSubscriptionModel,
} from '@modules/engagement/notification/notification.model';
import {
  buildTableFilter,
  runTableQuery,
  type TableEntityConfig,
  type TableFilterInput,
  type TableQueryInput,
} from '@utils/table-query';

/**
 * The marketing Target Audience list.
 *
 * Deliberately NOT usersTable: that one is the admin user directory. It hands
 * back the payout percentages, the postal address, the WhatsApp number and the
 * raw birthdate, none of which a campaign tool needs, and it does not exclude
 * soft-deleted accounts — which must never end up in a send list. This query
 * returns a slim row and hard-excludes deleted users.
 *
 * Three of the filters cannot be expressed as a plain field comparison, so the
 * service translates them before the shared table engine runs:
 *   - age            -> a date range on profile.dob
 *   - whatsapp       -> presence of a verification timestamp
 *   - push_platform  -> a user-id set resolved from the push-token collections
 */

/** Field-comparison filters, handled entirely by the shared engine. */
const AUDIENCE_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['profile.first_name', 'profile.last_name', 'auth.email', 'auth.phone.number'],
  sortFields: {
    first_name: 'profile.first_name',
    last_name: 'profile.last_name',
    email: 'auth.email',
    city: 'profile.city',
    state: 'profile.state',
    zone: 'profile.zone',
    status: 'metadata.status',
    dob: 'profile.dob',
    locale: 'profile.locale',
    last_login_provider: 'auth.last_login_provider',
    last_login_at: 'auth.last_login_at',
    created_at: 'metadata.created_at',
  },
  filterFields: {
    status: { path: 'metadata.status', type: 'enum' },
    role: { path: 'metadata.role_keys', type: 'enum' },
    country: { path: 'profile.country', type: 'string' },
    state: { path: 'profile.state', type: 'string' },
    city: { path: 'profile.city', type: 'string' },
    zone: { path: 'profile.zone', type: 'string' },
    pincode: { path: 'profile.pincode', type: 'string' },
    locale: { path: 'profile.locale', type: 'string' },
    email_verified: { path: 'auth.is_email_verified', type: 'boolean' },
    phone_verified: { path: 'auth.phone.is_verified', type: 'boolean' },
    last_login_provider: { path: 'auth.last_login_provider', type: 'enum' },
    last_login_at: { path: 'auth.last_login_at', type: 'date' },
    created_at: { path: 'metadata.created_at', type: 'date' },
    survey_completed: { path: 'metadata.onboarding_survey_completed', type: 'boolean' },
    first_time_user: { path: 'metadata.is_first_time_user', type: 'boolean' },
    profile_visibility: { path: 'metadata.profile_visibility', type: 'enum' },
  },
  defaultSort: { 'metadata.created_at': -1 },
};

/** Fields this service resolves itself; stripped before the engine sees them. */
const TRANSLATED = new Set(['age', 'whatsapp', 'push_platform', 'interest_category']);

/** The birthdate of somebody turning exactly `years` old today. */
function dobForAge(years: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

/**
 * An age range as a birthdate range. Someone aged >= min was born on or before
 * the min boundary; someone aged <= max was born strictly AFTER the (max + 1)
 * boundary, because a person born exactly max+1 years ago today has already had
 * that birthday.
 */
function dobRange(min?: number, max?: number): Record<string, Date> | undefined {
  const range: Record<string, Date> = {};
  if (min !== undefined) range.$lte = dobForAge(min);
  if (max !== undefined) range.$gt = dobForAge(max + 1);
  return Object.keys(range).length > 0 ? range : undefined;
}

const num = (raw?: string | null) => {
  if (raw == null || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : undefined;
};

/** Pull [min, max] out of whichever range op the table filter used. */
function ageBounds(f: TableFilterInput): { min?: number; max?: number } {
  if (f.op === 'between') {
    const [lo, hi] = f.values ?? [];
    return { min: num(lo), max: num(hi) };
  }
  if (f.op === 'gte') return { min: num(f.value) };
  if (f.op === 'lte') return { max: num(f.value) };
  if (f.op === 'eq') {
    const exact = num(f.value);
    return { min: exact, max: exact };
  }
  return {};
}

/** Ids of users reachable on a push platform. ANDROID/IOS come from the native
 * token rows, WEB from the browser subscriptions. A user with a phone and a
 * tablet has several token rows, so the ids are deduped by the $in itself. */
async function pushReachableIds(platform: string): Promise<Types.ObjectId[]> {
  if (platform === 'WEB') return PushSubscriptionModel.distinct('user_id');
  return ExpoPushTokenModel.distinct('user_id', { platform: platform.toLowerCase() });
}

/** Every user with at least one push token on any platform. */
async function anyPushReachableIds(): Promise<Types.ObjectId[]> {
  const [native, web] = await Promise.all([
    ExpoPushTokenModel.distinct('user_id'),
    PushSubscriptionModel.distinct('user_id'),
  ]);
  return [...native, ...web];
}

async function pushCondition(value: string): Promise<IdCondition | undefined> {
  if (value === 'NONE') return { $nin: await anyPushReachableIds() };
  if (value === 'ANY') return { $in: await anyPushReachableIds() };
  if (value === 'WEB' || value === 'ANDROID' || value === 'IOS') {
    return { $in: await pushReachableIds(value) };
  }
  return undefined;
}

async function interestCondition(f: TableFilterInput): Promise<IdCondition | undefined> {
  const raw = f.op === 'in' ? (f.values ?? []) : [f.value];
  const ids = raw.filter((v): v is string => !!v && Types.ObjectId.isValid(v));
  if (ids.length === 0) return undefined;
  // The cast corrects a wrong library inference, not a real type change:
  // InferSchemaType resolves distinct()'s element type from the timestamps
  // rather than the ref, so it claims Date[] for what is always ObjectId[].
  const users = (await UserInterestModel.distinct('user_id', {
    interest_category_id: { $in: ids.map((id) => new Types.ObjectId(id)) },
  })) as unknown as Types.ObjectId[];
  return { $in: users };
}

type BaseFilter = Record<string, unknown>;
type IdCondition = { $in?: Types.ObjectId[]; $nin?: Types.ObjectId[] };

const intersect = (a: Types.ObjectId[], b: Types.ObjectId[]) => {
  const keep = new Set(b.map((id) => id.toHexString()));
  return a.filter((id) => keep.has(id.toHexString()));
};

/**
 * AND-merge two `_id` conditions (push reachability and interest are both
 * resolved to id sets). Two `$in`s must INTERSECT: spreading them would let the
 * second silently replace the first and widen a two-axis segment back to one
 * axis. `$in` and `$nin` are different keys and simply coexist.
 */
function mergeId(target: BaseFilter, cond: IdCondition) {
  const existing = target._id as IdCondition | undefined;
  if (!existing) {
    target._id = cond;
    return;
  }
  const merged: IdCondition = { ...existing, ...cond };
  if (existing.$in && cond.$in) merged.$in = intersect(existing.$in, cond.$in);
  target._id = merged;
}

function applyAge(base: BaseFilter, f: TableFilterInput) {
  const { min, max } = ageBounds(f);
  const range = dobRange(min, max);
  if (range) base['profile.dob'] = range;
}

function applyWhatsapp(base: BaseFilter, f: TableFilterInput) {
  if (f.op === 'is_true') base['communication.whatsapp.verified_at'] = { $ne: null };
  else if (f.op === 'is_false') base['communication.whatsapp.verified_at'] = null;
}

async function applyPush(base: BaseFilter, f: TableFilterInput) {
  if (!f.value) return;
  const cond = await pushCondition(f.value);
  if (cond) mergeId(base, cond);
}

async function applyInterest(base: BaseFilter, f: TableFilterInput) {
  const cond = await interestCondition(f);
  if (cond) mergeId(base, cond);
}

async function applyTranslated(base: BaseFilter, f: TableFilterInput): Promise<void> {
  if (f.field === 'age') return applyAge(base, f);
  if (f.field === 'whatsapp') return applyWhatsapp(base, f);
  if (f.field === 'push_platform') return applyPush(base, f);
  return applyInterest(base, f);
}

/**
 * Turn the translated filters into a base-filter fragment and return the
 * remaining filters for the shared engine.
 */
async function translate(input?: TableQueryInput | null) {
  const all = input?.filters ?? [];
  // Soft-deleted accounts are never an audience — a campaign must not reach a
  // closed account. usersTable does not do this; here it is not optional.
  const base: BaseFilter = { 'metadata.deleted_at': null };

  for (const f of all.filter((x) => TRANSLATED.has(x.field))) {
    await applyTranslated(base, f);
  }

  const passthrough = all.filter((f) => !TRANSLATED.has(f.field));
  return { base, query: { ...input, filters: passthrough } };
}

/** Whole years between a birthdate and today, or null when unknown. Exported
 * so the row mapping is unit-testable without shaping Mongo documents. */
export const yearsSince = (dob?: Date | null): number | null => {
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

const iso = (d?: Date | null) => (d ? d.toISOString() : null);

/** The slim audience row — no payout config, no postal address, no birthdate.
 * The optional chaining is not paranoia: accounts predating the communication
 * subdoc, and Google signups with no phone, really do arrive without them. */
export const toAudienceRow = (u: any) => ({
  id: String(u._id),
  full_name: [u.profile?.first_name, u.profile?.last_name].filter(Boolean).join(' '),
  email: u.auth?.email ?? null,
  phone: u.auth?.phone?.number ?? null,
  age: yearsSince(u.profile?.dob),
  city: u.profile?.city ?? null,
  state: u.profile?.state ?? null,
  zone: u.profile?.zone ?? null,
  pincode: u.profile?.pincode ?? null,
  country: u.profile?.country ?? null,
  locale: u.profile?.locale ?? null,
  status: u.metadata?.status ?? null,
  roles: u.metadata?.role_keys ?? [],
  email_verified: !!u.auth?.is_email_verified,
  phone_verified: !!u.auth?.phone?.is_verified,
  whatsapp_reachable: !!u.communication?.whatsapp?.verified_at,
  last_login_provider: u.auth?.last_login_provider ?? null,
  last_login_at: iso(u.auth?.last_login_at),
  created_at: iso(u.metadata?.created_at),
});

/** Push platforms per user id, for the rows on the current page only. */
async function pushPlatformsFor(ids: string[]): Promise<Map<string, string[]>> {
  const objectIds = ids.map((id) => new Types.ObjectId(id));
  const [native, web] = await Promise.all([
    ExpoPushTokenModel.find({ user_id: { $in: objectIds } }).select('user_id platform'),
    PushSubscriptionModel.find({ user_id: { $in: objectIds } }).select('user_id'),
  ]);
  const byUser = new Map<string, Set<string>>();
  const add = (userId: Types.ObjectId, platform: string) => {
    const key = userId.toHexString();
    const set = byUser.get(key) ?? new Set<string>();
    set.add(platform);
    byUser.set(key, set);
  };
  for (const t of native) add(t.user_id, (t.platform ?? 'unknown').toUpperCase());
  for (const s of web) add(s.user_id, 'WEB');
  return new Map([...byUser].map(([k, v]) => [k, [...v].sort((a, b) => a.localeCompare(b))]));
}

/** How many people match a saved list's criteria right now. A live segment has
 * no stored membership, so the count is always recomputed. */
export async function countAudience(input?: TableQueryInput | null): Promise<number> {
  const { base, query } = await translate(input);
  const filter = Object.keys(buildTableFilter(query, AUDIENCE_TABLE_CONFIG)).length
    ? { $and: [base, buildTableFilter(query, AUDIENCE_TABLE_CONFIG)] }
    : base;
  return UserModel.countDocuments(filter);
}

export const audienceService = {
  /** Dropdown values for the filters whose options are data, not a fixed list.
   * Both are derived from what the audience actually contains — an option that
   * can only ever return zero rows is noise in a segment builder. */
  async filterOptions() {
    const [interestIds, roles] = await Promise.all([
      UserInterestModel.distinct('interest_category_id'),
      UserModel.distinct('metadata.role_keys', { 'metadata.deleted_at': null }),
    ]);
    const cats =
      interestIds.length > 0
        ? await CategoryModel.find({ _id: { $in: interestIds } })
            .select('name')
            .sort({ name: 1 })
        : [];
    return {
      interests: cats.map((c: any) => ({ id: String(c._id), name: c.name })),
      // Same wrong distinct() inference as above — role_keys is always string[].
      roles: (roles as unknown as string[]).slice().sort((a, b) => a.localeCompare(b)),
    };
  },

  async table(input?: TableQueryInput | null) {
    const { base, query } = await translate(input);
    const { docs, total, page, page_size } = await runTableQuery<any>(
      UserModel,
      base,
      query,
      AUDIENCE_TABLE_CONFIG
    );
    const rows = docs.map(toAudienceRow);
    const platforms = await pushPlatformsFor(rows.map((r) => r.id));
    return {
      rows: rows.map((r) => ({ ...r, push_platforms: platforms.get(r.id) ?? [] })),
      total,
      page,
      page_size,
    };
  },
};
