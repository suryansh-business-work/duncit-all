import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { HostModel, type IHost } from './host.model';
import { UserModel } from '@modules/access/user/user.model';
import { sendEmail } from '@services/email/email.service';
import { normalizeBankAccountInput, toBankAccountPub } from '@modules/finance/finance/bankAccount';

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
  const date = new Date(String(value));
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

const toPub = (h: IHost) => ({
  id: String(h._id),
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
  step_completed: h.step_completed ?? 0,
  status: h.status,
  is_active: h.is_active ?? true,
  reviewer_notes: h.reviewer_notes ?? '',
  submitted_at: h.submitted_at ? h.submitted_at.toISOString() : null,
  approved_at: h.approved_at ? h.approved_at.toISOString() : null,
  rejected_at: h.rejected_at ? h.rejected_at.toISOString() : null,
  created_at: h.created_at?.toISOString?.() ?? '',
  updated_at: h.updated_at?.toISOString?.() ?? '',
});

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

export const hostService = {
  async getMine(userId: string) {
    const h = await HostModel.findOne({ user_id: new Types.ObjectId(userId) });
    return h ? toPub(h) : null;
  },
  async list(filter?: { status?: string }) {
    const q: any = {};
    if (filter?.status) q.status = filter.status;
    const docs = await HostModel.find(q).sort({ created_at: -1 });
    return docs.map(toPub);
  },
  async getById(id: string) {
    const h = await HostModel.findById(id);
    return h ? toPub(h) : null;
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
  async adminUpdate(id: string, opts: { step1: any; step2: any; step3: any; status?: string }) {
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
        // eslint-disable-next-line no-console
        console.warn(`[host.setActive] email failed for ${slug}:`, (err as Error).message);
      }
    }

    return toPub(h);
  },

  async deleteHost(hostId: string) {
    const r = await HostModel.deleteOne({ _id: new Types.ObjectId(hostId) });
    return r.deletedCount > 0;
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
};
