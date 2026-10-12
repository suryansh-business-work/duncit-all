jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { sendEmail } from '@services/email/email.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { UserModel } from '@modules/access/user/user.model';
import { WalletModel } from '@modules/finance/wallet/wallet.model';
import { PaymentReleaseModel } from '../../paymentRelease.model';
import { paymentReleaseService as svc, toPub } from '../../paymentRelease.service';

/**
 * The manual payment-release path: what a request must carry before it is
 * created, and what a reviewer must supply before money moves to a wallet.
 */

let seq = 0;
const code = (c: string) => expect.objectContaining({ extensions: { code: c } });

async function seedHost(over: Record<string, unknown> = {}) {
  seq += 1;
  return UserModel.create({ auth: { email: `rel-host${seq}@x.com` }, profile: { first_name: 'Asha', last_name: 'Host' }, ...over });
}
async function seedPod(over: Record<string, unknown> = {}) {
  seq += 1;
  return PodModel.create({
    pod_id: `pod-rel-${seq}`,
    pod_title: 'Sunset Pod',
    pod_hosts_id: [],
    club_id: new Types.ObjectId(),
    pod_description: 'd',
    pod_date_time: new Date(),
    pod_type: 'PAID',
    ...over,
  });
}
const media = [{ url: 'https://cdn.test/party.mp4?x=1' }, 'https://cdn.test/photo.jpg', { url: '  ' }];

