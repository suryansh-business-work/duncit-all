import { Types } from 'mongoose';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { TicketModel, type TicketStatus } from '@modules/pods/ticket/ticket.model';
import { podAttendanceRoster } from '@modules/finance/finance/settlement.service';
import { fetchPodAttendance, loadPodAttendance } from '../../pod.attendance.loader';

/**
 * `Pod.attendance` counts: the "N Attended" on a Previous Pods card. They must
 * match the settlement roster seat for seat, or a card and the host's payout
 * would quote different attendance for the same pod.
 */

type MemberStatus = 'JOINED' | 'BACKOUT_IN_PROCESS' | 'BACKED_OUT';

async function booking(podId: Types.ObjectId, seats: number, ticket: TicketStatus | null, status: MemberStatus = 'JOINED') {
  const member = await PodMemberModel.create({ pod_id: podId, user_id: new Types.ObjectId(), seats, status });
  if (ticket) {
    await TicketModel.create({
      ticket_code: `T-${new Types.ObjectId().toString()}`,
      membership_id: member._id,
      pod_id: podId,
      user_id: member.user_id,
      status: ticket,
    });
  }
  return member;
}

describe('pod attendance loader', () => {
  it('counts seats, not people: only JOINED bookings, attended when the ticket reads CHECKED_IN', async () => {
    const pod = new Types.ObjectId();
    await booking(pod, 3, 'CHECKED_IN');
    await booking(pod, 1, 'CHECKED_IN');
    await booking(pod, 2, 'VALID');
    await booking(pod, 1, 'CANCELLED');
    await booking(pod, 1, null);
    // A backed-out booking holds no seat even if its ticket was scanned.
    await booking(pod, 4, 'CHECKED_IN', 'BACKED_OUT');

    const counts = (await fetchPodAttendance([String(pod)])).get(String(pod));

    expect(counts).toEqual({ attended_seats: 4, booked_seats: 8 });
  });

  it('agrees with the settlement roster on the same pod', async () => {
    const pod = new Types.ObjectId();
    await booking(pod, 2, 'CHECKED_IN');
    await booking(pod, 1, 'VALID');
    await booking(pod, 5, 'CHECKED_IN', 'BACKOUT_IN_PROCESS');

    const roster = await podAttendanceRoster(String(pod));
    const counts = (await fetchPodAttendance([String(pod)])).get(String(pod));

    expect(counts).toEqual({ attended_seats: roster.attended_seats, booked_seats: roster.booked_seats });
  });

  it('answers a page of pods in one member read and keeps each pod separate', async () => {
    const podA = new Types.ObjectId();
    const podB = new Types.ObjectId();
    const empty = new Types.ObjectId();
    await booking(podA, 2, 'CHECKED_IN');
    await booking(podB, 1, 'VALID');
    const find = jest.spyOn(PodMemberModel, 'find');
    try {
      const ctx = {};
      const [a, b, none] = await Promise.all([
        loadPodAttendance(ctx, String(podA)),
        loadPodAttendance(ctx, String(podB)),
        loadPodAttendance(ctx, String(empty)),
      ]);

      expect(a).toEqual({ attended_seats: 2, booked_seats: 2 });
      expect(b).toEqual({ attended_seats: 0, booked_seats: 1 });
      expect(none).toEqual({ attended_seats: 0, booked_seats: 0 });
      expect(find).toHaveBeenCalledTimes(1);
    } finally {
      find.mockRestore();
    }
  });

  it('skips the database for ids that are not ObjectIds', async () => {
    const find = jest.spyOn(PodMemberModel, 'find');
    try {
      expect((await fetchPodAttendance(['nope'])).size).toBe(0);
      expect(await loadPodAttendance({}, 'nope')).toEqual({ attended_seats: 0, booked_seats: 0 });
      expect(find).not.toHaveBeenCalled();
    } finally {
      find.mockRestore();
    }
  });
});
