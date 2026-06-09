import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { MeetingModel, type MeetingStatus } from './meeting.model';
import { UserModel } from '@modules/access/user/user.model';
import { leadSurveyService } from './leadSurvey.service';
import type { SurveyKind } from './survey.model';
import {
  sendMeetingScheduledEmail,
  sendMeetingScheduledAdminEmail,
} from '@services/email/email.service';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

const pub = (doc: any, names?: Map<string, { name: string; email: string }>) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const u = names?.get(String(o.user_id));
  return {
    id: String(o._id),
    kind: o.kind,
    user_id: String(o.user_id),
    user_name: u?.name ?? null,
    user_email: u?.email ?? null,
    requested_at: iso(o.requested_at),
    scheduled_at: iso(o.scheduled_at),
    meeting_link: o.meeting_link ?? null,
    status: o.status ?? 'REQUESTED',
    notes: o.notes ?? null,
    contact_name: o.contact_name ?? null,
    contact_phone: o.contact_phone ?? null,
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
};

/** Batch-resolve display name + email for the given user ids. */
async function userMap(ids: string[]): Promise<Map<string, { name: string; email: string }>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const users = await UserModel.find({ _id: { $in: unique } }).select('profile.first_name profile.last_name auth.email').lean();
  return new Map(
    users.map((u: any) => [
      String(u._id),
      {
        name: [u.profile?.first_name, u.profile?.last_name].filter(Boolean).join(' ') || u.auth?.email || 'User',
        email: u.auth?.email ?? '',
      },
    ]),
  );
}

/** Active onboarding staff who should be CC'd when a meeting is scheduled. */
async function onboardingAdminEmails(): Promise<string[]> {
  const admins = await UserModel.find({
    'metadata.role_keys': { $in: ['SUPER_ADMIN', 'ONBOARDING_MANAGER'] },
    'metadata.status': 'ACTIVE',
    'auth.email': { $ne: null },
  })
    .select('auth.email')
    .lean();
  return admins.map((u: any) => u.auth?.email).filter(Boolean);
}

const slotLabel = (value?: string | null) =>
  value
    ? `${new Date(value).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: 'UTC' })} UTC`
    : 'To be confirmed';

/** Email the applicant + onboarding staff that a meeting was scheduled. */
async function notifyScheduled(doc: any) {
  const kindLabel = doc.kind === 'VENUE' ? 'Venue' : 'Host';
  const slot = slotLabel(iso(doc.scheduled_at));
  const link = doc.meeting_link || '';
  const notes = doc.notes || '';
  const [names, adminTo] = await Promise.all([
    userMap([String(doc.user_id)]),
    onboardingAdminEmails(),
  ]);
  const host = names.get(String(doc.user_id));
  if (host?.email) {
    await sendMeetingScheduledEmail({ to: host.email, name: host.name, kind: kindLabel, slot, link, notes });
  }
  if (adminTo.length > 0) {
    await sendMeetingScheduledAdminEmail({
      to: adminTo.join(','),
      name: host?.name ?? 'Applicant',
      email: host?.email ?? '',
      kind: kindLabel,
      slot,
      link,
      notes,
    });
  }
}

export interface MeetingFilter {
  kind?: SurveyKind | null;
  status?: MeetingStatus | null;
  from?: string | null;
  to?: string | null;
}

const notFound = () => new GraphQLError('Meeting not found', { extensions: { code: 'NOT_FOUND' } });

export const meetingService = {
  /** User raises (or updates) their meeting request for a kind. */
  async request(
    userId: string,
    kind: SurveyKind,
    input: { requested_at: string; notes?: string | null; contact_name?: string | null; contact_phone?: string | null },
  ) {
    if (!input.requested_at) throw new GraphQLError('A preferred date & time is required', { extensions: { code: 'BAD_USER_INPUT' } });
    const doc = await MeetingModel.findOneAndUpdate(
      { user_id: new Types.ObjectId(userId), kind },
      {
        $set: {
          requested_at: new Date(input.requested_at),
          notes: input.notes ?? null,
          contact_name: input.contact_name ?? null,
          contact_phone: input.contact_phone ?? null,
        },
        $setOnInsert: { status: 'REQUESTED' },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    // Completing the gate (meeting requested) is what pushes the survey data
    // into CRM as a lead. Best-effort — a sync failure must not block the
    // user's meeting request.
    try {
      await leadSurveyService.syncFromGate(userId, kind);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[meeting.request] syncFromGate failed:', err);
    }
    return pub(doc);
  },

  async myMeeting(userId: string, kind: SurveyKind) {
    return pub(await MeetingModel.findOne({ user_id: new Types.ObjectId(userId), kind }));
  },

  /** Onboarding list — calendar uses (from,to); tables use kind. */
  async list(filter: MeetingFilter = {}) {
    const q: any = {};
    if (filter.kind) q.kind = filter.kind;
    if (filter.status) q.status = filter.status;
    if (filter.from || filter.to) {
      // Order by the effective date (scheduled when set, else requested).
      q.$or = [{ scheduled_at: range(filter) }, { scheduled_at: null, requested_at: range(filter) }];
    }
    const docs = await MeetingModel.find(q).sort({ scheduled_at: 1, requested_at: 1 });
    const names = await userMap(docs.map((d: any) => String(d.user_id)));
    return docs.map((d) => pub(d, names));
  },

  /** Onboarding staff schedule/track a meeting (date, link, status, notes). */
  async update(
    id: string,
    input: {
      status?: MeetingStatus | null;
      scheduled_at?: string | null;
      meeting_link?: string | null;
      notes?: string | null;
    },
    by?: string | null,
  ) {
    const doc = await MeetingModel.findById(id);
    if (!doc) throw notFound();
    const touchedSchedule =
      input.scheduled_at !== undefined || input.meeting_link !== undefined || input.status != null;
    if (input.status != null) doc.status = input.status;
    if (input.scheduled_at !== undefined) doc.scheduled_at = input.scheduled_at ? new Date(input.scheduled_at) : null;
    if (input.meeting_link !== undefined) doc.meeting_link = input.meeting_link || null;
    if (input.notes !== undefined) doc.notes = input.notes;
    doc.created_by = doc.created_by ?? by ?? null;
    await doc.save();
    // Notify the applicant + onboarding staff when the meeting is (re)scheduled.
    // Best-effort — an email failure must not fail the staff's update.
    if (doc.status === 'SCHEDULED' && touchedSchedule) {
      try {
        await notifyScheduled(doc);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[meeting.update] notifyScheduled failed:', err);
      }
    }
    return pub(doc);
  },
};

function range(f: MeetingFilter) {
  const r: any = {};
  if (f.from) r.$gte = new Date(f.from);
  if (f.to) r.$lte = new Date(f.to);
  return r;
}
