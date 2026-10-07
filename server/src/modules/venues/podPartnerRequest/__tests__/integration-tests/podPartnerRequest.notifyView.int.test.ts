/**
 * What each side is told and shown: the notification copy per event (named
 * after the other side, linking the request, sent to the right person, never
 * failing the transition), and the request view (both summaries, the slot, and
 * contact details only once the pod exists).
 */
const createNotification = jest.fn();
jest.mock('@modules/engagement/notification/notification.service', () => ({
  notificationService: { create: (...args: unknown[]) => createNotification(...args) },
}));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { appDateTime } from '@utils/app-time';
import { UserModel } from '@modules/access/user/user.model';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { PodPartnerRequestModel, type IPodPartnerRequest } from '../../podPartnerRequest.model';
import { notifyPartner, partnerRequestPath, type PartnerRequestEvent } from '../../podPartnerRequest.notify';
import { categoryLabel, loadHostSummaries, toViews } from '../../podPartnerRequest.view';

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);
let hostId: string;
let ownerId: string;
let venueId: string;

async function seedRequest(over: Record<string, unknown> = {}): Promise<IPodPartnerRequest> {
  return PodPartnerRequestModel.create({
    direction: 'VENUE_TO_HOST',
    venue_id: venueId,
    venue_owner_user_id: ownerId,
    host_user_id: hostId,
    note: 'Weekend quiz night',
    distance_km: 2.5,
    ...over,
  });
}

beforeEach(async () => {
  createNotification.mockResolvedValue({});
  const host = await UserModel.create({
    auth: { email: 'meera@duncit.com', phone: { number: '9876543210', extension: '91' } },
    profile: { first_name: 'Meera', last_name: 'Shah', profile_photo: 'https://img.example.test/meera.jpg' },
  });
  const owner = await UserModel.create({
    auth: { email: 'rohit@duncit.com', phone: { number: '9876543211', extension: '91' } },
    profile: { first_name: 'Rohit', last_name: 'Rao' },
  });
  hostId = String(host._id);
  ownerId = String(owner._id);
  const venue = await VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Flow Sports Life',
    venue_category: { super_category_name: 'Sports' },
    venue_type: 'Arena',
    capacity: 60,
    locality: 'Bandra',
    city: 'Mumbai',
    owner_phone: '+911234567890',
    owner_email: 'venue@duncit.com',
    address_line1: '1 Hill Road',
  });
  venueId = String(venue._id);
});

describe('categoryLabel', () => {
  it('joins the most specific category name with the sub-category', () => {
    expect(categoryLabel({ super_category_name: 'Sports', category_name: 'Racket', sub_category_name: 'Badminton' })).toBe(
      'Racket · Badminton'
    );
    expect(categoryLabel({ super_category_name: 'Sports', sub_category_name: 'Badminton' })).toBe('Sports · Badminton');
    expect(categoryLabel({ super_category_name: 'Sports' })).toBe('Sports');
    expect(categoryLabel({})).toBe('');
    expect(categoryLabel(null)).toBe('');
  });
});

describe('notifyPartner', () => {
  it('builds the deep link for a request', () => {
    expect(partnerRequestPath('abc')).toBe('/pod-requests/abc');
  });

  it("tells the host, in the venue's name, with a link to the request", async () => {
    const doc = await seedRequest();
    await notifyPartner(doc, 'REQUESTED', 'HOST');
    expect(createNotification).toHaveBeenCalledWith({
      title: 'New Pod Request',
      body: 'Flow Sports Life would like to run a pod with you. Review the request.',
      scope: 'USER',
      target_user_ids: [hostId],
      link_url: `/pod-requests/${String(doc._id)}`,
      silent: false,
    });
  });

  it("tells the venue owner, in the host's name", async () => {
    const doc = await seedRequest({ direction: 'HOST_TO_VENUE' });
    await notifyPartner(doc, 'ACCEPTED', 'VENUE');
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Pod Request accepted',
        body: 'Meera Shah accepted your Pod Request. Pick a slot next.',
        target_user_ids: [ownerId],
      })
    );
  });

  const start = inDays(4);
  it.each<[PartnerRequestEvent, string, string]>([
    ['REJECTED', 'Pod Request declined', 'Flow Sports Life declined your Pod Request.'],
    ['SLOT_REQUESTED', 'Slot request received', `Flow Sports Life picked ${appDateTime(start)}. Confirm the slot to continue.`],
    ['SLOT_CONFIRMED', 'Slot confirmed', `Flow Sports Life confirmed ${appDateTime(start)}. The pod can be created now.`],
    ['SLOT_DECLINED', 'Slot declined', `Flow Sports Life could not do ${appDateTime(start)}. Pick another slot.`],
    ['POD_CREATED', 'Pod created', 'The pod with Flow Sports Life is live. Contact details are now shared on the request.'],
  ])('%s carries its own copy, naming the slot time where it matters', async (event, title, body) => {
    const doc = await seedRequest({ slot_start_at: start });
    await notifyPartner(doc, event, 'HOST');
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ title, body }));
  });

  it('never puts a phone number or email into the copy', async () => {
    const doc = await seedRequest({ slot_start_at: start, status: 'POD_CREATED' });
    await notifyPartner(doc, 'POD_CREATED', 'VENUE');
    await notifyPartner(doc, 'POD_CREATED', 'HOST');
    const sent = JSON.stringify(createNotification.mock.calls);
    expect(sent).not.toMatch(/@duncit\.com|9876543210|1234567890|Hill Road/);
  });

  it('falls back to a generic name when the other side has none', async () => {
    await UserModel.updateOne({ _id: hostId }, { $set: { 'profile.first_name': '', 'profile.last_name': '' } });
    const doc = await seedRequest({ venue_id: new Types.ObjectId() });
    await notifyPartner(doc, 'REJECTED', 'HOST');
    await notifyPartner(doc, 'REJECTED', 'VENUE');
    expect(createNotification.mock.calls.map(([n]) => n.body)).toEqual([
      'A venue declined your Pod Request.',
      'A host declined your Pod Request.',
    ]);
  });

  it('logs a failed send instead of throwing — the transition is already saved', async () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    const failure = new Error('push gateway down');
    createNotification.mockRejectedValueOnce(failure);
    const doc = await seedRequest();
    await expect(notifyPartner(doc, 'ACCEPTED', 'VENUE')).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith('pod-partner-request', 'notify', {
      error: failure,
      event: 'ACCEPTED',
      request_id: String(doc._id),
    });
    error.mockRestore();
  });
});

