import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { MeetingAvailabilityModel, MeetingHolidayModel, MeetingModel, nextMeetingRequestNo, type MeetingAvailabilityDoc, type HolidayType, type MeetingStatus, type MeetingApprovalStatus } from './meeting.model';
import { UserModel } from '@modules/access/user/user.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { leadSurveyService } from './leadSurvey.service';
import { surveyService } from './survey.service';
import { approvalService } from '@modules/approval/approval.service';
import type { SurveyKind } from './survey.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  sendMeetingBookedEmail,
  sendMeetingCancelledEmail,
  sendMeetingScheduledEmail,
  sendMeetingScheduledAdminEmail,
  sendMeetingRescheduledEmail,
  sendMeetingApprovedEmail,
  sendMeetingRejectedEmail,
} from '@services/email/email.service';

/** Where a meeting notification deep-links to — the Earn surface holds the
 * meeting card with its full details on every client. */
const MEETING_DEEP_LINK = '/earn';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);
const oid = (v?: string | null) => (v ? new Types.ObjectId(v) : null);

const pub = (doc: any, names?: Map<string, { name: string; email: string }>, catNames?: Map<string, string>) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const u = names?.get(String(o.user_id));
  const cat = (id: any) => (id && catNames ? catNames.get(String(id)) ?? null : null);
  return {
    id: String(o._id),
    request_no: o.request_no ?? null,
    kind: o.kind,
    user_id: String(o.user_id),
    user_name: u?.name ?? null,
    user_email: u?.email ?? null,
    super_category_name: cat(o.super_category_id),
    category_name: cat(o.category_id),
    sub_category_name: cat(o.sub_category_id),
    reschedule_count: o.reschedule_count ?? 0,
    requested_at: iso(o.requested_at),
    scheduled_at: iso(o.scheduled_at),
    meeting_link: o.meeting_link ?? null,
    status: o.status ?? 'REQUESTED',
    cancel_reason: o.cancel_reason ?? null,
    dismissed: !!o.dismissed,
    notes: o.notes ?? null,
    contact_name: o.contact_name ?? null,
    contact_phone: o.contact_phone ?? null,
    approval_status: o.approval_status ?? 'NONE',
    feedback: o.feedback ?? null,
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

/** Batch-resolve category names for the super/category/sub ids on the docs. */
async function categoryNameMap(docs: any[]): Promise<Map<string, string>> {
  const ids = new Set<string>();
  for (const d of docs) {
    for (const k of ['super_category_id', 'category_id', 'sub_category_id'] as const) {
      if (d[k]) ids.add(String(d[k]));
    }
  }
  if (ids.size === 0) return new Map();
  const cats = await CategoryModel.find({ _id: { $in: [...ids] } }).select('name').lean();
  return new Map(cats.map((c: any) => [String(c._id), c.name as string]));
}

/** Best-effort in-app (Notification Center) message to a single user. The
 * optional link_url deep-links the notification tap to the meeting surface. */
async function notifyUserInApp(userId: string, title: string, body: string, link_url?: string | null) {
  try {
    const { notificationService } = await import('@modules/engagement/notification/notification.service');
    await notificationService.create({ title, body, scope: 'USER', target_user_ids: [userId], silent: false, link_url: link_url ?? null });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[meeting] in-app notification failed:', err);
  }
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

/** Fixed-offset timezone label, e.g. "GMT+5:30" (IST) — meetings use one
 * configured offset, so we render the wall-clock time at that offset. */
function gmtLabel(offsetMin: number): string {
  const sign = offsetMin < 0 ? '-' : '+';
  const abs = Math.abs(offsetMin);
  return `GMT${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
}

/** Human slot label in the configured onboarding timezone (not UTC) so the
 * applicant always sees the meeting time + zone they'll actually attend. */
function slotLabelTz(value: string | null | undefined, offsetMin: number): string {
  if (!value) return 'To be confirmed';
  const shifted = new Date(new Date(value).getTime() + offsetMin * 60_000);
  const formatted = shifted.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: 'UTC' });
  return `${formatted} ${gmtLabel(offsetMin)}`;
}

const MEETING_KIND_LABELS: Record<string, string> = { VENUE: 'Venue', HOST: 'Host', ECOMM: 'Seller' };

type MeetingEvent = 'scheduled' | 'rescheduled' | 'updated' | 'approved' | 'rejected';

const MEETING_EVENT_INAPP: Record<MeetingEvent, (kind: string, slot: string) => { title: string; body: string }> = {
  scheduled: (kind, slot) => ({ title: 'Onboarding meeting scheduled', body: `Your ${kind} onboarding meeting is scheduled for ${slot}.` }),
  rescheduled: (kind, slot) => ({ title: 'Onboarding meeting rescheduled', body: `Your ${kind} onboarding meeting was moved to ${slot}.` }),
  updated: (kind) => ({ title: 'Onboarding meeting updated', body: `The details of your ${kind} onboarding meeting were updated.` }),
  approved: (kind) => ({ title: 'Onboarding approved 🎉', body: `Your ${kind} onboarding has been approved — open the app to get started.` }),
  rejected: (kind) => ({ title: 'Onboarding update', body: `There's an update on your ${kind} onboarding request.` }),
};

/**
 * Single source for staff-driven meeting events: fires the in-app Notification
 * Center message (with a deep-link to the Earn surface) AND the matching email.
 * Best-effort per channel — callers wrap in try/catch so a delivery failure
 * never blocks the state change. Content is kept consistent across channels.
 */
async function notifyMeetingEvent(doc: any, event: MeetingEvent) {
  const kindLabel = MEETING_KIND_LABELS[doc.kind] ?? 'Host';
  const [names, av] = await Promise.all([
    userMap([String(doc.user_id)]),
    MeetingAvailabilityModel.findOne(),
  ]);
  const who = names.get(String(doc.user_id));
  const offset = av?.timezone_offset_minutes ?? 330;
  const slot = slotLabelTz(iso(doc.scheduled_at ?? doc.requested_at), offset);
  const link = doc.meeting_link || '';
  const notes = doc.notes || '';

  const inApp = MEETING_EVENT_INAPP[event](kindLabel, slot);
  await notifyUserInApp(String(doc.user_id), inApp.title, inApp.body, MEETING_DEEP_LINK);

  if (!who?.email) return;
  if (event === 'scheduled') {
    await sendMeetingScheduledEmail({ to: who.email, name: who.name, kind: kindLabel, slot, link, notes });
    const adminTo = await onboardingAdminEmails();
    if (adminTo.length > 0) {
      await sendMeetingScheduledAdminEmail({ to: adminTo.join(','), name: who.name, email: who.email, kind: kindLabel, slot, link, notes });
    }
  } else if (event === 'rescheduled' || event === 'updated') {
    await sendMeetingRescheduledEmail({ to: who.email, name: who.name, kind: kindLabel, slot, link, notes, change: event });
  } else if (event === 'approved') {
    await sendMeetingApprovedEmail({ to: who.email, name: who.name, kind: kindLabel });
  } else {
    await sendMeetingRejectedEmail({ to: who.email, name: who.name, kind: kindLabel });
  }
}

export interface MeetingFilter {
  kind?: SurveyKind | null;
  status?: MeetingStatus | null;
  from?: string | null;
  to?: string | null;
}

/** Allowlists for the shared table engine (onboardingMeetingsTable — DUNCIT TABLE CONTRACT v1). */
const MEETING_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['request_no', 'contact_name', 'contact_phone'],
  sortFields: {
    request_no: 'request_no',
    kind: 'kind',
    status: 'status',
    approval_status: 'approval_status',
    requested_at: 'requested_at',
    scheduled_at: 'scheduled_at',
    created_at: 'created_at',
  },
  filterFields: {
    kind: { type: 'enum' },
    status: { type: 'enum' },
    approval_status: { type: 'enum' },
    dismissed: { type: 'boolean' },
    requested_at: { type: 'date' },
    scheduled_at: { type: 'date' },
  },
  // Mirrors list(): order by the effective date (scheduled, then requested).
  defaultSort: { scheduled_at: 1, requested_at: 1 },
};

const notFound = () => new GraphQLError('Meeting not found', { extensions: { code: 'NOT_FOUND' } });

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const pad2 = (n: number) => String(n).padStart(2, '0');

/** Availability input guards — a bad value is a BAD_USER_INPUT error. */
function assertHhmm(value: string, label: string) {
  if (!TIME_RE.test(value)) {
    throw new GraphQLError(`${label} must be HH:mm`, { extensions: { code: 'BAD_USER_INPUT' } });
  }
}

function assertRange(value: number, min: number, max: number, message: string) {
  if (value < min || value > max) {
    throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
  }
}

/** Wall-clock (offset-shifted) calendar day 'YYYY-MM-DD' for an instant. */
function localDayKey(instantMs: number, offsetMin: number): string {
  const local = new Date(instantMs + offsetMin * 60_000);
  return `${local.getUTCFullYear()}-${pad2(local.getUTCMonth() + 1)}-${pad2(local.getUTCDate())}`;
}

/** Holiday day keys ('YYYY-MM-DD') — onboarding-team leave that blocks slots. */
async function holidayDaySet(): Promise<Set<string>> {
  const docs = await MeetingHolidayModel.find().select('date').lean();
  return new Set(docs.map((d: any) => d.date as string));
}

/** True when the requested instant falls on a configured holiday. */
async function isHolidayInstant(requestedAt: string): Promise<boolean> {
  const [av, holidays] = await Promise.all([MeetingAvailabilityModel.findOne(), holidayDaySet()]);
  const offset = av?.timezone_offset_minutes ?? 330;
  return holidays.has(localDayKey(new Date(requestedAt).getTime(), offset));
}

const pubHoliday = (doc: any) => ({
  id: String(doc._id),
  date: doc.date,
  name: doc.name ?? '',
  type: doc.type ?? 'PUBLIC_HOLIDAY',
});

const HOLIDAY_BLOCKED = 'Our onboarding team is on leave that day — please pick another slot';

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
  holidays: Set<string> = new Set(),
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
    // Skip onboarding-team holidays / leave days.
    if (holidays.has(`${local.getUTCFullYear()}-${pad2(local.getUTCMonth() + 1)}-${pad2(local.getUTCDate())}`)) continue;
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

interface OccupyOpts {
  /** Skip a user's own meetings (gate: keep your held slot selectable). */
  excludeUserId?: string | null;
  /** Skip one specific meeting (staff scheduling: keep its own slot selectable). */
  excludeMeetingId?: string | null;
}

/** Effective busy instants of other non-cancelled meetings — scheduled time wins. */
async function occupiedInstants(opts: OccupyOpts = {}): Promise<number[]> {
  const q: any = { status: { $in: ['REQUESTED', 'SCHEDULED'] } };
  if (opts.excludeUserId) q.user_id = { $ne: new Types.ObjectId(opts.excludeUserId) };
  if (opts.excludeMeetingId) q._id = { $ne: new Types.ObjectId(opts.excludeMeetingId) };
  const docs = await MeetingModel.find(q).select('requested_at scheduled_at').lean();
  return docs
    .map((d: any) => (d.scheduled_at ?? d.requested_at)?.getTime?.())
    .filter((t: any): t is number => typeof t === 'number');
}

/** A candidate instant collides with a busy one when their slot windows overlap
 * (covers staff-scheduled times that fall off the regular slot grid). */
const isTaken = (instant: number, busy: number[], slotMs: number) =>
  busy.some((t) => Math.abs(t - instant) < slotMs);

/** Slot length (ms) from the availability singleton — drives overlap windows. */
async function slotWindowMs(): Promise<number> {
  const av = await MeetingAvailabilityModel.findOne();
  return Math.max(av?.slot_minutes ?? 30, 5) * 60_000;
}

/**
 * Notify the applicant after staff schedule / reschedule / update a confirmed
 * meeting — the distinct events drive distinct copy. Best-effort: a delivery
 * failure must not fail the staff's update.
 */
async function notifyScheduleChange(doc: any, wasScheduled: boolean, prevScheduledMs: number | null) {
  const newScheduledMs = doc.scheduled_at?.getTime() ?? null;
  let event: MeetingEvent;
  if (!wasScheduled) {
    event = 'scheduled';
  } else if (newScheduledMs === prevScheduledMs) {
    event = 'updated';
  } else {
    event = 'rescheduled';
  }
  try {
    await notifyMeetingEvent(doc, event);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[meeting.update] notify failed:', err);
  }
}

/** Best-effort applicant notification for booking + cancellation actions. */
async function notifyApplicant(doc: any, kind: 'booked' | 'cancelled', reason?: string) {
  try {
    const [names, av] = await Promise.all([userMap([String(doc.user_id)]), MeetingAvailabilityModel.findOne()]);
    const who = names.get(String(doc.user_id));
    if (!who?.email) return;
    const opts = {
      to: who.email,
      name: who.name,
      kind: MEETING_KIND_LABELS[doc.kind] ?? 'Host',
      slot: slotLabelTz(iso(doc.scheduled_at ?? doc.requested_at), av?.timezone_offset_minutes ?? 330),
      notes: doc.notes || '',
    };
    if (kind === 'booked') await sendMeetingBookedEmail(opts);
    else await sendMeetingCancelledEmail({ ...opts, reason: reason ?? '' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[meeting] applicant email failed:', err);
  }
}

/** The staff-editable fields of a meeting (Onboarding portal update form). */
interface MeetingStaffInput {
  status?: MeetingStatus | null;
  scheduled_at?: string | null;
  meeting_link?: string | null;
  notes?: string | null;
}

/** Staff can't schedule onto a slot another applicant already holds. */
async function assertStaffSlotFree(meetingId: string, scheduledAt: string) {
  const [busy, slotMs] = await Promise.all([occupiedInstants({ excludeMeetingId: meetingId }), slotWindowMs()]);
  if (isTaken(new Date(scheduledAt).getTime(), busy, slotMs)) {
    throw new GraphQLError('That slot is already taken by another meeting', { extensions: { code: 'CONFLICT' } });
  }
}

/** Anything schedule-related in the staff edit — drives the applicant notify. */
const touchesSchedule = (input: MeetingStaffInput) =>
  input.scheduled_at !== undefined || input.meeting_link !== undefined || input.status != null;

/** Write the staff-editable fields onto the doc (caller saves). */
function applyStaffFields(doc: any, input: MeetingStaffInput, by?: string | null) {
  if (input.status != null) doc.status = input.status;
  if (input.scheduled_at !== undefined) doc.scheduled_at = input.scheduled_at ? new Date(input.scheduled_at) : null;
  if (input.meeting_link !== undefined) doc.meeting_link = input.meeting_link || null;
  if (input.notes !== undefined) doc.notes = input.notes;
  doc.created_by = doc.created_by ?? by ?? null;
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
      assertHhmm(input.start_time, 'Start time');
      doc.start_time = input.start_time;
    }
    if (input.end_time != null) {
      assertHhmm(input.end_time, 'End time');
      doc.end_time = input.end_time;
    }
    if (minutesOf(doc.start_time) >= minutesOf(doc.end_time)) {
      throw new GraphQLError('End time must be after the start time', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (input.slot_minutes != null) {
      assertRange(input.slot_minutes, 10, 240, 'Slot length must be between 10 and 240 minutes');
      doc.slot_minutes = input.slot_minutes;
    }
    if (input.horizon_days != null) {
      assertRange(input.horizon_days, 1, 60, 'Booking horizon must be between 1 and 60 days');
      doc.horizon_days = input.horizon_days;
    }
    if (input.timezone_offset_minutes != null) doc.timezone_offset_minutes = input.timezone_offset_minutes;
    await doc.save();
    return pubAvailability(doc);
  },

  /** Onboarding-team holidays / leave days (sorted by date). */
  async holidays() {
    const docs = await MeetingHolidayModel.find().sort({ date: 1 });
    return docs.map(pubHoliday);
  },

  /** Add (or update) a holiday — one entry per calendar day. */
  async addHoliday(input: { date: string; name?: string | null; type?: HolidayType | null }) {
    if (!DATE_RE.test(input.date ?? '')) {
      throw new GraphQLError('Holiday date must be YYYY-MM-DD', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await MeetingHolidayModel.findOneAndUpdate(
      { date: input.date },
      { $set: { name: input.name ?? '', type: input.type ?? 'PUBLIC_HOLIDAY' } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return pubHoliday(doc);
  },

  async removeHoliday(id: string) {
    const r = await MeetingHolidayModel.deleteOne({ _id: new Types.ObjectId(id) });
    return r.deletedCount > 0;
  },

  /** Bookable slots — booked instants disabled.
   * - Staff scheduling a specific meeting pass `excludeMeetingId`: only OTHER
   *   meetings block it.
   * - The user gate/reschedule pass `kind`: block other users AND the caller's
   *   own OTHER-kind meetings (so a slot already booked in another onboarding
   *   flow shows unavailable), while keeping the caller's own same-kind slot
   *   selectable — matching request()/reschedule validation. */
  async slots(userId: string, opts: { kind?: SurveyKind | null; excludeMeetingId?: string | null } = {}) {
    const doc = (await MeetingAvailabilityModel.findOne()) ?? (await MeetingAvailabilityModel.create({}));
    let occupy: OccupyOpts;
    if (opts.excludeMeetingId) {
      occupy = { excludeMeetingId: opts.excludeMeetingId };
    } else if (opts.kind) {
      const own = await MeetingModel.findOne({ user_id: new Types.ObjectId(userId), kind: opts.kind }).select('_id');
      occupy = own ? { excludeMeetingId: String(own._id) } : {};
    } else {
      occupy = { excludeUserId: userId };
    }
    const [busy, holidays] = await Promise.all([occupiedInstants(occupy), holidayDaySet()]);
    const slotMs = Math.max(doc.slot_minutes ?? 30, 5) * 60_000;
    return generateSlots(doc, new Date(), holidays).map((slot) => ({
      start_at: slot.start_at.toISOString(),
      end_at: slot.end_at.toISOString(),
      available: !isTaken(slot.start_at.getTime(), busy, slotMs),
    }));
  },

  /** User raises (or updates) their meeting request for a kind. */
  async request(
    userId: string,
    kind: SurveyKind,
    input: {
      requested_at: string;
      notes?: string | null;
      contact_name?: string | null;
      contact_phone?: string | null;
      super_category_id?: string | null;
      category_id?: string | null;
      sub_category_id?: string | null;
    },
  ) {
    if (!input.requested_at) throw new GraphQLError('A preferred date & time is required', { extensions: { code: 'BAD_USER_INPUT' } });
    if (!input.contact_phone?.trim()) {
      throw new GraphQLError('Phone number is required so our onboarding team can reach you', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    // Slot race: block other users AND this user's other-kind meetings at the
    // same instant — only the caller's own meeting for THIS kind is excluded.
    const own = await MeetingModel.findOne({ user_id: new Types.ObjectId(userId), kind }).select('_id request_no status approval_status');
    // Onboarding still in process: the interview happened (DONE) but the admin has
    // not yet approved/denied the feedback — the user must not re-apply until then.
    if (own?.status === 'DONE' && (own.approval_status === 'NONE' || own.approval_status === 'PENDING')) {
      throw new GraphQLError('Onboarding in process.', { extensions: { code: 'CONFLICT' } });
    }
    const [busy, slotMs] = await Promise.all([
      occupiedInstants(own ? { excludeMeetingId: String(own._id) } : {}),
      slotWindowMs(),
    ]);
    if (isTaken(new Date(input.requested_at).getTime(), busy, slotMs)) {
      throw new GraphQLError('That slot is already booked — please pick another one', { extensions: { code: 'CONFLICT' } });
    }
    if (await isHolidayInstant(input.requested_at)) {
      throw new GraphQLError(HOLIDAY_BLOCKED, { extensions: { code: 'CONFLICT' } });
    }
    // Assign a request id once and keep it across re-requests of the same
    // user+kind (also back-fills legacy rows that predate the field).
    const requestNo = own?.request_no ?? (await nextMeetingRequestNo(kind));
    // A fresh booking restarts the request — a previously CANCELLED meeting (or a
    // DONE one the admin DENIED) comes back as REQUESTED so the Earn card locks
    // again. A DONE meeting still awaiting approval was already blocked above.
    const doc = await MeetingModel.findOneAndUpdate(
      { user_id: new Types.ObjectId(userId), kind },
      {
        $set: {
          request_no: requestNo,
          requested_at: new Date(input.requested_at),
          notes: input.notes ?? null,
          contact_name: input.contact_name ?? null,
          contact_phone: input.contact_phone ?? null,
          super_category_id: oid(input.super_category_id),
          category_id: oid(input.category_id),
          sub_category_id: oid(input.sub_category_id),
          status: 'REQUESTED',
          scheduled_at: null,
          meeting_link: null,
          cancel_reason: null,
          reschedule_count: 0,
          reschedule_reason: null,
          approval_status: 'NONE',
          feedback: null,
          dismissed: false,
        },
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
    await notifyApplicant(doc, 'booked');
    return pub(doc);
  },

  /** User moves their own meeting to a new open slot. Contact details are kept;
   * any staff scheduling is reset since the time changed. */
  async rescheduleMyMeeting(userId: string, kind: SurveyKind, requestedAt: string, reason?: string | null) {
    if (!requestedAt) throw new GraphQLError('A new date & time is required', { extensions: { code: 'BAD_USER_INPUT' } });
    const doc = await MeetingModel.findOne({ user_id: new Types.ObjectId(userId), kind });
    if (!doc) throw notFound();
    // Reschedule is a one-time option.
    if ((doc.reschedule_count ?? 0) >= 1) {
      throw new GraphQLError('You have already used your one-time reschedule option', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    // Block other users' slots and the user's own other-kind meetings.
    const [busy, slotMs] = await Promise.all([occupiedInstants({ excludeMeetingId: String(doc._id) }), slotWindowMs()]);
    // A reschedule must move to a DIFFERENT slot — the current one is shown for
    // reference only and cannot be re-picked.
    const currentMs = (doc.scheduled_at ?? doc.requested_at)?.getTime();
    if (currentMs != null && Math.abs(new Date(requestedAt).getTime() - currentMs) < slotMs) {
      throw new GraphQLError('Please choose a different time slot to reschedule', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (isTaken(new Date(requestedAt).getTime(), busy, slotMs)) {
      throw new GraphQLError('That slot is already booked — please pick another one', { extensions: { code: 'CONFLICT' } });
    }
    if (await isHolidayInstant(requestedAt)) {
      throw new GraphQLError(HOLIDAY_BLOCKED, { extensions: { code: 'CONFLICT' } });
    }
    doc.requested_at = new Date(requestedAt);
    doc.scheduled_at = null;
    doc.meeting_link = null;
    doc.status = 'REQUESTED';
    doc.reschedule_count = (doc.reschedule_count ?? 0) + 1;
    doc.reschedule_reason = reason?.trim() || null;
    await doc.save();
    await notifyApplicant(doc, 'booked');
    return pub(doc);
  },

  /** User cancels their own meeting — frees the slot and unlocks the Earn card. */
  async cancelMyMeeting(userId: string, kind: SurveyKind, reason?: string | null) {
    const doc = await MeetingModel.findOne({ user_id: new Types.ObjectId(userId), kind });
    if (!doc) throw notFound();
    doc.status = 'CANCELLED';
    doc.cancel_reason = reason?.trim() || null;
    await doc.save();
    await notifyApplicant(doc, 'cancelled');
    return pub(doc);
  },

  /** Onboarding staff cancel a meeting with a reason (e.g. survey not
   * satisfying) — the applicant is emailed the reason and asked to fill the
   * survey again and book a new slot. */
  async cancelByStaff(id: string, reason: string) {
    if (!reason?.trim()) {
      throw new GraphQLError('A cancellation reason is required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await MeetingModel.findById(id);
    if (!doc) throw notFound();
    doc.status = 'CANCELLED';
    doc.cancel_reason = reason.trim();
    await doc.save();
    await notifyApplicant(
      doc,
      'cancelled',
      `Reason: ${reason.trim()}. Please fill the survey again and book a new slot from Earn with Duncit.`,
    );
    await notifyUserInApp(
      String(doc.user_id),
      'Onboarding meeting cancelled',
      `Your ${MEETING_KIND_LABELS[doc.kind] ?? 'onboarding'} meeting was cancelled. Reason: ${reason.trim()}`,
      MEETING_DEEP_LINK,
    );
    return pub(doc);
  },

  /** Onboarding staff hide a cancelled meeting from the calendar (Outlook
   * "remove from my calendar") — the record stays for audit. */
  async dismiss(id: string) {
    const doc = await MeetingModel.findById(id);
    if (!doc) throw notFound();
    if (doc.status !== 'CANCELLED') {
      throw new GraphQLError('Only cancelled meetings can be removed from the calendar', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    doc.dismissed = true;
    await doc.save();
    return pub(doc);
  },

  /** Onboarding staff send post-meeting feedback + the applicant's survey
   * answers to the Admin console for approval. Only a DONE meeting can be sent;
   * a DENIED meeting can be re-sent. */
  async sendFeedback(id: string, feedback: string, by: { id?: string | null; name?: string | null }) {
    if (!feedback?.trim()) {
      throw new GraphQLError('Add your feedback before sending', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await MeetingModel.findById(id);
    if (!doc) throw notFound();
    if (doc.status !== 'DONE') {
      throw new GraphQLError('Mark the meeting as done before sending feedback', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (doc.approval_status !== 'NONE') {
      throw new GraphQLError('Feedback has already been sent for this meeting', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const [names, responses] = await Promise.all([
      userMap([String(doc.user_id)]),
      surveyService.userResponses(String(doc.user_id)),
    ]);
    const who = names.get(String(doc.user_id));
    const kindLabel = MEETING_KIND_LABELS[doc.kind] ?? 'Host';
    // Survey answers for this kind become the approval request's detail rows.
    const surveyDetails = responses
      .filter((r: any) => r.kind === doc.kind)
      .flatMap((r: any) => (r.items ?? []).map((it: any) => ({ label: it.label, value: it.answer })));
    const details = [...surveyDetails, { label: 'Interviewer feedback', value: feedback.trim() }];
    await approvalService.create({
      type: 'ONBOARDING_MEETING_FEEDBACK',
      source_portal: 'onboarding',
      title: `${kindLabel} onboarding — ${who?.name ?? 'Applicant'}`,
      summary: `Approve to draft this ${kindLabel.toLowerCase()} into the onboarded list.`,
      details,
      kind: doc.kind,
      subject_user_id: String(doc.user_id),
      subject_name: who?.name ?? null,
      subject_email: who?.email ?? null,
      subject_phone: doc.contact_phone ?? null,
      meeting_id: String(doc._id),
      requested_by: by.id ?? null,
      requested_by_name: by.name ?? null,
    });
    doc.feedback = feedback.trim();
    doc.feedback_sent_at = new Date();
    doc.approval_status = 'PENDING';
    await doc.save();
    return pub(doc);
  },

  /** Set by the Admin console's approve/deny actions (via approvalService).
   * Notifies the applicant (in-app + email) of the onboarding decision. */
  async setApprovalStatus(id: string, status: MeetingApprovalStatus) {
    const doc = await MeetingModel.findById(id);
    if (!doc) return null;
    const prev = doc.approval_status;
    doc.approval_status = status;
    await doc.save();
    if (status !== prev && (status === 'APPROVED' || status === 'DENIED')) {
      try {
        await notifyMeetingEvent(doc, status === 'APPROVED' ? 'approved' : 'rejected');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[meeting.setApprovalStatus] notify failed:', err);
      }
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
    const [names, catNames] = await Promise.all([
      userMap(docs.map((d: any) => String(d.user_id))),
      categoryNameMap(docs),
    ]);
    return docs.map((d) => pub(d, names, catNames));
  },

  /** Server-side table page (search/filter/sort/paginate) for onboardingMeetingsTable. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery(
      MeetingModel,
      {},
      input,
      MEETING_TABLE_CONFIG
    );
    const [names, catNames] = await Promise.all([
      userMap(docs.map((d: any) => String(d.user_id))),
      categoryNameMap(docs),
    ]);
    return { rows: docs.map((d) => pub(d, names, catNames)), total, page, page_size };
  },

  /** Onboarding staff schedule/track a meeting (date, link, status, notes). */
  async update(id: string, input: MeetingStaffInput, by?: string | null) {
    const doc = await MeetingModel.findById(id);
    if (!doc) throw notFound();
    if (input.scheduled_at) {
      await assertStaffSlotFree(id, input.scheduled_at);
    }
    // Capture the prior schedule state so we can classify the event after save.
    const wasScheduled = doc.status === 'SCHEDULED';
    const prevScheduledMs = doc.scheduled_at?.getTime() ?? null;
    const touchedSchedule = touchesSchedule(input);
    applyStaffFields(doc, input, by);
    await doc.save();
    if (doc.status === 'SCHEDULED' && touchedSchedule) {
      await notifyScheduleChange(doc, wasScheduled, prevScheduledMs);
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
