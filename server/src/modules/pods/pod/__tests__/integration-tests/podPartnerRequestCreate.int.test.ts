/**
 * Create Pod arriving from a host↔venue Pod Request: only the request's host,
 * only once both sides confirmed the slot, only on that slot. The pod adopts
 * the held booking (venue-APPROVED, live, window taken from the slot), the
 * request closes as POD_CREATED, and any refusal leaves no pod behind and the
 * slot still held for the request.
 */
import { Types } from 'mongoose';
import { podService } from '../../pod.service';
import { PodModel } from '../../pod.model';
import { UserRoleModel } from '@modules/access/user/relations';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import * as partnerHold from '@modules/venues/venueSlot/venueSlot.partnerHold';
import { PodPartnerRequestModel } from '@modules/venues/podPartnerRequest/podPartnerRequest.model';
import { notificationService } from '@modules/engagement/notification/notification.service';
import * as emailService from '@services/email/email.service';

const ownerId = new Types.ObjectId().toString();
const hostId = new Types.ObjectId().toString();
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);
const IMG = { url: 'https://cdn.example.com/pod.jpg', type: 'IMAGE' };

const codeOf = async (run: Promise<unknown>) => {
  try {
    await run;
    return 'OK';
  } catch (err) {
    return (err as { extensions?: { code?: string } }).extensions?.code ?? 'THROWN';
  }
};