describe('loadHostSummaries', () => {
  it("uses the host application's name when the profile has none, and de-duplicates category labels", async () => {
    await UserModel.updateOne({ _id: hostId }, { $set: { 'profile.first_name': '', 'profile.last_name': '' } });
    await HostModel.create({
      user_id: hostId,
      full_name: 'Meera S.',
      host_categories: [
        { category_name: 'Games', sub_category_name: 'Chess' },
        { category_name: 'Games', sub_category_name: 'Chess' },
        { super_category_name: 'Music' },
        {},
      ],
    });
    const map = await loadHostSummaries([new Types.ObjectId(hostId)]);
    expect(map.get(hostId)).toEqual({
      user_id: hostId,
      name: 'Meera S.',
      photo_url: 'https://img.example.test/meera.jpg',
      categories: ['Games · Chess', 'Music'],
    });
  });
});

describe('toViews', () => {
  it('shows both summaries and the slot, but no contact before the pod', async () => {
    const slot = await VenueSlotModel.create({
      venue_id: venueId,
      owner_user_id: ownerId,
      start_at: inDays(3),
      end_at: inDays(3.1),
      price: 750,
      space_label: 'Court 2',
      status: 'BOOKED',
    });
    const doc = await seedRequest({ status: 'SLOT_CONFIRMED', slot_id: slot._id });
    const [view] = await toViews([doc], 'HOST');
    expect(view).toMatchObject({
      id: String(doc._id),
      direction: 'VENUE_TO_HOST',
      status: 'SLOT_CONFIRMED',
      viewer_side: 'HOST',
      note: 'Weekend quiz night',
      distance_km: 2.5,
      venue: {
        id: venueId,
        venue_name: 'Flow Sports Life',
        category: 'Sports',
        venue_type: 'Arena',
        capacity: 60,
        locality: 'Bandra',
        city: 'Mumbai',
      },
      host: { user_id: hostId, name: 'Meera Shah', categories: [] },
      slot: {
        id: String(slot._id),
        start_at: slot.start_at.toISOString(),
        end_at: slot.end_at.toISOString(),
        whole_day: false,
        price: 750,
        space_label: 'Court 2',
      },
      pod_id: null,
      contact: null,
    });
    expect(typeof view.created_at).toBe('string');
  });

  it('shows a missing slot and missing parties as null', async () => {
    const doc = await seedRequest({ slot_id: new Types.ObjectId(), venue_id: new Types.ObjectId(), host_user_id: new Types.ObjectId() });
    const [view] = await toViews([doc], 'VENUE');
    expect(view).toMatchObject({ slot: null, venue: null, host: null, contact: null });
  });

  it("shares the host's number and email with the venue, and the venue's with the host, once the pod exists", async () => {
    const podId = new Types.ObjectId();
    await UserModel.updateOne(
      { _id: hostId },
      { $set: { 'communication.whatsapp': { number: '9123456780', extension: '91' } } }
    );
    const doc = await seedRequest({ status: 'POD_CREATED', is_open: false, pod_id: podId });
    const [venueView] = await toViews([doc], 'VENUE');
    expect(venueView).toMatchObject({ pod_id: String(podId), contact: { phone: '+919123456780', email: 'meera@duncit.com' } });
    const [hostView] = await toViews([doc], 'HOST');
    expect(hostView.contact).toEqual({ phone: '+911234567890', email: 'venue@duncit.com', address: '1 Hill Road' });
  });

  it('shares empty contact fields when the other side is gone', async () => {
    const doc = await seedRequest({
      status: 'POD_CREATED',
      is_open: false,
      venue_id: new Types.ObjectId(),
      host_user_id: new Types.ObjectId(),
    });
    expect((await toViews([doc], 'VENUE'))[0].contact).toEqual({ phone: '', email: '' });
    expect((await toViews([doc], 'HOST'))[0].contact).toEqual({ phone: '', email: '', address: '' });
  });
});
