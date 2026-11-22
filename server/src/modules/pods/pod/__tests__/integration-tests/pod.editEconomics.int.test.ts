jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import { PodModel } from '../../pod.model';
import { podService } from '../../pod.service';
import { assertPortalEditEconomics, editChangesMoney, editedPodView } from '../../pod.economics';
import { breakdownService } from '@modules/finance/finance/breakdown.service';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { UserModel } from '@modules/access/user/user.model';

/**
 * The production regression: an Admin changed a paid pod's venue booking after
 * it was created, the new booking left its host at −₹15.89, and nothing refused
 * it — the portal edit (podService.update, which the Admin and Club Admin
 * consoles and the MCP tools all use) never ran the economics guard create
 * runs. The Admin's own projection meanwhile said −₹11.89, because it left out
 * the ₹4 commission the booking charges on top.
 *
 * Fixture: the reference pod — 5 spots, the host's seat free, a per-guest
 * booking frozen at ₹40 + ₹4 commission on top, at the default rates (GST 18%,
 * fee 5%, club admin 3%, host commission 10%, venue commission 10%).
 */
let seq = 0;

async function seedReferencePod(
  podAmount: number,
  over: Record<string, unknown> = {},
  venueOffers: Record<string, unknown> = {}
) {
  seq += 1;
  const host = await UserModel.create({
    auth: { email: `edit-econ-host${seq}@x.com` },
    profile: { first_name: 'Riya', last_name: 'Host' },
  });
  const venue = await VenueModel.create({
    owner_user_id: new Types.ObjectId(),
    venue_name: 'Test Pay',
    owner_email: `edit-econ-venue${seq}@x.com`,
    settings: { offers: venueOffers },
  });
  const start = new Date(Date.now() + 3 * 86_400_000);
  const slot = await VenueSlotModel.create({
    venue_id: venue._id,
    owner_user_id: venue.owner_user_id,
    start_at: start,
    end_at: new Date(start.getTime() + 3_600_000),
    price: 8,
    status: 'BOOKED',
    price_snapshot: {
      model: 'PER_PAX',
      rate: 8,
      pax: 5,
      date: start.toISOString().slice(0, 10),
      base: 40,
      venue_price: 40,
      venue_payout: 40,
      platform_fee_pct: 10,
      platform_fee: 4,
      total: 44,
      confirmed_at: new Date(),
    },
    price_basis: { model: 'PER_GUEST', rate: 8, min_guests: 5, pets: false, charges: null },
  });
  const pod = await PodModel.create({
    pod_id: `edit-econ-${seq}`,
    pod_title: 'Test pod',
    pod_hosts_id: [host._id],
    club_id: new Types.ObjectId(),
    venue_id: venue._id,
    venue_slot_id: slot._id,
    pod_description: 'desc',
    pod_date_time: start,
    pod_end_date_time: new Date(start.getTime() + 3_600_000),
    pod_type: 'PAID',
    pod_amount: podAmount,
    no_of_spots: 5,
    ...over,
  });
  return { pod, venue, slot, host };
}

const judge = (pod: Parameters<typeof editedPodView>[0], input: Record<string, unknown>) =>
  assertPortalEditEconomics(editedPodView(pod, input, null), input, null);

