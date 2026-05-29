jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import { paymentReleaseService } from '../../paymentRelease.service';
import { PaymentReleaseModel } from '../../paymentRelease.model';

let seq = 0;
async function seedRequest(amount = 1000) {
  seq += 1;
  const doc = await PaymentReleaseModel.create({
    release_id: `REL-${Date.now()}-${seq}`,
    kind: 'HOST_PAYMENT',
    status: 'PENDING',
    pod_id: new Types.ObjectId(),
    pod_title: 'Sunset Pod',
    beneficiary_name: 'Asha',
    beneficiary_email: 'asha@x.com',
    amount_requested: amount,
  });
  return String(doc._id);
}

describe('paymentReleaseService integration', () => {
  it('lists requests and approves a full release', async () => {
    expect(await paymentReleaseService.list()).toEqual([]);

    const id = await seedRequest(1000);
    const reviewed = await paymentReleaseService.review(id, { status: 'APPROVED', approval_type: 'FULL' }, new Types.ObjectId().toString());
    expect(reviewed.status).toBe('APPROVED');
    expect(reviewed.approved_amount).toBe(1000);

    expect(await paymentReleaseService.list({ status: 'APPROVED' })).toHaveLength(1);
  });

  it('requires a reason for partial release and rejection', async () => {
    const id = await seedRequest(1000);
    await expect(
      paymentReleaseService.review(id, { status: 'APPROVED', approval_type: 'PARTIAL', approved_amount: 500 })
    ).rejects.toThrow(/reason is required/i);
  });

  it('blocks reviewing a non-pending request and a missing id', async () => {
    const id = await seedRequest();
    await paymentReleaseService.review(id, { status: 'REJECTED', approval_reason: 'no docs' });
    await expect(
      paymentReleaseService.review(id, { status: 'APPROVED', approval_type: 'FULL' })
    ).rejects.toThrow(/only pending/i);

    await expect(
      paymentReleaseService.review(new Types.ObjectId().toString(), { status: 'APPROVED' })
    ).rejects.toThrow(/not found/i);
  });
});
