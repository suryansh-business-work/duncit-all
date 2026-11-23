import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { escapedSearchRegex } from '@utils/table-query';
import { CRM_RW, type CrmLeadEntityType } from '@modules/crm/crm/crm.constants';
import { LEAD_MODELS } from '@modules/crm/crm/leadModels';

/**
 * The CRM team as the CRM sees it: who a lead can be assigned to, who can be
 * @mentioned in a manual log, and the name behind a log's author id.
 *
 * Staff = an ACTIVE, not-deleted user holding a CRM role (CRM_RW). A user who
 * is not staff (an author who has since lost the role) is still named, but
 * their email and roles are withheld — the CRM has no business reading them.
 */
export interface CrmStaffUser {
  id: string;
  name: string;
  email: string | null;
  roles: string[];
  is_staff: boolean;
}

const STAFF_ROLES: readonly string[] = CRM_RW;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_IDS = 100;
const MAX_SEARCH = 100;
const SELECT = 'profile.first_name profile.last_name auth.email metadata.role_keys metadata.status metadata.deleted_at';

interface UserRow {
  _id: unknown;
  profile?: { first_name?: string | null; last_name?: string | null } | null;
  auth?: { email?: string | null } | null;
  metadata?: { role_keys?: string[] | null; status?: string | null; deleted_at?: Date | null } | null;
}

const ACTIVE_STAFF = {
  'metadata.role_keys': { $in: STAFF_ROLES },
  'metadata.status': 'ACTIVE',
  'metadata.deleted_at': null,
};

function isActiveStaff(row: UserRow): boolean {
  const roles = row.metadata?.role_keys ?? [];
  return (
    roles.some((role) => STAFF_ROLES.includes(role)) &&
    (row.metadata?.status ?? 'ACTIVE') === 'ACTIVE' &&
    !row.metadata?.deleted_at
  );
}

export function toStaffUser(row: UserRow): CrmStaffUser {
  const staff = isActiveStaff(row);
  const name = [row.profile?.first_name, row.profile?.last_name].filter(Boolean).join(' ').trim();
  return {
    id: String(row._id),
    name,
    email: staff ? (row.auth?.email ?? null) : null,
    roles: staff ? (row.metadata?.role_keys ?? []).filter((role) => role !== 'USER') : [],
    is_staff: staff,
  };
}

/** Unique, well-formed ObjectId strings, capped — anything else can never match a user. */
export function cleanUserIds(ids: readonly unknown[] | null | undefined, max = MAX_IDS): string[] {
  const out = new Set<string>();
  for (const id of ids ?? []) {
    const value = String(id ?? '').trim();
    if (Types.ObjectId.isValid(value) && /^[a-f\d]{24}$/i.test(value)) out.add(value.toLowerCase());
    if (out.size >= max) break;
  }
  return [...out];
}

const clampLimit = (limit?: number | null) =>
  Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(limit) || DEFAULT_LIMIT)));

/** Staff matching a name/email search, A–Z — the Assigned To picker and the @mention list. */
export async function listAssignableUsers(search?: string | null, limit?: number | null): Promise<CrmStaffUser[]> {
  const filter: Record<string, unknown> = { ...ACTIVE_STAFF };
  const term = (search ?? '').trim().slice(0, MAX_SEARCH);
  if (term) {
    const rx = escapedSearchRegex(term);
    filter.$or = [{ 'profile.first_name': rx }, { 'profile.last_name': rx }, { 'auth.email': rx }];
  }
  const rows = await UserModel.find(filter)
    .select(SELECT)
    .sort({ 'profile.first_name': 1, 'profile.last_name': 1 })
    .limit(clampLimit(limit))
    .lean<UserRow[]>();
  return rows.map(toStaffUser);
}

/** One request for every id a page shows (log authors, the assignee) — no per-row lookups. */
export async function usersByIds(ids: readonly unknown[] | null | undefined): Promise<CrmStaffUser[]> {
  const clean = cleanUserIds(ids);
  if (clean.length === 0) return [];
  const rows = await UserModel.find({ _id: { $in: clean } }).select(SELECT).lean<UserRow[]>();
  return rows.map(toStaffUser);
}

/** Only the ids that are active CRM staff right now — who may be assigned or mentioned. */
export async function activeStaffByIds(ids: readonly unknown[]): Promise<Map<string, CrmStaffUser>> {
  const clean = cleanUserIds(ids);
  if (clean.length === 0) return new Map();
  const rows = await UserModel.find({ _id: { $in: clean }, ...ACTIVE_STAFF }).select(SELECT).lean<UserRow[]>();
  return new Map(rows.map((row) => [String(row._id), toStaffUser(row)]));
}

/** The assignee a lead holds now — read only when an older portal edits the free-text name. */
async function storedAssignee(entity_type: CrmLeadEntityType, id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  const doc = await LEAD_MODELS[entity_type].collection.findOne(
    { _id: new Types.ObjectId(id) },
    { projection: { assigned_to: 1, assigned_user_id: 1 } }
  );
  if (!doc) return null;
  return {
    assigned_to: typeof doc.assigned_to === 'string' ? doc.assigned_to : '',
    assigned_user_id: typeof doc.assigned_user_id === 'string' ? doc.assigned_user_id : null,
  };
}

/**
 * Resolve a lead's assignee before it is saved.
 *
 * - `assigned_user_id` sent (the current portal): a CRM team member, whose
 *   name is copied into `assigned_to` so older app versions and the listing's
 *   sort keep reading a name; null leaves `assigned_to` as sent (unassigned,
 *   or a legacy free-text name the user did not touch).
 * - Only `assigned_to` sent (an older portal): free text, as before. If it no
 *   longer matches the stored name the linked user is dropped, so the id and
 *   the name can never point at two different people.
 */
export async function applyAssignee<T extends Record<string, unknown>>(
  input: T,
  existing?: { entity_type: CrmLeadEntityType; id: string }
): Promise<T> {
  const out: Record<string, unknown> = { ...input };
  if ('assigned_user_id' in input) {
    if (!input.assigned_user_id) {
      out.assigned_user_id = null;
      return out as T;
    }
    const [id] = cleanUserIds([input.assigned_user_id], 1);
    const user = id ? (await activeStaffByIds([id])).get(id) : undefined;
    if (!user) {
      throw new GraphQLError('Assign the lead to an active CRM team member.', {
        extensions: { code: 'BAD_USER_INPUT', field: 'assigned_user_id' },
      });
    }
    out.assigned_user_id = user.id;
    out.assigned_to = user.name || user.email || '';
    return out as T;
  }
  if ('assigned_to' in input && existing) {
    const stored = await storedAssignee(existing.entity_type, existing.id);
    if (stored?.assigned_user_id && stored.assigned_to !== String(input.assigned_to ?? '').trim()) {
      out.assigned_user_id = null;
    }
  }
  return out as T;
}
