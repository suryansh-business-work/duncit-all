import { Types } from 'mongoose';
import { podService } from '../../pod.service';
import { PodModel } from '../../pod.model';
import { assessPodCancellationRisk, podFinanceNow, runPodCancellationRiskSweep } from '../../pod.cancellationRisk';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { UserModel } from '@modules/access/user/user.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { AppSettingsModel } from '@modules/platform/settings/settings.model';
import { notificationService } from '@modules/engagement/notification/notification.service';
import * as notify from '@services/notify/notify.service';
import * as emailService from '@services/email/email.service';

/**
 * A PHYSICAL pod may be FREE. Picking a venue's open slot books it instantly
 * at the venue's own price — the host's own slot and any partner's slot alike,
 * nothing waits for the venue — but a free pod still quotes the venue no
 * platform money, and nothing on the finance side treats it as loss-making.
 */

const hostId = new Types.ObjectId().toString();
const ownerId = new Types.ObjectId().toString();
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const IMG = { url: 'https://cdn.example.com/pod.jpg', type: 'IMAGE' };
const NOTICE = /This pod is free, so please coordinate with the host/;
/** The booking notes fire after the response; let them land. */
const settle = async () => {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setTimeout(resolve, 50));
};

let notifyCreate: jest.SpyInstance;
let slotEmail: jest.SpyInstance;