/** The request closes after the pod is saved, off the create path — wait for it. */
async function statusSettles(requestId: string, expected: string) {
  for (let i = 0; i < 40; i += 1) {
    const doc = await PodPartnerRequestModel.findById(requestId).select('status').lean();
    if (doc?.status === expected) return expected;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return (await PodPartnerRequestModel.findById(requestId).select('status').lean())?.status;
}

let venueId: string;
let slotId: string;
let slotStart: Date;
let slotEnd: Date;

/** A request whose slot both sides confirmed, holding that slot. */
async function seedConfirmed(status = 'SLOT_CONFIRMED', host = hostId) {
  slotStart = inDays(3);
  slotEnd = inDays(3.1);
  const slot = await VenueSlotModel.create({
    venue_id: new Types.ObjectId(venueId),
    owner_user_id: new Types.ObjectId(ownerId),
    start_at: slotStart,
    end_at: slotEnd,
    price: 300,
    status: 'AVAILABLE',
  });
  slotId = String(slot._id);
  const request = await PodPartnerRequestModel.create({
    direction: 'VENUE_TO_HOST',
    venue_id: venueId,
    venue_owner_user_id: ownerId,
    host_user_id: host,
    status,
    slot_id: slot._id,
    slot_start_at: slotStart,
    slot_end_at: slotEnd,
  });
  await VenueSlotModel.updateOne({ _id: slot._id }, { $set: { status: 'BOOKED', booked_by_partner_request_id: request._id } });
  return String(request._id);
}

const podInput = (requestId: string, over: Record<string, unknown> = {}) => ({
  pod_title: `Request pod ${Math.random().toString(36).slice(2)}`,
  club_id: String(new Types.ObjectId()),
  pod_mode: 'PHYSICAL',
  pod_description: 'Board games with the neighbourhood',
  pod_type: 'PAID',
  pod_amount: 1000,
  no_of_spots: 4,
  // Stale form values: the held slot is the source of truth for the window.
  pod_date_time: inDays(9).toISOString(),
  pod_end_date_time: inDays(9.1).toISOString(),
  pod_images_and_videos: [IMG],
  venue_id: venueId,
  venue_slot_id: slotId,
  partner_request_id: requestId,
  ...over,
});

beforeEach(async () => {
  jest.spyOn(notificationService, 'create').mockResolvedValue({} as never);
  jest.spyOn(emailService, 'sendVenueSlotRequestEmail').mockResolvedValue(undefined as never);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await UserRoleModel.create({ user_id: hostId, role: 'HOST' });
  const venue = await VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Request Hall',
    owner_email: 'owner@x.com',
  });
  venueId = String(venue._id);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('createForPartner from a Pod Request', () => {
  it('adopts the held slot: venue-approved, live, on the slot window, and closes the request', async () => {
    const requestId = await seedConfirmed();
    const created = await podService.createForPartner(hostId, podInput(requestId));

    const pod = await PodModel.findById(created!.id).lean();
    expect(pod).toMatchObject({ venue_approval_status: 'APPROVED', is_active: true });
    expect(String(pod?.venue_id)).toBe(venueId);
    expect(String(pod?.venue_slot_id)).toBe(slotId);
    expect(pod?.pod_date_time?.toISOString()).toBe(slotStart.toISOString());
    expect(pod).not.toHaveProperty('partner_request_id');

    const slot = await VenueSlotModel.findById(slotId).lean();
    expect(slot).toMatchObject({ status: 'BOOKED', booked_by_partner_request_id: null, decision: 'APPROVED' });
    expect(String(slot?.booked_by_pod_id)).toBe(created!.id);

    expect(await statusSettles(requestId, 'POD_CREATED')).toBe('POD_CREATED');
    const request = await PodPartnerRequestModel.findById(requestId).lean();
    expect(request).toMatchObject({ is_open: false });
    expect(String(request?.pod_id)).toBe(created!.id);
  });

  it("refuses a form without the request's slot, even at a venue the host owns", async () => {
    const requestId = await seedConfirmed();
    // Without the slot the pod would be stamped approved and close the request
    // while the request's slot stayed held with no pod on it.
    const own = await VenueModel.create({ owner_user_id: hostId, status: 'APPROVED', is_active: true, venue_name: 'Own Hall' });
    const input = podInput(requestId, { venue_id: String(own._id), venue_slot_id: undefined });
    expect(await codeOf(podService.createForPartner(hostId, input))).toBe('BAD_USER_INPUT');
    expect(await PodModel.countDocuments({})).toBe(0);
    expect(await PodPartnerRequestModel.findById(requestId).lean()).toMatchObject({ status: 'SLOT_CONFIRMED' });
  });

  it.each([
    ['the slot is not confirmed yet', 'SLOT_REQUESTED', 'CONFLICT'],
    ['the request was already used', 'POD_CREATED', 'CONFLICT'],
  ])('refuses when %s, creating nothing', async (_label, status, code) => {
    const requestId = await seedConfirmed(status);
    expect(await codeOf(podService.createForPartner(hostId, podInput(requestId)))).toBe(code);
    expect(await PodModel.countDocuments({})).toBe(0);
    expect(await VenueSlotModel.findById(slotId).lean()).toMatchObject({ status: 'BOOKED', booked_by_pod_id: null });
  });

  it("refuses another host using someone else's request", async () => {
    const requestId = await seedConfirmed('SLOT_CONFIRMED', new Types.ObjectId().toString());
    expect(await codeOf(podService.createForPartner(hostId, podInput(requestId)))).toBe('NOT_FOUND');
    expect(await PodModel.countDocuments({})).toBe(0);
  });

  it('refuses a slot other than the one confirmed on the request', async () => {
    const requestId = await seedConfirmed();
    const other = await VenueSlotModel.create({
      venue_id: new Types.ObjectId(venueId),
      owner_user_id: new Types.ObjectId(ownerId),
      start_at: inDays(5),
      end_at: inDays(5.1),
      price: 300,
      status: 'AVAILABLE',
    });
    expect(
      await codeOf(podService.createForPartner(hostId, podInput(requestId, { venue_slot_id: String(other._id) })))
    ).toBe('BAD_USER_INPUT');
    expect(await VenueSlotModel.findById(other._id).lean()).toMatchObject({ status: 'AVAILABLE' });
  });

  it('refuses a malformed request id', async () => {
    await seedConfirmed();
    expect(await codeOf(podService.createForPartner(hostId, podInput('nope')))).toBe('BAD_USER_INPUT');
  });

  it('refuses when the slot is no longer held for the request', async () => {
    const requestId = await seedConfirmed();
    await VenueSlotModel.updateOne({ _id: slotId }, { $set: { status: 'AVAILABLE', booked_by_partner_request_id: null } });
    expect(await codeOf(podService.createForPartner(hostId, podInput(requestId)))).toBe('CONFLICT');
    expect(await PodModel.countDocuments({})).toBe(0);
    expect(await PodPartnerRequestModel.findById(requestId).lean()).toMatchObject({ status: 'SLOT_CONFIRMED' });
  });

  it('removes the pod again when the hold cannot be handed over', async () => {
    const requestId = await seedConfirmed();
    jest
      .spyOn(partnerHold, 'transferPartnerRequestHold')
      .mockRejectedValueOnce(Object.assign(new Error('This slot is no longer held for that request.'), { extensions: { code: 'CONFLICT' } }));
    expect(await codeOf(podService.createForPartner(hostId, podInput(requestId)))).toBe('CONFLICT');
    expect(await PodModel.countDocuments({})).toBe(0);
    expect(await PodPartnerRequestModel.findById(requestId).lean()).toMatchObject({ status: 'SLOT_CONFIRMED' });
  });
});
