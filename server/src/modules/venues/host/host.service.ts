import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { HostModel, type IHost, type IHostCategory } from './host.model';
import { UserModel } from '@modules/access/user/user.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { sendEmail } from '@services/email/email.service';
import { normalizeBankAccountInput, toBankAccountPub } from '@modules/finance/finance/bankAccount';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { logs } from '@observability/log';

const fail = (code: string, message: string): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

/** Validates one Super → Category → Sub triple against the shared Category
 * collection (ids exist, levels match, parent chain lines up) and returns the
 * denormalized subdoc — same rules the venue category flow enforces. */
async function normalizeHostCategoryInput(input: any): Promise<Omit<IHostCategory, 'request_no'>> {
  const ids = [input.super_category_id, input.category_id, input.sub_category_id].map(String);
  if (ids.some((id) => !Types.ObjectId.isValid(id))) {
    fail('BAD_USER_INPUT', 'Host category selection is invalid');
  }
  const [superCat, category, subCat] = await Promise.all(ids.map((id) => CategoryModel.findById(id)));
  if (superCat?.level !== 'SUPER') fail('BAD_USER_INPUT', 'Select a valid super category');
  if (category?.level !== 'CATEGORY' || String(category.parent_id) !== String(superCat!._id)) {
    fail('BAD_USER_INPUT', 'Select a valid category under the chosen super category');
  }
  if (subCat?.level !== 'SUB' || String(subCat.parent_id) !== String(category!._id)) {
    fail('BAD_USER_INPUT', 'Select a valid sub category under the chosen category');
  }
  return {
    super_category_id: superCat!._id,
    category_id: category!._id,
    sub_category_id: subCat!._id,
    super_category_name: superCat!.name,
    category_name: category!.name,
    sub_category_name: subCat!.name,
  };
}

/** Normalizes an admin-supplied category list: validates each triple, dedupes
 * by sub-category, and preserves the `request_no` of any triple the host
 * already held (so an admin edit never severs a category's HOSTREQ linkage). */
async function normalizeHostCategories(input: any[], existing: IHostCategory[]): Promise<IHostCategory[]> {
  const requestNoBySub = new Map<string, string>();
  for (const c of existing ?? []) {
    if (c.sub_category_id) requestNoBySub.set(String(c.sub_category_id), c.request_no ?? '');
  }
  const seen = new Set<string>();
  const out: IHostCategory[] = [];
  for (const raw of input) {
    const normalized = await normalizeHostCategoryInput(raw);
    const key = String(normalized.sub_category_id);
    if (seen.has(key)) continue; // silently drop duplicate sub-categories
    seen.add(key);
    out.push({ ...normalized, request_no: requestNoBySub.get(key) ?? '' });
  }
  return out;
}

