import { Types } from 'mongoose';
import { generateSlots, meetingService } from '../../meeting.service';
import { MeetingModel } from '../../meeting.model';
import type { SurveyKind } from '../../survey.model';
import { UserModel } from '@modules/access/user/user.model';
import { userService } from '@modules/access/user/user.service';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import {
  sendMeetingScheduledEmail,
  sendMeetingScheduledAdminEmail,
  sendMeetingCancelledEmail,
  sendMeetingRescheduledEmail,
  sendMeetingApprovedEmail,
  sendMeetingRejectedEmail,
} from '@services/email/email.service';

jest.mock('@services/email/email.service', () => ({
  sendMeetingScheduledEmail: jest.fn().mockResolvedValue(undefined),
  sendMeetingScheduledAdminEmail: jest.fn().mockResolvedValue(undefined),
  sendMeetingBookedEmail: jest.fn().mockResolvedValue(undefined),
  sendMeetingCancelledEmail: jest.fn().mockResolvedValue(undefined),
  sendMeetingRescheduledEmail: jest.fn().mockResolvedValue(undefined),
  sendMeetingApprovedEmail: jest.fn().mockResolvedValue(undefined),
  sendMeetingRejectedEmail: jest.fn().mockResolvedValue(undefined),
}));

const userId = new Types.ObjectId().toString();

let phoneSeq = 9300000000;
const nextPhone = () => String(++phoneSeq);

/** Create a fresh user, raise a meeting for a kind, and mark it DONE — the state
 * onboarding staff need before they can approve/deny it. */
async function doneMeeting(kind: SurveyKind, requestedAt: string, name = 'Appy Test') {
  const user = new Types.ObjectId();
  await UserModel.collection.insertOne({
    _id: user,
    auth: { email: `${user.toString()}@example.com` },
    profile: { first_name: name },
  } as never);
  await meetingService.request(user.toString(), kind, { requested_at: requestedAt, contact_phone: nextPhone() });
  const m = await meetingService.myMeeting(user.toString(), kind);
  await meetingService.update(m!.id, { status: 'DONE' });
  return { userId: user.toString(), meetingId: m!.id };
}

