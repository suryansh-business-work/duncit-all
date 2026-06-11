import { Types } from 'mongoose';
import { podMemberService } from '../../podMember.service';
import { PodMemberModel } from '../../podMember.model';

const userId = new Types.ObjectId().toString();
const podId = new Types.ObjectId().toString();

describe('podMemberService integration', () => {
  it('throws NOT_FOUND for state/join on a missing pod', async () => {
    await expect(podMemberService.getState(podId, userId)).rejects.toThrow(/pod not found/i);
    await expect(podMemberService.joinFree(podId, userId)).rejects.toThrow(/pod not found/i);
  });

  it('lists a user’s memberships and a pod’s members', async () => {
    expect(await podMemberService.listMine(userId)).toEqual([]);

    await PodMemberModel.create({ pod_id: podId, user_id: userId, status: 'JOINED', source: 'FREE', refund_status: 'NONE' });

    expect(await podMemberService.listMine(userId)).toHaveLength(1);
    expect(await podMemberService.listForPod(podId)).toHaveLength(1);
    expect(await podMemberService.listForPod(podId, 'BACKED_OUT')).toHaveLength(0);
  });

  it('looks up a referral token', async () => {
    expect(await podMemberService.lookupReferral('nope')).toBeNull();

    await PodMemberModel.create({
      pod_id: podId,
      user_id: userId,
      status: 'JOINED',
      source: 'FREE',
      refund_status: 'NONE',
      referral_token: 'ref-abc',
    });
    const found = await podMemberService.lookupReferral('ref-abc');
    expect(found).not.toBeNull();
  });
});

describe('expired pod booking guard', () => {
  const makePod = (over: Record<string, unknown> = {}) => ({
    pod_id: `p-${Math.random().toString(36).slice(2)}`,
    pod_title: 'Guard pod',
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_type: 'NATIVE_FREE',
    pod_date_time: new Date(Date.now() + 86_400_000),
    is_active: true,
    ...over,
  });

  it('rejects joinFree once the pod date has passed', async () => {
    const { PodModel } = await import('@modules/pods/pod/pod.model');
    const past = await PodModel.create(makePod({ pod_date_time: new Date(Date.now() - 3_600_000) }));
    await expect(
      podMemberService.joinFree(String(past._id), new Types.ObjectId().toString())
    ).rejects.toThrow(/already taken place/i);
  });

  it('still allows joining an upcoming free pod', async () => {
    const { PodModel } = await import('@modules/pods/pod/pod.model');
    const upcoming = await PodModel.create(makePod());
    const member = await podMemberService.joinFree(
      String(upcoming._id),
      new Types.ObjectId().toString()
    );
    expect(member.status).toBe('JOINED');
  });
});
