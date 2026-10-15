/**
 * A pod going live at a venue answers the event requests made to that venue
 * and its hosts: a venue's approval and a free pod's instant booking both hand
 * the pod to the fan-out; a decline never does. The fan-out itself has its own
 * suite (eventRequest.fulfil) — here it is the seam.
 */
jest.mock('@modules/venues/eventRequest/eventRequest.fulfil', () => ({ fulfilEventRequests: jest.fn() }));

import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { fulfilEventRequests } from '@modules/venues/eventRequest/eventRequest.fulfil';
import { venueLocalYmd } from '@modules/venues/autoExtend/slotGenerator';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '../../venueSlot.model';
import { notifyFreeSlotBooked, venueSlotService } from '../../venueSlot.service';

const fulfil = jest.mocked(fulfilEventRequests);
const ownerId = new Types.ObjectId().toHexString();
const hostId = new Types.ObjectId();
const DAY_MS = 86_400_000;

/** `d` days ahead at noon venue time, so a short slot never crosses midnight. */
const inDays = (d: number) => {
  const whole = Math.floor(d);
  const ymd = venueLocalYmd(new Date(Date.now() + whole * DAY_MS));
  return new Date(new Date(`${ymd}T12:00:00+05:30`).getTime() + (d - whole) * DAY_MS).toISOString();
};

async function seedHold() {
  await UserModel.create({
    _id: hostId,
    auth: { email: `meera-${hostId.toHexString()}@duncit.com` },
    profile: { first_name: 'Meera', last_name: 'Shah' },
  });
  const venue = await VenueModel.create({ owner_user_id: ownerId, status: 'APPROVED', is_active: true, venue_name: 'Cafe Uno' });
  const venueId = String(venue._id);
  const [slot] = await venueSlotService.create(ownerId, {
    venue_id: venueId,
    slots: [{ start_at: inDays(3), end_at: inDays(3.1), price: 400 }],
  });
  const pod = await PodModel.create({
    pod_id: `pod-${new Types.ObjectId().toHexString()}`,
    pod_title: 'Quiz night',
    pod_hosts_id: [hostId],
    club_id: new Types.ObjectId(),
    pod_description: 'A quiz',
    pod_date_time: new Date(inDays(3)),
    pod_type: 'PAID',
    is_active: false,
    venue_approval_status: 'PENDING',
  });
  await venueSlotService.holdForPod(slot.id, venueId, String(pod._id));
  // What a free booking hands the notifier: the pod fields the templates read.
  const livePod = { _id: pod._id, pod_title: pod.pod_title, club_id: pod.club_id, pod_hosts_id: [hostId] };
  return { venueId, slotId: slot.id, podId: String(pod._id), pod: livePod };
}

describe('event requests answered when a pod goes live at a venue', () => {
  it("hands the approved pod, its venue and its hosts to the fan-out", async () => {
    const { venueId, slotId, podId } = await seedHold();
    await venueSlotService.approveRequest(ownerId, slotId);

    expect(fulfil).toHaveBeenCalledTimes(1);
    const facts = fulfil.mock.calls[0][0];
    expect(facts).toMatchObject({ podId, podTitle: 'Quiz night', venueName: 'Cafe Uno', hostName: 'Meera Shah' });
    expect(String(facts.venueId)).toBe(venueId);
    expect(facts.hostIds.map(String)).toEqual([hostId.toHexString()]);
    expect(facts.date).toEqual(expect.any(String));
    expect(facts.time).toEqual(expect.any(String));
  });

  it('answers nothing when the venue declines', async () => {
    const { slotId } = await seedHold();
    await venueSlotService.declineRequest(ownerId, slotId, 'Double booked');
    expect(fulfil).not.toHaveBeenCalled();
  });

  it("answers the requests when a free pod books a partner's free slot outright", async () => {
    const { slotId, podId, pod } = await seedHold();
    const slot = await VenueSlotModel.findById(slotId);
    if (!slot) throw new Error('slot missing');
    await notifyFreeSlotBooked(pod, slot);
    expect(fulfil).toHaveBeenCalledWith(expect.objectContaining({ podId, podTitle: 'Quiz night' }));
  });

  it('answers nothing when the venue has gone', async () => {
    const { slotId, venueId, pod } = await seedHold();
    const slot = await VenueSlotModel.findById(slotId);
    if (!slot) throw new Error('slot missing');
    await VenueModel.deleteOne({ _id: venueId });
    await notifyFreeSlotBooked(pod, slot);
    expect(fulfil).not.toHaveBeenCalled();
  });
});
