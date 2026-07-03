import { Types } from 'mongoose';
import { hostService } from '../../host.service';
import { HostModel } from '../../host.model';
import { CategoryModel } from '@modules/pods/category/category.model';

/** Seed a Super → Category → Sub chain; returns the three ids. */
async function seedCategoryTree(prefix: string) {
  const superCat = await CategoryModel.create({ name: `${prefix} Super`, slug: `${prefix}-super`, level: 'SUPER', parent_id: null });
  const category = await CategoryModel.create({ name: `${prefix} Cat`, slug: `${prefix}-cat`, level: 'CATEGORY', parent_id: superCat._id });
  const sub = await CategoryModel.create({ name: `${prefix} Sub`, slug: `${prefix}-sub`, level: 'SUB', parent_id: category._id });
  return {
    super_category_id: String(superCat._id),
    category_id: String(category._id),
    sub_category_id: String(sub._id),
  };
}

const baseStep = {
  step1: { full_name: 'Asha', email: 'asha@x.com', phone: '+919999999999', dob: '' },
  step2: { aadhar_number: '123456789012', pan_number: 'ABCDE1234F', passport_photo_url: 'https://i/p.jpg' },
  step3: { police_verification_url: 'https://i/pv.jpg', full_address: 'Somewhere nice' },
};

const userId = new Types.ObjectId().toString();
const yearsAgo = (y: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - y);
  return d.toISOString();
};