describe('meetingService integration', () => {
  it('requests once per user/kind (upsert), then lets staff schedule it with a link', async () => {
    const a = await meetingService.request(userId, 'VENUE', { requested_at: '2026-07-01T10:00:00.000Z', notes: 'morning', contact_phone: '9000000001' });
    expect(a!.status).toBe('REQUESTED');
    // Every raised request carries a human-readable, kind-prefixed id.
    expect(a!.request_no).toMatch(/^DUN-VEN-\d{6}$/);
    // Re-request updates the same row (still one).
    await meetingService.request(userId, 'VENUE', { requested_at: '2026-07-02T10:00:00.000Z', contact_phone: '9000000001' });
    const mine = await meetingService.myMeeting(userId, 'VENUE');
    expect(mine!.requested_at).toBe('2026-07-02T10:00:00.000Z');

    const updated = await meetingService.update(mine!.id, {
      status: 'SCHEDULED',
      scheduled_at: '2026-07-03T09:00:00.000Z',
      meeting_link: 'https://meet.example/abc',
    });
    expect(updated!.status).toBe('SCHEDULED');
    expect(updated!.scheduled_at).toBe('2026-07-03T09:00:00.000Z');
    expect(updated!.meeting_link).toBe('https://meet.example/abc');
  });

  it('emails the host and onboarding staff when a meeting is scheduled', async () => {
    (sendMeetingScheduledEmail as jest.Mock).mockClear();
    (sendMeetingScheduledAdminEmail as jest.Mock).mockClear();
    const host = new Types.ObjectId();
    // Raw inserts so we control exactly the fields the notify lookups read.
    await UserModel.collection.insertOne({
      _id: host,
      auth: { email: 'host@example.com' },
      profile: { first_name: 'Hosty' },
    } as never);
    await UserModel.collection.insertOne({
      _id: new Types.ObjectId(),
      auth: { email: 'ops@example.com' },
      metadata: { role_keys: ['ONBOARDING_MANAGER'], status: 'ACTIVE' },
    } as never);

    await meetingService.request(host.toString(), 'HOST', { requested_at: '2026-09-01T10:00:00.000Z', contact_phone: '9000000002' });
    const mine = await meetingService.myMeeting(host.toString(), 'HOST');
    await meetingService.update(mine!.id, {
      status: 'SCHEDULED',
      scheduled_at: '2026-09-02T09:00:00.000Z',
      meeting_link: 'https://meet.example/host',
    });

    expect(sendMeetingScheduledEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'host@example.com', link: 'https://meet.example/host' }),
    );
    expect(sendMeetingScheduledAdminEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ops@example.com' }),
    );
  });

  it('does not notify for a notes-only update', async () => {
    (sendMeetingScheduledEmail as jest.Mock).mockClear();
    const u = new Types.ObjectId().toString();
    await meetingService.request(u, 'VENUE', { requested_at: '2026-10-01T10:00:00.000Z', contact_phone: '9000000003' });
    const mine = await meetingService.myMeeting(u, 'VENUE');
    await meetingService.update(mine!.id, { notes: 'called, will retry' });
    expect(sendMeetingScheduledEmail).not.toHaveBeenCalled();
  });

  it('lists by kind and within a date range (by effective date)', async () => {
    await meetingService.request(userId, 'HOST', { requested_at: '2026-08-15T10:00:00.000Z', contact_phone: '9000000004' });
    const venue = await meetingService.list({ kind: 'VENUE' });
    expect(venue.every((m) => m!.kind === 'VENUE')).toBe(true);
    const inAug = await meetingService.list({ from: '2026-08-01T00:00:00.000Z', to: '2026-08-31T00:00:00.000Z' });
    expect(inAug.some((m) => m!.kind === 'HOST')).toBe(true);
  });

  it('requires a preferred date', async () => {
    await expect(meetingService.request(userId, 'VENUE', { requested_at: '' } as any)).rejects.toThrow(/date/i);
  });

  it('serves the onboardingMeetingsTable page with search, filters, sort and paging', async () => {
    const u1 = new Types.ObjectId().toString();
    const u2 = new Types.ObjectId().toString();
    const a = await meetingService.request(u1, 'VENUE', {
      requested_at: '2026-08-01T10:00:00.000Z',
      contact_name: 'Asha',
      contact_phone: '9000000011',
    });
    const b = await meetingService.request(u2, 'HOST', {
      requested_at: '2026-08-02T10:00:00.000Z',
      contact_name: 'Bina',
      contact_phone: '9000000022',
    });
    await meetingService.update(b!.id, {
      status: 'SCHEDULED',
      scheduled_at: '2026-08-03T09:00:00.000Z',
      meeting_link: 'https://meet.example/b',
    });

    // Plain envelope, default effective-date order (null scheduled_at sorts first).
    const all = await meetingService.table();
    expect(all.total).toBe(2);
    expect(all.rows.map((m) => m!.id)).toEqual([a!.id, b!.id]);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);
    // Rows keep the joined pub shape, like the onboardingMeetings list.
    expect(all.rows[0]!.contact_name).toBe('Asha');
    expect(all.rows[0]!.request_no).toMatch(/^DUN-VEN-\d{6}$/);

    // Search spans request_no and contact name/phone.
    const byNo = await meetingService.table({ search: a!.request_no! });
    expect(byNo.rows.map((m) => m!.id)).toEqual([a!.id]);
    const byName = await meetingService.table({ search: 'bina' });
    expect(byName.rows.map((m) => m!.id)).toEqual([b!.id]);

    // Enum + date-range filters narrow.
    const scheduled = await meetingService.table({
      filters: [{ field: 'status', op: 'eq', value: 'SCHEDULED' }],
    });
    expect(scheduled.rows.map((m) => m!.id)).toEqual([b!.id]);
    const venue = await meetingService.table({ filters: [{ field: 'kind', op: 'eq', value: 'VENUE' }] });
    expect(venue.rows.map((m) => m!.id)).toEqual([a!.id]);
    const ranged = await meetingService.table({
      filters: [
        {
          field: 'requested_at',
          op: 'between',
          values: ['2026-08-01T00:00:00.000Z', '2026-08-01T23:59:59.000Z'],
        },
      ],
    });
    expect(ranged.rows.map((m) => m!.id)).toEqual([a!.id]);

    // Allowlisted sort + paging keep the total and report the clamped page back.
    const desc = await meetingService.table({ sort_by: 'requested_at', sort_dir: 'desc', page_size: 1 });
    expect(desc.rows.map((m) => m!.id)).toEqual([b!.id]);
    expect(desc.total).toBe(2);
    const page2 = await meetingService.table({
      sort_by: 'requested_at',
      sort_dir: 'desc',
      page: 2,
      page_size: 1,
    });
    expect(page2.rows.map((m) => m!.id)).toEqual([a!.id]);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });
});

