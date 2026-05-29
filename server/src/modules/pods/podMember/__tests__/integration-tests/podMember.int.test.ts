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
