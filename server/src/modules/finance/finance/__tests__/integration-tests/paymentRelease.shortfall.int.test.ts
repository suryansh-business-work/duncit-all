jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import { paymentReleaseService, shortfallFundingNote, toPub } from '../../paymentRelease.service';
import { PaymentReleaseModel } from '../../paymentRelease.model';

/**
 * The reference pod collected ₹36 but its completion asked Finance to pay the
 * venue ₹40 and the club admin ₹0.87 in full, while the host side sat at
 * −₹15.89. Approving that pays out money the pod never took. The shortfall is
 * frozen on the releases, and Finance can approve it only by saying who funds
 * it — recorded on every release it approves.
 */
let seq = 0;
async function seedBatch(shortfall: number) {
  const batch = `set_shortfall_${++seq}`;
  const podId = new Types.ObjectId();
  const common = {
    batch_id: batch,
    status: 'PENDING',
    pod_id: podId,
    pod_title: 'Test pod',
    breakdown: { collected_total: 36, venue_bill: 9999, venue_bill_applied: false, funding_shortfall: shortfall },
  };
  await PaymentReleaseModel.create([
    { ...common, release_id: `REL-SF-V-${seq}`, kind: 'VENUE_BILLING', beneficiary_name: 'Test Pay', beneficiary_email: 'v@x.com', amount_requested: 40 },
    { ...common, release_id: `REL-SF-C-${seq}`, kind: 'CLUB_ADMIN', beneficiary_name: 'Club admin', beneficiary_email: 'c@x.com', amount_requested: 0.87 },
  ]);
  return batch;
}

const reviewer = () => new Types.ObjectId().toHexString();

describe('shortfallFundingNote', () => {
  it('asks for nothing when the pod paid its way', () => {
    expect(shortfallFundingNote(0, undefined)).toBe('');
  });

  it('refuses a missing or too-short note when there is a shortfall, naming the amount', () => {
    for (const note of [undefined, '', '   ', 'too short']) {
      expect(() => shortfallFundingNote(15.89, note)).toThrow(/₹15\.89 more than its pod's takings/);
    }
    try {
      shortfallFundingNote(15.89, 'short');
    } catch (error) {
      expect(error).toMatchObject({ extensions: { code: 'BAD_USER_INPUT', funding_shortfall: 15.89 } });
    }
  });

  it('accepts a real note, trimmed', () => {
    expect(shortfallFundingNote(15.89, '  Duncit absorbs this one — pilot venue  ')).toBe('Duncit absorbs this one — pilot venue');
  });
});

describe('approving a request that pays out more than its pod took', () => {
  it('is refused without a funding note, and nothing is paid', async () => {
    const batch = await seedBatch(15.89);
    await expect(paymentReleaseService.approveGroup(batch, reviewer())).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT', funding_shortfall: 15.89 },
    });
    expect(await PaymentReleaseModel.countDocuments({ batch_id: batch, status: 'PENDING' })).toBe(2);
  });

  it('approves every release with the note recorded on each', async () => {
    const batch = await seedBatch(15.89);
    await paymentReleaseService.approveGroup(batch, reviewer(), 'Duncit marketing budget covers the gap');
    const rows = await PaymentReleaseModel.find({ batch_id: batch });
    expect(rows.map((row) => row.status)).toEqual(['APPROVED', 'APPROVED']);
    expect(rows.every((row) => row.shortfall_funding_note === 'Duncit marketing budget covers the gap')).toBe(true);
  });

  it('asks for no note when the request carries no shortfall', async () => {
    const batch = await seedBatch(0);
    await paymentReleaseService.approveGroup(batch, reviewer());
    expect(await PaymentReleaseModel.countDocuments({ batch_id: batch, status: 'APPROVED', shortfall_funding_note: '' })).toBe(2);
  });

  it('holds a single-release review to the same rule', async () => {
    const batch = await seedBatch(15.89);
    const venue = await PaymentReleaseModel.findOne({ batch_id: batch, kind: 'VENUE_BILLING' });
    await expect(
      paymentReleaseService.review(String(venue!._id), { status: 'APPROVED', approval_type: 'FULL' }, reviewer())
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect((await PaymentReleaseModel.findById(venue!._id))?.status).toBe('PENDING');

    const approved = await paymentReleaseService.review(
      String(venue!._id),
      { status: 'APPROVED', approval_type: 'FULL', shortfall_funding_note: 'Venue contract guarantee, Duncit pays' },
      reviewer()
    );
    expect(approved).toMatchObject({ status: 'APPROVED', shortfall_funding_note: 'Venue contract guarantee, Duncit pays' });
  });

  it('shows the evidence-only venue bill and the shortfall on the release, and defaults them on older releases', async () => {
    const batch = await seedBatch(15.89);
    const venue = await PaymentReleaseModel.findOne({ batch_id: batch, kind: 'VENUE_BILLING' });
    expect(toPub(venue!).breakdown).toMatchObject({ venue_bill: 9999, venue_bill_applied: false, funding_shortfall: 15.89 });

    const legacy = await PaymentReleaseModel.collection.insertOne({
      release_id: `REL-SF-OLD-${seq}`,
      kind: 'HOST_PAYMENT',
      status: 'APPROVED',
      pod_id: new Types.ObjectId(),
      pod_title: 'Old pod',
      beneficiary_name: 'Old host',
      beneficiary_email: 'o@x.com',
      amount_requested: 100,
      requested_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      breakdown: { collected_total: 100, venue_bill: 0 },
    });
    const old = await PaymentReleaseModel.findById(legacy.insertedId);
    expect(toPub(old!)).toMatchObject({ shortfall_funding_note: '' });
    expect(toPub(old!).breakdown).toMatchObject({ venue_bill_applied: null, funding_shortfall: 0 });
  });
});
