/**
 * A pod going live answers the open requests to its venue and its hosts: each
 * is closed as FULFILLED by that pod, and only the members whose rows THIS pod
 * closed are told. The pod link and the in-app notification are the seams.
 */
interface NoteInput {
  title: string;
  body: string;
  image_url: string | null;
  link_url: string;
  scope: string;
  target_user_ids: string[];
}
const createNotification = jest.fn<Promise<unknown>, [NoteInput]>();
jest.mock('@modules/engagement/notification/notification.service', () => ({
  notificationService: { create: (input: NoteInput) => createNotification(input) },
}));
jest.mock('@modules/venues/venueFood/venueSubscriber.service', () => ({
  podLink: jest.fn(async (podId: string) => `https://duncit.test/s/${podId}`),
}));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { EventRequestModel, type EventRequestStatus, type EventRequestTarget } from '../../eventRequest.model';
import { fulfilEventRequests, type PodLiveFacts } from '../../eventRequest.fulfil';

const venueId = new Types.ObjectId();
const otherVenueId = new Types.ObjectId();
const hostA = new Types.ObjectId();
const hostB = new Types.ObjectId();
const asha = new Types.ObjectId();
const kiran = new Types.ObjectId();
const meera = new Types.ObjectId();

/** Every `updateMany` the fan-out started, so a test can wait for a run that tells nobody to finish. */
let started: Promise<unknown>[] = [];

async function seed(type: EventRequestTarget, targetId: Types.ObjectId, requester: Types.ObjectId, status: EventRequestStatus = 'OPEN') {
  return EventRequestModel.create({ target_type: type, target_id: targetId, requester_id: requester, status });
}

const facts = (over: Partial<PodLiveFacts> = {}): PodLiveFacts => ({
  podId: new Types.ObjectId().toHexString(),
  podTitle: 'Quiz night',
  venueId,
  venueName: 'Cafe Uno',
  hostIds: [hostA, hostB],
  hostName: 'Meera Rao',
  date: 'Sat, 18 Oct',
  time: '7:00 PM',
  ...over,
});

