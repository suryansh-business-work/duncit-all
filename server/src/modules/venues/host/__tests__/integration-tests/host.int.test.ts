import { Types } from 'mongoose';
import { hostService } from '../../host.service';
import { HostModel } from '../../host.model';

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