describe('create', () => {
  it('refuses an unsupported kind, a non-positive amount and an unknown pod', async () => {
    await expect(svc.create({ kind: 'CLUB_ADMIN', amount_requested: 10, pod_id: new Types.ObjectId() })).rejects.toThrow('Invalid payment release type');
    await expect(svc.create({ kind: 'HOST_PAYMENT', amount_requested: 0, pod_id: new Types.ObjectId() })).rejects.toThrow('greater than 0');
    await expect(svc.create({ kind: 'HOST_PAYMENT', amount_requested: 'abc', pod_id: new Types.ObjectId() })).rejects.toThrow('greater than 0');
    await expect(svc.create({ kind: 'HOST_PAYMENT', amount_requested: 10, pod_id: new Types.ObjectId() })).rejects.toMatchObject({
      message: 'Pod not found',
      extensions: { code: 'NOT_FOUND' },
    });
  });

  it('needs a venue with an owner email for venue billing', async () => {
    const noVenue = await seedPod();
    await expect(svc.create({ kind: 'VENUE_BILLING', amount_requested: 10, pod_id: noVenue._id })).rejects.toThrow('no venue billing target');

    const ghost = await seedPod({ venue_id: new Types.ObjectId() });
    await expect(svc.create({ kind: 'VENUE_BILLING', amount_requested: 10, pod_id: ghost._id })).rejects.toThrow('Venue not found');

    const venue = await VenueModel.create({ owner_user_id: new Types.ObjectId(), venue_name: 'Cafe', owner_email: 'owner@x.com' });
    await VenueModel.collection.updateOne({ _id: venue._id }, { $set: { owner_email: '' } });
    const pod = await seedPod({ venue_id: venue._id });
    await expect(svc.create({ kind: 'VENUE_BILLING', amount_requested: 10, pod_id: pod._id })).rejects.toThrow('Venue owner email is missing');
  });

  it('needs the bill for venue billing, and party media for a host payment', async () => {
    const venue = await VenueModel.create({ owner_user_id: new Types.ObjectId(), venue_name: 'Cafe', owner_email: 'owner@x.com' });
    const venuePod = await seedPod({ venue_id: venue._id });
    await expect(svc.create({ kind: 'VENUE_BILLING', amount_requested: 10, pod_id: venuePod._id, bill_url: '  ' })).rejects.toThrow('Upload a venue bill');

    const host = await seedHost();
    const pod = await seedPod({ pod_hosts_id: [host._id] });
    await expect(svc.create({ kind: 'HOST_PAYMENT', amount_requested: 10, pod_id: pod._id, evidence_media: [{ url: ' ' }] })).rejects.toThrow(
      'Upload party photos or videos'
    );
    expect(await PaymentReleaseModel.countDocuments()).toBe(0);
  });

  it('creates a venue billing request for the venue’s owner, naming the venue', async () => {
    const venue = await VenueModel.create({ owner_user_id: new Types.ObjectId(), venue_name: 'Sunset Cafe', owner_email: 'owner@x.com' });
    const pod = await seedPod({ venue_id: venue._id });

    const out = await svc.create({ kind: 'VENUE_BILLING', amount_requested: 1200, pod_id: pod._id, bill_url: ' https://cdn.test/bill.pdf ', notes: ' final ' }, null);

    expect(out).toMatchObject({
      kind: 'VENUE_BILLING',
      status: 'PENDING',
      beneficiary_name: 'Sunset Cafe',
      beneficiary_email: 'owner@x.com',
      amount_requested: 1200,
      bill_url: 'https://cdn.test/bill.pdf',
      notes: 'final',
      venue_id: String(venue._id),
      host_user_id: null,
      requested_by: null,
      reviewed_at: null,
      breakdown: null,
    });
  });

  it('creates a host payment for the chosen assigned host, with typed evidence', async () => {
    const first = await seedHost();
    const { insertedId: secondId } = await UserModel.collection.insertOne({ auth: { email: 'nameless@x.com' } } as never);
    const second = { _id: secondId, auth: { email: 'nameless@x.com' } };
    const pod = await seedPod({ pod_hosts_id: [first._id, second._id] });
    const actor = String(new Types.ObjectId());

    const out = await svc.create({ kind: 'HOST_PAYMENT', amount_requested: 500, pod_id: pod._id, evidence_media: media, host_user_id: String(second._id) }, actor);

    expect(out).toMatchObject({ host_user_id: String(second._id), requested_by: actor, beneficiary_email: 'nameless@x.com', beneficiary_name: 'nameless@x.com' });
    expect(out.evidence_media).toEqual([
      expect.objectContaining({ url: 'https://cdn.test/party.mp4?x=1', type: 'VIDEO' }),
      expect.objectContaining({ url: 'https://cdn.test/photo.jpg', type: 'IMAGE' }),
    ]);
    expect((await PodModel.findById(pod._id))?.completed_at).toBeInstanceOf(Date);

    // The default host is the pod's first one.
    const defaulted = await svc.create({ kind: 'HOST_PAYMENT', amount_requested: 500, pod_id: (await seedPod({ pod_hosts_id: [first._id] }))._id, evidence_media: media });
    expect(defaulted.host_user_id).toBe(String(first._id));
    expect(defaulted.beneficiary_name).toBe('Asha Host');
  });

  it('refuses a host who is not on the pod, who does not exist, or who has no email', async () => {
    const assigned = await seedHost();
    const outsider = await seedHost();
    const pod = await seedPod({ pod_hosts_id: [assigned._id] });
    const input = { kind: 'HOST_PAYMENT', amount_requested: 10, pod_id: pod._id, evidence_media: media };
    await expect(svc.create({ ...input, host_user_id: String(outsider._id) })).rejects.toThrow('Select a host assigned to this pod');
    await expect(svc.create({ ...input, pod_id: (await seedPod())._id })).rejects.toThrow('Select a host assigned to this pod');

    const gone = new Types.ObjectId();
    const ghostPod = await seedPod({ pod_hosts_id: [gone] });
    await expect(svc.create({ ...input, pod_id: ghostPod._id })).rejects.toThrow('Host user not found');

    const mailless = await UserModel.collection.insertOne({ profile: { first_name: 'No', last_name: 'Mail' } } as never);
    const mailPod = await seedPod({ pod_hosts_id: [mailless.insertedId] });
    await expect(svc.create({ ...input, pod_id: mailPod._id })).rejects.toThrow('Host email is missing');
  });
});

