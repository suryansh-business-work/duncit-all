import { Types } from 'mongoose';
import { bouncerService } from '../../bouncer.service';
import { bouncerResolvers } from '../../bouncer.resolver';
import { makeContext } from '@test/harness';

const uid = new Types.ObjectId().toString();

describe('bouncer unit', () => {
  it('submitFeedback rejects an out-of-range rating before any DB call', async () => {
    await expect(
      bouncerService.submitFeedback(uid, { pod_id: new Types.ObjectId().toString(), rating: 9, category: 'SAFETY' })
    ).rejects.toThrow(/rating must be 1-5/i);
  });

  it('raiseSos rejects an invalid pod_id', async () => {
    await expect(
      bouncerService.raiseSos(uid, { pod_id: 'not-an-id' })
    ).rejects.toThrow(/invalid pod_id/i);
  });

  it('raiseBouncerSos requires authentication', () => {
    expect(() =>
      (bouncerResolvers.Mutation as any).raiseBouncerSos({}, { input: {} }, makeContext(null))
    ).toThrow(/not authenticated/i);
  });

  it('bouncerSosAlerts is gated to support roles', () => {
    expect(() =>
      (bouncerResolvers.Query as any).bouncerSosAlerts({}, {}, makeContext({ roles: ['USER'] }))
    ).toThrow(/access denied/i);
  });
});
