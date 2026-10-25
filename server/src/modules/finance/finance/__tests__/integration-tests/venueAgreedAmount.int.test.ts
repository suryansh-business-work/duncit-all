jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));

import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { UserModel } from '@modules/access/user/user.model';
import { frozenCharges, quoteOffer } from '@modules/venues/venueOffer/venueOffer.quote';
import type { VenuePricing } from '@modules/venues/venuePricing/venuePricing.types';
import { paymentReleaseService as svc } from '../../paymentRelease.service';
import { computePodSettlement, venueChargeForPod } from '../../settlement.service';

/**
 * A venue booking agreed by offer settles on what was agreed: per guest, for
 * the people who came — never fewer than the agreed minimum, the host's seat
 * counted — on the rate and venue charges frozen at accept. The venue's final
 * bill is the proof, required from every client that completes this way, and
 * extra charges on it are paid on top for Finance to approve. Every booking
 * made any other way settles exactly as before.
 */

const HOUR = 3_600_000;
let seq = 0;

/** A venue with no charges of its own: only the agreed price counts. */
const charges: VenuePricing = {
  model: null,
  base_rate: 0,
  min_pax: 0,
  max_pax: 0,
  min_hours: 0,
  max_hours: 0,
  booking_increment_minutes: 0,
  min_spend: 0,
  slots: [],
  operating_hours: [],
  price_rules: [],
  deposit: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  gst_enabled: false,
  blocked_dates: [],
};

const start = new Date(Date.now() - 3 * HOUR);
const end = new Date(Date.now() - HOUR);

function agreedQuote(model: 'PER_GUEST' | 'FLAT', rate: number, pax: number) {
  const result = quoteOffer(charges, { model, rate }, { start, end, pax, commissionPct: 10, gstPct: 18, timeZone: 'Asia/Kolkata' });
  if (!result.ok) throw new Error(result.message);
  return { ...result.breakdown, confirmed_at: new Date() };
}

interface Seeded {
  podId: string;
  hostId: string;
}

/** A pod that ran at a venue on an accepted offer — per guest with a minimum, or flat. */
async function seedAgreed(over: { model?: 'PER_GUEST' | 'FLAT'; rate?: number; min?: number; counterRate?: number; free?: boolean } = {}): Promise<Seeded> {
  seq += 1;
  const model = over.model ?? 'PER_GUEST';
  const rate = over.rate ?? 500;
  const owner = await UserModel.create({ auth: { email: `owner-agreed-${seq}@x.com` }, profile: { first_name: 'Olu', last_name: 'Owner' } });
  const host = await UserModel.create({ auth: { email: `host-agreed-${seq}@x.com` }, profile: { first_name: 'Meera', last_name: 'Nair' } });
  const venue = await VenueModel.create({ owner_user_id: owner._id, status: 'APPROVED', is_active: true, venue_name: 'Deck', owner_email: 'deck@x.com' });
  const pod = await PodModel.create({
    pod_id: `agreed-${seq}`,
    pod_title: 'Rooftop Jam',
    pod_hosts_id: [host._id],
    pod_attendees: [host._id],
    club_id: new Types.ObjectId(),
    pod_description: 'd',
    pod_date_time: start,
    pod_end_date_time: end,
    pod_type: over.free ? 'FREE' : 'PAID',
    pod_amount: over.free ? 0 : 800,
    no_of_spots: 20,
    venue_id: venue._id,
    is_active: true,
    venue_approval_status: 'APPROVED',
  });
  const quote = agreedQuote(model, rate, 20);
  const counter = over.counterRate
    ? { model, rate: over.counterRate, quote, quote_min: quote, charges: null, min_guests: over.min ?? 6, offerings: [], note: '', at: new Date() }
    : null;
  const slot = await VenueSlotModel.create({
    venue_id: venue._id,
    owner_user_id: owner._id,
    start_at: start,
    end_at: end,
    status: 'BOOKED',
    booked_by_pod_id: pod._id,
    requested_by_host: true,
    price: quote.venue_payout,
    price_snapshot: quote,
    price_basis:
      model === 'PER_GUEST' && over.min !== 0
        ? { model, rate: over.counterRate ?? rate, min_guests: over.min ?? 6, pets: false, charges: frozenCharges(charges) }
        : null,
    offer: {
      model,
      rate,
      pax: 20,
      pets: false,
      quote,
      quote_min: quote,
      status: 'ACCEPTED',
      round: counter ? 2 : 1,
      counter,
      history: [],
      min_guests: over.min ?? 6,
      offerings: [],
      note: '',
      move: 1,
    },
  });
  await PodModel.updateOne({ _id: pod._id }, { $set: { venue_slot_id: slot._id } });
  return { podId: String(pod._id), hostId: String(host._id) };
}

