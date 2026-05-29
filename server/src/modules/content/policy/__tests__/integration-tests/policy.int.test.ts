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

  it('seeds default policies idempotently', async () => {
    await policyService.seedDefaults();
    await policyService.seedDefaults();
    expect(await PolicyModel.countDocuments({ slug: 'backout-terms' })).toBe(1);
  });
});