describe('a portal edit runs the pod economics guard', () => {
  it('refuses lowering the reference pod to ₹9, names ₹15, and leaves the stored pod as it was', async () => {
    const { pod } = await seedReferencePod(20);
    await expect(podService.update(String(pod._id), { pod_amount: 9 }, { source: 'ADMIN' })).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT', reason: 'VENUE_NOT_COVERED', minimum_viable_ticket_price: 15 },
    });
    const stored = await PodModel.findById(pod._id).lean();
    expect(stored?.pod_amount).toBe(20);
  });

  it('refuses ₹14 (venue covered, host still below ₹0) and accepts ₹15 — strictly positive', async () => {
    const { pod } = await seedReferencePod(20);
    await expect(judge(pod, { pod_amount: 14 })).rejects.toMatchObject({
      extensions: { reason: 'NO_EARNINGS', minimum_viable_ticket_price: 15 },
    });
    await expect(judge(pod, { pod_amount: 15 })).resolves.toBeUndefined();
  });

  it('holds the pod to the venue’s minimum spend: ₹100 × 4 paying seats is refused, 13 spots pass', async () => {
    const { pod } = await seedReferencePod(100, {}, { min_spend: 1000 });
    // 4 paying seats: 400 − 10% = 360, not more than ₹1000.
    await expect(judge(pod, { pod_amount: 100 })).rejects.toMatchObject({
      extensions: { reason: 'BELOW_MIN_BUSINESS', venue_min_business: 1000, minimum_viable_ticket_price: 278 },
    });
    // 12 paying seats: 1200 − 120 = 1080.
    await expect(judge(pod, { pod_amount: 100, no_of_spots: 13 })).resolves.toBeUndefined();
    await expect(judge(pod, { pod_amount: 100, no_of_spots: 12 })).rejects.toMatchObject({
      extensions: { reason: 'BELOW_MIN_BUSINESS' },
    });
  });

  it('multiplies a per-guest minimum business by the people the venue serves', async () => {
    // ₹90 a guest at 13 spots = ₹1170 — more than the ₹1080 the ticket money nets.
    const { pod } = await seedReferencePod(100, {}, { min_business: [{ model: 'PER_GUEST', amount: 90 }] });
    await expect(judge(pod, { no_of_spots: 13 })).rejects.toMatchObject({
      extensions: { reason: 'BELOW_MIN_BUSINESS', venue_min_business: 1170 },
    });
    // The per-booking amount belongs to flat bookings only — this booking pays per guest.
    const flatOnly = await seedReferencePod(100, {}, { min_business: [{ model: 'FLAT', amount: 5000 }] });
    await expect(judge(flatOnly.pod, { no_of_spots: 13 })).resolves.toBeUndefined();
  });

  it('does not judge a save that sends the money fields unchanged — the portal editors send them every time', async () => {
    // The reference pod is already unprofitable; an admin fixing its title must still be able to save.
    const { pod } = await seedReferencePod(9);
    const unchanged = {
      pod_title: 'Fixed title',
      pod_amount: 9,
      no_of_spots: 5,
      pod_type: 'PAID',
      pod_hosts_id: pod.pod_hosts_id.map(String),
    };
    await expect(assertPortalEditEconomics(editedPodView(pod, unchanged, null), unchanged, null, pod)).resolves.toBeUndefined();

    const cheaper = { ...unchanged, pod_amount: 8 };
    await expect(assertPortalEditEconomics(editedPodView(pod, cheaper, null), cheaper, null, pod)).rejects.toMatchObject({
      extensions: { reason: 'VENUE_NOT_COVERED' },
    });
    const otherHost = { ...unchanged, pod_hosts_id: [String(new Types.ObjectId())] };
    await expect(assertPortalEditEconomics(editedPodView(pod, otherHost, null), otherHost, null, pod)).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('does not judge an edit that touches no money field, a completed pod, a cancelled pod, or a free pod', async () => {
    const { pod } = await seedReferencePod(9);
    await expect(judge(pod, { pod_title: 'New' })).resolves.toBeUndefined();
    const settled = { ...editedPodView(pod, { pod_amount: 9 }, null), completed_at: new Date() };
    await expect(assertPortalEditEconomics(settled, { pod_amount: 9 }, null)).resolves.toBeUndefined();
    const cancelled = { ...editedPodView(pod, { pod_amount: 9 }, null), deleted_at: new Date() };
    await expect(assertPortalEditEconomics(cancelled, { pod_amount: 9 }, null)).resolves.toBeUndefined();
    await expect(judge(pod, { pod_type: 'FREE', pod_amount: 0 })).resolves.toBeUndefined();
  });

  it('a re-route is judged on the NEW slot, and a move to virtual drops the venue', async () => {
    const { pod } = await seedReferencePod(20);
    const newSlotId = new Types.ObjectId();
    const rerouted = editedPodView(pod, { venue_id: String(pod.venue_id) }, { slotDoc: { _id: newSlotId } });
    expect(String(rerouted.venue_slot_id)).toBe(String(newSlotId));
    expect(editedPodView(pod, { pod_mode: 'VIRTUAL' }, null)).toMatchObject({ venue_id: null, venue_slot_id: null });
  });
});

describe('editChangesMoney', () => {
  const stored = { pod_amount: 9, no_of_spots: 5, pod_type: 'PAID', pod_hosts_id: ['a', 'b'] };

  it('is false for the same values, however they are typed, and for fields left out', () => {
    expect(editChangesMoney(stored, { pod_amount: '9', no_of_spots: 5, pod_type: 'PAID', pod_hosts_id: ['a', 'b'] })).toBe(false);
    expect(editChangesMoney(stored, { pod_title: 'New' })).toBe(false);
  });

  it('is true for a changed price, size, type or host list (order included — the first host is the one priced)', () => {
    expect(editChangesMoney(stored, { pod_amount: 10 })).toBe(true);
    expect(editChangesMoney(stored, { no_of_spots: 6 })).toBe(true);
    expect(editChangesMoney(stored, { pod_type: 'FREE' })).toBe(true);
    expect(editChangesMoney(stored, { pod_hosts_id: ['b', 'a'] })).toBe(true);
  });
});

describe('adminPotentialPodEarnings prices the venue the way the pod settles', () => {
  const project = (venueId: Types.ObjectId, slotId: Types.ObjectId, podAmount: number, noOfSpots = 5) =>
    breakdownService.adminPotentialPodEarnings({
      hostUserId: null,
      podAmount,
      noOfSpots,
      venueId: String(venueId),
      venueSlotId: String(slotId),
    });

  it('includes the booking’s ₹4 commission on top: −₹15.89, not the −₹11.89 an Admin was shown', async () => {
    const { venue, slot } = await seedReferencePod(9);
    const projection = await project(venue._id, slot._id, 9);
    expect(projection.waterfall).toMatchObject({ amount: 36, venue_amount: 40, venue_commission_amount: 4, host_receives: -15.89 });
    expect(projection).toMatchObject({ viable: false, viability_reason: 'VENUE_NOT_COVERED', minimum_viable_ticket_price: 15 });
  });

  it('says viable at ₹15 and reports no minimum business when the venue set none', async () => {
    const { venue, slot } = await seedReferencePod(15);
    const projection = await project(venue._id, slot._id, 15);
    expect(projection.waterfall.host_receives).toBe(2.57);
    expect(projection).toMatchObject({ viable: true, viability_reason: null, venue_min_business: 0 });
  });

  it('reports the venue’s minimum business and the reason when the ticket money cannot clear it', async () => {
    const { venue, slot } = await seedReferencePod(100, {}, { min_spend: 1000 });
    const projection = await project(venue._id, slot._id, 100);
    expect(projection).toMatchObject({ viable: false, viability_reason: 'BELOW_MIN_BUSINESS', venue_min_business: 1000 });
  });
});