describe('meeting slot booking', () => {
  const AV = {
    week_days: [1, 2, 3, 4, 5, 6],
    start_time: '10:00',
    end_time: '12:00',
    slot_minutes: 30,
    horizon_days: 3,
    timezone_offset_minutes: 330,
  };

  it('generateSlots expands availability into future slots on enabled days only', () => {
    // A Monday 00:00 UTC reference — local (IST) Monday morning.
    const now = new Date('2026-07-06T00:00:00.000Z');
    const slots = generateSlots(AV, now);
    expect(slots.length).toBeGreaterThan(0);
    // 4 half-hour slots per enabled day (10:00–12:00), all in the future.
    expect(slots.every((s) => s.start_at.getTime() > now.getTime())).toBe(true);
    const sameDay = slots.filter((s) => s.start_at.toISOString().startsWith('2026-07-06'));
    expect(sameDay).toHaveLength(4);
    // 10:00 IST = 04:30 UTC.
    expect(sameDay[0].start_at.toISOString()).toBe('2026-07-06T04:30:00.000Z');
  });

  it('generateSlots skips disabled weekdays and past slots', () => {
    const sundayOnly = { ...AV, week_days: [0], horizon_days: 2 };
    // Local Monday → only a Sunday-enabled config yields nothing in 2 days.
    expect(generateSlots(sundayOnly, new Date('2026-07-06T00:00:00.000Z'))).toHaveLength(0);
  });

  it('exposes the availability singleton and validates updates', async () => {
    const av = await meetingService.availability();
    expect(av.slot_minutes).toBe(30);
    const updated = await meetingService.updateAvailability({ slot_minutes: 60, horizon_days: 5 });
    expect(updated.slot_minutes).toBe(60);
    expect(updated.horizon_days).toBe(5);
    await expect(meetingService.updateAvailability({ week_days: [] })).rejects.toThrow(/working day/i);
    await expect(meetingService.updateAvailability({ start_time: '99:99' })).rejects.toThrow(/HH:mm/);
    await expect(meetingService.updateAvailability({ slot_minutes: 5 })).rejects.toThrow(/Slot length/);
    await meetingService.updateAvailability({ slot_minutes: 30, horizon_days: 7 });
  });

  it('marks slots held by others unavailable but keeps your own selectable', async () => {
    const me = new Types.ObjectId().toString();
    const other = new Types.ObjectId().toString();
    const slotsBefore = await meetingService.slots(me);
    const open = slotsBefore.filter((s) => s.available);
    expect(open.length).toBeGreaterThan(1);
    const [first, second] = open;

    await meetingService.request(other, 'HOST', { requested_at: first.start_at, contact_phone: '9111111111' });
    await meetingService.request(me, 'VENUE', { requested_at: second.start_at, contact_phone: '9222222222' });

    const slotsAfter = await meetingService.slots(me);
    expect(slotsAfter.find((s) => s.start_at === first.start_at)?.available).toBe(false);
    expect(slotsAfter.find((s) => s.start_at === second.start_at)?.available).toBe(true);
  });

  it('reschedules my meeting to a free slot and resets staff scheduling', async () => {
    const me = new Types.ObjectId().toString();
    const other = new Types.ObjectId().toString();
    await meetingService.request(me, 'VENUE', { requested_at: '2027-02-01T05:00:00.000Z', contact_phone: '9555555551' });
    const mine = await meetingService.myMeeting(me, 'VENUE');
    await meetingService.update(mine!.id, { status: 'SCHEDULED', scheduled_at: '2027-02-01T05:00:00.000Z', meeting_link: 'https://meet.example/x' });

    // Taken by someone else → rejected.
    await meetingService.request(other, 'VENUE', { requested_at: '2027-02-01T06:00:00.000Z', contact_phone: '9555555552' });
    await expect(
      meetingService.rescheduleMyMeeting(me, 'VENUE', '2027-02-01T06:00:00.000Z'),
    ).rejects.toThrow(/already booked/i);

    const moved = await meetingService.rescheduleMyMeeting(me, 'VENUE', '2027-02-01T07:00:00.000Z');
    expect(moved!.requested_at).toBe('2027-02-01T07:00:00.000Z');
    expect(moved!.status).toBe('REQUESTED');
    expect(moved!.scheduled_at).toBeNull();
    expect(moved!.meeting_link).toBeNull();
    expect(moved!.contact_phone).toBe('9555555551');

    await expect(meetingService.rescheduleMyMeeting(other, 'HOST', '2027-02-01T08:00:00.000Z')).rejects.toThrow(/not found/i);
  });

  it('cancels my meeting and frees its slot for others', async () => {
    const me = new Types.ObjectId().toString();
    const other = new Types.ObjectId().toString();
    await meetingService.request(me, 'ECOMM', { requested_at: '2027-03-01T05:00:00.000Z', contact_phone: '9666666661' });
    const cancelled = await meetingService.cancelMyMeeting(me, 'ECOMM');
    expect(cancelled!.status).toBe('CANCELLED');
    // The instant is free again for another user.
    await meetingService.request(other, 'ECOMM', { requested_at: '2027-03-01T05:00:00.000Z', contact_phone: '9666666662' });
    await expect(meetingService.cancelMyMeeting(other, 'VENUE')).rejects.toThrow(/not found/i);
  });

  it('re-booking after a cancel restarts the request (Earn card locks again)', async () => {
    const me = new Types.ObjectId().toString();
    const first = await meetingService.request(me, 'VENUE', { requested_at: '2027-04-01T05:00:00.000Z', contact_phone: '9777777771' });
    await meetingService.cancelMyMeeting(me, 'VENUE');

    const again = await meetingService.request(me, 'VENUE', { requested_at: '2027-04-02T05:00:00.000Z', contact_phone: '9777777771' });
    expect(again!.status).toBe('REQUESTED');
    expect(again!.scheduled_at).toBeNull();
    expect(again!.cancel_reason).toBeNull();
    // A cancelled cycle is closed: re-requesting mints a fresh request id
    // rather than resurrecting the old one.
    expect(again!.request_no).toMatch(/^DUN-VEN-\d{6}$/);
    expect(again!.request_no).not.toBe(first!.request_no);
    const mine = await meetingService.myMeetings(me);
    expect(mine.filter((m) => m!.kind === 'VENUE')).toHaveLength(1);
  });

  it('blocks re-applying while a done meeting still awaits approval, then allows it once approved', async () => {
    const me = new Types.ObjectId().toString();
    await meetingService.request(me, 'VENUE', { requested_at: '2027-05-01T05:00:00.000Z', contact_phone: '9888888881' });
    // The interview happened (DONE) but the admin has not approved/denied yet.
    await MeetingModel.updateOne(
      { user_id: new Types.ObjectId(me), kind: 'VENUE' },
      { $set: { status: 'DONE', approval_status: 'NONE' } },
    );
    await expect(
      meetingService.request(me, 'VENUE', { requested_at: '2027-05-02T05:00:00.000Z', contact_phone: '9888888881' }),
    ).rejects.toThrow(/onboarding in process/i);

    // Once the admin approves, re-applying is allowed again (restarts as REQUESTED).
    await MeetingModel.updateOne(
      { user_id: new Types.ObjectId(me), kind: 'VENUE' },
      { $set: { approval_status: 'APPROVED' } },
    );
    const again = await meetingService.request(me, 'VENUE', { requested_at: '2027-05-03T05:00:00.000Z', contact_phone: '9888888881' });
    expect(again!.status).toBe('REQUESTED');
  });

  it('staff cancel a meeting with a required reason and the applicant is emailed it', async () => {
    (sendMeetingCancelledEmail as jest.Mock).mockClear();
    const applicant = new Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: applicant,
      auth: { email: 'applicant@example.com' },
      profile: { first_name: 'Appy' },
    } as never);
    await meetingService.request(applicant.toString(), 'HOST', { requested_at: '2027-05-01T05:00:00.000Z', contact_phone: '9888888881' });
    const mine = await meetingService.myMeeting(applicant.toString(), 'HOST');

    await expect(meetingService.cancelByStaff(mine!.id, '  ')).rejects.toThrow(/reason/i);

    const cancelled = await meetingService.cancelByStaff(mine!.id, 'Survey not satisfying');
    expect(cancelled!.status).toBe('CANCELLED');
    expect(cancelled!.cancel_reason).toBe('Survey not satisfying');
    expect(sendMeetingCancelledEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'applicant@example.com',
        reason: expect.stringMatching(/Survey not satisfying.*fill the survey again/),
      }),
    );

    await expect(meetingService.cancelByStaff(new Types.ObjectId().toString(), 'x')).rejects.toThrow(/not found/i);
  });

  it('requires a phone number and rejects a slot another user holds', async () => {
    const me = new Types.ObjectId().toString();
    const other = new Types.ObjectId().toString();
    await expect(
      meetingService.request(me, 'HOST', { requested_at: '2027-01-04T05:00:00.000Z' } as any),
    ).rejects.toThrow(/phone/i);

    await meetingService.request(other, 'HOST', { requested_at: '2027-01-04T05:00:00.000Z', contact_phone: '9333333333' });
    await expect(
      meetingService.request(me, 'HOST', { requested_at: '2027-01-04T05:00:00.000Z', contact_phone: '9444444444' }),
    ).rejects.toThrow(/already booked/i);
  });

  it('blocks staff from scheduling a meeting onto a slot another applicant holds', async () => {
    const a = new Types.ObjectId().toString();
    const b = new Types.ObjectId().toString();
    await meetingService.request(a, 'VENUE', { requested_at: '2027-06-01T05:00:00.000Z', contact_phone: '9100000001' });
    await meetingService.request(b, 'HOST', { requested_at: '2027-06-01T06:00:00.000Z', contact_phone: '9100000002' });
    const bMeeting = await meetingService.myMeeting(b, 'HOST');

    // a holds 05:00 → staff cannot schedule b onto it.
    await expect(
      meetingService.update(bMeeting!.id, { status: 'SCHEDULED', scheduled_at: '2027-06-01T05:00:00.000Z' }),
    ).rejects.toThrow(/already taken/i);
    // Scheduling b onto its own requested time is fine (it excludes itself).
    const ok = await meetingService.update(bMeeting!.id, { status: 'SCHEDULED', scheduled_at: '2027-06-01T06:00:00.000Z' });
    expect(ok!.status).toBe('SCHEDULED');
  });

  it('keeps the meeting being scheduled selectable in the staff slot grid', async () => {
    const staff = new Types.ObjectId().toString();
    const applicant = new Types.ObjectId().toString();
    const target = (await meetingService.slots(staff)).find((s) => s.available)!;
    await meetingService.request(applicant, 'VENUE', { requested_at: target.start_at, contact_phone: '9120000001' });
    const m = await meetingService.myMeeting(applicant, 'VENUE');

    // For everyone else the held slot is now blocked …
    const blocked = await meetingService.slots(staff);
    expect(blocked.find((s) => s.start_at === target.start_at)?.available).toBe(false);
    // … but excluding the meeting itself keeps it selectable for re-scheduling.
    const forEdit = await meetingService.slots(staff, { excludeMeetingId: m!.id });
    expect(forEdit.find((s) => s.start_at === target.start_at)?.available).toBe(true);
  });

  it('removes only cancelled meetings from the calendar and re-booking restores them', async () => {
    const u = new Types.ObjectId().toString();
    await meetingService.request(u, 'VENUE', { requested_at: '2027-07-01T05:00:00.000Z', contact_phone: '9130000001' });
    const m = await meetingService.myMeeting(u, 'VENUE');
    await expect(meetingService.dismiss(m!.id)).rejects.toThrow(/cancelled/i);

    await meetingService.cancelMyMeeting(u, 'VENUE');
    const hidden = await meetingService.dismiss(m!.id);
    expect(hidden!.dismissed).toBe(true);

    // Re-booking clears the dismissed flag so the meeting shows again.
    const again = await meetingService.request(u, 'VENUE', { requested_at: '2027-07-02T05:00:00.000Z', contact_phone: '9130000001' });
    expect(again!.dismissed).toBe(false);
    await expect(meetingService.dismiss(new Types.ObjectId().toString())).rejects.toThrow(/not found/i);
  });

  it('generateSlots skips holiday days', () => {
    const now = new Date('2026-07-06T00:00:00.000Z'); // local (IST) Monday morning
    const holidays = new Set(['2026-07-06']);
    const slots = generateSlots(AV, now, holidays);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.some((s) => s.start_at.toISOString().startsWith('2026-07-06'))).toBe(false);
  });

  it('blocks bookable slots and requests on a holiday, then frees them on removal', async () => {
    const u = new Types.ObjectId().toString();
    const before = (await meetingService.slots(u)).find((s) => s.available)!;
    const istDay = new Date(new Date(before.start_at).getTime() + 330 * 60_000).toISOString().slice(0, 10);

    const h = await meetingService.addHoliday({ date: istDay, name: 'Diwali', type: 'PUBLIC_HOLIDAY' });
    expect(h.date).toBe(istDay);
    expect((await meetingService.holidays()).some((x) => x.date === istDay)).toBe(true);

    const after = await meetingService.slots(u);
    expect(after.some((s) => s.start_at === before.start_at)).toBe(false);
    await expect(
      meetingService.request(u, 'VENUE', { requested_at: before.start_at, contact_phone: '9610000001' }),
    ).rejects.toThrow(/leave that day/i);

    expect(await meetingService.removeHoliday(h.id)).toBe(true);
    const restored = await meetingService.slots(u);
    expect(restored.some((s) => s.start_at === before.start_at)).toBe(true);
  });

  it('validates the holiday date and upserts one entry per day', async () => {
    await expect(meetingService.addHoliday({ date: '07-2026' })).rejects.toThrow(/YYYY-MM-DD/);
    await meetingService.addHoliday({ date: '2030-01-01', name: 'NY', type: 'OFFICE_HOLIDAY' });
    const b = await meetingService.addHoliday({ date: '2030-01-01', name: 'New Year', type: 'OFFICIAL_LEAVE' });
    expect(b.name).toBe('New Year');
    expect((await meetingService.holidays()).filter((x) => x.date === '2030-01-01')).toHaveLength(1);
  });

  it('blocks the same user from booking one instant across kinds (shared inventory)', async () => {
    const u = new Types.ObjectId().toString();
    await meetingService.request(u, 'HOST', { requested_at: '2027-09-01T05:00:00.000Z', contact_phone: '9140000001' });
    await expect(
      meetingService.request(u, 'VENUE', { requested_at: '2027-09-01T05:00:00.000Z', contact_phone: '9140000001' }),
    ).rejects.toThrow(/already booked/i);
    const ok = await meetingService.request(u, 'VENUE', { requested_at: '2027-09-01T06:00:00.000Z', contact_phone: '9140000001' });
    expect(ok!.kind).toBe('VENUE');
  });

  it('allows the user to reschedule only once and records the reason', async () => {
    const u = new Types.ObjectId().toString();
    await meetingService.request(u, 'HOST', { requested_at: '2027-09-02T05:00:00.000Z', contact_phone: '9150000001' });
    const moved = await meetingService.rescheduleMyMeeting(u, 'HOST', '2027-09-02T06:00:00.000Z', 'Clashing work call');
    expect(moved!.reschedule_count).toBe(1);
    await expect(
      meetingService.rescheduleMyMeeting(u, 'HOST', '2027-09-02T07:00:00.000Z', 'again'),
    ).rejects.toThrow(/one-time reschedule/i);
  });

  it('records the self-cancel reason and shows the chosen category in the listing', async () => {
    const { CategoryModel } = await import('@modules/pods/category/category.model');
    const catId = new Types.ObjectId();
    await CategoryModel.collection.insertOne({ _id: catId, name: 'Badminton' } as never);
    const u = new Types.ObjectId().toString();
    await meetingService.request(u, 'ECOMM', {
      requested_at: '2027-09-03T05:00:00.000Z',
      contact_phone: '9160000001',
      category_id: catId.toString(),
    });
    const cancelled = await meetingService.cancelMyMeeting(u, 'ECOMM', 'Changed my mind');
    expect(cancelled!.status).toBe('CANCELLED');
    expect(cancelled!.cancel_reason).toBe('Changed my mind');
    // After a cancel the user re-requests, which restores the category mapping.
    await meetingService.request(u, 'ECOMM', {
      requested_at: '2027-09-03T06:00:00.000Z',
      contact_phone: '9160000001',
      category_id: catId.toString(),
    });
    const mine = (await meetingService.list({ kind: 'ECOMM' })).find((m) => m!.user_id === u);
    expect(mine!.category_name).toBe('Badminton');
  });
});

