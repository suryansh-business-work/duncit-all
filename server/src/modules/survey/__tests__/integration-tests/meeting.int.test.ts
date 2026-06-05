import { Types } from 'mongoose';
import { meetingService } from '../../meeting.service';

const userId = new Types.ObjectId().toString();

describe('meetingService integration', () => {
  it('requests once per user/kind (upsert), then lets staff schedule it', async () => {
    const a = await meetingService.request(userId, 'VENUE', { requested_at: '2026-07-01T10:00:00.000Z', notes: 'morning' });
    expect(a!.status).toBe('REQUESTED');
    // Re-request updates the same row (still one).
    await meetingService.request(userId, 'VENUE', { requested_at: '2026-07-02T10:00:00.000Z' });
    const mine = await meetingService.myMeeting(userId, 'VENUE');
    expect(mine!.requested_at).toBe('2026-07-02T10:00:00.000Z');

    const updated = await meetingService.update(mine!.id, { status: 'SCHEDULED', scheduled_at: '2026-07-03T09:00:00.000Z' });
    expect(updated!.status).toBe('SCHEDULED');
    expect(updated!.scheduled_at).toBe('2026-07-03T09:00:00.000Z');
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