describe('review', () => {
  async function pending(amount = 1000) {
    const host = await seedHost();
    const pod = await seedPod({ pod_hosts_id: [host._id] });
    const created = await svc.create({ kind: 'HOST_PAYMENT', amount_requested: amount, pod_id: pod._id, evidence_media: media }, null);
    return { id: created.id, host };
  }

  it('refuses an unknown request, and one already decided', async () => {
    await expect(svc.review(String(new Types.ObjectId()), { status: 'APPROVED' })).rejects.toThrow('Payment release request not found');
    const { id } = await pending();
    await svc.review(id, { status: 'REJECTED', approval_reason: 'No proof' });
    await expect(svc.review(id, { status: 'APPROVED' })).rejects.toThrow('Only pending requests can be reviewed');
  });

  it('validates the decision before touching the request', async () => {
    const { id } = await pending(1000);
    await expect(svc.review(id, { status: 'MAYBE' })).rejects.toThrow('Select approval status');
    await expect(svc.review(id, { status: 'APPROVED', approval_type: 'HALF' })).rejects.toThrow('Select full or partial release');
    await expect(svc.review(id, { status: 'APPROVED', approval_type: 'PARTIAL', approved_amount: 0, approval_reason: 'x' })).rejects.toThrow('between 1 and requested amount');
    await expect(svc.review(id, { status: 'APPROVED', approval_type: 'PARTIAL', approved_amount: 1001, approval_reason: 'x' })).rejects.toThrow('between 1 and requested amount');
    await expect(svc.review(id, { status: 'APPROVED', approval_type: 'PARTIAL', approved_amount: 'abc', approval_reason: 'x' })).rejects.toThrow('between 1 and requested amount');
    await expect(svc.review(id, { status: 'APPROVED', approval_type: 'PARTIAL', approved_amount: 500, approval_reason: ' ' })).rejects.toThrow('Reason is required');
    await expect(svc.review(id, { status: 'REJECTED' })).rejects.toThrow('Reason is required');
    expect((await PaymentReleaseModel.findById(id))?.status).toBe('PENDING');
  });

  it('credits the host’s wallet once with the approved amount, and records who decided', async () => {
    const { id, host } = await pending(1000);
    const reviewer = String(new Types.ObjectId());

    const out = await svc.review(id, { status: 'APPROVED', approval_type: 'PARTIAL', approved_amount: 600, approval_reason: 'Venue short-billed' }, reviewer);

    expect(out).toMatchObject({ status: 'APPROVED', approval_type: 'PARTIAL', approved_amount: 600, approval_reason: 'Venue short-billed', reviewed_by: reviewer });
    expect((await WalletModel.findOne({ user_id: host._id }))?.balance).toBe(600);
    expect(sendEmail).toHaveBeenCalled();
    await expect(svc.review(id, { status: 'APPROVED' })).rejects.toThrow('Only pending requests can be reviewed');
    expect((await WalletModel.findOne({ user_id: host._id }))?.balance).toBe(600);
  });

  it('approves in full by default and moves no money when rejected', async () => {
    const full = await pending(300);
    await svc.review(full.id, { status: 'APPROVED' });
    expect((await WalletModel.findOne({ user_id: full.host._id }))?.balance).toBe(300);

    const rejected = await pending(300);
    const out = await svc.review(rejected.id, { status: 'REJECTED', approval_reason: 'Duplicate' });
    expect(out).toMatchObject({ status: 'REJECTED', approval_type: null, approved_amount: 0, approval_reason: 'Duplicate', reviewed_by: null });
    expect(await WalletModel.findOne({ user_id: rejected.host._id })).toBeNull();
  });

  it('still decides the request when the notification email fails, and logs why', async () => {
    const { id } = await pending(100);
    (sendEmail as jest.Mock).mockRejectedValueOnce(new Error('smtp down'));

    const out = await svc.review(id, { status: 'APPROVED' });

    expect(out.status).toBe('APPROVED');
    expect(logs.server.warn).toHaveBeenCalledWith('paymentRelease', 'notifyApproval', expect.objectContaining({ msg: 'approval email failed' }));
  });
});

