import { Types } from 'mongoose';
import { bouncerService } from '../../bouncer.service';
import {
  BouncerSosAlertModel,
  BouncerCallbackRequestModel,
  BouncerFeedbackModel,
} from '../../bouncer.model';

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
