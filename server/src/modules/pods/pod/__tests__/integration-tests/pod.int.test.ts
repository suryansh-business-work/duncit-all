import { Types } from 'mongoose';
import { podService } from '../../pod.service';
import { PodModel } from '../../pod.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';

const makePod = (over: Record<string, unknown> = {}) => ({
  pod_id: `p-${Math.random().toString(36).slice(2)}`,
  pod_title: 'Test pod',
  club_id: new Types.ObjectId(),
  pod_description: 'desc',
  pod_type: 'NATIVE_FREE',
  pod_date_time: new Date(Date.now() + 86_400_000),
  is_active: true,
  ...over,
});

const IMG = { url: 'https://cdn.example.com/pod.jpg', type: 'IMAGE' };

const makeVirtualInput = (hostId: Types.ObjectId, over: Record<string, unknown> = {}) => ({
  pod_title: `Virtual pod ${Math.random().toString(36).slice(2)}`,
  club_id: String(new Types.ObjectId()),
  pod_hosts_id: [String(hostId)],
  pod_mode: 'VIRTUAL',
  meeting_url: 'https://meet.example.com/x',
  pod_description: 'desc',
  pod_type: 'NATIVE_FREE',
  pod_date_time: new Date(Date.now() + 86_400_000).toISOString(),
  pod_images_and_videos: [IMG],
  ...over,
});

const makePayment = (podId: Types.ObjectId, userId: Types.ObjectId, over: Record<string, unknown> = {}) => ({
  payment_id: `pay-${Math.random().toString(36).slice(2)}`,
  user_id: userId,
  user_name: 'Payer',
  user_email: 'payer@example.com',
  billing_address: 'addr',
  checkout_url: 'https://mweb.duncit.com/checkout',
  target_type: 'POD',
  pod_id: podId,
  description: 'pod booking',
  subtotal: 100,
  platform_fee_pct: 0,
  platform_fee_amount: 0,
  gst_pct: 0,
  gst_amount: 0,
  total: 100,
  currency_symbol: '₹',
  status: 'SUCCESS',
  gateway: 'DUMMY',
  ...over,
});

