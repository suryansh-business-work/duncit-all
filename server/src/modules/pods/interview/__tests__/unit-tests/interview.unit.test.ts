import { Types } from 'mongoose';
import { interviewService } from '../../interview.service';
import { interviewResolvers } from '../../interview.resolver';
import { makeContext } from '@test/harness';

const uid = new Types.ObjectId().toString();
const slot = () => ({ start: new Date(Date.now() + 86_400_000).toISOString(), end: new Date(Date.now() + 90_000_000).toISOString() });

describe('interview unit', () => {
  it('create requires at least one preferred slot', async () => {
    await expect(interviewService.create({ preferred_slots: [] }, uid)).rejects.toThrow(/at least one preferred slot/i);
  });

  it('create rejects more than 5 slots', async () => {
    await expect(
      interviewService.create({ preferred_slots: Array.from({ length: 6 }, slot) }, uid)
    ).rejects.toThrow(/up to 5 preferred slots/i);
  });

  it('create rejects an invalid slot range', async () => {
    const bad = { start: new Date(Date.now() + 90_000_000).toISOString(), end: new Date(Date.now() + 86_400_000).toISOString() };
    await expect(interviewService.create({ preferred_slots: [bad] }, uid)).rejects.toThrow(/invalid slot range/i);
  });

  it('interviews query is gated to admin roles', async () => {
    await expect(
      (interviewResolvers.Query as any).interviews({}, {}, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });

  it('createInterview requires authentication', async () => {
    await expect(
      (interviewResolvers.Mutation as any).createInterview({}, { input: {} }, makeContext(null))
    ).rejects.toThrow(/not authenticated/i);
  });
});
