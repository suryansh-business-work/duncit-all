/**
 * `userService` — admin user management: lists and tables, create, update and
 * soft delete. Composed into `userService` in user.service.ts.
 */
import bcrypt from 'bcryptjs';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from './user.model';
import {
  UserRoleModel,
  UserRelationshipModel,
  PodFollowerModel,
  ClubFollowerModel,
  UserSavedPodModel,
  UserInterestModel,
} from './relations';
import { userAuditService } from '@modules/access/userAudit/userAudit.service';
import type { CreateUserDTO, UpdateUserDTO } from './user.validator';
import { rbacService } from '@modules/access/role/rbac.service';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { notifyEvent } from '@services/notify/notify.service';
import { publishSession, toPublic } from './user.public';
import {
  isPlaceholderPhone,
  nextFreeUsername,
  registerDuplicateError,
  shapeUserDoc,
  welcomeNewAccount,
} from './user.accounts';
import { PARTNER_ROLE_LABELS, replaceUserRoles } from './user.roles';
import { splitDataIssuesFilter } from './user.data-issues.query';

// Escape user-supplied search terms before building a RegExp so special chars
// (., *, (, etc.) are matched literally and cannot break the query.
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/** Allowlists for the shared table engine (usersTable — DUNCIT TABLE CONTRACT v1).
 * Storage is nested (profile/auth/metadata), so every API field maps to its db path. */
const USER_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['profile.first_name', 'profile.last_name', 'auth.email', 'auth.phone.number'],
  sortFields: {
    first_name: 'profile.first_name',
    last_name: 'profile.last_name',
    full_name: 'profile.first_name',
    email: 'auth.email',
    phone_number: 'auth.phone.number',
    google_email: 'auth.google_email',
    roles: 'metadata.role_keys',
    role: 'metadata.role_keys',
    city: 'profile.city',
    zone: 'profile.zone',
    status: 'metadata.status',
    last_login_provider: 'auth.last_login_provider',
    last_login_at: 'auth.last_login_at',
    created_at: 'metadata.created_at',
  },
  filterFields: {
    first_name: { path: 'profile.first_name', type: 'string' },
    full_name: { path: 'profile.first_name', type: 'string' },
    phone_number: { path: 'auth.phone.number', type: 'string' },
    google_email: { path: 'auth.google_email', type: 'string' },
    roles: { path: 'metadata.role_keys', type: 'enum' },
    role: { path: 'metadata.role_keys', type: 'enum' },
    status: { path: 'metadata.status', type: 'enum' },
    city: { path: 'profile.city', type: 'string' },
    zone: { path: 'profile.zone', type: 'string' },
    last_login_provider: { path: 'auth.last_login_provider', type: 'enum' },
    last_login_at: { path: 'auth.last_login_at', type: 'date' },
    created_at: { path: 'metadata.created_at', type: 'date' },
  },
  defaultSort: { 'metadata.created_at': -1 },
};

/**
 * Which account-status message a change earns, if any.
 *
 * INACTIVE and SUSPENDED both mean "cannot sign in", so the only edge worth a
 * message is the one that crosses ACTIVE — and re-saving a status it already
 * holds must stay silent, because an account-level send has no entity for the
 * funnel's unique index to dedupe on.
 */

function accountStatusEvent(before: string, after: string): string | null {
  if (before === after) return null;
  if (after === 'ACTIVE') return 'USER_ACCOUNT_REACTIVATED';
  return before === 'ACTIVE' ? 'USER_ACCOUNT_SUSPENDED' : null;
}

// Soft-delete writes for a user: flag the doc (deleted_at + INACTIVE) and hard
// delete the relation rows so counters do not drift. Session-optional so the
// admin remove() can run it inside a transaction (prod replica set). The
// relation deletes are independent, so any-order is fine.
async function softDeleteUserWrites(oid: Types.ObjectId, session?: any) {
  const opts = session ? { session } : {};
  await UserModel.updateOne(
    { _id: oid },
    { $set: { 'metadata.deleted_at': new Date(), 'metadata.status': 'INACTIVE' } },
    opts
  );
  await Promise.all([
    UserRoleModel.deleteMany({ user_id: oid }, opts),
    UserSavedPodModel.deleteMany({ user_id: oid }, opts),
    PodFollowerModel.deleteMany({ user_id: oid }, opts),
    ClubFollowerModel.deleteMany({ user_id: oid }, opts),
    UserInterestModel.deleteMany({ user_id: oid }, opts),
    UserRelationshipModel.deleteMany(
      { $or: [{ follower_id: oid }, { following_id: oid }] },
      opts
    ),
  ]);
}

