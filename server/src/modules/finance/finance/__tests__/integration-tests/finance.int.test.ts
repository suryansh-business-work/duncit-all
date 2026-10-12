jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import { paymentReleaseService } from '../../paymentRelease.service';
import { paymentReleaseGroupService } from '../../paymentReleaseGroup.service';
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

/*
  Payment Release, one row per pod request. Three requests cover the three
  statuses a row can roll up to, and the two ways a request is identified:

    Sunset Pod   — batch set_sunset: host PENDING 1000 + venue APPROVED 400
    Trivia Night — batch set_trivia: host APPROVED 250 + club admin REJECTED 50
    Board Games  — no batch (written before batches): host + venue REJECTED,
                   grouped by — and addressed as — its pod id
*/
describe('paymentReleaseGroupService integration', () => {
  const sunsetPod = new Types.ObjectId();
  const triviaPod = new Types.ObjectId();
  const boardPod = new Types.ObjectId();

  async function seedGroups() {
    const seedRelease = (over: Record<string, unknown>) =>
      PaymentReleaseModel.create({
        release_id: `REL-G-${Date.now()}-${++seq}`,
        kind: 'HOST_PAYMENT',
        status: 'PENDING',
        beneficiary_name: 'Asha',
        beneficiary_email: 'asha@x.com',
        ...over,
      });
    const sunset = { batch_id: 'set_sunset', pod_id: sunsetPod, pod_title: 'Sunset Pod' };
    const trivia = { batch_id: 'set_trivia', pod_id: triviaPod, pod_title: 'Trivia Night' };
    const board = { pod_id: boardPod, pod_title: 'Board Games', status: 'REJECTED' };
    // Created one at a time so `created_at` orders the payouts inside a request.
    await seedRelease({
      ...sunset,
      release_id: 'REL-G-SUNSET-HOST',
      amount_requested: 1000,
      evidence_media: [{ url: 'https://x.com/a.jpg' }, { url: 'https://x.com/b.mp4', type: 'VIDEO' }],
    });
    await seedRelease({
      ...sunset,
      kind: 'VENUE_BILLING',
      status: 'APPROVED',
      beneficiary_name: 'The Hall',
      beneficiary_email: 'owner@hall.com',
      amount_requested: 400,
      bill_url: 'https://x.com/bill.pdf',
    });
    await seedRelease({ ...trivia, status: 'APPROVED', amount_requested: 250 });
    await seedRelease({ ...trivia, kind: 'CLUB_ADMIN', status: 'REJECTED', amount_requested: 50 });
    await seedRelease({ ...board, amount_requested: 90 });
    await seedRelease({ ...board, kind: 'VENUE_BILLING', amount_requested: 10.5 });
  }

  it('rolls the payouts up to one row per request, with the status the request as a whole has', async () => {
    expect(await paymentReleaseGroupService.table()).toEqual({
      rows: [],
      total: 0,
      page: 1,
      page_size: 25,
    });
    await seedGroups();

    const all = await paymentReleaseGroupService.table();
    expect(all.total).toBe(3);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);
    const byId = new Map(all.rows.map((row) => [row.id, row]));

    // Waiting while ANY payout on it is — even beside one already paid.
    const sunset = byId.get('set_sunset')!;
    expect(sunset.status).toBe('PENDING');
    expect(sunset.pod_id).toBe(String(sunsetPod));
    expect(sunset.pod_title).toBe('Sunset Pod');
    expect(sunset.total_requested).toBe(1400);
    expect(sunset.release_count).toBe(2);
    expect([...sunset.kinds].sort((a, b) => a.localeCompare(b))).toEqual([
      'HOST_PAYMENT',
      'VENUE_BILLING',
    ]);
    expect(sunset.has_bill).toBe(true);
    expect(sunset.media_count).toBe(2);
    expect(Number.isNaN(Date.parse(sunset.requested_at))).toBe(false);

    // Nothing waiting and something paid — settled, whatever else was refused.
    const trivia = byId.get('set_trivia')!;
    expect(trivia.status).toBe('APPROVED');
    expect(trivia.total_requested).toBe(300);
    expect(trivia.has_bill).toBe(false);
    expect(trivia.media_count).toBe(0);

    // Rejected only when every payout was. No batch, so the pod id is its id.
    const board = byId.get(String(boardPod))!;
    expect(board.status).toBe('REJECTED');
    expect(board.total_requested).toBe(100.5);
    expect(board.release_count).toBe(2);
  });

  it('searches by any payout on the request, filters on the rolled-up status, sorts and pages', async () => {
    await seedGroups();
    const titles = (page: { rows: { pod_title: string }[] }) => page.rows.map((r) => r.pod_title);

    // One box finds a request by its pod, a beneficiary's name or email, or a release id.
    expect(titles(await paymentReleaseGroupService.table({ search: 'trivia' }))).toEqual([
      'Trivia Night',
    ]);
    const byBeneficiary = await paymentReleaseGroupService.table({ search: 'the hall' });
    expect(titles(byBeneficiary)).toEqual(['Sunset Pod']);
    expect(byBeneficiary.total).toBe(1);
    // The match is on one payout; the row is still the whole request.
    expect(byBeneficiary.rows[0]!.total_requested).toBe(1400);
    expect(titles(await paymentReleaseGroupService.table({ search: 'owner@hall' }))).toEqual([
      'Sunset Pod',
    ]);
    expect(titles(await paymentReleaseGroupService.table({ search: 'rel-g-sunset-host' }))).toEqual([
      'Sunset Pod',
    ]);
    const nothing = await paymentReleaseGroupService.table({ search: 'no such request' });
    expect(nothing.rows).toEqual([]);
    expect(nothing.total).toBe(0);

    // The status filter is the REQUEST's status: Sunset has an APPROVED payout
    // on it but is still waiting, so it is not an approved request.
    for (const [status, expected] of [
      ['PENDING', ['Sunset Pod']],
      ['APPROVED', ['Trivia Night']],
      ['REJECTED', ['Board Games']],
    ] as const) {
      const page = await paymentReleaseGroupService.table({
        filters: [{ field: 'status', op: 'eq', value: status }],
      });
      expect(titles(page)).toEqual(expected);
      expect(page.total).toBe(1);
    }
    const withClubAdmin = await paymentReleaseGroupService.table({
      filters: [{ field: 'kinds', op: 'eq', value: 'CLUB_ADMIN' }],
    });
    expect(titles(withClubAdmin)).toEqual(['Trivia Night']);
    // A field that is not on the allowlist is dropped, not obeyed.
    const unknownField = await paymentReleaseGroupService.table({
      filters: [{ field: 'beneficiary_emails', op: 'eq', value: 'owner@hall.com' }],
    });
    expect(unknownField.total).toBe(3);

    // Allowlisted sort + paging keep the total.
    const asc = await paymentReleaseGroupService.table({ sort_by: 'total_requested', sort_dir: 'asc' });
    expect(asc.rows.map((r) => r.total_requested)).toEqual([100.5, 300, 1400]);
    const page2 = await paymentReleaseGroupService.table({
      sort_by: 'total_requested',
      sort_dir: 'asc',
      page: 2,
      page_size: 1,
    });
    expect(page2.rows.map((r) => r.total_requested)).toEqual([300]);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
    const pastTheEnd = await paymentReleaseGroupService.table({ page: 4, page_size: 1 });
    expect(pastTheEnd.rows).toEqual([]);
    expect(pastTheEnd.total).toBe(3);
  });

  it('opens one request with every payout on it, by batch id or by legacy pod id', async () => {
    await seedGroups();

    const sunset = await paymentReleaseGroupService.detail('set_sunset');
    // The summary is the same roll-up the list quotes. `kinds` is a set — the
    // aggregation promises its members, not their order — so it is compared sorted.
    const sorted = <T extends { kinds: string[] }>(row: T) => ({
      ...row,
      kinds: [...row.kinds].sort((a, b) => a.localeCompare(b)),
    });
    const listed = (await paymentReleaseGroupService.table({ search: 'sunset' })).rows[0]!;
    expect(sorted(sunset.summary)).toEqual(sorted(listed));
    expect(sunset.summary.total_requested).toBe(1400);
    expect(sunset.releases.map((r) => [r.kind, r.status, r.amount_requested])).toEqual([
      ['HOST_PAYMENT', 'PENDING', 1000],
      ['VENUE_BILLING', 'APPROVED', 400],
    ]);
    expect(sunset.releases.every((r) => r.batch_id === 'set_sunset')).toBe(true);

    const board = await paymentReleaseGroupService.detail(String(boardPod));
    expect(board.summary.id).toBe(String(boardPod));
    expect(board.summary.status).toBe('REJECTED');
    expect(board.releases).toHaveLength(2);
    expect(board.releases.every((r) => r.batch_id === null)).toBe(true);
  });

  it('answers NOT_FOUND for a request that is not there', async () => {
    await seedGroups();
    const notFound = {
      message: 'Payment release request not found',
      extensions: { code: 'NOT_FOUND' },
    };
    await expect(paymentReleaseGroupService.detail('set_missing')).rejects.toMatchObject(notFound);
    await expect(
      paymentReleaseGroupService.detail(new Types.ObjectId().toString())
    ).rejects.toMatchObject(notFound);
    await expect(paymentReleaseGroupService.detail('')).rejects.toMatchObject(notFound);
    // A pod id only stands for the UNBATCHED payouts on that pod: Sunset's are
    // batched, so its pod id is not a request.
    await expect(paymentReleaseGroupService.detail(String(sunsetPod))).rejects.toMatchObject(
      notFound
    );
  });
});
