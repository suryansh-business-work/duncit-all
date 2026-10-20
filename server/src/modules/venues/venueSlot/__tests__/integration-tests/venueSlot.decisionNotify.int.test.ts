/**
 * What a venue's decision (and a free pod's instant booking) sends, and that a
 * failing send never undoes the booking. The in-app note, the WhatsApp/email
 * fan-out, the event-request fan-out and the venue-subscriber fan-out are the
 * seams; everything they are fed is read from real documents.
 */
import { Types } from 'mongoose';

const notifyEach = jest.fn();
jest.mock('@services/notify/notify.service', () => ({
  notifyEach: (...args: unknown[]) => notifyEach(...args),
}));

const notificationCreate = jest.fn();
jest.mock('@modules/engagement/notification/notification.service', () => {
  const actual = jest.requireActual('@modules/engagement/notification/notification.service');
  return {
    ...actual,
    notificationService: {
      ...actual.notificationService,
      create: (...args: unknown[]) => notificationCreate(...args),
    },
  };
});

const notifyVenueSubscribers = jest.fn();
jest.mock('@modules/venues/venueFood/venueSubscriber.service', () => ({
  ...jest.requireActual('@modules/venues/venueFood/venueSubscriber.service'),
  notifyVenueSubscribers: (...args: unknown[]) => notifyVenueSubscribers(...args),
}));

jest.mock('@modules/venues/eventRequest/eventRequest.fulfil', () => ({ fulfilEventRequests: jest.fn() }));

// A trailing slash on the configured portal URL must not double up in the link.
jest.mock('@config/url-configs', () => {
  const actual = jest.requireActual('@config/url-configs');
  return {
    ...actual,
    getUrlConfigs: async () => ({ ...(await actual.getUrlConfigs()), partnersUrl: 'https://partners.example.test//' }),
  };
});

import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { venueLocalYmd } from '@modules/venues/autoExtend/slotGenerator';
import { VenueSlotModel } from '../../venueSlot.model';
import { notifyFreeSlotBooked, venueSlotService } from '../../venueSlot.service';

const DAY_MS = 86_400_000;
const inDays = (d: number) => {
  const whole = Math.floor(d);
  const ymd = venueLocalYmd(new Date(Date.now() + whole * DAY_MS));
  return new Date(new Date(`${ymd}T12:00:00+05:30`).getTime() + (d - whole) * DAY_MS).toISOString();
};

interface Send {
  event: string;
  params: string[];
  vars?: Record<string, string>;
}

const sentEvents = (): Send[] => notifyEach.mock.calls.flatMap((call) => call[0] as Send[]);
const sendFor = (event: string) => sentEvents().find((s) => s.event === event);

let logError: jest.SpyInstance;

beforeEach(() => {
  notifyEach.mockResolvedValue([]);
  notificationCreate.mockResolvedValue({});
  notifyVenueSubscribers.mockResolvedValue({ queued: 0 });
  logError = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  logError.mockRestore();
});

async function seedUser(first: string, last: string, id = new Types.ObjectId()) {
  await UserModel.create({
    _id: id,
    auth: { email: `${first.toLowerCase()}-${id.toHexString()}@duncit.com` },
    profile: { first_name: first, last_name: last },
  });
  return id;
}

/** A pending request from a pod whose club has a named admin (unless told not
 * to), with or without a real venue-owner account behind the venue. */
async function seedRequest({ withOwner = true, withClubAdmin = true } = {}) {
  const ownerId = withOwner ? await seedUser('Rohit', 'Nair') : new Types.ObjectId();
  const hostId = await seedUser('Meera', 'Shah');
  const clubId = new Types.ObjectId();
  if (withClubAdmin) {
    const adminId = await seedUser('Asha', 'Rao');
    await ClubModel.collection.insertOne({
      _id: clubId,
      club_id: `club-${clubId.toHexString()}`,
      club_name: 'Poets',
      admin_user_ids: [adminId],
    } as never);
  }
  const venue = await VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Cafe Uno',
  });
  const venueId = String(venue._id);
  const owner = ownerId.toHexString();
  const [slot] = await venueSlotService.create(owner, {
    venue_id: venueId,
    slots: [{ start_at: inDays(3), end_at: inDays(3.1), price: 400 }],
  });
  const pod = await PodModel.create({
    pod_id: `pod-${new Types.ObjectId().toHexString()}`,
    pod_title: 'Quiz night',
    pod_hosts_id: [hostId],
    club_id: clubId,
    pod_description: 'A quiz',
    pod_date_time: new Date(inDays(3)),
    pod_type: 'PAID',
    is_active: false,
    venue_approval_status: 'PENDING',
  });
  await venueSlotService.holdForPod(slot.id, venueId, String(pod._id));
  return { owner, venueId, slotId: slot.id, podId: String(pod._id), hostId, clubId };
}