/** Map the admin UpdateUserDTO field names onto their document dot-paths. */
const ADMIN_UPDATE_PATHS: Record<string, string> = {
  first_name: 'profile.first_name',
  last_name: 'profile.last_name',
  bio: 'profile.bio',
  profile_photo: 'profile.profile_photo',
  city: 'profile.city',
  state: 'profile.state',
  pincode: 'profile.pincode',
  zone: 'profile.zone',
  dob: 'profile.dob',
  status: 'metadata.status',
  assigned_city: 'profile.assigned_city',
  assigned_zones: 'metadata.assigned_zones',
  host_share_pct: 'finance.host_share_pct',
  host_commission_pct: 'finance.host_commission_pct',
};

/** The write an admin edit turns into: fields to set, and fields to remove. */
interface AdminUserWrite {
  set: Record<string, any>;
  unset: Record<string, ''>;
}

/**
 * Clear a contact field by REMOVING it, never by writing a blank.
 *
 * `auth.email` and the `auth.phone` pair each carry a unique index whose
 * partialFilterExpression is `$type: 'string'`. An empty string is a string,
 * so blanking a contact enrols the account in that index under the value '' —
 * and the SECOND account cleared the same way collides with E11000 on a field
 * neither of them has. An absent path is outside the index entirely, which is
 * what the model's own comment says it relies on.
 */
function assignAdminContact(
  write: AdminUserWrite,
  value: string | undefined,
  path: string,
) {
  if (value === undefined) return;
  if (value === '') write.unset[path] = '';
  else write.set[path] = value;
}

