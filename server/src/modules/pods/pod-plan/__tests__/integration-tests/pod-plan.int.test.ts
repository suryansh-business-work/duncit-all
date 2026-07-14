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

  it('serves the podPlansTable page with the sort_order default, search, filter and paging', async () => {
    await podPlanService.create({ key: 'zeta', name: 'Zeta', sort_order: 0 });
    await podPlanService.create({ key: 'alpha', name: 'Alpha', sort_order: 1, is_active: false });
    await podPlanService.create({ key: 'mid', name: 'Mid', sort_order: 0 });

    // Default order mirrors list(): sort_order asc, then name asc.
    const all = await podPlanService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((r) => r.name)).toEqual(['Mid', 'Zeta', 'Alpha']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans name and key.
    const searched = await podPlanService.table({ search: 'alph' });
    expect(searched.rows.map((r) => r.key)).toEqual(['alpha']);
    expect(searched.total).toBe(1);

    // Boolean filter narrows.
    const active = await podPlanService.table({ filters: [{ field: 'is_active', op: 'is_true' }] });
    expect(active.rows.map((r) => r.name)).toEqual(['Mid', 'Zeta']);

    // Allowlisted sort + paging over it.
    const sorted = await podPlanService.table({ sort_by: 'name', sort_dir: 'desc' });
    expect(sorted.rows.map((r) => r.name)).toEqual(['Zeta', 'Mid', 'Alpha']);
    const page2 = await podPlanService.table({ sort_by: 'name', sort_dir: 'asc', page: 2, page_size: 1 });
    expect(page2.rows.map((r) => r.name)).toEqual(['Mid']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });
});
