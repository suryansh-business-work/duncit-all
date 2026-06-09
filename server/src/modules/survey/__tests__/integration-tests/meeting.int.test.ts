import { Types } from 'mongoose';
import { meetingService } from '../../meeting.service';
import { UserModel } from '@modules/access/user/user.model';
import {
  sendMeetingScheduledEmail,
  sendMeetingScheduledAdminEmail,
} from '@services/email/email.service';

jest.mock('@services/email/email.service', () => ({
  sendMeetingScheduledEmail: jest.fn().mockResolvedValue(undefined),
  sendMeetingScheduledAdminEmail: jest.fn().mockResolvedValue(undefined),
}));

const userId = new Types.ObjectId().toString();

describe('meetingService integration', () => {
  it('requests once per user/kind (upsert), then lets staff schedule it with a link', async () => {
    const a = await meetingService.request(userId, 'VENUE', { requested_at: '2026-07-01T10:00:00.000Z', notes: 'morning' });
    expect(a!.status).toBe('REQUESTED');
    // Re-request updates the same row (still one).
    await meetingService.request(userId, 'VENUE', { requested_at: '2026-07-02T10:00:00.000Z' });
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

    await meetingService.request(host.toString(), 'HOST', { requested_at: '2026-09-01T10:00:00.000Z' });
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
    await meetingService.request(u, 'VENUE', { requested_at: '2026-10-01T10:00:00.000Z' });
    const mine = await meetingService.myMeeting(u, 'VENUE');
    await meetingService.update(mine!.id, { notes: 'called, will retry' });
    expect(sendMeetingScheduledEmail).not.toHaveBeenCalled();
  });

  it('lists by kind and within a date range (by effective date)', async () => {
    await meetingService.request(userId, 'HOST', { requested_at: '2026-08-15T10:00:00.000Z' });
    const venue = await meetingService.list({ kind: 'VENUE' });
    expect(venue.every((m) => m!.kind === 'VENUE')).toBe(true);
    const inAug = await meetingService.list({ from: '2026-08-01T00:00:00.000Z', to: '2026-08-31T00:00:00.000Z' });
    expect(inAug.some((m) => m!.kind === 'HOST')).toBe(true);
  });

  it('requires a preferred date', async () => {
    await expect(meetingService.request(userId, 'VENUE', { requested_at: '' } as any)).rejects.toThrow(/date/i);
  });
});
