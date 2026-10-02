/**
 * The scheduler lease against a real Mongo. What matters: a free lease is
 * taken, a live lease held by another process is refused (the upsert's `_id`
 * collision is the "no"), an expired one is taken over, and our own lease
 * renews.
 */
import mongoose from 'mongoose';
import { claimSchedulerLease, isSchedulerLeader, startSchedulerLease } from '@utils/schedulerLeader';

const leases = () => mongoose.connection.collection('schedulerleases');

describe('claimSchedulerLease', () => {
  beforeEach(async () => {
    await leases().deleteMany({});
  });

  it('takes a lease nobody holds', async () => {
    expect(await claimSchedulerLease()).toBe(true);
    expect(await leases().countDocuments({ _id: 'scheduler-leader' as never })).toBe(1);
  });

  it('renews its own lease and pushes the expiry forward', async () => {
    const start = new Date('2026-10-02T10:00:00Z');
    await claimSchedulerLease(start);
    await claimSchedulerLease(new Date(start.getTime() + 30_000));
    const lease = await leases().findOne({ _id: 'scheduler-leader' as never });
    expect(lease?.expires_at).toEqual(new Date(start.getTime() + 120_000));
  });

  it('refuses a live lease another process holds', async () => {
    const now = new Date();
    await leases().insertOne({
      _id: 'scheduler-leader' as never,
      owner: 'web-2:41:abcd1234',
      expires_at: new Date(now.getTime() + 60_000),
    });
    expect(await claimSchedulerLease(now)).toBe(false);
  });

  it('takes over a lease whose holder stopped renewing', async () => {
    const now = new Date();
    await leases().insertOne({
      _id: 'scheduler-leader' as never,
      owner: 'web-2:41:abcd1234',
      expires_at: new Date(now.getTime() - 1_000),
    });
    expect(await claimSchedulerLease(now)).toBe(true);
    const lease = await leases().findOne({ _id: 'scheduler-leader' as never });
    expect(lease?.owner).not.toBe('web-2:41:abcd1234');
  });

  it('rethrows a failure that is not the collision', async () => {
    const spy = jest.spyOn(mongoose.Model, 'updateOne').mockRejectedValueOnce(new Error('not primary'));
    await expect(claimSchedulerLease()).rejects.toThrow('not primary');
    spy.mockRestore();
  });
});

describe('startSchedulerLease', () => {
  beforeEach(async () => {
    await leases().deleteMany({});
  });

  it('does nothing under NODE_ENV=test, so this process never leads', () => {
    startSchedulerLease();
    expect(isSchedulerLeader()).toBe(false);
  });

  it('leads once its first claim lands, outside a test run', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      startSchedulerLease();
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(isSchedulerLeader()).toBe(true);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
