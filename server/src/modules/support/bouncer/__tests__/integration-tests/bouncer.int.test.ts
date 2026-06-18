import { Types } from 'mongoose';
import { bouncerService } from '../../bouncer.service';
import {
  BouncerSosAlertModel,
  BouncerCallbackRequestModel,
  BouncerFeedbackModel,
} from '../../bouncer.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';

const userId = new Types.ObjectId().toString();
const podId = new Types.ObjectId().toString();
const adminId = new Types.ObjectId().toString();

describe('bouncerService integration', () => {
  it('lists SOS alerts and resolves the active-for-user lookup', async () => {
    await BouncerSosAlertModel.create({ user_id: userId, pod_id: podId, status: 'ACTIVE' });

    const all = await bouncerService.listSos();
    expect(all).toHaveLength(1);

    const mine = await bouncerService.getMyActiveSos(userId, podId);
    expect(mine?.status).toBe('ACTIVE');
  });

  it('acknowledges then resolves an SOS, and blocks ack after resolve', async () => {
    const sos = await BouncerSosAlertModel.create({ user_id: userId, pod_id: podId, status: 'ACTIVE' });
    const id = String(sos._id);

    const acked = await bouncerService.acknowledgeSos(adminId, id);
    expect(acked.status).toBe('ACKNOWLEDGED');
    expect(acked.acknowledged_at).toBeTruthy();

    const resolved = await bouncerService.resolveSos(adminId, id);
    expect(resolved.status).toBe('RESOLVED');

    await expect(bouncerService.acknowledgeSos(adminId, id)).rejects.toThrow(/already resolved/i);
  });

  it('throws NOT_FOUND acknowledging a missing SOS', async () => {
    await expect(
      bouncerService.acknowledgeSos(adminId, new Types.ObjectId().toString())
    ).rejects.toThrow(/not found/i);
  });

  it('moves a callback PENDING -> CONTACTED -> CLOSED', async () => {
    const cb = await BouncerCallbackRequestModel.create({
      user_id: userId,
      contact_phone: '+919999999999',
      status: 'PENDING',
    });
    const id = String(cb._id);

    const contacted = await bouncerService.markCallbackContacted(adminId, id);
    expect(contacted.status).toBe('CONTACTED');

    const closed = await bouncerService.closeCallback(adminId, id);
    expect(closed.status).toBe('CLOSED');

    const list = await bouncerService.listCallbacks('CLOSED');
    expect(list).toHaveLength(1);
  });

  it('records call duration + conclusion and lists the user’s own callbacks (Bug 5)', async () => {
    const cb = await BouncerCallbackRequestModel.create({
      user_id: userId,
      contact_phone: '+919999999999',
      reason: 'Booking issue',
      status: 'PENDING',
    });
    const id = String(cb._id);

    const contacted = await bouncerService.markCallbackContacted(adminId, id, {
      duration_seconds: 142,
      conclusion: 'Resolved on call',
    });
    expect(contacted.status).toBe('CONTACTED');
    expect(contacted.duration_seconds).toBe(142);
    expect(contacted.conclusion).toBe('Resolved on call');

    const mine = await bouncerService.listMyCallbacks(userId);
    expect(mine).toHaveLength(1);
    expect(mine[0].duration_seconds).toBe(142);

    const others = await bouncerService.listMyCallbacks(new Types.ObjectId().toString());
    expect(others).toHaveLength(0);
  });

  it('returns the most recent attended, unrated pod for the feedback pop-up (Bug 6)', async () => {
    const uid = new Types.ObjectId();
    const past = new Types.ObjectId();
    const future = new Types.ObjectId();
    await PodModel.collection.insertOne({
      _id: past,
      pod_id: 'past-pod',
      club_id: new Types.ObjectId(),
      pod_title: 'Past Pod',
      pod_date_time: new Date(Date.now() - 86_400_000),
    });
    await PodModel.collection.insertOne({
      _id: future,
      pod_id: 'future-pod',
      club_id: new Types.ObjectId(),
      pod_title: 'Future Pod',
      pod_date_time: new Date(Date.now() + 86_400_000),
    });
    await PodMemberModel.create({ pod_id: past, user_id: uid, status: 'JOINED' });
    await PodMemberModel.create({ pod_id: future, user_id: uid, status: 'JOINED' });

    const pending = await bouncerService.getPendingPodFeedback(String(uid));
    expect(pending?.id).toBe(String(past));
    expect(pending?.title).toBe('Past Pod');

    // Once rated, the pod no longer surfaces.
    await BouncerFeedbackModel.create({ user_id: uid, pod_id: past, rating: 5, category: 'OTHER' });
    expect(await bouncerService.getPendingPodFeedback(String(uid))).toBeNull();

    // A user with no memberships has nothing pending.
    expect(await bouncerService.getPendingPodFeedback(new Types.ObjectId().toString())).toBeNull();
  });

  it('requestCallback fails when the user has no profile', async () => {
    await expect(
      bouncerService.requestCallback(new Types.ObjectId().toString(), { reason: 'help' })
    ).rejects.toThrow(/user not found/i);
  });

  it('lists feedback and rejects feedback for a missing pod', async () => {
    await BouncerFeedbackModel.create({ user_id: userId, pod_id: podId, rating: 4, category: 'HOST' });
    const list = await bouncerService.listFeedback();
    expect(list).toHaveLength(1);
    expect(list[0].rating).toBe(4);

    await expect(
      bouncerService.submitFeedback(userId, { pod_id: new Types.ObjectId().toString(), rating: 5, category: 'SAFETY' })
    ).rejects.toThrow(/pod not found/i);
  });

  it('exposes a support target shape', async () => {
    const target = await bouncerService.getSupportTarget();
    expect(typeof target.available).toBe('boolean');
    expect(target).toHaveProperty('phone');
  });
});
