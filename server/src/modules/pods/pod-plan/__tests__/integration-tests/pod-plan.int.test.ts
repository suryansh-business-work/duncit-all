import { podPlanService } from '../../pod-plan.service';
import { PodPlanModel } from '../../pod-plan.model';

describe('podPlanService integration', () => {
  it('creates, lists (incl. public) and updates a plan', async () => {
    const created = await podPlanService.create({ key: 'Pro', name: 'Pro Plan', is_active: true });
    expect(created.key).toBe('pro');

    expect(await podPlanService.list()).toHaveLength(1);
    expect(await podPlanService.listPublic()).toHaveLength(1);

    const updated = await podPlanService.update(created.id, { price_label: '₹499/mo' });
    expect(updated.price_label).toBe('₹499/mo');
  });

  it('prevents duplicate keys and removes plans', async () => {
    const created = await podPlanService.create({ key: 'basic', name: 'Basic' });
    await expect(podPlanService.create({ key: 'basic', name: 'dup' })).rejects.toThrow(/already exists/i);
    expect(await podPlanService.remove(created.id)).toBe(true);
  });

  it('seeds default plans idempotently', async () => {
    await podPlanService.seedDefaults();
    await podPlanService.seedDefaults();
    expect(await PodPlanModel.countDocuments()).toBe(2);
  });
});