describe('review — the wallet leg of each kind', () => {
  const direct = async (kind: string, over: Record<string, unknown> = {}) => {
    seq += 1;
    const pod = await seedPod();
    return PaymentReleaseModel.create({
      release_id: `rel-direct-${seq}`,
      kind,
      pod_id: pod._id,
      pod_title: 'Direct Pod',
      beneficiary_name: 'B',
      beneficiary_email: 'b@x.com',
      amount_requested: 400,
      ...over,
    });
  };

  it.each([['CLUB_ADMIN'], ['ECOMM_PAYMENT']])('credits a %s release to the beneficiary’s wallet exactly once', async (kind) => {
    const user = await seedHost();
    const rel = await direct(kind, { host_user_id: user._id });

    await svc.review(String(rel._id), { status: 'APPROVED' });

    expect((await WalletModel.findOne({ user_id: user._id }))?.balance).toBe(400);
  });

  it.each([['CLUB_ADMIN'], ['ECOMM_PAYMENT']])('approves a %s release with no beneficiary account without crediting anyone', async (kind) => {
    const rel = await direct(kind);
    const out = await svc.review(String(rel._id), { status: 'APPROVED' });
    expect(out.status).toBe('APPROVED');
    expect(await WalletModel.countDocuments()).toBe(0);
  });

  it('credits the venue owner’s wallet for venue billing, and warns when the venue has no owner user', async () => {
    const owner = await seedHost();
    const venue = await VenueModel.create({ owner_user_id: owner._id, venue_name: 'Cafe', owner_email: 'v@x.com' });
    const paid = await direct('VENUE_BILLING', { venue_id: venue._id });
    await svc.review(String(paid._id), { status: 'APPROVED' });
    expect((await WalletModel.findOne({ user_id: owner._id }))?.balance).toBe(400);

    const orphan = await direct('VENUE_BILLING', { venue_id: null });
    await svc.review(String(orphan._id), { status: 'APPROVED' });
    expect(logs.server.warn).toHaveBeenCalledWith('paymentRelease', 'applyApproval', expect.objectContaining({ release_id: orphan.release_id }));
    expect(await WalletModel.countDocuments()).toBe(1);
  });
});

describe('listing', () => {
  it('lists newest first, narrowed by status and kind, and as a searchable table page', async () => {
    const { id } = await (async () => {
      const host = await seedHost();
      const pod = await seedPod({ pod_hosts_id: [host._id] });
      return svc.create({ kind: 'HOST_PAYMENT', amount_requested: 50, pod_id: pod._id, evidence_media: media });
    })();
    await svc.review(id, { status: 'REJECTED', approval_reason: 'x' });
    const host2 = await seedHost();
    const pod2 = await seedPod({ pod_hosts_id: [host2._id], pod_title: 'Findable Pod' });
    await svc.create({ kind: 'HOST_PAYMENT', amount_requested: 70, pod_id: pod2._id, evidence_media: media });

    expect(await svc.list()).toHaveLength(2);
    expect((await svc.list({ status: 'PENDING' })).map((r) => r.pod_title)).toEqual(['Findable Pod']);
    expect(await svc.list({ kind: 'VENUE_BILLING' })).toEqual([]);
    const page = await svc.table({ search: 'Findable' });
    expect(page.rows).toHaveLength(1);
    expect(page.total).toBe(1);
  });

  it('shows a stored breakdown field for field', async () => {
    const host = await seedHost();
    const pod = await seedPod({ pod_hosts_id: [host._id] });
    const doc = await PaymentReleaseModel.create({
      release_id: 'rel-bd',
      kind: 'HOST_PAYMENT',
      pod_id: pod._id,
      pod_title: 'P',
      host_user_id: host._id,
      beneficiary_name: 'A',
      beneficiary_email: 'a@x.com',
      amount_requested: 90,
      breakdown: { collected_total: 100, payout_amount: 90, include_slot_price: true },
    });
    expect(toPub(doc).breakdown).toMatchObject({ collected_total: 100, payout_amount: 90, include_slot_price: true, version: 1, venue_bill: 0 });
  });
});
