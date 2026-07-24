jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import { paymentReleaseService } from '../../paymentRelease.service';
import { PaymentReleaseModel } from '../../paymentRelease.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { walletService } from '@modules/finance/wallet/wallet.service';

let venueSeq = 0;
async function seedVenueRelease(over: Record<string, unknown>) {
  venueSeq += 1;
  const doc = await PaymentReleaseModel.create({
    release_id: `REL-V-${Date.now()}-${venueSeq}`,
    kind: 'VENUE_BILLING',
    status: 'PENDING',
    pod_id: new Types.ObjectId(),
    pod_title: 'Gala Night',
    beneficiary_name: 'The Hall',
    beneficiary_email: 'owner@x.com',
    amount_requested: 400,
    ...over,
  });
  return String(doc._id);
}

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

  it('serves the paymentReleaseRequestsTable page with search, filter, sort and paging', async () => {
    const seedRelease = (over: Record<string, unknown>) =>
      PaymentReleaseModel.create({
        release_id: `REL-${Date.now()}-${++seq}`,
        kind: 'HOST_PAYMENT',
        status: 'PENDING',
        pod_id: new Types.ObjectId(),
        pod_title: 'Sunset Pod',
        beneficiary_name: 'Asha',
        beneficiary_email: 'asha@x.com',
        amount_requested: 1000,
        ...over,
      });
    await seedRelease({ pod_title: 'Sunset Pod', amount_requested: 1000 });
    await seedRelease({ pod_title: 'Trivia Night', kind: 'VENUE_BILLING', amount_requested: 400 });
    await seedRelease({ pod_title: 'Board Games', status: 'APPROVED', amount_requested: 250 });

    // Plain envelope with the clamp defaults (created_at desc).
    const all = await paymentReleaseService.table();
    expect(all.total).toBe(3);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans release_id / pod_title / beneficiary fields.
    const byTitle = await paymentReleaseService.table({ search: 'trivia' });
    expect(byTitle.rows.map((r) => r.pod_title)).toEqual(['Trivia Night']);
    expect(byTitle.total).toBe(1);

    // Status + kind enum filters narrow (the old UI's two selects).
    const pending = await paymentReleaseService.table({
      filters: [{ field: 'status', op: 'eq', value: 'PENDING' }],
    });
    expect(pending.total).toBe(2);
    const venue = await paymentReleaseService.table({
      filters: [{ field: 'kind', op: 'eq', value: 'VENUE_BILLING' }],
    });
    expect(venue.rows.map((r) => r.pod_title)).toEqual(['Trivia Night']);

    // Allowlisted sort + paging keep the total.
    const asc = await paymentReleaseService.table({ sort_by: 'amount_requested', sort_dir: 'asc' });
    expect(asc.rows.map((r) => r.amount_requested)).toEqual([250, 400, 1000]);
    const page2 = await paymentReleaseService.table({
      sort_by: 'amount_requested',
      sort_dir: 'asc',
      page: 2,
      page_size: 1,
    });
    expect(page2.rows.map((r) => r.amount_requested)).toEqual([400]);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('credits the venue owner wallet when a VENUE_BILLING release is approved', async () => {
    const ownerId = new Types.ObjectId();
    const venueId = new Types.ObjectId();
    await VenueModel.collection.insertOne({ _id: venueId, owner_user_id: ownerId, venue_name: 'The Hall' });
    const id = await seedVenueRelease({ venue_id: venueId, amount_requested: 400 });

    await paymentReleaseService.review(id, { status: 'APPROVED', approval_type: 'FULL' });

    const wallet = await walletService.getMyWallet(String(ownerId));
    expect(wallet.balance).toBe(400);
  });

  it('does not credit when the venue has no owner or no venue_id', async () => {
    // venue_id points at a venue that does not exist -> no owner -> no credit.
    const ghostVenue = new Types.ObjectId();
    const withVenue = await seedVenueRelease({ venue_id: ghostVenue });
    await paymentReleaseService.review(withVenue, { status: 'APPROVED', approval_type: 'FULL' });
    expect((await walletService.getMyWallet(String(ghostVenue))).balance).toBe(0);

    // A venue release with no venue_id at all -> the credit block is skipped.
    const noVenue = await seedVenueRelease({ venue_id: null });
    const reviewed = await paymentReleaseService.review(noVenue, {
      status: 'APPROVED',
      approval_type: 'FULL',
    });
    expect(reviewed.status).toBe('APPROVED');
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