beforeEach(() => {
  notifyCreate = jest.spyOn(notificationService, 'create').mockResolvedValue({} as never);
  slotEmail = jest.spyOn(emailService, 'sendVenueSlotRequestEmail').mockResolvedValue(undefined as never);
  jest.spyOn(notify, 'notifyEach').mockResolvedValue(undefined as never);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function seedVenue(owner: string) {
  await UserModel.create({
    _id: new Types.ObjectId(owner),
    auth: { email: `owner-${owner}@x.com` },
    profile: { first_name: 'Olu', last_name: 'Owner' },
  });
  const venue = await VenueModel.create({
    owner_user_id: owner,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Free Hall',
    owner_email: 'owner@x.com',
  });
  return String(venue._id);
}

async function seedSlot(owner: string, venueId: string, price: number) {
  const [slot] = await venueSlotService.create(owner, {
    venue_id: venueId,
    slots: [{ start_at: inDays(3), end_at: inDays(3.1), price }],
  });
  return slot.id;
}

const physicalInput = (venueId: string, slotId: string, over: Record<string, unknown> = {}) => ({
  pod_title: `Free pod ${Math.random().toString(36).slice(2)}`,
  club_id: String(new Types.ObjectId()),
  pod_hosts_id: [hostId],
  pod_mode: 'PHYSICAL',
  pod_description: 'desc',
  pod_type: 'FREE',
  pod_amount: 0,
  no_of_spots: 6,
  pod_date_time: inDays(3),
  pod_images_and_videos: [IMG],
  venue_id: venueId,
  venue_slot_id: slotId,
  ...over,
});

describe('creating a free physical pod', () => {
  it("books the host's own priced slot instantly and confirmed — nobody is notified, nothing to approve", async () => {
    const venueId = await seedVenue(hostId);
    const slotId = await seedSlot(hostId, venueId, 2500);

    const pod = await podService.create(physicalInput(venueId, slotId));

    expect(pod).toMatchObject({
      pod_type: 'FREE',
      pod_amount: 0,
      pod_mode: 'PHYSICAL',
      venue_approval_status: 'APPROVED',
      is_active: true,
    });
    const slot = (await VenueSlotModel.findById(slotId))!;
    expect(slot.status).toBe('BOOKED');
    expect(String(slot.booked_by_pod_id)).toBe(pod!.id);
    await settle();
    // The owner is the host: no booking note, no request email.
    expect(notifyCreate).not.toHaveBeenCalled();
    expect(slotEmail).not.toHaveBeenCalled();
  });

  it("books a partner's ₹0 slot instantly for a FREE pod, telling the venue it is live", async () => {
    const venueId = await seedVenue(ownerId);
    const slotId = await seedSlot(ownerId, venueId, 0);

    const pod = await podService.create(physicalInput(venueId, slotId));

    expect(pod).toMatchObject({ venue_approval_status: 'APPROVED', is_active: true });
    const slot = (await VenueSlotModel.findById(slotId))!;
    expect(slot.status).toBe('BOOKED');
    expect(String(slot.booked_by_pod_id)).toBe(pod!.id);
    expect(slot.price_snapshot).toMatchObject({ venue_payout: 0, total: 0 });
    expect(await venueSlotService.listRequests(ownerId)).toEqual([]);

    await settle();
    // No request went out — the venue gets the free-slot booking note.
    expect(slotEmail).not.toHaveBeenCalled();
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Slot booked', target_user_ids: [ownerId] })
    );
  });

  it("books a partner's ₹0 slot instantly for a PAID pod and tells the venue the booking is confirmed", async () => {
    const venueId = await seedVenue(ownerId);
    const slotId = await seedSlot(ownerId, venueId, 0);

    const pod = await podService.create(physicalInput(venueId, slotId, { pod_type: 'PAID', pod_amount: 500 }));

    expect(pod).toMatchObject({ venue_approval_status: 'APPROVED', is_active: true });
    const slot = (await VenueSlotModel.findById(slotId))!;
    expect(slot.status).toBe('BOOKED');
    expect(String(slot.booked_by_pod_id)).toBe(pod!.id);
    expect(slot.price_snapshot).toMatchObject({ venue_payout: 0, total: 0 });
    expect(await venueSlotService.listRequests(ownerId)).toEqual([]);

    await settle();
    expect(slotEmail).not.toHaveBeenCalled();
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New booking confirmed', target_user_ids: [ownerId] })
    );
    expect(notifyCreate).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Slot booked' }));
  });

  it('re-routes a free pod onto a partner ₹0 slot and then onto a priced one, booking each instantly', async () => {
    const venueId = await seedVenue(ownerId);
    const freeSlot = await seedSlot(ownerId, venueId, 0);
    const [priced] = await venueSlotService.create(ownerId, {
      venue_id: venueId,
      slots: [{ start_at: inDays(5), end_at: inDays(5.1), price: 900 }],
    });
    const pod = await PodModel.create({
      pod_id: `reroute-${new Types.ObjectId().toString()}`,
      pod_title: 'Reroute me',
      pod_hosts_id: [new Types.ObjectId(hostId)],
      club_id: new Types.ObjectId(),
      pod_mode: 'PHYSICAL',
      pod_description: 'desc',
      pod_date_time: new Date(inDays(2)),
      pod_type: 'FREE',
      pod_amount: 0,
      no_of_spots: 5,
      pod_images_and_videos: [IMG],
      is_active: false,
      venue_approval_status: 'DECLINED',
    });

    const onFree = await podService.update(String(pod._id), { venue_slot_id: freeSlot });
    expect(onFree).toMatchObject({ venue_approval_status: 'APPROVED', is_active: true, venue_slot_id: freeSlot });
    expect((await VenueSlotModel.findById(freeSlot))!.status).toBe('BOOKED');

    const onPriced = await podService.update(String(pod._id), { venue_slot_id: priced.id });
    expect(onPriced).toMatchObject({ venue_approval_status: 'APPROVED', is_active: true, venue_slot_id: priced.id });
    const pricedSlot = (await VenueSlotModel.findById(priced.id))!;
    expect(pricedSlot.status).toBe('BOOKED');
    expect(String(pricedSlot.booked_by_pod_id)).toBe(String(pod._id));
    expect(pricedSlot.price_snapshot).toMatchObject({ venue_payout: 900 });
    // The seat it moved off goes back on sale.
    expect((await VenueSlotModel.findById(freeSlot))!.status).toBe('AVAILABLE');
    expect(await venueSlotService.listRequests(ownerId)).toEqual([]);
  });

  it("keeps a paid pod's instant ₹0-slot booking confirmed when an edit makes the pod free", async () => {
    const venueId = await seedVenue(ownerId);
    const slotId = await seedSlot(ownerId, venueId, 0);
    const pod = await podService.create(physicalInput(venueId, slotId, { pod_type: 'PAID', pod_amount: 500 }));

    const edited = await podService.update(pod!.id, { pod_type: 'FREE', pod_amount: 0 });

    expect(edited).toMatchObject({ pod_type: 'FREE', venue_approval_status: 'APPROVED', is_active: true, venue_slot_id: slotId });
    const slot = (await VenueSlotModel.findById(slotId))!;
    expect(slot.status).toBe('BOOKED');
    expect(String(slot.booked_by_pod_id)).toBe(pod!.id);
    expect(await venueSlotService.listRequests(ownerId)).toEqual([]);
  });

  it('resubmits a declined free pod onto a partner ₹0 slot instantly', async () => {
    const venueId = await seedVenue(ownerId);
    const slotId = await seedSlot(ownerId, venueId, 0);
    const pod = await PodModel.create({
      pod_id: `resubmit-${new Types.ObjectId().toString()}`,
      pod_title: 'Declined free pod',
      pod_hosts_id: [new Types.ObjectId(hostId)],
      club_id: new Types.ObjectId(),
      location_id: new Types.ObjectId(),
      pod_mode: 'PHYSICAL',
      pod_description: 'An evening of board games',
      pod_date_time: new Date(inDays(2)),
      pod_type: 'FREE',
      pod_amount: 0,
      no_of_spots: 5,
      pod_images_and_videos: [IMG],
      is_active: false,
      venue_approval_status: 'DECLINED',
    });

    const out = await podService.hostResubmit(String(pod._id), hostId, { venue_id: venueId, venue_slot_id: slotId });

    expect(out).toMatchObject({ venue_approval_status: 'APPROVED', is_active: true });
    expect((await VenueSlotModel.findById(slotId))!.status).toBe('BOOKED');
  });

  it('books a priced partner slot instantly for a FREE pod and quotes the venue no platform money', async () => {
    const venueId = await seedVenue(ownerId);
    const slotId = await seedSlot(ownerId, venueId, 5000);

    // ₹5,000 would fail a paid ₹0 pod's economics; a free pod is exempt.
    const pod = await podService.create(physicalInput(venueId, slotId));
    expect(pod).toMatchObject({ venue_approval_status: 'APPROVED', is_active: true });
    expect((await VenueSlotModel.findById(slotId))!.status).toBe('BOOKED');

    await settle();
    // No request any more: the venue is told the booking is confirmed.
    expect(slotEmail).not.toHaveBeenCalled();
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New booking confirmed', target_user_ids: [ownerId] })
    );

    // The platform owes the venue nothing for a free pod.
    const decision = await venueSlotService.decisionDetail(ownerId, slotId);
    expect(decision).toMatchObject({ pod_is_free: true, price: 0, venue_commission_amount: 0, venue_receives: 0 });
  });

  it("books a paid pod's priced partner slot instantly, freezing its price and telling the venue its payout", async () => {
    const venueId = await seedVenue(ownerId);
    const slotId = await seedSlot(ownerId, venueId, 300);

    const pod = await podService.create(physicalInput(venueId, slotId, { pod_type: 'PAID', pod_amount: 1000 }));
    expect(pod).toMatchObject({ venue_approval_status: 'APPROVED', is_active: true });
    const slot = (await VenueSlotModel.findById(slotId))!;
    expect(slot.status).toBe('BOOKED');
    // The venue gets exactly its price; Duncit's commission rides on top.
    const snapshot = slot.price_snapshot!;
    expect(snapshot).toMatchObject({ venue_price: 300, venue_payout: 300 });
    expect(snapshot.platform_fee).toBeCloseTo((300 * snapshot.platform_fee_pct) / 100, 2);
    expect(snapshot.total).toBeCloseTo(300 + snapshot.platform_fee, 2);

    await settle();
    expect(slotEmail).not.toHaveBeenCalled();
    const note = notifyCreate.mock.calls.find(([arg]) => arg.title === 'New booking confirmed')?.[0];
    expect(note).toMatchObject({ target_user_ids: [ownerId] });
    expect(note.body).toContain('You receive ₹300.');
    expect(note.body).not.toMatch(NOTICE);
    const decision = await venueSlotService.decisionDetail(ownerId, slotId);
    expect(decision.pod_is_free).toBe(false);
    expect(decision.venue_receives).toBeGreaterThan(0);
  });

  it('still requires a free pod to cost nothing', async () => {
    const venueId = await seedVenue(hostId);
    const slotId = await seedSlot(hostId, venueId, 0);
    await expect(podService.create(physicalInput(venueId, slotId, { pod_amount: 200 }))).rejects.toThrow(
      'Free pods must have amount 0'
    );
  });
});

