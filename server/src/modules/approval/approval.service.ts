import { GraphQLError } from 'graphql';
import { ApprovalRequestModel, type ApprovalStatus, type ApprovalType } from './approval.model';
import { hostService } from '@modules/venues/host/host.service';
import { venueService } from '@modules/venues/venue/venue.service';
import { ecommBrandService } from '@modules/venues/ecommBrand/ecommBrand.service';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

const pub = (doc: any) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    type: o.type,
    status: o.status ?? 'PENDING',
    source_portal: o.source_portal ?? '',
    title: o.title ?? '',
    summary: o.summary ?? '',
    details: (o.details ?? []).map((d: any) => ({ label: d.label, value: d.value ?? '' })),
    kind: o.kind ?? null,
    subject_user_id: o.subject_user_id ? String(o.subject_user_id) : null,
    subject_name: o.subject_name ?? null,
    subject_email: o.subject_email ?? null,
    subject_phone: o.subject_phone ?? null,
    meeting_id: o.meeting_id ? String(o.meeting_id) : null,
    requested_by_name: o.requested_by_name ?? null,
    reviewed_by_name: o.reviewed_by_name ?? null,
    reviewed_at: iso(o.reviewed_at),
    review_notes: o.review_notes ?? null,
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
};

const notFound = () => new GraphQLError('Request not found', { extensions: { code: 'NOT_FOUND' } });

export interface CreateApprovalInput {
  type: ApprovalType;
  source_portal?: string;
  title?: string;
  summary?: string;
  details?: { label: string; value?: string | null }[];
  kind?: string | null;
  subject_user_id?: string | null;
  subject_name?: string | null;
  subject_email?: string | null;
  subject_phone?: string | null;
  meeting_id?: string | null;
  requested_by?: string | null;
  requested_by_name?: string | null;
}

interface Reviewer {
  id?: string | null;
  name?: string | null;
}

/** On approval of an onboarding-meeting request, draft the matching onboarded
 * entity so it surfaces in the portal's Onboarded {Hosts,Venues,Brands} list. */
async function draftOnboardedEntity(doc: any) {
  const prefill = {
    userId: String(doc.subject_user_id),
    name: doc.subject_name ?? '',
    email: doc.subject_email ?? '',
    phone: doc.subject_phone ?? '',
  };
  if (!doc.subject_user_id) return;
  if (doc.kind === 'HOST') await hostService.createDraftFromApproval(prefill);
  else if (doc.kind === 'VENUE') await venueService.createDraftFromApproval(prefill);
  else if (doc.kind === 'ECOMM') await ecommBrandService.createDraftFromApproval(prefill);
}

/** Reflect the decision back onto the source meeting's approval column. */
async function syncMeetingStatus(doc: any, status: 'APPROVED' | 'DENIED') {
  if (!doc.meeting_id) return;
  const { meetingService } = await import('@modules/survey/meeting.service');
  await meetingService.setApprovalStatus(String(doc.meeting_id), status);
}

export const approvalService = {
  async list(filter: { status?: ApprovalStatus | null; type?: string | null } = {}) {
    const q: any = {};
    if (filter.status) q.status = filter.status;
    if (filter.type) q.type = filter.type;
    const docs = await ApprovalRequestModel.find(q).sort({ created_at: -1 });
    return docs.map(pub);
  },

  /** Generic creation — used by the onboarding meeting-feedback flow. */
  async create(input: CreateApprovalInput) {
    const doc = await ApprovalRequestModel.create({
      type: input.type,
      source_portal: input.source_portal ?? '',
      title: input.title ?? '',
      summary: input.summary ?? '',
      details: (input.details ?? []).map((d) => ({ label: d.label, value: d.value ?? '' })),
      kind: input.kind ?? null,
      subject_user_id: input.subject_user_id ?? null,
      subject_name: input.subject_name ?? null,
      subject_email: input.subject_email ?? null,
      subject_phone: input.subject_phone ?? null,
      meeting_id: input.meeting_id ?? null,
      requested_by: input.requested_by ?? null,
      requested_by_name: input.requested_by_name ?? null,
    });
    return pub(doc);
  },

  async approve(id: string, reviewer: Reviewer, notes?: string | null) {
    const doc = await ApprovalRequestModel.findById(id);
    if (!doc) throw notFound();
    if (doc.status !== 'PENDING') {
      throw new GraphQLError('This request has already been reviewed', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    doc.status = 'APPROVED';
    doc.reviewed_by = reviewer.id ?? null;
    doc.reviewed_by_name = reviewer.name ?? null;
    doc.reviewed_at = new Date();
    doc.review_notes = notes ?? null;
    await doc.save();
    if (doc.type === 'ONBOARDING_MEETING_FEEDBACK') {
      await draftOnboardedEntity(doc);
      await syncMeetingStatus(doc, 'APPROVED');
    }
    return pub(doc);
  },

  async deny(id: string, reviewer: Reviewer, notes?: string | null) {
    const doc = await ApprovalRequestModel.findById(id);
    if (!doc) throw notFound();
    if (doc.status !== 'PENDING') {
      throw new GraphQLError('This request has already been reviewed', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    doc.status = 'DENIED';
    doc.reviewed_by = reviewer.id ?? null;
    doc.reviewed_by_name = reviewer.name ?? null;
    doc.reviewed_at = new Date();
    doc.review_notes = notes ?? null;
    await doc.save();
    if (doc.type === 'ONBOARDING_MEETING_FEEDBACK') {
      await syncMeetingStatus(doc, 'DENIED');
    }
    return pub(doc);
  },
};