describe('podService integration', () => {
  it('lists no pods on an empty dataset', async () => {
    expect(await podService.list()).toEqual([]);
  });

  it('returns null for a missing pod id', async () => {
    expect(await podService.getById(new Types.ObjectId().toString())).toBeNull();
  });

  it('soft-deletes: excludes from reads but keeps the row + includeDeleted access', async () => {
    const doc = await PodModel.create(makePod());
    const id = String(doc._id);
    await podService.remove(id);
    // Row survives in the DB (bypass the soft-delete hook to see it).
    const raw = await PodModel.findById(id).setOptions({ includeDeleted: true });
    expect(raw?.deleted_at).toBeInstanceOf(Date);
    // Default reads exclude it.
    expect(await podService.list()).toEqual([]);
    expect(await PodModel.countDocuments()).toBe(0);
    expect(await podService.getById(id)).toBeNull();
    // Pod History resolves it via includeDeleted.
    const kept = await podService.getById(id, { includeDeleted: true });
    expect(kept?.is_deleted).toBe(true);
    expect(kept?.pod_title).toBe('Test pod');
  });

  it('reports only locations with a live (active, upcoming) pod', async () => {
    const live = new Types.ObjectId();
    const inactive = new Types.ObjectId();
    const past = new Types.ObjectId();
    await PodModel.create(makePod({ location_id: live }));
    await PodModel.create(makePod({ location_id: inactive, is_active: false }));
    await PodModel.create(makePod({ location_id: past, pod_date_time: new Date(Date.now() - 86_400_000) }));
    await PodModel.create(makePod({ location_id: null }));

    const ids = await podService.activeLocationIds();
    expect(ids).toContain(String(live));
    expect(ids).not.toContain(String(inactive));
    expect(ids).not.toContain(String(past));
  });

  it('rejects pod creation without at least one image', async () => {
    const hostId = new Types.ObjectId();
    await expect(
      podService.create(makeVirtualInput(hostId, { pod_images_and_videos: [] }))
    ).rejects.toThrow(/at least one pod image/i);
    await expect(
      podService.create(
        makeVirtualInput(hostId, {
          pod_images_and_videos: [{ url: 'https://cdn.example.com/v.mp4', type: 'VIDEO' }],
        })
      )
    ).rejects.toThrow(/at least one pod image/i);
  });

  it('creates a pod when an image is present', async () => {
    const hostId = new Types.ObjectId();
    const pod = await podService.create(makeVirtualInput(hostId));
    expect(pod?.pod_images_and_videos).toEqual([IMG]);
  });

  // update() carries the pod edit path (amount, meeting details, window). It had
  // no direct coverage, so these pin the behaviour the S3776 extraction moved out
  // into validatePodDatesForUpdate / applyMeetingFieldsForUpdate / applyDatesForUpdate.
  describe('update', () => {
    const virtualPod = async () => {
      const hostId = new Types.ObjectId();
      const pod = await podService.create(makeVirtualInput(hostId));
      return String(pod!.id);
    };

    it('edits scalar fields and re-validates the amount against the pod type', async () => {
      const id = await virtualPod();
      const updated = await podService.update(id, { pod_title: 'Renamed' });
      expect(updated?.pod_title).toBe('Renamed');
      // The free-pod invariant still holds on edit: a free type cannot carry a price.
      await expect(
        podService.update(id, { pod_type: 'NATIVE_FREE', pod_amount: 500 })
      ).rejects.toThrow(/Free pods must have amount 0/i);
      // …and the price ceiling is re-checked too.
      await expect(
        podService.update(id, { pod_type: 'NATIVE_PAID', pod_amount: 5000 })
      ).rejects.toThrow(/between 0 and 1999/i);
    });

    it('normalises meeting details on a virtual pod', async () => {
      const id = await virtualPod();
      const updated = await podService.update(id, {
        meeting_url: '  https://meet.example.com/y  ',
        meeting_notes: '   ',
      });
      expect(updated?.meeting_url).toBe('https://meet.example.com/y');
      expect(updated?.meeting_notes).toBeNull();
    });

    it('re-saving an unchanged past-free window does not re-validate the dates', async () => {
      const id = await virtualPod();
      const doc = await PodModel.findById(id);
      const same = doc!.pod_date_time.toISOString();
      // Same instant as stored → no change → validateFutureDates must not run.
      const updated = await podService.update(id, { pod_date_time: same });
      expect(new Date(updated!.pod_date_time).toISOString()).toBe(same);
    });

    it('rejects moving the pod window into the past', async () => {
      const id = await virtualPod();
      await expect(
        podService.update(id, { pod_date_time: new Date(Date.now() - 86_400_000).toISOString() })
      ).rejects.toThrow();
    });

    it('throws NOT_FOUND for a missing pod', async () => {
      await expect(
        podService.update(new Types.ObjectId().toString(), { pod_title: 'x' })
      ).rejects.toThrow();
    });
  });

  describe('host self-service edit/delete', () => {
    it('hostUpdate changes only title, description and media', async () => {
      const hostId = new Types.ObjectId();
      const doc = await PodModel.create(
        makePod({ pod_hosts_id: [hostId], pod_images_and_videos: [IMG], pod_amount: 0 })
      );
      const updated = await podService.hostUpdate(String(doc._id), String(hostId), {
        pod_title: 'New title',
        pod_description: 'New description',
        pod_images_and_videos: [{ url: 'https://cdn.example.com/new.jpg', type: 'IMAGE' }],
      });
      expect(updated?.pod_title).toBe('New title');
      expect(updated?.pod_description).toBe('New description');
      expect(updated?.pod_images_and_videos[0].url).toBe('https://cdn.example.com/new.jpg');
      // The slug never changes on a host edit, so shared links keep working.
      expect(updated?.pod_id).toBe(doc.pod_id);
    });

    it('hostUpdate rejects a non-host and a missing image', async () => {
      const hostId = new Types.ObjectId();
      const doc = await PodModel.create(makePod({ pod_hosts_id: [hostId] }));
      await expect(
        podService.hostUpdate(String(doc._id), String(new Types.ObjectId()), {
          pod_title: 'New title',
          pod_description: 'New description',
          pod_images_and_videos: [IMG],
        })
      ).rejects.toThrow(/only the pod host/i);
      await expect(
        podService.hostUpdate(String(doc._id), String(hostId), {
          pod_title: 'New title',
          pod_description: 'New description',
          pod_images_and_videos: [],
        })
      ).rejects.toThrow(/at least one pod image/i);
    });

    it('hostDeleteImpact reports other attendees and refundable payments', async () => {
      const hostId = new Types.ObjectId();
      const attendee = new Types.ObjectId();
      const doc = await PodModel.create(
        makePod({ pod_hosts_id: [hostId], pod_attendees: [hostId, attendee] })
      );
      await PaymentModel.create(makePayment(doc._id as Types.ObjectId, attendee));
      await PaymentModel.create(
        makePayment(doc._id as Types.ObjectId, attendee, { status: 'FAILED', total: 50 })
      );

      const impact = await podService.hostDeleteImpact(String(doc._id), String(hostId));
      expect(impact.other_attendee_count).toBe(1);
      expect(impact.refundable_payment_count).toBe(1);
      expect(impact.refund_total).toBe(100);
      expect(impact.currency_symbol).toBe('₹');
    });

    it('hostRemove demands a valid reason and a note for "Other"', async () => {
      const hostId = new Types.ObjectId();
      const doc = await PodModel.create(makePod({ pod_hosts_id: [hostId] }));
      await expect(
        podService.hostRemove(String(doc._id), String(hostId), 'Bad subject')
      ).rejects.toThrow(/valid delete reason/i);
      await expect(
        podService.hostRemove(String(doc._id), String(hostId), 'Other', '')
      ).rejects.toThrow(/describe the reason/i);
    });

    it('hostRemove refunds SUCCESS payments and deletes the pod', async () => {
      const hostId = new Types.ObjectId();
      const attendee = new Types.ObjectId();
      const doc = await PodModel.create(
        makePod({ pod_hosts_id: [hostId], pod_attendees: [hostId, attendee] })
      );
      const payment = await PaymentModel.create(makePayment(doc._id as Types.ObjectId, attendee));

      const ok = await podService.hostRemove(
        String(doc._id),
        String(hostId),
        'Venue unavailable',
        'Flooding at the venue'
      );
      expect(ok).toBe(true);
      expect(await PodModel.findById(doc._id)).toBeNull();

      const refunded = await PaymentModel.findById(payment._id);
      expect(refunded?.status).toBe('REFUNDED');
      expect((refunded as any)?.metadata?.refund_reason).toBe(
        'Venue unavailable — Flooding at the venue'
      );
      expect((refunded as any)?.metadata?.refund_initiated_by).toBe('HOST');
    });

    it('hostRemove rejects a non-host', async () => {
      const hostId = new Types.ObjectId();
      const doc = await PodModel.create(makePod({ pod_hosts_id: [hostId] }));
      await expect(
        podService.hostRemove(String(doc._id), String(new Types.ObjectId()), 'Event cancelled')
      ).rejects.toThrow(/only the pod host/i);
    });
  });
});

