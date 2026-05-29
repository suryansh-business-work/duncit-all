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
});
