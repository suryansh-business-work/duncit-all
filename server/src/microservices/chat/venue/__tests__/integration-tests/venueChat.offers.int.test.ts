/**
 * The venue chat as the place a booking is negotiated: each side sees who it is
 * talking to and how to reach them (typed contact details stay refused in the
 * chat itself), and the server posts each move of the offer as an OFFER line
 * whose terms reach every client — on the next read and live — with ISO dates.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { venueChatResolvers } from '../../venueChat.resolver';
import { venueChatService } from '../../venueChat.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { UserModel } from '@modules/access/user/user.model';
import type { VenueChatOfferPayload } from '../../venueChat.model';

const Q = venueChatResolvers.Query;

async function seed(over: { venue?: Record<string, unknown>; hostPhone?: boolean } = {}) {
  const owner = await UserModel.create({
    auth: { email: 'owner-account@x.com', phone: { extension: '+91', number: '9811111111' } },
    profile: { first_name: 'Olu', last_name: 'Owner' },
  });
  const host = await UserModel.create({
    auth: {
      email: 'meera@x.com',
      ...(over.hostPhone === false ? {} : { phone: { extension: '+91', number: '9876500000' } }),
    },
    profile: { first_name: 'Meera', last_name: 'Nair' },
  });
  const venue = await VenueModel.create({
    owner_user_id: owner._id,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Sky Deck',
    owner_name: 'Deck Desk',
    owner_email: 'desk@deck.com',
    owner_phone: '+919800000000',
    ...over.venue,
  });
  const pod = await PodModel.create({
    pod_id: `pod-${new Types.ObjectId().toString()}`,
    pod_title: 'Rooftop Jam',
    pod_hosts_id: [host._id],
    club_id: new Types.ObjectId(),
    pod_description: 'An evening',
    pod_date_time: new Date(Date.now() + 86_400_000),
    pod_type: 'PAID',
    venue_id: venue._id,
  });
  return { owner, host, venue, pod };
}

const room = (podId: unknown, as: unknown) => Q.venueChatRoom({}, { pod_id: String(podId) }, makeContext({ id: String(as) }));

describe('who each side is talking to', () => {
  it("shows a host the venue's listed contact, and the venue the pod's lead host", async () => {
    const { owner, host, pod } = await seed();
    await expect(room(pod._id, host._id)).resolves.toMatchObject({
      my_side: 'HOST',
      counterpart_name: 'Deck Desk',
      counterpart_phone: '+919800000000',
      counterpart_email: 'desk@deck.com',
    });
    await expect(room(pod._id, owner._id)).resolves.toMatchObject({
      my_side: 'VENUE',
      counterpart_name: 'Meera Nair',
      counterpart_phone: '+919876500000',
      counterpart_email: 'meera@x.com',
    });
  });

  it("falls back to the venue owner's own account where the listing is blank", async () => {
    const { host, pod } = await seed({ venue: { owner_name: '', owner_phone: '', owner_email: '' } });
    await expect(room(pod._id, host._id)).resolves.toMatchObject({
      counterpart_name: 'Olu Owner',
      counterpart_phone: '+919811111111',
      counterpart_email: 'owner-account@x.com',
    });
  });

  it('says there is no number rather than printing an empty one', async () => {
    const { owner, pod } = await seed({ hostPhone: false });
    await expect(room(pod._id, owner._id)).resolves.toMatchObject({ counterpart_phone: null, counterpart_email: 'meera@x.com' });
  });

  it('says whether the pod is free, so its offer lines name no money', async () => {
    const { host, pod } = await seed();
    await expect(room(pod._id, host._id)).resolves.toMatchObject({ pod_is_free: false });
    await PodModel.updateOne({ _id: pod._id }, { $set: { pod_type: 'FREE' } });
    await expect(room(pod._id, host._id)).resolves.toMatchObject({ pod_is_free: true });
  });

  it('has nobody to show for a pod without hosts', async () => {
    const { owner, pod } = await seed();
    await PodModel.updateOne({ _id: pod._id }, { $set: { pod_hosts_id: [] } });
    await expect(room(pod._id, owner._id)).resolves.toMatchObject({ counterpart_name: null, counterpart_phone: null, counterpart_email: null });
  });
});

describe('offer lines', () => {
  const payload = (over: Partial<VenueChatOfferPayload> = {}): VenueChatOfferPayload => ({
    slot_id: String(new Types.ObjectId()),
    round: 2,
    event: 'COUNTER',
    by: 'VENUE',
    model: 'PER_GUEST',
    rate: 600,
    min_guests: 8,
    max_guests: 20,
    offerings: ['Projector'],
    note: 'Veg snacks only',
    start_at: new Date('2027-01-04T12:30:00.000Z'),
    end_at: new Date('2027-01-04T14:30:00.000Z'),
    space_label: 'Terrace',
    pets: false,
    venue_receives_min: 4800,
    venue_receives_max: 12_000,
    total_min: 5280,
    total_max: 13_200,
    expires_at: new Date('2027-01-03T12:30:00.000Z'),
    reason: '',
    ...over,
  });

  it("posts a move signed as the venue, with its terms in ISO dates, and reads it back on the thread", async () => {
    const { owner, host, pod } = await seed();
    const posted = await venueChatService.postOffer({
      podId: String(pod._id),
      side: 'VENUE',
      userId: String(owner._id),
      text: 'Counter offer: ₹600 per guest · 8–20 guests',
      offer: payload(),
    });
    expect(posted).toMatchObject({
      type: 'OFFER',
      user_name: 'Sky Deck',
      text: 'Counter offer: ₹600 per guest · 8–20 guests',
      offer: {
        event: 'COUNTER',
        offerings: ['Projector'],
        start_at: '2027-01-04T12:30:00.000Z',
        end_at: '2027-01-04T14:30:00.000Z',
        expires_at: '2027-01-03T12:30:00.000Z',
      },
    });
    const [line] = await venueChatService.messages(String(pod._id), String(host._id));
    expect(line).toMatchObject({ type: 'OFFER', offer: { round: 2, venue_receives_max: 12_000, expires_at: '2027-01-03T12:30:00.000Z' } });
  });

  it('keeps no deadline once an offer is closed, and plain lines carry no offer', async () => {
    const { owner, host, pod } = await seed();
    await venueChatService.send(String(pod._id), String(host._id), { text: 'Hello!' });
    await venueChatService.postOffer({
      podId: String(pod._id),
      side: 'VENUE',
      userId: String(owner._id),
      text: 'Offer accepted',
      offer: payload({ event: 'ACCEPTED', expires_at: null }),
    });
    const lines = await venueChatService.messages(String(pod._id), String(owner._id));
    expect(lines.find((l) => l.type === 'TEXT')?.offer).toBeNull();
    expect(lines.find((l) => l.type === 'OFFER')?.offer).toMatchObject({ event: 'ACCEPTED', expires_at: null });
  });

  it('posts nothing for a pod that is not at a venue', async () => {
    const { owner, pod } = await seed();
    await PodModel.updateOne({ _id: pod._id }, { $unset: { venue_id: 1 } });
    await expect(
      venueChatService.postOffer({ podId: String(pod._id), side: 'VENUE', userId: String(owner._id), text: 'x', offer: payload() })
    ).resolves.toBeNull();
  });

  it('never throws: a line that cannot be written is logged and skipped', async () => {
    const { owner, pod } = await seed();
    await expect(
      venueChatService.postOffer({ podId: String(pod._id), side: 'VENUE', userId: String(owner._id), text: 'x', offer: { bad: true } as never })
    ).resolves.toBeNull();
  });
});