const HOST_DOB_MIN_AGE_YEARS = 18;
const HOST_DOB_MAX_AGE_YEARS = 100;
const HOST_DOB_RANGE_ERROR = `Host age must be between ${HOST_DOB_MIN_AGE_YEARS} and ${HOST_DOB_MAX_AGE_YEARS} years`;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function shiftYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function parseHostDob(value: unknown) {
  if (!value) return null;
  const raw = value as string;
  const date = new Date(String(raw));
  if (Number.isNaN(date.getTime())) {
    throw new GraphQLError('Enter a valid date of birth', { extensions: { code: 'BAD_USER_INPUT' } });
  }

  const normalized = startOfDay(date);
  const today = startOfDay(new Date());
  const minDate = shiftYears(today, -HOST_DOB_MAX_AGE_YEARS);
  const maxDate = shiftYears(today, -HOST_DOB_MIN_AGE_YEARS);
  if (normalized < minDate || normalized > maxDate) {
    throw new GraphQLError(HOST_DOB_RANGE_ERROR, { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return normalized;
}

/**
 * SECURITY: `publicHosts` is an UNAUTHENTICATED discovery query. It used to
 * return the whole Host document, which meant anyone — signed in or not — could
 * read every approved host's Aadhaar number, PAN, bank account, police-
 * verification document, DOB and phone. This strips all of that.
 *
 * What survives is exactly what the discovery UIs actually render (mWeb
 * HostsVenuesPage / PodDetailsPage, mobile HostsVenuesScreen): name, avatar,
 * address, tags, categories. Nothing here is a credential.
 */
const redactForPublic = (h: ReturnType<typeof toPub>) => ({
  ...h,
  email: '',
  phone: '',
  dob: null,
  aadhar_number: '',
  pan_number: '',
  police_verification_url: '',
  bank_account: {
    ...h.bank_account,
    account_number: '',
    ifsc: '',
    upi_id: '',
    account_holder_name: '',
  },
  reviewer_notes: '',
  host_commission_pct: null,
});

const toPub = (h: IHost) => ({
  id: String(h._id),
  host_no: h.host_no ?? null,
  user_id: String(h.user_id),
  full_name: h.full_name ?? '',
  email: h.email ?? '',
  phone: h.phone ?? '',
  dob: h.dob ? h.dob.toISOString() : null,
  aadhar_number: h.aadhar_number ?? '',
  pan_number: h.pan_number ?? '',
  passport_photo_url: h.passport_photo_url ?? '',
  police_verification_url: h.police_verification_url ?? '',
  full_address: h.full_address ?? '',
  bank_account: toBankAccountPub(h.bank_account),
  tags: h.tags ?? [],
  host_categories: (h.host_categories ?? []).map((c) => ({
    super_category_id: c.super_category_id ? String(c.super_category_id) : null,
    category_id: c.category_id ? String(c.category_id) : null,
    sub_category_id: c.sub_category_id ? String(c.sub_category_id) : null,
    super_category_name: c.super_category_name ?? '',
    category_name: c.category_name ?? '',
    sub_category_name: c.sub_category_name ?? '',
    request_no: c.request_no ?? '',
  })),
  step_completed: h.step_completed ?? 0,
  status: h.status,
  is_active: h.is_active ?? true,
  reviewer_notes: h.reviewer_notes ?? '',
  host_commission_pct: null as number | null,
  submitted_at: h.submitted_at ? h.submitted_at.toISOString() : null,
  approved_at: h.approved_at ? h.approved_at.toISOString() : null,
  rejected_at: h.rejected_at ? h.rejected_at.toISOString() : null,
  created_at: h.created_at?.toISOString?.() ?? '',
  updated_at: h.updated_at?.toISOString?.() ?? '',
});

/** Allowlists for the shared table engine (hostsTable — DUNCIT TABLE CONTRACT
 * v1). Onboarded Hosts defaults to newest-first, mirroring list(). */
const HOST_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['host_no', 'full_name', 'email', 'phone'],
  sortFields: {
    host_no: 'host_no',
    full_name: 'full_name',
    email: 'email',
    status: 'status',
    is_active: 'is_active',
    submitted_at: 'submitted_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    status: { type: 'enum' },
    is_active: { type: 'boolean' },
    submitted_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

async function getOrCreate(userId: string) {
  const uid = new Types.ObjectId(userId);
  let h = await HostModel.findOne({ user_id: uid });
  if (!h) h = await HostModel.create({ user_id: uid });
  return h;
}

async function assignApprovedHostRole(userId: Types.ObjectId) {
  const { userService } = await import('@modules/access/user/user.service');
  const u: any = await UserModel.findById(userId).select('metadata.role_keys');
  const current = new Set<string>((u?.metadata?.role_keys ?? []) as string[]);
  current.add('USER');
  current.add('HOST');
  await userService.assignRoles(String(userId), Array.from(current));
}

/** Strip a single role from a user (used on host hard-delete). No-op if the
 * user is gone or never held the role. */
async function removeUserRole(userId: string, role: string) {
  const u: any = await UserModel.findById(userId).select('metadata.role_keys');
  const roles = (u?.metadata?.role_keys ?? []) as string[];
  if (!u || !roles.includes(role)) return;
  const { userService } = await import('@modules/access/user/user.service');
  await userService.assignRoles(userId, roles.filter((r) => r !== role));
}

/** Attach each host's Duncit commission override (User.finance, 0 = inherit)
 * — only for the gated admin/onboarding queries, never for publicHosts. */
async function withCommission(rows: ReturnType<typeof toPub>[]) {
  if (rows.length === 0) return rows;
  const users = await UserModel.find({ _id: { $in: rows.map((r) => r.user_id) } }).select(
    'finance.host_commission_pct'
  );
  const byId = new Map(users.map((u: any) => [String(u._id), u.finance?.host_commission_pct ?? 0]));
  return rows.map((r) => ({ ...r, host_commission_pct: byId.get(r.user_id) ?? 0 }));
}

export const hostService = {
  async getMine(userId: string) {
    const h = await HostModel.findOne({ user_id: new Types.ObjectId(userId) });
    return h ? toPub(h) : null;
  },
  async list(
    filter?: { status?: string; activeOnly?: boolean },
    opts?: { withCommission?: boolean; redacted?: boolean }
  ) {
    const q: any = {};
    if (filter?.status) q.status = filter.status;
    // publicHosts passes activeOnly so deactivated hosts drop off discovery;
    // the onboarding list keeps showing them (to reactivate).
    if (filter?.activeOnly) q.is_active = { $ne: false };
    const docs = await HostModel.find(q).sort({ created_at: -1 });
    const rows = docs.map(toPub);
    // Never hand onboarding PII to an unauthenticated caller.
    if (opts?.redacted) return rows.map(redactForPublic);
    return opts?.withCommission ? withCommission(rows) : rows;
  },
  /** Server-side table page (admin/onboarding hostsTable) — rows carry the
   * per-host commission override exactly like the sibling gated hosts query. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IHost>(
      HostModel,
      {},
      input,
      HOST_TABLE_CONFIG
    );
    return { rows: await withCommission(docs.map(toPub)), total, page, page_size };
  },
  async getById(id: string) {
    const h = await HostModel.findById(id);
    if (!h) return null;
    const [row] = await withCommission([toPub(h)]);
    return row ?? null;
  },
  async submitStep1(userId: string, input: any) {
    const h = await getOrCreate(userId);
    h.full_name = input.full_name;
    h.email = input.email;
    h.phone = input.phone;
    h.dob = parseHostDob(input.dob);
    if (h.step_completed < 1) h.step_completed = 1;
    if (h.status === 'REJECTED') h.status = 'DRAFT';
    await h.save();
    return toPub(h);
  },
  async submitStep2(userId: string, input: any) {
    const h = await getOrCreate(userId);
    if (h.step_completed < 1) {
      throw new GraphQLError('Complete personal details first', { extensions: { code: 'BAD_REQUEST' } });
    }
    h.aadhar_number = input.aadhar_number;
    h.pan_number = input.pan_number;
    h.passport_photo_url = input.passport_photo_url;
    if (h.step_completed < 2) h.step_completed = 2;
    await h.save();
    return toPub(h);
  },
  async submitStep3(userId: string, input: any) {
    const h = await getOrCreate(userId);
    if (h.step_completed < 2) {
      throw new GraphQLError('Complete identity step first', { extensions: { code: 'BAD_REQUEST' } });
    }
    h.police_verification_url = input.police_verification_url;
    h.full_address = input.full_address;
    if (input.bank_account !== undefined) h.bank_account = normalizeBankAccountInput(input.bank_account) as any;
    if (input.tags !== undefined) h.tags = input.tags;
    if (h.step_completed < 3) h.step_completed = 3;
    await h.save();
    return toPub(h);
  },
  async submitFinal(userId: string) {
    const h = await getOrCreate(userId);
    if (h.step_completed < 3) {
      throw new GraphQLError('Complete all steps first', { extensions: { code: 'BAD_REQUEST' } });
    }
    h.step_completed = 4;
    h.status = 'SUBMITTED';
    h.submitted_at = new Date();
    await h.save();
    return toPub(h);
  },
  async withdrawMine(userId: string) {
    const h = await HostModel.findOne({ user_id: new Types.ObjectId(userId) });
    if (!h) throw new GraphQLError('Host application not found', { extensions: { code: 'NOT_FOUND' } });
    if (h.status === 'APPROVED') {
      throw new GraphQLError('Approved host applications cannot be withdrawn', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    h.status = 'DRAFT';
    h.submitted_at = null;
    h.rejected_at = null;
    h.reviewer_notes = '';
    h.step_completed = Math.min(h.step_completed ?? 0, 3);
    await h.save();
    return toPub(h);
  },
  async approve(id: string, notes?: string, tags?: string[]) {
    const h = await HostModel.findById(id);
    if (!h) throw new GraphQLError('Host not found', { extensions: { code: 'NOT_FOUND' } });
    h.status = 'APPROVED';
    h.approved_at = new Date();
    h.reviewer_notes = notes ?? h.reviewer_notes;
    if (tags) h.tags = tags.map((tag) => tag.trim()).filter(Boolean);
    await h.save();
    await assignApprovedHostRole(h.user_id);
    return toPub(h);
  },
  async reject(id: string, notes: string) {
    const h = await HostModel.findById(id);
    if (!h) throw new GraphQLError('Host not found', { extensions: { code: 'NOT_FOUND' } });
    h.status = 'REJECTED';
    h.rejected_at = new Date();
    h.reviewer_notes = notes;
    await h.save();
    return toPub(h);
  },
  async adminCreate(opts: {
    targetUserId: string;
    step1: any;
    step2: any;
    step3: any;
    submit?: boolean;
  }) {
    const h = await getOrCreate(opts.targetUserId);
    const { dob, ...step1 } = opts.step1 ?? {};
    Object.assign(h, step1);
    h.dob = parseHostDob(dob);
    Object.assign(h, opts.step2);
    Object.assign(h, opts.step3);
    if (opts.step3.bank_account !== undefined) h.bank_account = normalizeBankAccountInput(opts.step3.bank_account) as any;
    if (opts.step3.tags !== undefined) h.tags = opts.step3.tags;
    h.step_completed = opts.submit ? 4 : 3;
    if (opts.submit) {
      h.status = 'SUBMITTED';
      h.submitted_at = new Date();
    }
    await h.save();
    return toPub(h);
  },
  async adminUpdate(id: string, opts: { step1: any; step2: any; step3: any; status?: string; categories?: any[] }) {
    const h = await HostModel.findById(id);
    if (!h) throw new GraphQLError('Host not found', { extensions: { code: 'NOT_FOUND' } });
    h.full_name = opts.step1.full_name;
    h.email = opts.step1.email;
    h.phone = opts.step1.phone;
    h.dob = parseHostDob(opts.step1.dob);
    Object.assign(h, opts.step2);
    h.police_verification_url = opts.step3.police_verification_url;
    h.full_address = opts.step3.full_address;
    if (opts.step3.bank_account !== undefined) h.bank_account = normalizeBankAccountInput(opts.step3.bank_account) as any;
    if (opts.step3.tags !== undefined) h.tags = opts.step3.tags;
    if (opts.categories !== undefined) {
      h.host_categories = (await normalizeHostCategories(opts.categories, h.host_categories ?? [])) as any;
    }
    h.step_completed = Math.max(h.step_completed ?? 0, 3);
    if (opts.status) {
      h.status = opts.status as any;
      if (opts.status === 'APPROVED' && !h.approved_at) h.approved_at = new Date();
      if (opts.status === 'SUBMITTED' && !h.submitted_at) h.submitted_at = new Date();
      if (opts.status !== 'REJECTED') h.rejected_at = null;
    }
    await h.save();
    if (opts.status === 'APPROVED') await assignApprovedHostRole(h.user_id);
    return toPub(h);
  },

  async setActive(hostId: string, active: boolean) {
    const h = await HostModel.findById(hostId);
    if (!h) throw new GraphQLError('Host not found', { extensions: { code: 'NOT_FOUND' } });
    h.is_active = active;
    await h.save();

    // Notify the host via the dynamic /email-templates system.
    // The template slug is conventional; admin can edit copy from the admin UI.
    if (h.email) {
      const slug = active ? 'host-activated' : 'host-deactivated';
      try {
        await sendEmail({
          to: h.email,
          subject: active ? 'Your host account is now active' : 'Your host account has been deactivated',
          template: slug,
          vars: {
            host_name: h.full_name ?? '',
            host_email: h.email ?? '',
            status: active ? 'active' : 'deactivated',
          },
        });
      } catch (err) {
        // Email failures should not block the status change.
        logs.server.warn('host.service', 'setActive', {
          error: err,
          slug,
          host_email: h.email,
          msg: `email failed for ${slug}`,
        });
      }
    }

    return toPub(h);
  },

  /** Developer hard-delete: permanently removes a host record everywhere and
   * revokes their HOST role (host↔user is 1:1). BLOCKS when the host still has
   * live (non-deleted) pods so no active pod is orphaned. */
  async deleteHost(hostId: string) {
    if (!Types.ObjectId.isValid(hostId)) fail('BAD_USER_INPUT', 'Invalid host id');
    const host = await HostModel.findById(hostId);
    if (!host) fail('NOT_FOUND', 'Host not found');

    const podCount = await PodModel.countDocuments({ pod_hosts_id: host!.user_id, deleted_at: null });
    if (podCount > 0) {
      fail('BAD_REQUEST', `This host still hosts ${podCount} pod(s). Remove or reassign them before deleting.`);
    }

    await HostModel.deleteOne({ _id: host!._id });
    await removeUserRole(String(host!.user_id), 'HOST');
    return true;
  },

  /** Un-approve a user's host when their HOST role is revoked from Access. */
  async revokeApprovalForUser(userId: string) {
    const h = await HostModel.findOne({ user_id: new Types.ObjectId(userId) });
    if (h?.status === 'APPROVED') {
      h.status = 'REJECTED';
      h.rejected_at = new Date();
      h.reviewer_notes = 'Approval revoked — host access was removed.';
      await h.save();
    }
    return true;
  },

  /** Draft a host shell from an approved onboarding-meeting request so it shows
   * in the Onboarded Hosts list (status DRAFT). Idempotent per user. */
  async createDraftFromApproval(prefill: { userId: string; name?: string; email?: string; phone?: string }) {
    const h = await getOrCreate(prefill.userId);
    if (h.status === 'APPROVED') return toPub(h);
    if (prefill.name && !h.full_name) h.full_name = prefill.name;
    if (prefill.email && !h.email) h.email = prefill.email;
    if (prefill.phone && !h.phone) h.phone = prefill.phone;
    h.status = 'DRAFT';
    await h.save();
    return toPub(h);
  },

  /** Append a category mapping to an approved host from an approved Host Request.
   * Idempotent per request_no so a re-run won't duplicate the entry. */
  async addCategoryFromRequest(hostUserId: string, mapping: IHostCategory) {
    const h = await HostModel.findOne({ user_id: new Types.ObjectId(hostUserId) });
    if (!h) throw new GraphQLError('Host not found', { extensions: { code: 'NOT_FOUND' } });
    const exists = (h.host_categories ?? []).some((c) => c.request_no === mapping.request_no);
    if (!exists) {
      h.host_categories.push({
        super_category_id: mapping.super_category_id ?? null,
        category_id: mapping.category_id ?? null,
        sub_category_id: mapping.sub_category_id ?? null,
        super_category_name: mapping.super_category_name ?? '',
        category_name: mapping.category_name ?? '',
        sub_category_name: mapping.sub_category_name ?? '',
        request_no: mapping.request_no ?? '',
      });
      await h.save();
    }
    return toPub(h);
  },
};
