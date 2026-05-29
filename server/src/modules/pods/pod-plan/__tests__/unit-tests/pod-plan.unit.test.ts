import { podPlanService } from '../../pod-plan.service';
import { podPlanResolvers } from '../../pod-plan.resolver';
import { makeContext } from '@test/harness';

describe('pod-plan unit', () => {
  it('create requires a key', async () => {
    await expect(podPlanService.create({ name: 'No key' })).rejects.toThrow(/key is required/i);
  });

  it('podPlans query is gated to admin write roles', async () => {
    await expect(
      (podPlanResolvers.Query as any).podPlans({}, {}, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });

  it('createPodPlan is gated to admin write roles', async () => {
    await expect(
      (podPlanResolvers.Mutation as any).createPodPlan({}, { input: { key: 'x', name: 'X' } }, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });
});
