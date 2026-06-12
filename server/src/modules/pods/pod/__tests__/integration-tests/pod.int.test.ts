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