describe('hostService integration', () => {
  it('returns null/empty when there is no host application', async () => {
    expect(await hostService.getMine(userId)).toBeNull();
    expect(await hostService.list()).toEqual([]);
  });

  it('walks the multi-step host flow to SUBMITTED', async () => {
    const s1 = await hostService.submitStep1(userId, {
      full_name: 'Asha',
      email: 'asha@x.com',
      phone: '+919999999999',
      dob: yearsAgo(28),
    });
    expect(s1.step_completed).toBe(1);

    const s2 = await hostService.submitStep2(userId, { aadhar_number: '1234', pan_number: 'ABCDE1234F', passport_photo_url: 'https://i/p.jpg' });
    expect(s2.step_completed).toBe(2);

    const s3 = await hostService.submitStep3(userId, { police_verification_url: 'https://i/pv.jpg', full_address: 'Somewhere' });
    expect(s3.step_completed).toBe(3);

    const fin = await hostService.submitFinal(userId);
    expect(fin.status).toBe('SUBMITTED');
  });

  it('validates date of birth and step ordering', async () => {
    const u = new Types.ObjectId().toString();
    await expect(
      hostService.submitStep1(u, { full_name: 'X', email: 'x@x.com', phone: '1', dob: 'not-a-date' })
    ).rejects.toThrow(/valid date of birth/i);
    await expect(
      hostService.submitStep1(u, { full_name: 'X', email: 'x@x.com', phone: '1', dob: yearsAgo(10) })
    ).rejects.toThrow(/age must be between/i);
    await expect(
      hostService.submitStep2(new Types.ObjectId().toString(), {})
    ).rejects.toThrow(/complete personal details first/i);
  });

  it('rejects an application', async () => {
    const h = await HostModel.create({ user_id: userId, full_name: 'Asha' });
    const rejected = await hostService.reject(String(h._id), 'Incomplete');
    expect(rejected.status).toBe('REJECTED');
    expect(await HostModel.countDocuments()).toBe(1);
  });

  it('appends a category from an approved request and dedupes by request_no', async () => {
    const u = new Types.ObjectId().toString();
    await HostModel.create({ user_id: u, full_name: 'Cat Host', status: 'APPROVED' });
    const superId = new Types.ObjectId();
    const categoryId = new Types.ObjectId();
    const subId = new Types.ObjectId();
    const mapping = {
      super_category_id: superId,
      category_id: categoryId,
      sub_category_id: subId,
      super_category_name: 'For You',
      category_name: 'Sports',
      sub_category_name: 'Badminton',
      request_no: 'HOSTREQ-000001',
    };

    const after = await hostService.addCategoryFromRequest(u, mapping);
    expect(after.host_categories).toHaveLength(1);
    expect(after.host_categories[0]).toMatchObject({
      super_category_id: String(superId),
      category_id: String(categoryId),
      sub_category_id: String(subId),
      super_category_name: 'For You',
      category_name: 'Sports',
      sub_category_name: 'Badminton',
      request_no: 'HOSTREQ-000001',
    });

    // Idempotent: re-applying the same request_no does not duplicate.
    const again = await hostService.addCategoryFromRequest(u, mapping);
    expect(again.host_categories).toHaveLength(1);

    // A different request_no adds a second mapping.
    const second = await hostService.addCategoryFromRequest(u, { ...mapping, request_no: 'HOSTREQ-000002' });
    expect(second.host_categories).toHaveLength(2);
  });

  it('admin edits multi-category assignments: validates, denormalizes names, dedupes, preserves request_no', async () => {
    const a = await seedCategoryTree('alpha');
    const b = await seedCategoryTree('beta');
    // Host already holds category A from an approved request.
    const h = await HostModel.create({
      user_id: new Types.ObjectId(),
      full_name: 'Multi Host',
      status: 'APPROVED',
      host_categories: [{
        super_category_id: new Types.ObjectId(a.super_category_id),
        category_id: new Types.ObjectId(a.category_id),
        sub_category_id: new Types.ObjectId(a.sub_category_id),
        super_category_name: 'stale', category_name: 'stale', sub_category_name: 'stale',
        request_no: 'HOSTREQ-000009',
      }],
    });

    // Admin keeps A and adds B (a second super-category) — plus a duplicate B.
    const updated = await hostService.adminUpdate(String(h._id), {
      ...baseStep,
      categories: [a, b, b],
    });
    expect(updated.host_categories).toHaveLength(2);
    const byRequest = updated.host_categories.find((c: any) => c.request_no === 'HOSTREQ-000009');
    // Existing category keeps its request linkage AND gets fresh denormalized names.
    expect(byRequest).toMatchObject({ sub_category_id: a.sub_category_id, sub_category_name: 'alpha Sub' });
    // Admin-added category has no request linkage and correct names.
    const added = updated.host_categories.find((c: any) => c.sub_category_id === b.sub_category_id);
    expect(added).toMatchObject({ request_no: '', super_category_name: 'beta Super', category_name: 'beta Cat', sub_category_name: 'beta Sub' });
  });

  it('rejects an invalid category triple (broken parent chain) on admin update', async () => {
    const a = await seedCategoryTree('gamma');
    const b = await seedCategoryTree('delta');
    const h = await HostModel.create({ user_id: new Types.ObjectId(), full_name: 'Bad Cat', status: 'APPROVED' });
    await expect(
      hostService.adminUpdate(String(h._id), {
        ...baseStep,
        // sub of B under category of A — parent chain doesn't line up.
        categories: [{ super_category_id: a.super_category_id, category_id: a.category_id, sub_category_id: b.sub_category_id }],
      })
    ).rejects.toThrow(/valid sub category/i);
  });

  it('leaves categories untouched when the admin update omits them', async () => {
    const a = await seedCategoryTree('epsilon');
    const h = await HostModel.create({
      user_id: new Types.ObjectId(),
      full_name: 'Keep Cat',
      status: 'APPROVED',
      host_categories: [{
        super_category_id: new Types.ObjectId(a.super_category_id),
        category_id: new Types.ObjectId(a.category_id),
        sub_category_id: new Types.ObjectId(a.sub_category_id),
        super_category_name: 'X', category_name: 'Y', sub_category_name: 'Z', request_no: 'HOSTREQ-1',
      }],
    });
    const updated = await hostService.adminUpdate(String(h._id), baseStep);
    expect(updated.host_categories).toHaveLength(1);
    expect(updated.host_categories[0].request_no).toBe('HOSTREQ-1');
  });

  it('throws when adding a category to a missing host', async () => {
    await expect(
      hostService.addCategoryFromRequest(new Types.ObjectId().toString(), {
        super_category_id: null,
        category_id: null,
        sub_category_id: null,
        super_category_name: '',
        category_name: '',
        sub_category_name: '',
        request_no: 'X',
      })
    ).rejects.toThrow(/host not found/i);
  });
});