/** The phone is one fact in two fields, so it is written — and cleared — whole. */
function assignAdminPhone(write: AdminUserWrite, input: UpdateUserDTO) {
  const number = (input as any).phone_number as string | undefined;
  const extension = (input as any).phone_extension as string | undefined;
  if (number === undefined && extension === undefined) return;
  if (number && isPlaceholderPhone(number)) {
    throw new GraphQLError('Invalid phone number', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  // Clearing the number retires the whole subdocument: `auth.phone` requires
  // both halves when it is present, so a lone extension is not a valid phone.
  if (number === '') {
    write.unset['auth.phone'] = '';
    return;
  }
  assignAdminContact(write, number, 'auth.phone.number');
  assignAdminContact(write, extension, 'auth.phone.extension');
}

/**
 * The WhatsApp number, which carries no unique index and defaults to ''.
 *
 * Blanked rather than unset on purpose: `toPublic` reads it as
 * `wa.number ?? legacy.whatsapp_number ?? ''`, so removing the path would let
 * a stale legacy value answer in its place.
 *
 * `verified_at` is cleared only when the number ACTUALLY moves. The admin form
 * posts all three contact fields on every save, so clearing it unconditionally
 * would quietly un-verify a proved number every time an admin edited the bio.
 */
function assignAdminWhatsApp(set: Record<string, any>, input: UpdateUserDTO, before: any) {
  const number = (input as any).whatsapp_number as string | undefined;
  const extension = (input as any).whatsapp_extension as string | undefined;
  if (extension !== undefined) set['communication.whatsapp.extension'] = extension;
  if (number === undefined) return;
  set['communication.whatsapp.number'] = number;
  const stored = String(before?.communication?.whatsapp?.number ?? '');
  if (number !== stored) set['communication.whatsapp.verified_at'] = null;
}

/**
 * The contact number, whose `is_verified` flag follows the same rule.
 *
 * A number an admin typed has been proved by nobody, so a number that moved is
 * no longer verified — but a form re-posting the SAME number must not strip a
 * flag the person earned by answering a one-time code.
 */
function assignAdminPhoneVerification(
  set: Record<string, any>,
  input: UpdateUserDTO,
  before: any
) {
  const number = (input as any).phone_number as string | undefined;
  if (!number) return;
  const stored = String(before?.auth?.phone?.number ?? '');
  if (number !== stored) set['auth.phone.is_verified'] = false;
}

/**
 * Refuse an admin edit that would move a contact onto an account that has it.
 *
 * Checked before the write so the admin reads "Email already in use" instead
 * of a raw E11000, and scoped with `_id: { $ne }` so re-saving a form without
 * touching the address is never a conflict with the account's own value.
 */
async function assertAdminContactsFree(user_id: string, input: UpdateUserDTO) {
  const others = { _id: { $ne: new Types.ObjectId(user_id) } };
  const email = (input as any).email as string | undefined;
  if (email) {
    const taken = await UserModel.exists({ ...others, 'auth.email': email.trim().toLowerCase() });
    if (taken) throw new GraphQLError('Email already in use', { extensions: { code: 'CONFLICT' } });
  }
  const number = (input as any).phone_number as string | undefined;
  const extension = (input as any).phone_extension as string | undefined;
  if (number && extension) {
    const taken = await UserModel.exists({
      ...others,
      'auth.phone.number': number,
      'auth.phone.extension': extension,
    });
    if (taken) {
      throw new GraphQLError('This phone number is already registered to another account', {
        extensions: { code: 'CONFLICT' },
      });
    }
  }
}

/** Map an error raised by the admin user write onto the error to rethrow. */
function adminUpdateError(e: any): any {
  if (e instanceof GraphQLError) return e;
  return e?.code === 11000 ? registerDuplicateError(e) : e;
}

/**
 * Build the write for an admin user update. Throws on a placeholder phone.
 *
 * `before` is the stored document, needed because two of these fields carry a
 * "this was proved" flag beside them and only a real change may reset it.
 */
function buildAdminUserWrite(input: UpdateUserDTO, before: any): AdminUserWrite {
  const write: AdminUserWrite = { set: {}, unset: {} };
  for (const [field, path] of Object.entries(ADMIN_UPDATE_PATHS)) {
    if ((input as any)[field] !== undefined) write.set[path] = (input as any)[field];
  }
  assignAdminContact(write, (input as any).email, 'auth.email');
  assignAdminPhone(write, input);
  assignAdminPhoneVerification(write.set, input, before);
  assignAdminWhatsApp(write.set, input, before);
  return write;
}

export const userAdminMethods = {
  async list(filter?: {
    role?: string;
    city?: string;
    zone?: string;
    status?: string;
    search?: string;
  }) {
    const query: any = {};
    if (filter?.role) query['metadata.role_keys'] = filter.role;
    if (filter?.city) query['profile.city'] = filter.city;
    if (filter?.zone) query['profile.zone'] = filter.zone;
    if (filter?.status) query['metadata.status'] = filter.status;
    if (filter?.search) {
      const rx = new RegExp(escapeRegExp(filter.search), 'i');
      const or: any[] = [
        { 'profile.first_name': rx },
        { 'profile.last_name': rx },
        { 'auth.email': rx },
        { 'auth.phone.number': rx },
      ];
      // Also match by role: resolve the role keys whose name OR key matches the
      // search term, then look those up against the denormalized role_keys cache.
      const roles = await rbacService.listRoles();
      const matchedKeys = roles
        .filter((r) => r && (rx.test(r.name) || rx.test(r.key)))
        .map((r) => r!.key);
      if (matchedKeys.length) {
        or.push({ 'metadata.role_keys': { $in: matchedKeys } });
      }
      query.$or = or;
    }
    const all = await UserModel.find(query).sort({ 'metadata.created_at': -1 });
    return Promise.all(all.map((u) => toPublic(u)));
  },

  /** Server-side table page (search/filter/sort/paginate) for the usersTable query.
   * A `data_issues` filter is not a stored field, so it becomes the base filter here. */
  async table(input?: TableQueryInput | null) {
    const { base, rest } = await splitDataIssuesFilter(input);
    const { docs, total, page, page_size } = await runTableQuery(
      UserModel,
      base,
      rest,
      USER_TABLE_CONFIG
    );
    return { rows: await Promise.all(docs.map((u) => toPublic(u))), total, page, page_size };
  },

  /** Admin Partners list — every user holding a partner-portal role (Host,
   * Venue Partner, Product Seller, Club Admin). The client's `role` filter
   * narrows to one type; the base $in keeps non-partners out. */
  async partnersTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery(
      UserModel,
      { 'metadata.role_keys': { $in: Object.keys(PARTNER_ROLE_LABELS) } },
      input,
      USER_TABLE_CONFIG
    );
    return { rows: await Promise.all(docs.map((u) => toPublic(u))), total, page, page_size };
  },

  async create(input: CreateUserDTO) {
    if (isPlaceholderPhone(input.phone_number)) {
      throw new GraphQLError('Invalid phone number', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const existing = input.email
      ? await UserModel.findOne({ 'auth.email': input.email })
      : null;
    if (existing) {
      throw new GraphQLError('Email already in use', { extensions: { code: 'CONFLICT' } });
    }
    const hashed = await bcrypt.hash(input.password, 10);
    const username = await nextFreeUsername(input.first_name, input.last_name);
    const created = await UserModel.create(
      shapeUserDoc(input, { passwordHash: hashed, username })
    );
    await replaceUserRoles(String(created._id), (input.roles ?? []) as string[], {
      assignedZones: ((input.assigned_zones ?? []) as string[]).filter(Boolean),
      assignedCity: input.assigned_city ?? null,
    });

    await welcomeNewAccount(created, 'create');
    const fresh = await UserModel.findById(created._id);
    await userAuditService.recordCreate(String(created._id), fresh);
    return toPublic(fresh);
  },

  async update(user_id: string, input: UpdateUserDTO) {
    // Every admin edit is addressed by the id of the record being edited and
    // nothing else. A malformed one is refused here rather than reaching
    // Mongo, which answers a bad id with a CastError the admin cannot act on.
    if (!Types.ObjectId.isValid(user_id)) {
      throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    }
    // A contact moving onto an account that already holds it is a conflict the
    // admin can fix, so it is named before the write. The unique indexes are
    // still the authority — `adminUpdateError` below catches the race where two
    // admins claim the same address between this check and the write.
    await assertAdminContactsFree(user_id, input);
    // `{ new: true }` below hands back the AFTER value, so the status this write
    // moves away from has to be read while it still exists — without it every
    // re-save of an already-suspended account looks like a fresh suspension.
    // The same before-image is what the change log is diffed against, and it is
    // taken here rather than inside applyUserUpdate because the role write
    // below moves fields too: one diff has to span the whole admin save. It is
    // also what tells the write which contact fields ACTUALLY moved.
    const before = await UserModel.findById(user_id).lean();
    const { set, unset } = buildAdminUserWrite(input, before);
    const write: Record<string, any> = {};
    if (Object.keys(set).length > 0) write.$set = set;
    if (Object.keys(unset).length > 0) write.$unset = unset;
    const updated = await UserModel.findByIdAndUpdate(user_id, write, { new: true }).catch(
      (e: any) => {
        throw adminUpdateError(e);
      }
    );
    if (!updated) {
      throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    }
    if ((input as any).roles !== undefined) {
      const inputZones = (input as any).assigned_zones as string[] | undefined;
      const currentZones = (updated.metadata?.assigned_zones ?? []) as string[];
      await replaceUserRoles(user_id, ((input as any).roles ?? []) as string[], {
        assignedZones: (inputZones ?? currentZones).filter(Boolean),
        assignedCity:
          (input as any).assigned_city ?? updated.profile?.assigned_city ?? null,
      });
    }
    const fresh = await UserModel.findById(user_id);
    await userAuditService.record({ userId: user_id, before, after: fresh });
    const statusEvent = input.status
      ? accountStatusEvent(before?.metadata?.status ?? '', input.status)
      : null;
    if (statusEvent) {
      // Both channels. Being suspended is the single most consequential thing
      // that can happen to an account, and it used to be told over WhatsApp
      // alone — which most accounts have no number for, since signup never
      // asks for one.
      await notifyEvent({
        event: statusEvent,
        user: fresh,
        name: fresh?.profile?.first_name,
        params: [fresh?.profile?.first_name],
        email: fresh?.auth?.email ?? '',
        vars: { email: fresh?.auth?.email ?? '' },
      });
    }
    // Admin edits move the same fields a user can change about themselves —
    // name, email, phone, roles — so they must reach the same two places: that
    // person's open sessions, and the mirrored copies the admin tables search.
    // Without this, an admin renaming someone left every venue and approval row
    // showing the old name until that person next edited their own profile.
    return publishSession(await toPublic(fresh));
  },

  async remove(user_id: string) {
    // Soft delete per spec — set metadata.deleted_at, mark INACTIVE. Hard
    // delete of relations is also performed so counters do not drift.
    const oid = new Types.ObjectId(user_id);
    const before = await UserModel.findById(user_id).lean();
    const session = await UserModel.db.startSession();
    try {
      await session.withTransaction(() => softDeleteUserWrites(oid, session));
    } finally {
      await session.endSession();
    }
    const after = await UserModel.findById(user_id).lean();
    await userAuditService.record({ userId: user_id, before, after, action: 'DELETE' });
    return true;
  },
};