const podOf = async (id: string) => {
  const pod = await PodModel.findById(id);
  if (!pod) throw new Error('pod missing');
  return pod;
};

describe('an agreed per-guest booking at completion', () => {
  it('is paid for the people who came above its minimum', async () => {
    const { podId } = await seedAgreed();
    const charge = await venueChargeForPod(await podOf(podId), 0, null, { attended: 9 });
    expect(charge).toMatchObject({
      pricing_mode: 'PER_PAX',
      pax: 9,
      slot_price: 4500,
      amount: 4500,
      commission_on_top: 450,
      min_guests: 6,
      extra: 0,
      agreed_model: 'PER_GUEST',
      agreed_rate: 500,
    });
  });

  it('is never paid for fewer than its minimum', async () => {
    const { podId } = await seedAgreed();
    await expect(venueChargeForPod(await podOf(podId), 0, null, { attended: 3 })).resolves.toMatchObject({ pax: 6, amount: 3000 });
  });

  it('takes a head count above the roster’s, never below it', async () => {
    const { podId } = await seedAgreed();
    const pod = await podOf(podId);
    await expect(venueChargeForPod(pod, 0, null, { attended: 9, pax: 12 })).resolves.toMatchObject({ pax: 12, amount: 6000 });
    await expect(venueChargeForPod(pod, 0, null, { attended: 9, pax: 2 })).resolves.toMatchObject({ pax: 9, amount: 4500 });
  });

  it('reads everyone booked as having come before the pod is completed', async () => {
    const { podId } = await seedAgreed({ min: 1 });
    // The pod's only attendee is its host.
    await expect(venueChargeForPod(await podOf(podId), 0)).resolves.toMatchObject({ pax: 1, amount: 500 });
  });

  it("is priced on the venue's counter when that is what the host accepted", async () => {
    const { podId } = await seedAgreed({ counterRate: 650 });
    await expect(venueChargeForPod(await podOf(podId), 0, null, { attended: 10 })).resolves.toMatchObject({
      agreed_rate: 650,
      amount: 6500,
    });
  });
});

describe('extra charges on the venue’s bill', () => {
  it('are paid on top of the agreed amount, with the commission on top of them too', async () => {
    const { podId } = await seedAgreed();
    const pod = await podOf(podId);
    // The bill is proof (no slot-price choice sent): the agreed amount stands, the extra is added.
    await expect(venueChargeForPod(pod, 1800, null, { attended: 10, extra: 300 })).resolves.toMatchObject({
      bill: 1800,
      slot_included: false,
      extra: 300,
      amount: 5300,
      commission_on_top: 530,
    });
    await expect(venueChargeForPod(pod, 1000, true, { attended: 10, extra: 200 })).resolves.toMatchObject({
      slot_included: true,
      amount: 6200,
      commission_on_top: 620,
    });
    await expect(venueChargeForPod(pod, 4000, false, { attended: 10, extra: 100 })).resolves.toMatchObject({
      slot_included: false,
      amount: 4100,
      commission_on_top: 410,
    });
  });

  it('are nothing for a venue pod with no booking to add them to', async () => {
    const { podId } = await seedAgreed();
    await PodModel.updateOne({ _id: podId }, { $set: { venue_slot_id: null } });
    await expect(venueChargeForPod(await podOf(podId), 900, null, { extra: 300 })).resolves.toMatchObject({ extra: 0, amount: 900 });
  });
});