/** Polls until `check` passes — the fan-out is queued, not awaited. */
async function eventually(check: () => Promise<void> | void, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      await check();
      return;
    } catch (error) {
      if (Date.now() > deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

/** Waits for every close the fan-out started, then for the run to return. */
async function settled() {
  await Promise.allSettled(started);
  await new Promise((resolve) => setImmediate(resolve));
}

const statusOf = async (id: Types.ObjectId) => (await EventRequestModel.findById(id).lean())?.status;

beforeAll(async () => {
  await EventRequestModel.init();
});

beforeEach(() => {
  started = [];
  createNotification.mockResolvedValue({});
  const realUpdateMany = EventRequestModel.updateMany.bind(EventRequestModel);
  jest.spyOn(EventRequestModel, 'updateMany').mockImplementation(((
    filter: Parameters<typeof realUpdateMany>[0],
    update: Parameters<typeof realUpdateMany>[1]
  ) => {
    const run = realUpdateMany(filter, update).exec();
    started.push(run);
    return run;
  }) as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('fulfilEventRequests', () => {
  it("closes the open asks to the pod's venue and hosts, and tells each member once per kind of ask", async () => {
    const atVenue = await seed('VENUE', venueId, asha);
    const ofHostA = await seed('HOST', hostA, kiran);
    const ashaOfHostB = await seed('HOST', hostB, asha);
    const elsewhere = await seed('VENUE', otherVenueId, meera);
    const dismissed = await seed('VENUE', venueId, meera, 'DISMISSED');
    const live = facts();

    expect(fulfilEventRequests(live)).toBeUndefined();

    await eventually(() => expect(createNotification).toHaveBeenCalledTimes(2));
    for (const row of [atVenue, ofHostA, ashaOfHostB]) {
      const stored = await EventRequestModel.findById(row._id).lean();
      expect(stored).toMatchObject({ status: 'FULFILLED', closed_by_id: null });
      expect(String(stored?.fulfilled_pod_id)).toBe(live.podId);
      expect(stored?.closed_at).toBeInstanceOf(Date);
    }
    expect(await statusOf(elsewhere._id)).toBe('OPEN');
    expect(await statusOf(dismissed._id)).toBe('DISMISSED');

    const link = `https://duncit.test/s/${live.podId}`;
    expect(createNotification).toHaveBeenCalledWith({
      title: "You asked for an event at Cafe Uno — it's live",
      body: 'Quiz night · Sat, 18 Oct, 7:00 PM',
      image_url: null,
      link_url: link,
      scope: 'USER',
      target_user_ids: [String(asha)],
    });
    const hostNote = createNotification.mock.calls.map(([input]) => input).find((input) => input.title.includes('Meera Rao'));
    expect(hostNote).toMatchObject({ title: "You asked Meera Rao for an event — it's live", link_url: link });
    expect([...(hostNote?.target_user_ids ?? [])].sort((a, b) => a.localeCompare(b))).toEqual(
      [String(kiran), String(asha)].sort((a, b) => a.localeCompare(b))
    );
  });

  it('tells a member asking two hosts of the same pod only once', async () => {
    await seed('HOST', hostA, asha);
    await seed('HOST', hostB, asha);
    fulfilEventRequests(facts({ venueId: null }));
    await eventually(() => expect(createNotification).toHaveBeenCalledTimes(1));
    expect(createNotification.mock.calls[0][0].target_user_ids).toEqual([String(asha)]);
  });

  it('tells nobody again when the same pod is approved twice', async () => {
    await seed('VENUE', venueId, asha);
    const live = facts();
    fulfilEventRequests(live);
    await eventually(() => expect(createNotification).toHaveBeenCalledTimes(1));

    fulfilEventRequests(live);
    await settled();
    expect(createNotification).toHaveBeenCalledTimes(1);
  });

  it('tells only the members whose requests the second pod closed, not those the first one answered', async () => {
    await seed('VENUE', venueId, asha);
    fulfilEventRequests(facts());
    await eventually(() => expect(createNotification).toHaveBeenCalledTimes(1));

    const later = await seed('VENUE', venueId, kiran);
    const second = facts();
    fulfilEventRequests(second);
    await eventually(() => expect(createNotification).toHaveBeenCalledTimes(2));
    expect(createNotification.mock.calls[1][0].target_user_ids).toEqual([String(kiran)]);
    expect(String((await EventRequestModel.findById(later._id).lean())?.fulfilled_pod_id)).toBe(second.podId);
  });

  it('falls back to neutral names when the venue or host name is unknown', async () => {
    await seed('VENUE', venueId, asha);
    await seed('HOST', hostA, kiran);
    fulfilEventRequests(facts({ venueName: undefined, hostName: undefined }));
    await eventually(() => expect(createNotification).toHaveBeenCalledTimes(2));
    const titles = createNotification.mock.calls.map(([input]) => input.title);
    expect(titles).toEqual(["You asked for an event at this venue — it's live", "You asked a host for an event — it's live"]);
  });

  it('does nothing for a pod id that is not an id, or a pod with no venue and no valid host', async () => {
    const open = await seed('VENUE', venueId, asha);
    fulfilEventRequests(facts({ podId: 'not-an-id' }));
    fulfilEventRequests(facts({ venueId: 'nope', hostIds: ['bad', null] }));
    await settled();
    expect(EventRequestModel.updateMany).not.toHaveBeenCalled();
    expect(await statusOf(open._id)).toBe('OPEN');
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('closes nothing and tells nobody when no request is open', async () => {
    await seed('VENUE', venueId, asha, 'DISMISSED');
    fulfilEventRequests(facts());
    await settled();
    expect(EventRequestModel.updateMany).toHaveBeenCalledTimes(1);
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('never throws when the note cannot be sent — it logs, and the requests stay answered', async () => {
    const atVenue = await seed('VENUE', venueId, asha);
    createNotification.mockRejectedValueOnce(new Error('push down'));
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    const live = facts();

    expect(() => fulfilEventRequests(live)).not.toThrow();

    await eventually(() =>
      expect(error).toHaveBeenCalledWith('event-request', 'fulfil', expect.objectContaining({ podId: live.podId }))
    );
    expect(await statusOf(atVenue._id)).toBe('FULFILLED');
  });
});