describe('meeting notifications + cross-flow slot picker (batch)', () => {
  it('kind-aware picker hides the user\'s own other-flow slot but keeps the same-flow slot selectable', async () => {
    const me = new Types.ObjectId().toString();
    const open = (await meetingService.slots(me, { kind: 'VENUE' })).filter((s) => s.available);
    expect(open.length).toBeGreaterThan(0);
    const slot = open[0];
    // Book that instant for HOST.
    await meetingService.request(me, 'HOST', { requested_at: slot.start_at, contact_phone: '9170000001' });
    // In the VENUE picker it must now show unavailable (other-flow booking).
    const venueView = await meetingService.slots(me, { kind: 'VENUE' });
    expect(venueView.find((s) => s.start_at === slot.start_at)?.available).toBe(false);
    // But in the HOST picker the user's own same-flow slot stays selectable.
    const hostView = await meetingService.slots(me, { kind: 'HOST' });
    expect(hostView.find((s) => s.start_at === slot.start_at)?.available).toBe(true);
  });

  it('rejects rescheduling to the same slot (must move to a different time)', async () => {
    const u = new Types.ObjectId().toString();
    await meetingService.request(u, 'HOST', { requested_at: '2028-01-03T05:00:00.000Z', contact_phone: '9180000001' });
    await expect(
      meetingService.rescheduleMyMeeting(u, 'HOST', '2028-01-03T05:00:00.000Z'),
    ).rejects.toThrow(/different time slot/i);
  });

  it('emails distinct events when staff schedule, reschedule, then update details', async () => {
    const applicant = new Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: applicant,
      auth: { email: 'evt@example.com' },
      profile: { first_name: 'Evt' },
    } as never);
    await meetingService.request(applicant.toString(), 'HOST', { requested_at: '2028-02-01T05:00:00.000Z', contact_phone: '9190000001' });
    const m = await meetingService.myMeeting(applicant.toString(), 'HOST');

    (sendMeetingScheduledEmail as jest.Mock).mockClear();
    await meetingService.update(m!.id, { status: 'SCHEDULED', scheduled_at: '2028-02-01T05:00:00.000Z', meeting_link: 'https://x' });
    expect(sendMeetingScheduledEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'evt@example.com' }));

    (sendMeetingRescheduledEmail as jest.Mock).mockClear();
    await meetingService.update(m!.id, { scheduled_at: '2028-02-01T06:00:00.000Z' });
    expect(sendMeetingRescheduledEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'evt@example.com', change: 'rescheduled' }));

    (sendMeetingRescheduledEmail as jest.Mock).mockClear();
    await meetingService.update(m!.id, { meeting_link: 'https://y' });
    expect(sendMeetingRescheduledEmail).toHaveBeenCalledWith(expect.objectContaining({ change: 'updated' }));
  });

});

