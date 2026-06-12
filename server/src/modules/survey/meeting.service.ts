import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { MeetingAvailabilityModel, MeetingModel, type MeetingAvailabilityDoc, type MeetingStatus } from './meeting.model';
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
const MEETING_KIND_LABELS: Record<string, string> = { VENUE: 'Venue', HOST: 'Host', ECOMM: 'Seller' };

async function notifyScheduled(doc: any) {
  const kindLabel = MEETING_KIND_LABELS[doc.kind] ?? 'Host';
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

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const pubAvailability = (doc: MeetingAvailabilityDoc) => ({
  id: String(doc._id),
  week_days: doc.week_days ?? [],
  start_time: doc.start_time,
  end_time: doc.end_time,
  slot_minutes: doc.slot_minutes,
  horizon_days: doc.horizon_days,
  timezone_offset_minutes: doc.timezone_offset_minutes,
});

/**
 * Expand the availability config into concrete future slots. All math is done
 * at the configured fixed UTC offset (wall-clock IST by default): we shift
 * "now" into local time, walk each local day in the horizon, and emit slots
 * between start and end on enabled weekdays. Pure — unit tested.
 */
export function generateSlots(
  av: Pick<MeetingAvailabilityDoc, 'week_days' | 'start_time' | 'end_time' | 'slot_minutes' | 'horizon_days' | 'timezone_offset_minutes'>,
  now: Date = new Date(),
): { start_at: Date; end_at: Date }[] {
  const offsetMs = (av.timezone_offset_minutes ?? 330) * 60_000;
  const slotMs = Math.max(av.slot_minutes ?? 30, 5) * 60_000;
  const startMin = minutesOf(av.start_time ?? '10:00');
  const endMin = minutesOf(av.end_time ?? '19:00');
  const days = new Set(av.week_days ?? []);
  const localNow = new Date(now.getTime() + offsetMs);
  const slots: { start_at: Date; end_at: Date }[] = [];
  for (let i = 0; i < (av.horizon_days ?? 7); i++) {
    const local = new Date(localNow.getTime() + i * 86_400_000);
    if (!days.has(local.getUTCDay())) continue;
    // UTC instant of this local day's midnight.
    const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offsetMs;
    for (let m = startMin; m + av.slot_minutes <= endMin; m += av.slot_minutes) {
      const start = midnight + m * 60_000;
      if (start <= now.getTime()) continue;
      slots.push({ start_at: new Date(start), end_at: new Date(start + slotMs) });
    }
  }
  return slots;
}

/** Instants other (non-cancelled) meetings occupy — scheduled time wins. */
async function occupiedInstants(excludeUserId?: string | null): Promise<Set<number>> {
  const q: any = { status: { $in: ['REQUESTED', 'SCHEDULED'] } };
  if (excludeUserId) q.user_id = { $ne: new Types.ObjectId(excludeUserId) };
  const docs = await MeetingModel.find(q).select('requested_at scheduled_at').lean();
  return new Set(
    docs.map((d: any) => (d.scheduled_at ?? d.requested_at)?.getTime?.()).filter((t: any) => typeof t === 'number'),
  );
}

export const meetingService = {
  /** Global slot-availability config (singleton; created with defaults on first read). */
  async availability() {
    const doc = (await MeetingAvailabilityModel.findOne()) ?? (await MeetingAvailabilityModel.create({}));
    return pubAvailability(doc);
  },

  async updateAvailability(input: {
    week_days?: number[] | null;
    start_time?: string | null;
    end_time?: string | null;
    slot_minutes?: number | null;
    horizon_days?: number | null;
    timezone_offset_minutes?: number | null;
  }) {
    const doc = (await MeetingAvailabilityModel.findOne()) ?? (await MeetingAvailabilityModel.create({}));
    if (input.week_days != null) {
      const days = [...new Set(input.week_days)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
      if (days.length === 0) {
        throw new GraphQLError('Pick at least one working day', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      doc.week_days = days;
    }
    if (input.start_time != null) {
      if (!TIME_RE.test(input.start_time)) throw new GraphQLError('Start time must be HH:mm', { extensions: { code: 'BAD_USER_INPUT' } });
      doc.start_time = input.start_time;
    }
    if (input.end_time != null) {
      if (!TIME_RE.test(input.end_time)) throw new GraphQLError('End time must be HH:mm', { extensions: { code: 'BAD_USER_INPUT' } });
      doc.end_time = input.end_time;
    }
    if (minutesOf(doc.start_time) >= minutesOf(doc.end_time)) {
      throw new GraphQLError('End time must be after the start time', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (input.slot_minutes != null) {
      if (input.slot_minutes < 10 || input.slot_minutes > 240) {
        throw new GraphQLError('Slot length must be between 10 and 240 minutes', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      doc.slot_minutes = input.slot_minutes;
    }
    if (input.horizon_days != null) {
      if (input.horizon_days < 1 || input.horizon_days > 60) {
        throw new GraphQLError('Booking horizon must be between 1 and 60 days', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      doc.horizon_days = input.horizon_days;
    }
    if (input.timezone_offset_minutes != null) doc.timezone_offset_minutes = input.timezone_offset_minutes;
    await doc.save();
    return pubAvailability(doc);
  },

  /** Bookable slots for the gate's meeting step — others' bookings disabled. */
  async slots(userId: string) {
    const doc = (await MeetingAvailabilityModel.findOne()) ?? (await MeetingAvailabilityModel.create({}));
    const taken = await occupiedInstants(userId);
    return generateSlots(doc).map((slot) => ({
      start_at: slot.start_at.toISOString(),
      end_at: slot.end_at.toISOString(),
      available: !taken.has(slot.start_at.getTime()),
    }));
  },

  /** User raises (or updates) their meeting request for a kind. */
  async request(
    userId: string,
    kind: SurveyKind,
    input: { requested_at: string; notes?: string | null; contact_name?: string | null; contact_phone?: string | null },
  ) {
    if (!input.requested_at) throw new GraphQLError('A preferred date & time is required', { extensions: { code: 'BAD_USER_INPUT' } });
    if (!input.contact_phone?.trim()) {
      throw new GraphQLError('Phone number is required so our onboarding team can reach you', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    // Slot race: another user may have just taken this instant.
    const taken = await occupiedInstants(userId);
    if (taken.has(new Date(input.requested_at).getTime())) {
      throw new GraphQLError('That slot was just booked — please pick another one', { extensions: { code: 'CONFLICT' } });
    }
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

  /** All of the user's meetings (one per kind) — drives the Earn page cards. */
  async myMeetings(userId: string) {
    const docs = await MeetingModel.find({ user_id: new Types.ObjectId(userId) }).sort({ kind: 1 });
    return docs.map((d) => pub(d));
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