describe('editing a pod to free', () => {
  async function seedPod(over: Record<string, unknown> = {}) {
    return PodModel.create({
      pod_id: `edit-free-${new Types.ObjectId().toString()}`,
      pod_title: 'Board games',
      pod_hosts_id: [new Types.ObjectId(hostId)],
      club_id: new Types.ObjectId(),
      location_id: new Types.ObjectId(),
      pod_mode: 'PHYSICAL',
      pod_description: 'Board games night',
      pod_date_time: new Date(inDays(4)),
      pod_type: 'PAID',
      pod_amount: 400,
      no_of_spots: 5,
      pod_images_and_videos: [IMG],
      ...over,
    });
  }

  it('turns a physical paid pod with no paid bookings free', async () => {
    const pod = await seedPod();
    const out = await podService.update(String(pod._id), { pod_type: 'FREE', pod_amount: 0 });
    expect(out).toMatchObject({ pod_type: 'FREE', pod_amount: 0, pod_mode: 'PHYSICAL' });
  });

  it('keeps a free pod free when an edit moves it from virtual to physical', async () => {
    const pod = await seedPod({ pod_type: 'FREE', pod_amount: 0 });
    const out = await podService.update(String(pod._id), { pod_mode: 'PHYSICAL', pod_title: 'Board games night' });
    expect(out!.pod_type).toBe('FREE');
  });

  it('refuses to make a pod free once people have paid for it — their money would never settle', async () => {
    const pod = await seedPod();
    await PaymentModel.create({
      payment_id: `pay-${new Types.ObjectId().toString()}`,
      user_id: new Types.ObjectId(),
      user_name: 'A',
      user_email: 'a@x.com',
      pod_id: pod._id,
      subtotal: 400,
      total: 400,
      currency_symbol: '₹',
      status: 'SUCCESS',
    } as never);
    await expect(podService.update(String(pod._id), { pod_type: 'FREE', pod_amount: 0 })).rejects.toThrow(
      /already has paid bookings/
    );
    expect((await PodModel.findById(pod._id))!.pod_type).toBe('PAID');
  });
});

