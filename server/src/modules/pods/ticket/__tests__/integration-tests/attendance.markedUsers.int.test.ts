import { Types } from 'mongoose';
import { TicketModel, type TicketStatus } from '../../ticket.model';
import { markedUserIdsByPod } from '../../attendance.service';

/**
 * `markedUserIdsByPod` — who was marked present at each of many pods, in one
 * read. The pod feedback sweep asks only these people to rate, so a booking
 * that was never checked in (or was cancelled) must not appear.
 */

const ticket = (podId: Types.ObjectId, userId: Types.ObjectId, status: TicketStatus) =>
  TicketModel.create({
    ticket_code: `T-${new Types.ObjectId().toString()}`,
    membership_id: new Types.ObjectId(),
    pod_id: podId,
    user_id: userId,
    status,
  });

describe('markedUserIdsByPod', () => {
  it('groups the checked-in users by pod and leaves out VALID and CANCELLED tickets', async () => {
    const podA = new Types.ObjectId();
    const podB = new Types.ObjectId();
    const [u1, u2, u3, u4] = [0, 1, 2, 3].map(() => new Types.ObjectId());
    await ticket(podA, u1, 'CHECKED_IN');
    await ticket(podA, u2, 'CHECKED_IN');
    await ticket(podA, u3, 'VALID');
    await ticket(podA, u4, 'CANCELLED');
    await ticket(podB, u3, 'CHECKED_IN');

    const byPod = await markedUserIdsByPod([podA, podB]);

    expect([...byPod.keys()].sort()).toEqual([String(podA), String(podB)].sort());
    expect([...(byPod.get(String(podA)) ?? [])].sort()).toEqual([String(u1), String(u2)].sort());
    expect([...(byPod.get(String(podB)) ?? [])]).toEqual([String(u3)]);
  });

  it('reads only the pods asked for, and has no entry for a pod nobody was marked at', async () => {
    const asked = new Types.ObjectId();
    const empty = new Types.ObjectId();
    const other = new Types.ObjectId();
    const user = new Types.ObjectId();
    await ticket(asked, user, 'CHECKED_IN');
    await ticket(empty, new Types.ObjectId(), 'VALID');
    await ticket(other, new Types.ObjectId(), 'CHECKED_IN');

    const byPod = await markedUserIdsByPod([asked, empty]);

    expect(byPod.get(String(asked))?.has(String(user))).toBe(true);
    expect(byPod.has(String(empty))).toBe(false);
    expect(byPod.has(String(other))).toBe(false);
  });

  it('accepts string ids, ignores duplicates and drops ids that are not ObjectIds', async () => {
    const pod = new Types.ObjectId();
    const user = new Types.ObjectId();
    await ticket(pod, user, 'CHECKED_IN');

    const byPod = await markedUserIdsByPod([String(pod), pod, 'not-an-id', null]);

    expect(byPod.size).toBe(1);
    expect([...(byPod.get(String(pod)) ?? [])]).toEqual([String(user)]);
  });

  it('answers an empty map without querying when no usable id is given', async () => {
    const find = jest.spyOn(TicketModel, 'find');
    try {
      expect((await markedUserIdsByPod([])).size).toBe(0);
      expect((await markedUserIdsByPod(['nope', undefined])).size).toBe(0);
      expect(find).not.toHaveBeenCalled();
    } finally {
      find.mockRestore();
    }
  });
});
