import { policyService } from '../../policy.service';
import { PolicyModel } from '../../policy.model';

describe('policyService integration', () => {
  it('creates, fetches by id and slug, and normalises the slug', async () => {
    const created = await policyService.create({ title: 'Privacy Policy', slug: 'Privacy Policy' });
    expect(created.slug).toBe('privacy-policy');

    expect((await policyService.getById(created.id))?.title).toBe('Privacy Policy');
    expect((await policyService.getBySlug('privacy-policy'))?.id).toBe(created.id);
  });

  it('prevents duplicate slugs', async () => {
    await policyService.create({ title: 'Terms', slug: 'terms' });
    await expect(policyService.create({ title: 'Terms 2', slug: 'terms' })).rejects.toThrow(/already exists/i);
  });

  it('filters by active flag and search, and lists public only when active', async () => {
    await policyService.create({ title: 'Active', slug: 'active', is_active: true });
    await policyService.create({ title: 'Hidden', slug: 'hidden', is_active: false });

    expect(await policyService.list({ is_active: false })).toHaveLength(1);
    expect(await policyService.list({ search: 'active' })).toHaveLength(1);
    expect(await policyService.publicList()).toHaveLength(1);
  });

  it('updates and removes a policy', async () => {
    const p = await policyService.create({ title: 'Refund', slug: 'refund' });
    const updated = await policyService.update(p.id, { title: 'Refund Policy', is_active: false });
    expect(updated.title).toBe('Refund Policy');
    expect(updated.is_active).toBe(false);

    expect(await policyService.remove(p.id)).toBe(true);
    expect(await PolicyModel.countDocuments()).toBe(0);
  });

  it('serves the policiesTable page with search, filter, sort and paging', async () => {
    await policyService.create({ title: 'Privacy', slug: 'privacy', sort_order: 2 });
    await policyService.create({ title: 'Terms', slug: 'terms', sort_order: 1 });
    await policyService.create({ title: 'Refunds', slug: 'refunds', sort_order: 3, is_active: false });

    // Plain envelope with the default sort (sort_order asc, like the list) and clamp defaults.
    const all = await policyService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((p) => p.slug)).toEqual(['terms', 'privacy', 'refunds']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans title and slug.
    const searched = await policyService.table({ search: 'priv' });
    expect(searched.rows.map((p) => p.slug)).toEqual(['privacy']);
    expect(searched.total).toBe(1);

    // Boolean filter narrows.
    const active = await policyService.table({ filters: [{ field: 'is_active', op: 'is_true' }] });
    expect(active.rows.map((p) => p.slug)).toEqual(['terms', 'privacy']);

    // Allowlisted sort + paging keep total and report the clamps back.
    const byTitle = await policyService.table({ sort_by: 'title', sort_dir: 'asc' });
    expect(byTitle.rows.map((p) => p.title)).toEqual(['Privacy', 'Refunds', 'Terms']);

    const page2 = await policyService.table({ page: 2, page_size: 1 });
    expect(page2.rows.map((p) => p.slug)).toEqual(['privacy']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('seeds default policies idempotently', async () => {
    await policyService.seedDefaults();
    await policyService.seedDefaults();
    expect(await PolicyModel.countDocuments({ slug: 'backout-terms' })).toBe(1);
  });
});