describe('meeting decide (onboarding self-approve)', () => {
  it('approves a DONE meeting: drafts the onboarded host, marks it approved, emails the applicant', async () => {
    (sendMeetingApprovedEmail as jest.Mock).mockClear();
    const { userId: uid, meetingId } = await doneMeeting('HOST', '2029-01-01T05:00:00.000Z', 'Drafty');

    // Feedback is required.
    await expect(meetingService.decide(meetingId, 'APPROVED', '  ')).rejects.toThrow(/feedback/i);

    const approved = await meetingService.decide(meetingId, 'APPROVED', 'Strong candidate');
    expect(approved!.approval_status).toBe('APPROVED');
    expect(approved!.feedback).toBe('Strong candidate');

    const host: any = await HostModel.findOne({ user_id: new Types.ObjectId(uid) });
    expect(host?.status).toBe('DRAFT');
    expect(host?.full_name).toBe('Drafty');
    expect(sendMeetingApprovedEmail).toHaveBeenCalledWith(expect.objectContaining({ to: `${uid}@example.com` }));

    // A decided meeting can't be decided again.
    await expect(meetingService.decide(meetingId, 'APPROVED', 'again')).rejects.toThrow(/already/i);
  });

  it('drafts a venue and a seller brand on approval by kind', async () => {
    const venue = await doneMeeting('VENUE', '2029-02-01T05:00:00.000Z', 'Venue Owner');
    await meetingService.decide(venue.meetingId, 'APPROVED', 'ok');
    const v: any = await VenueModel.findOne({ owner_user_id: new Types.ObjectId(venue.userId) });
    expect(v?.status).toBe('DRAFT');
    expect(v?.owner_name).toBe('Venue Owner');

    const seller = await doneMeeting('ECOMM', '2029-03-01T05:00:00.000Z', 'Seller Person');
    await meetingService.decide(seller.meetingId, 'APPROVED', 'ok');
    const b: any = await EcommBrandModel.findOne({ owner_user_id: new Types.ObjectId(seller.userId) });
    expect(b?.status).toBe('DRAFT');
    expect(b?.contact_person).toBe('Seller Person');
  });

  it('grants the CLUB_ADMIN role on approval (no drafted entity)', async () => {
    // Role assignment uses a transaction (real replica set in prod); the standalone
    // test mongo can't run it, so spy on addRole to assert the branch wiring.
    const spy = jest.spyOn(userService, 'addRole').mockResolvedValue(undefined as never);
    const club = await doneMeeting('CLUB_ADMIN', '2029-04-01T05:00:00.000Z', 'Club Boss');
    const approved = await meetingService.decide(club.meetingId, 'APPROVED', 'ok');
    expect(approved!.approval_status).toBe('APPROVED');
    expect(spy).toHaveBeenCalledWith(club.userId, 'CLUB_ADMIN');
    spy.mockRestore();
  });

  it('denies a DONE meeting: marks it denied, drafts nothing, emails the applicant, and blocks a re-decide', async () => {
    (sendMeetingRejectedEmail as jest.Mock).mockClear();
    const { userId: uid, meetingId } = await doneMeeting('HOST', '2029-05-01T05:00:00.000Z', 'Rejy');
    const denied = await meetingService.decide(meetingId, 'DENIED', 'Not a fit');
    expect(denied!.approval_status).toBe('DENIED');
    expect(await HostModel.findOne({ user_id: new Types.ObjectId(uid) })).toBeNull();
    expect(sendMeetingRejectedEmail).toHaveBeenCalledWith(expect.objectContaining({ to: `${uid}@example.com` }));
    await expect(meetingService.decide(meetingId, 'APPROVED', 'reconsider')).rejects.toThrow(/already/i);
  });

  it('refuses to decide a meeting that is not DONE, and 404s an unknown id', async () => {
    const user = new Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: user,
      auth: { email: `${user.toString()}@example.com` },
      profile: { first_name: 'NotDone' },
    } as never);
    await meetingService.request(user.toString(), 'HOST', { requested_at: '2029-06-01T05:00:00.000Z', contact_phone: nextPhone() });
    const m = await meetingService.myMeeting(user.toString(), 'HOST');
    await expect(meetingService.decide(m!.id, 'APPROVED', 'ok')).rejects.toThrow(/done/i);
    await expect(meetingService.decide(new Types.ObjectId().toString(), 'APPROVED', 'ok')).rejects.toThrow(/not found/i);
  });
});
