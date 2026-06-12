import { Types } from 'mongoose';
import { generateSlots, meetingService } from '../../meeting.service';
import { UserModel } from '@modules/access/user/user.model';
import {
  sendMeetingScheduledEmail,
  sendMeetingScheduledAdminEmail,
  sendMeetingCancelledEmail,
} from '@services/email/email.service';

jest.mock('@services/email/email.service', () => ({
  sendMeetingScheduledEmail: jest.fn().mockResolvedValue(undefined),
  sendMeetingScheduledAdminEmail: jest.fn().mockResolvedValue(undefined),
  sendMeetingBookedEmail: jest.fn().mockResolvedValue(undefined),
  sendMeetingCancelledEmail: jest.fn().mockResolvedValue(undefined),
}));

const userId = new Types.ObjectId().toString();

describe('meetingService integration', () => {
  it('requests once per user/kind (upsert), then lets staff schedule it with a link', async () => {
    const a = await meetingService.request(userId, 'VENUE', { requested_at: '2026-07-01T10:00:00.000Z', notes: 'morning', contact_phone: '9000000001' });
    expect(a!.status).toBe('REQUESTED');
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
    ).rejects.toThrow(/just booked/i);

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
    await meetingService.request(me, 'VENUE', { requested_at: '2027-04-01T05:00:00.000Z', contact_phone: '9777777771' });
    await meetingService.cancelMyMeeting(me, 'VENUE');

    const again = await meetingService.request(me, 'VENUE', { requested_at: '2027-04-02T05:00:00.000Z', contact_phone: '9777777771' });
    expect(again!.status).toBe('REQUESTED');
    expect(again!.scheduled_at).toBeNull();
    expect(again!.cancel_reason).toBeNull();
    const mine = await meetingService.myMeetings(me);
    expect(mine.filter((m) => m!.kind === 'VENUE')).toHaveLength(1);
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
    ).rejects.toThrow(/just booked/i);
  });
});