describe('pod comment reactions (explore item 4)', () => {
  it('likes/unlikes a comment and exposes the liker array', async () => {
    const pod = await PodModel.create(makePod());
    const viewer = new Types.ObjectId().toString();
    const liker = new Types.ObjectId().toString();
    const added = await podService.addComment(String(pod._id), viewer, 'Nice pod!');
    expect(added.likes).toEqual([]);

    const liked = await podService.toggleCommentLike(String(pod._id), added.id, liker);
    expect(liked.likes).toEqual([liker]);

    const list = await podService.listComments(String(pod._id));
    expect(list[0]?.likes).toEqual([liker]);

    const unliked = await podService.toggleCommentLike(String(pod._id), added.id, liker);
    expect(unliked.likes).toEqual([]);
  });

  it('rejects a like on a bad id or a missing comment', async () => {
    const pod = await PodModel.create(makePod());
    await expect(
      podService.toggleCommentLike('not-an-id', new Types.ObjectId().toString(), new Types.ObjectId().toString())
    ).rejects.toThrow(/invalid id/i);
    await expect(
      podService.toggleCommentLike(String(pod._id), new Types.ObjectId().toString(), new Types.ObjectId().toString())
    ).rejects.toThrow(/comment not found/i);
  });

  it('hides pods awaiting venue slot approval from the default list unless a reviewer opts in', async () => {
    const clubId = new Types.ObjectId();
    await PodModel.create(makePod({ club_id: clubId, pod_title: 'Live pod', venue_approval_status: 'NONE' }));
    await PodModel.create(
      makePod({ club_id: clubId, pod_title: 'Pending pod', venue_approval_status: 'PENDING', is_active: false })
    );

    // Public/consumer reads never receive a pod still awaiting venue approval.
    const publicList = await podService.list({ club_id: String(clubId) });
    expect(publicList.map((p) => p.pod_title)).toEqual(['Live pod']);

    // Admin/onboarding reviewers opt in and see the pending pod too.
    const reviewList = await podService.list({ club_id: String(clubId) }, { includePendingApproval: true });
    expect(reviewList.map((p) => p.pod_title).sort()).toEqual(['Live pod', 'Pending pod']);
  });

  it('serves the podsTable page with search, filters, sort, paging and the PENDING guard', async () => {
    await PodModel.create(
      makePod({ pod_title: 'Alpha Jam', pod_amount: 100, pod_date_time: new Date('2030-01-01T10:00:00Z') })
    );
    await PodModel.create(
      makePod({
        pod_title: 'Beta Bash',
        pod_amount: 50,
        pod_date_time: new Date('2030-02-01T10:00:00Z'),
        is_active: false,
      })
    );
    await PodModel.create(makePod({ pod_title: 'Hidden Pending', venue_approval_status: 'PENDING' }));
    await PodModel.create(makePod({ pod_title: 'Deleted Pod', deleted_at: new Date() }));

    // Default page: pod_date_time desc; PENDING + soft-deleted rows excluded.
    const all = await podService.table();
    expect(all.total).toBe(2);
    expect(all.rows.map((p) => p!.pod_title)).toEqual(['Beta Bash', 'Alpha Jam']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Reviewers opt in and see the PENDING pod too.
    const review = await podService.table(undefined, { includePendingApproval: true });
    expect(review.total).toBe(3);

    // A crafted client filter cannot override the PENDING baseFilter guard.
    const forced = await podService.table({
      filters: [{ field: 'venue_approval_status', op: 'eq', value: 'PENDING' }],
    });
    expect(forced.total).toBe(0);

    // Search spans pod_title and the pod_id slug.
    const searched = await podService.table({ search: 'beta' });
    expect(searched.rows.map((p) => p!.pod_title)).toEqual(['Beta Bash']);
    expect(searched.total).toBe(1);

    // Boolean filter narrows.
    const active = await podService.table({ filters: [{ field: 'is_active', op: 'is_true' }] });
    expect(active.rows.map((p) => p!.pod_title)).toEqual(['Alpha Jam']);

    // Allowlisted sort, asc.
    const sorted = await podService.table({ sort_by: 'pod_amount', sort_dir: 'asc' });
    expect(sorted.rows.map((p) => p!.pod_amount)).toEqual([50, 100]);

    // Paging reports the clamped page/page_size back; total unaffected.
    const page2 = await podService.table({ page: 2, page_size: 1 });
    expect(page2.rows).toHaveLength(1);
    expect(page2.total).toBe(2);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('scopes myHostPodsTable to the calling host — user A can never see user B rows', async () => {
    const hostA = new Types.ObjectId();
    const hostB = new Types.ObjectId();
    await PodModel.create(makePod({ pod_title: 'A Pod', pod_hosts_id: [hostA] }));
    await PodModel.create(makePod({ pod_title: 'B Pod', pod_hosts_id: [hostB] }));

    const mine = await podService.tableMine(String(hostA));
    expect(mine.total).toBe(1);
    expect(mine.rows.map((p) => p!.pod_title)).toEqual(['A Pod']);

    // A client filter cannot widen the scope to another host's pods.
    const widened = await podService.tableMine(String(hostA), {
      filters: [{ field: 'host_user_id', op: 'eq', value: String(hostB) }],
    });
    expect(widened.total).toBe(0);

    await expect(podService.tableMine('not-an-object-id')).rejects.toThrow(/authentication required/i);
  });
});