describe('cancellation risk ignores a free pod', () => {
  const settings = { enabled: true, lead_hours: 6, risk_window_hours: 72, risk_alert_hours: 12 };

  async function podOnPricedSlot(type: 'FREE' | 'PAID') {
    const venueId = await seedVenue(new Types.ObjectId().toString());
    const slot = await VenueSlotModel.create({
      venue_id: venueId,
      owner_user_id: new Types.ObjectId(),
      start_at: new Date(inDays(1)),
      end_at: new Date(inDays(1.1)),
      price: 5000,
      status: 'BOOKED',
    });
    return PodModel.create({
      pod_id: `risk-${new Types.ObjectId().toString()}`,
      pod_title: `${type} risk pod`,
      pod_hosts_id: [new Types.ObjectId()],
      club_id: new Types.ObjectId(),
      pod_description: 'd',
      pod_date_time: new Date(inDays(1)),
      pod_type: type,
      pod_amount: type === 'FREE' ? 0 : 100,
      no_of_spots: 5,
      venue_id: venueId,
      venue_slot_id: slot._id,
      is_active: true,
    });
  }

  it('reads a free pod on a ₹5,000 slot as having no venue cost, while a paid one is negative', async () => {
    const free = await podOnPricedSlot('FREE');
    const paid = await podOnPricedSlot('PAID');

    expect(await podFinanceNow(free)).toEqual({ collected: 0, venueAmount: 0, rates: null, waterfall: null, negative: false });
    expect((await podFinanceNow(paid)).negative).toBe(true);

    const now = Date.now();
    expect((await assessPodCancellationRisk(free, settings, now)).state).toBe('NO_VENUE_COST');
    expect((await assessPodCancellationRisk(paid, settings, now)).at_risk).toBe(true);
  });

  it('flags and alerts the paid pod in the sweep and never the free one', async () => {
    await AppSettingsModel.updateOne(
      { singleton_key: 'app' },
      { $set: { pod_auto_cancel_enabled: true, pod_cancel_risk_window_hours: 72 } },
      { upsert: true }
    );
    const free = await podOnPricedSlot('FREE');
    const paid = await podOnPricedSlot('PAID');

    const out = await runPodCancellationRiskSweep();

    expect(out.flagged).toBe(1);
    expect((await PodModel.findById(paid._id).lean())!.cancellation_risk?.at_risk).toBe(true);
    expect((await PodModel.findById(free._id).lean())!.cancellation_risk ?? null).toBeNull();
  });
});