describe('approval fan-out', () => {
  it('tells host and owner, sends the pod-is-live pair naming the club admin, and alerts subscribers', async () => {
    const { owner, slotId, podId, venueId, hostId } = await seedRequest();
    const approved = await venueSlotService.approveRequest(owner, slotId);
    expect(approved.status).toBe('BOOKED');

    expect(notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Venue approved your slot', target_user_ids: [hostId.toHexString()] })
    );
    expect(sentEvents().map((s) => s.event)).toEqual([
      'HOST_SLOT_APPROVED',
      'VENUE_SLOT_APPROVED',
      'VENUE_POD_PUBLISHED',
      'HOST_POD_PUBLISHED',
    ]);
    const studioUrl = 'https://partners.example.test/venues/dashboard';
    expect(sendFor('VENUE_SLOT_APPROVED')).toMatchObject({ vars: { studio_url: studioUrl } });
    expect(sendFor('VENUE_SLOT_APPROVED')?.params).toEqual(
      expect.arrayContaining(['Rohit Nair', 'Quiz night', 'Meera Shah', studioUrl])
    );
    expect(sendFor('VENUE_POD_PUBLISHED')?.params[0]).toBe('Rohit Nair');
    expect(sendFor('VENUE_POD_PUBLISHED')?.params.slice(-1)[0]).toBe('Asha Rao');
    expect(sendFor('HOST_POD_PUBLISHED')?.params[0]).toBe('Meera Shah');
    expect(sendFor('HOST_POD_PUBLISHED')?.params.slice(-1)[0]).toBe('Asha Rao');

    expect(notifyVenueSubscribers).toHaveBeenCalledWith(
      expect.objectContaining({ venueName: 'Cafe Uno', podId, podTitle: 'Quiz night' })
    );
    expect(String(notifyVenueSubscribers.mock.calls[0][0].venueId)).toBe(venueId);
  });

  it('skips the owner-side messages when the venue owner has no account', async () => {
    const { owner, slotId } = await seedRequest({ withOwner: false });
    await venueSlotService.approveRequest(owner, slotId);
    expect(sentEvents().map((s) => s.event)).toEqual(['HOST_SLOT_APPROVED', 'HOST_POD_PUBLISHED']);
  });

  it('a failed in-app note still lets the WhatsApp decision go out', async () => {
    const { owner, slotId, podId } = await seedRequest();
    notificationCreate.mockRejectedValueOnce(new Error('push down'));
    const approved = await venueSlotService.approveRequest(owner, slotId);

    expect(approved.status).toBe('BOOKED');
    expect(logError).toHaveBeenCalledWith(
      'venueSlot',
      'notifySlotDecision',
      expect.objectContaining({ approved: true, slot_id: slotId, msg: 'decision notification failed' })
    );
    expect(sendFor('HOST_SLOT_APPROVED')).toBeDefined();
    expect((await PodModel.findById(podId))?.is_active).toBe(true);
  });

  it('a failed WhatsApp fan-out is logged and never undoes the approval', async () => {
    const { owner, slotId, podId } = await seedRequest();
    notifyEach.mockRejectedValueOnce(new Error('provider down'));
    const approved = await venueSlotService.approveRequest(owner, slotId);

    expect(approved.status).toBe('BOOKED');
    expect(logError).toHaveBeenCalledWith(
      'venueSlot',
      'whatsappSlotDecision',
      expect.objectContaining({ approved: true, slot_id: slotId, msg: 'decision whatsapp failed' })
    );
    // The failure came before the subscriber fan-out, so nobody was alerted.
    expect(notifyVenueSubscribers).not.toHaveBeenCalled();
    expect((await PodModel.findById(podId))?.venue_approval_status).toBe('APPROVED');
    expect((await VenueSlotModel.findById(slotId))?.status).toBe('BOOKED');
  });
});

describe('decline fan-out', () => {
  it('tells host and owner of the decline and sends no pod-is-live pair', async () => {
    const { owner, slotId } = await seedRequest();
    await venueSlotService.declineRequest(owner, slotId, '  Double booked ');

    expect(notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Venue declined your slot',
        body: expect.stringContaining('Reason: Double booked'),
      })
    );
    expect(sentEvents().map((s) => s.event)).toEqual(['HOST_SLOT_REJECTED', 'VENUE_SLOT_REJECTED']);
    expect(sendFor('VENUE_SLOT_REJECTED')?.params).toHaveLength(6);
    expect(notifyVenueSubscribers).not.toHaveBeenCalled();
  });
});

describe('notifyFreeSlotBooked', () => {
  async function seedFreeBooking() {
    const seeded = await seedRequest();
    const slot = await VenueSlotModel.findById(seeded.slotId);
    if (!slot) throw new Error('slot missing');
    const pod = { _id: new Types.ObjectId(seeded.podId), pod_title: 'Quiz night', club_id: seeded.clubId, pod_hosts_id: [seeded.hostId] };
    return { ...seeded, slot, pod };
  }

  it('notes the owner in-app and sends only the pod-is-live pair', async () => {
    const { owner, slot, pod } = await seedFreeBooking();
    await notifyFreeSlotBooked(pod, slot);

    expect(notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Slot booked', target_user_ids: [owner] })
    );
    expect(sentEvents().map((s) => s.event)).toEqual(['VENUE_POD_PUBLISHED', 'HOST_POD_PUBLISHED']);
    expect(logError).not.toHaveBeenCalledWith('venueSlot', expect.anything(), expect.anything());
  });

  it('logs a failed in-app note and still sends the WhatsApp pair', async () => {
    const { slot, pod } = await seedFreeBooking();
    notificationCreate.mockRejectedValueOnce(new Error('push down'));
    await notifyFreeSlotBooked(pod, slot);

    expect(logError).toHaveBeenCalledWith(
      'venueSlot',
      'announceLiveBooking',
      expect.objectContaining({ msg: 'booking note failed', slot_id: String(slot._id) })
    );
    expect(sentEvents().map((s) => s.event)).toEqual(['VENUE_POD_PUBLISHED', 'HOST_POD_PUBLISHED']);
  });

  it('logs a failed WhatsApp send without throwing', async () => {
    const { slot, pod } = await seedFreeBooking();
    notifyEach.mockRejectedValueOnce(new Error('provider down'));
    await expect(notifyFreeSlotBooked(pod, slot)).resolves.toBeUndefined();

    expect(logError).toHaveBeenCalledWith(
      'venueSlot',
      'announceLiveBooking',
      expect.objectContaining({ msg: 'booking whatsapp failed', slot_id: String(slot._id) })
    );
  });
});
