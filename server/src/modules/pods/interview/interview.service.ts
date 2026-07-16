import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { InterviewModel, type IInterview, type InterviewType } from './interview.model';
import { UserModel } from '@modules/access/user/user.model';
import {
  sendInterviewAdminEmail,
  sendInterviewApplicantEmail,
  sendInterviewScheduledEmail,
} from '@services/email/email.service';
import { getUrlConfigs } from '@config/url-configs';

const toPub = (i: IInterview) => ({
  id: String(i._id),
  type: i.type,
  applicant_user_id: String(i.applicant_user_id),
  applicant_name: i.applicant_name,
  applicant_email: i.applicant_email,
  applicant_phone: i.applicant_phone,
  about: i.about,
  business_name: i.business_name ?? null,
  business_address: i.business_address ?? null,
  city: i.city ?? null,
  zone: i.zone ?? null,
  preferred_slots: (i.preferred_slots ?? []).map((s) => ({
    start: s.start.toISOString(),
    end: s.end.toISOString(),
  })),
  scheduled_slot: i.scheduled_slot
    ? { start: i.scheduled_slot.start.toISOString(), end: i.scheduled_slot.end.toISOString() }
    : null,
  status: i.status,
  meeting_link: i.meeting_link ?? null,
  admin_notes: i.admin_notes ?? null,
  created_at: i.created_at.toISOString(),
  updated_at: i.updated_at.toISOString(),
});

const fmtSlot = (s: { start: Date | string; end: Date | string }) => {
  const start = typeof s.start === 'string' ? new Date(s.start) : s.start;
  const end = typeof s.end === 'string' ? new Date(s.end) : s.end;
  const date = start.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const t = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${t(start)} – ${t(end)}`;
};

async function adminEmails(): Promise<string[]> {
  const admins = await UserModel.find({
    'metadata.role_keys': { $in: ['SUPER_ADMIN', 'CITY_ADMIN'] },
    'metadata.status': 'ACTIVE',
    'auth.email': { $ne: null },
  }).select('auth.email');
  return admins.map((u) => u.auth?.email).filter((email): email is string => Boolean(email));
}

export const interviewService = {
  async list(filter?: { status?: string; type?: InterviewType }) {
    const q: any = {};
    if (filter?.status) q.status = filter.status;
    if (filter?.type) q.type = filter.type;
    const docs = await InterviewModel.find(q).sort({ created_at: -1 });
    return docs.map(toPub);
  },

  async getById(id: string) {
    const doc = await InterviewModel.findById(id);
    return doc ? toPub(doc) : null;
  },

  async listForUser(userId: string) {
    const docs = await InterviewModel.find({ applicant_user_id: new Types.ObjectId(userId) }).sort({
      created_at: -1,
    });
    return docs.map(toPub);
  },

  async create(input: any, userId: string) {
    if (!input.preferred_slots?.length)
      throw new GraphQLError('Pick at least one preferred slot', { extensions: { code: 'BAD_USER_INPUT' } });
    if (input.preferred_slots.length > 5)
      throw new GraphQLError('Up to 5 preferred slots allowed', { extensions: { code: 'BAD_USER_INPUT' } });

    const slots = input.preferred_slots.map((s: any) => ({
      start: new Date(s.start),
      end: new Date(s.end),
    }));

    for (const s of slots) {
      if (Number.isNaN(+s.start) || Number.isNaN(+s.end) || s.end <= s.start)
        throw new GraphQLError('Invalid slot range', { extensions: { code: 'BAD_USER_INPUT' } });
    }

    const doc = await InterviewModel.create({
      type: input.type,
      applicant_user_id: new Types.ObjectId(userId),
      applicant_name: input.applicant_name.trim(),
      applicant_email: input.applicant_email.trim(),
      applicant_phone: input.applicant_phone.trim(),
      about: input.about.trim(),
      business_name: input.business_name?.trim() || null,
      business_address: input.business_address?.trim() || null,
      city: input.city?.trim() || null,
      zone: input.zone?.trim() || null,
      preferred_slots: slots,
      status: 'PENDING',
    });

    const slotsText = slots.map(fmtSlot).join('\n');
    const business = [input.business_name, input.business_address].filter(Boolean).join(' — ') || '—';
    const typeLabel = input.type === 'HOST' ? 'Host' : 'Venue';

    // Send applicant confirmation
    try {
      await sendInterviewApplicantEmail({
        to: doc.applicant_email,
        name: doc.applicant_name,
        type: typeLabel,
        about: doc.about,
        slots: slotsText,
        ref: String(doc._id),
      });
    } catch (e) {
       
      console.warn('Applicant email failed', e);
    }

    // Send admin notification
    const adminTo = await adminEmails();
    if (adminTo.length > 0) {
      try {
        const urlConfigs = await getUrlConfigs();
        await sendInterviewAdminEmail({
          to: adminTo.join(','),
          type: typeLabel,
          name: doc.applicant_name,
          email: doc.applicant_email,
          phone: doc.applicant_phone,
          business,
          about: doc.about,
          slots: slotsText,
          adminLink: `${urlConfigs.adminUrl}/interview-requests`,
        });
      } catch (e) {
         
        console.warn('Admin email failed', e);
      }
    }

    return toPub(doc);
  },

  async update(id: string, input: any) {
    const doc = await InterviewModel.findById(id);
    if (!doc) throw new GraphQLError('Interview not found', { extensions: { code: 'NOT_FOUND' } });

    let scheduled = false;
    if (input.scheduled_slot) {
      doc.scheduled_slot = {
        start: new Date(input.scheduled_slot.start),
        end: new Date(input.scheduled_slot.end),
      };
      scheduled = true;
    }
    if (input.status !== undefined) doc.status = input.status;
    if (input.meeting_link !== undefined) doc.meeting_link = input.meeting_link;
    if (input.admin_notes !== undefined) doc.admin_notes = input.admin_notes;

    if (scheduled && doc.status === 'PENDING') doc.status = 'SCHEDULED';

    await doc.save();

    if (scheduled || input.status === 'SCHEDULED') {
      try {
        await sendInterviewScheduledEmail({
          to: doc.applicant_email,
          name: doc.applicant_name,
          type: doc.type === 'HOST' ? 'Host' : 'Venue',
          slot: doc.scheduled_slot ? fmtSlot(doc.scheduled_slot) : 'TBD',
          link: doc.meeting_link || '#',
          ref: String(doc._id),
        });
      } catch (e) {
         
        console.warn('Scheduled email failed', e);
      }
    }

    return toPub(doc);
  },

  async remove(id: string) {
    const res = await InterviewModel.findByIdAndDelete(id);
    return !!res;
  },
};
