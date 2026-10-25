/**
 * Telling the other side never fails a move: an offer whose pod or venue has
 * gone tells nobody, a send that throws is logged, and the expiry sweep logs
 * (and retries next tick) a decline that failed for any reason but a fresher
 * answer.
 */
import { Types } from 'mongoose';
import { inAppOfferNote, tellHostsOfCounter, tellVenueOfOffer } from '../../venueOffer.notify';
import { VenueSlotModel, type IVenueSlot } from '../../../venueSlot/venueSlot.model';
import { runSlotRequestExpirySweep } from '../../../venueSlot/venueSlot.expiry';
import { VenueModel } from '../../../venue/venue.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { notificationService } from '@modules/engagement/notification/notification.service';
import * as notify from '@services/notify/notify.service';
import { logs } from '@observability/log';
import type { OfferQuote, VenueOfferProposal } from '../../venueOffer.types';

const quote = { venue_payout: 3000, total: 3300, pax: 6 } as unknown as OfferQuote;
const terms: VenueOfferProposal = {
  model: 'PER_GUEST',
  rate: 500,
  min_guests: 6,
  offerings: [],
  note: '',
  quote,
  quote_min: null,
  charges: null,
};

let event: jest.SpyInstance;
let logError: jest.SpyInstance;

beforeEach(() => {
  event = jest.spyOn(notify, 'notifyEvent').mockResolvedValue({ wa: { status: 'SENT', reason: '', message_id: '' }, mail: null } as never);
  logError = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
  jest.spyOn(notify, 'notifyEach').mockResolvedValue(undefined as never);
  jest.spyOn(notificationService, 'create').mockResolvedValue({} as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function seed() {
  const owner = await UserModel.create({ auth: { email: 'o@x.com' }, profile: { first_name: 'Olu', last_name: 'Owner' } });
  const host = await UserModel.create({ auth: { email: 'h@x.com' }, profile: { first_name: 'Meera', last_name: '' } });
  const venue = await VenueModel.create({ owner_user_id: owner._id, status: 'APPROVED', is_active: true, venue_name: 'Deck' });
  const pod = await PodModel.create({
    pod_id: `pod-${new Types.ObjectId().toString()}`,
    pod_title: 'Jam',
    pod_hosts_id: [host._id],
    club_id: new Types.ObjectId(),
    pod_description: 'd',
    pod_date_time: new Date(Date.now() + 86_400_000),
    pod_type: 'PAID',
    venue_id: venue._id,
  });
  const slot = await VenueSlotModel.create({
    venue_id: venue._id,
    owner_user_id: owner._id,
    start_at: new Date(Date.now() + 86_400_000),
    end_at: new Date(Date.now() + 90_000_000),
    status: 'PENDING',
    booked_by_pod_id: pod._id,
    requested_by_host: true,
    offer: { model: 'PER_GUEST', rate: 500, pax: 20, pets: false, quote: { ...quote, model: 'PER_PAX', rate: 500, date: '2027-01-01', base: 3000, venue_price: 3000, confirmed_at: new Date() }, status: 'SENT', round: 1, history: [], min_guests: 6, expires_at: null },
  });
  return { owner, host, venue, pod, slot };
}

describe('telling the other side', () => {
  it('tells nobody about an offer whose pod or venue has gone', async () => {
    const { slot } = await seed();
    await tellVenueOfOffer({ slot, podId: String(new Types.ObjectId()), terms, round: 1 });
    await tellHostsOfCounter({ slot, podId: String(new Types.ObjectId()), terms, round: 2 });
    expect(event).not.toHaveBeenCalled();
  });

  it('logs a send that throws instead of failing the move', async () => {
    const { slot, pod } = await seed();
    event.mockRejectedValue(new Error('smtp down'));
    await tellVenueOfOffer({ slot, podId: String(pod._id), terms, round: 1 });
    await tellHostsOfCounter({ slot, podId: String(pod._id), terms, round: 2 });
    expect(logError).toHaveBeenCalledWith('venueOffer', 'tellVenueOfOffer', expect.objectContaining({ pod_id: String(pod._id) }));
    expect(logError).toHaveBeenCalledWith('venueOffer', 'tellHostsOfCounter', expect.objectContaining({ pod_id: String(pod._id) }));
  });

  it('names a host or venue owner with no name of their own by the role, so no WhatsApp value is blank', async () => {
    const { slot, pod, host } = await seed();
    await UserModel.updateOne({ _id: host._id }, { $set: { 'profile.first_name': '' } });
    await tellHostsOfCounter({ slot, podId: String(pod._id), terms, round: 2 });
    const [input] = event.mock.calls[0];
    expect(input.params[0]).toBe('Host');
    expect(input.params[8]).toBe('No special request');
  });

  it('logs an in-app note that could not be written', async () => {
    jest.spyOn(notificationService, 'create').mockRejectedValue(new Error('db down'));
    await inAppOfferNote(['u1'], 'Title', 'Body', 'pod-1');
    expect(logError).toHaveBeenCalledWith('venueOffer', 'inAppOfferNote', expect.objectContaining({ pod_id: 'pod-1' }));
  });
});

describe('the expiry sweep', () => {
  it('logs a decline that failed, and leaves the offer for the next tick', async () => {
    const { slot } = await seed();
    await VenueSlotModel.updateOne({ _id: slot._id }, { $set: { 'offer.expires_at': new Date(Date.now() - 1000) } });
    jest.spyOn(VenueSlotModel, 'deleteOne').mockRejectedValueOnce(new Error('db down'));

    await expect(runSlotRequestExpirySweep()).resolves.toBe(0);

    expect(logError).toHaveBeenCalledWith('venue-slot-expiry', 'expireRequest', expect.objectContaining({ slot_id: String(slot._id) }));
    const still = (await VenueSlotModel.findById(slot._id).lean()) as IVenueSlot | null;
    expect(still?.status).toBe('PENDING');
  });
});
