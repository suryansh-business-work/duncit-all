import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { HostModel, type IHost } from './host.model';

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
  tags: h.tags ?? [],
  step_completed: h.step_completed ?? 0,
  status: h.status,
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
    h.dob = new Date(input.dob);
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
  async approve(id: string, notes?: string, tags?: string[]) {
    const h = await HostModel.findById(id);
    if (!h) throw new GraphQLError('Host not found', { extensions: { code: 'NOT_FOUND' } });
    h.status = 'APPROVED';
    h.approved_at = new Date();
    h.reviewer_notes = notes ?? h.reviewer_notes;
    if (tags) h.tags = tags.map((tag) => tag.trim()).filter(Boolean);
    await h.save();
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
    Object.assign(h, opts.step1);
    if (opts.step1?.dob) h.dob = new Date(opts.step1.dob);
    Object.assign(h, opts.step2);
    Object.assign(h, opts.step3);
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
    h.dob = opts.step1.dob ? new Date(opts.step1.dob) : null;
    Object.assign(h, opts.step2);
    h.police_verification_url = opts.step3.police_verification_url;
    h.full_address = opts.step3.full_address;
    if (opts.step3.tags !== undefined) h.tags = opts.step3.tags;
    h.step_completed = Math.max(h.step_completed ?? 0, 3);
    if (opts.status) {
      h.status = opts.status as any;
      if (opts.status === 'APPROVED' && !h.approved_at) h.approved_at = new Date();
      if (opts.status === 'SUBMITTED' && !h.submitted_at) h.submitted_at = new Date();
      if (opts.status !== 'REJECTED') h.rejected_at = null;
    }
    await h.save();
    return toPub(h);
  },
};