describe('every other booking', () => {
  it('keeps a flat agreed price whoever came', async () => {
    const { podId } = await seedAgreed({ model: 'FLAT', rate: 7000 });
    await expect(venueChargeForPod(await podOf(podId), 0, null, { attended: 3 })).resolves.toMatchObject({
      amount: 7000,
      min_guests: 0,
      agreed_model: 'FLAT',
    });
  });

  it('keeps a per-guest offer agreed without a minimum at its frozen price', async () => {
    const { podId } = await seedAgreed({ min: 0 });
    await expect(venueChargeForPod(await podOf(podId), 0, null, { attended: 3 })).resolves.toMatchObject({ amount: 10_000, min_guests: 0 });
  });

  it('reports no agreed terms for a booking made before offers', async () => {
    const { podId } = await seedAgreed();
    await VenueSlotModel.updateOne({ booked_by_pod_id: podId }, { $set: { offer: null, price_snapshot: null, price_basis: null, price: 1500 } });
    await expect(venueChargeForPod(await podOf(podId), 0, null, { extra: 200 })).resolves.toMatchObject({
      amount: 1700,
      commission_on_top: null,
      agreed_model: null,
      agreed_rate: null,
    });
  });

  it('owes nothing for a free pod — none of the new figures either', async () => {
    const { podId } = await seedAgreed({ free: true });
    await expect(venueChargeForPod(await podOf(podId), 500, null, { attended: 9, extra: 100 })).resolves.toMatchObject({
      amount: 0,
      min_guests: 0,
      extra: 0,
      agreed_model: null,
      agreed_rate: null,
    });
  });
});

describe('the settlement', () => {
  it('counts the hosts among the people who came and pays the venue at least its minimum', async () => {
    const { podId } = await seedAgreed();
    const settlement = await computePodSettlement(podId, 1200, null, null, { extra: 250 });
    expect(settlement).toMatchObject({
      venue_people_counted: 1,
      venue_min_guests: 6,
      venue_pax: 6,
      venue_extra_amount: 250,
      venue_agreed_model: 'PER_GUEST',
      venue_agreed_rate: 500,
      venue_bill: 1200,
    });
    expect(settlement.waterfall.venue_amount).toBe(3250);
  });
});

describe('completing a pod against an agreed amount', () => {
  const actorOf = (hostId: string) => ({ id: hostId, isAdmin: false });

  it("requires the venue's final bill from a client that sends the extra charges", async () => {
    const { podId, hostId } = await seedAgreed();
    await expect(svc.completePod({ pod_id: podId, venue_bill_amount: 0, venue_extra_amount: 0 }, actorOf(hostId))).rejects.toMatchObject({
      message: "Upload the venue's final bill and enter its total",
      extensions: { code: 'BAD_USER_INPUT', reason: 'VENUE_BILL_REQUIRED' },
    });
    await expect(
      svc.completePod({ pod_id: podId, venue_bill_amount: 3000, venue_extra_amount: 0 }, actorOf(hostId))
    ).rejects.toMatchObject({ extensions: { reason: 'VENUE_BILL_REQUIRED' } });
  });

  it('freezes the per-guest figures and the extra charges on the venue’s release for Finance', async () => {
    const { podId, hostId } = await seedAgreed();
    const out = await svc.completePod(
      { pod_id: podId, venue_bill_amount: 3400, venue_bill_url: 'https://ik.imagekit.io/x/bill.pdf', venue_extra_amount: 150 },
      actorOf(hostId)
    );
    const venue = out.releases.find((r) => r.kind === 'VENUE_BILLING');
    expect(venue).toMatchObject({ bill_url: 'https://ik.imagekit.io/x/bill.pdf' });
    expect(venue?.breakdown).toMatchObject({
      venue_min_guests: 6,
      venue_people_counted: 1,
      venue_pax: 6,
      venue_extra_amount: 150,
      venue_agreed_model: 'PER_GUEST',
      venue_agreed_rate: 500,
    });
    expect(out.settlement.waterfall.venue_amount).toBe(3150);
  });

  it('still completes from an app build that never sends the extra charges, with no bill asked for', async () => {
    const { podId, hostId } = await seedAgreed();
    const out = await svc.completePod({ pod_id: podId, venue_bill_amount: 0 }, actorOf(hostId));
    expect(out.settlement.venue_extra_amount).toBe(0);
    expect(out.releases.map((r) => r.kind)).toContain('VENUE_BILLING');
  });
});
