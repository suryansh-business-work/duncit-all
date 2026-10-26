/**
 * A pod, its host and a venue with its owner, and the host's offer placed and
 * announced exactly as Create Pod does — for the suites that bargain on it.
 * The messages each move sends are stubbed (`stubOfferMessages`), and every
 * announcement is waited for (`announced`) before the next move, so no move's
 * line or read mark lands after a test has moved on.
 */
import { Types } from 'mongoose';
import { venueOfferService } from '../../venueOffer.service';
import { VenueSlotModel } from '../../../venueSlot/venueSlot.model';
import { VenueModel } from '../../../venue/venue.model';
import { venueLocalYmd } from '../../../autoExtend/slotGenerator';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { VenueChatMessageModel } from '@microservices/chat/venue/venueChat.model';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import * as notify from '@services/notify/notify.service';
import type { VenueOfferRequest } from '../../venueOffer.types';

const DAY_MS = 86_400_000;
const SENT = { status: 'SENT', reason: '', message_id: 'wa-1' };

/** `days` ahead at `hhmm` venue time — inside the default opening hours. */
const at = (days: number, hhmm: string) => new Date(`${venueLocalYmd(new Date(Date.now() + days * DAY_MS))}T${hhmm}:00+05:30`);

export interface World {
  ownerId: string;
  hostId: string;
  venueId: string;
  podId: string;
}

export interface OfferMessages {
  inApp: jest.SpyInstance;
  event: jest.SpyInstance;
}

/** The in-app notes, email/WhatsApp events and fallbacks each move sends, stubbed and recorded. */
export function stubOfferMessages(): OfferMessages {
  const inApp = jest.spyOn(notificationService, 'create').mockResolvedValue({} as never);
  const event = jest.spyOn(notify, 'notifyEvent').mockResolvedValue({ wa: SENT, mail: null } as never);
  jest.spyOn(notify, 'notifyEach').mockResolvedValue(undefined as never);
  jest.spyOn(whatsappService, 'send').mockResolvedValue(SENT as never);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  return { inApp, event };
}

/** Retries `check` until it passes: a move's messages go out after the move returns. */
export async function eventually(check: () => Promise<void> | void, ms = 4000) {
  const until = Date.now() + ms;
  for (;;) {
    try {
      await check();
      return;
    } catch (error) {
      if (Date.now() > until) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

let seeded = 0;
const nextPhone = () => String(9_700_000_000 + (seeded += 1));

export async function seedWorld(): Promise<World> {
  const owner = await UserModel.create({
    auth: { email: `owner-${new Types.ObjectId()}@x.com`, phone: { extension: '+91', number: nextPhone() } },
    profile: { first_name: 'Olu', last_name: 'Owner' },
  });
  const host = await UserModel.create({
    auth: { email: `host-${new Types.ObjectId()}@x.com`, phone: { extension: '+91', number: nextPhone() } },
    profile: { first_name: 'Meera', last_name: 'Nair' },
  });
  const venue = await VenueModel.create({
    owner_user_id: owner._id,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Sky Deck',
    capacity: 30,
    owner_email: 'deck@x.com',
    owner_phone: '+919800000000',
    settings: { offers: { min_guests: 6, response_hours: 12 } },
  });
  const pod = await PodModel.create({
    pod_id: `pod-${new Types.ObjectId().toString()}`,
    pod_title: 'Rooftop Jam',
    pod_hosts_id: [host._id],
    club_id: new Types.ObjectId(),
    pod_description: 'Acoustic evening under the stars',
    pod_date_time: at(3, '18:00'),
    pod_type: 'PAID',
    pod_amount: 800,
    no_of_spots: 20,
    venue_id: venue._id,
    is_active: false,
    venue_approval_status: 'PENDING',
  });
  return { ownerId: String(owner._id), hostId: String(host._id), venueId: String(venue._id), podId: String(pod._id) };
}

/** The host's opening terms: ₹500 a guest, 6 to 20 guests, two points and a note. */
export const request = (over: Partial<VenueOfferRequest> = {}): VenueOfferRequest => ({
  start_at: at(3, '18:00').toISOString(),
  end_at: at(3, '20:00').toISOString(),
  space_label: '',
  pax: 20,
  pets: false,
  model: 'PER_GUEST',
  rate: 500,
  min_guests: 6,
  offerings: ['Projector', 'Snacks for 20'],
  note: 'Keep the AC on',
  ...over,
});

/** Read plain: Mongoose's own arrays and subdocuments do not compare as plain values. */
export const loadSlot = (id: string) => VenueSlotModel.findById(id).lean();

/** The booking's offer lines, oldest first — deleted ones included, so a withdrawal can be seen. */
export const offerLines = (podId: string) => VenueChatMessageModel.find({ pod_id: podId, type: 'OFFER' }).sort({ createdAt: 1 }).lean();

/** One move's line, found by what it records. */
export const lineFor = async (podId: string, event: string, round: number) =>
  (await offerLines(podId)).find((line) => line.offer?.event === event && line.offer?.round === round);

/**
 * Waits until a move has been fully announced: its line is in the chat (and its
 * mover's read mark with it) and the other side has been sent its message,
 * which goes out last. `notified` is the event that message is sent as.
 */
export async function announced(messages: OfferMessages, w: World, slotId: string, move: { event: string; round: number; notified: string }) {
  await eventually(async () => {
    expect(await lineFor(w.podId, move.event, move.round)).toBeDefined();
    expect(
      messages.event.mock.calls.some(([input]) => input.event === move.notified && input.entityId === `${slotId}:r${move.round}`)
    ).toBe(true);
  });
}

/** The host's offer, held, pointed at by the pod and announced to the venue. */
export async function placeOffer(messages: OfferMessages, w: World, over: Partial<VenueOfferRequest> = {}) {
  const slot = await venueOfferService.place(w.podId, w.venueId, request(over), false);
  await PodModel.updateOne({ _id: w.podId }, { $set: { venue_slot_id: slot._id } });
  venueOfferService.announcePlaced(slot);
  const slotId = String(slot._id);
  await announced(messages, w, slotId, { event: 'OFFER', round: 1, notified: 'VENUE_OFFER_RECEIVED' });
  return slotId;
}
