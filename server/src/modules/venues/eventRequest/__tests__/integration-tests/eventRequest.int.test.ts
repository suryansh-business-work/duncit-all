/**
 * "Run something here" requests against the in-memory database: who may ask,
 * the one-open-ask rule (and the race it guards), who may close a request, and
 * which consoles read them. Only the in-app notification seam is replaced.
 */
const createNotification = jest.fn();
jest.mock('@modules/engagement/notification/notification.service', () => ({
  notificationService: { create: (...args: unknown[]) => createNotification(...args) },
}));

import type { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { EVENT_REQUEST_NOTE_MAX, EventRequestModel } from '../../eventRequest.model';
import { eventRequestResolvers } from '../../eventRequest.resolver';
import { eventRequestService } from '../../eventRequest.service';
import { assertTargetType, loadTarget, ownedTargetIds, ownsTarget, parseObjectId } from '../../eventRequest.target';

let memberId: string;
let ownerId: string;
let hostId: string;
let venueId: string;

const { Query, Mutation } = eventRequestResolvers;

/** What a refused call was refused with. */
async function refusal(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    const refused = error as GraphQLError;
    return { code: refused.extensions?.code, message: refused.message };
  }
  throw new Error('Expected the call to be refused');
}

async function makeUser(first: string, roles: string[] = ['USER']) {
  const user = await UserModel.create({
    auth: { email: `${first.toLowerCase()}-${new Types.ObjectId().toHexString()}@duncit.com` },
    profile: { first_name: first, last_name: 'Rao' },
    metadata: { role_keys: roles },
  });
  return String(user._id);
}

async function makeVenue(owner: string, over: Record<string, unknown> = {}) {
  const venue = await VenueModel.create({
    owner_user_id: owner,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Cafe Uno',
    ...over,
  });
  return String(venue._id);
}

const askVenue = (caller = memberId, note?: string | null, target = venueId) =>
  eventRequestService.request(caller, { target_type: 'VENUE', target_id: target, note });

// The one-open-ask rule IS the partial unique index; build it before a test leans on it.
beforeAll(async () => {
  await EventRequestModel.init();
});

beforeEach(async () => {
  createNotification.mockResolvedValue({});
  memberId = await makeUser('Asha');
  ownerId = await makeUser('Rohit');
  hostId = await makeUser('Meera', ['USER', 'HOST']);
  venueId = await makeVenue(ownerId);
});

describe('the one open request per member and target', () => {
  it('refuses a second OPEN row in the database, and admits one again once the first is closed', async () => {
    const row = {
      target_type: 'VENUE' as const,
      target_id: new Types.ObjectId(venueId),
      requester_id: new Types.ObjectId(memberId),
    };
    const first = await EventRequestModel.create(row);
    await expect(EventRequestModel.create(row)).rejects.toMatchObject({ code: 11000 });

    await EventRequestModel.updateOne({ _id: first._id }, { $set: { status: 'DISMISSED' } });
    await expect(EventRequestModel.create(row)).resolves.toMatchObject({ status: 'OPEN' });
    expect(await EventRequestModel.countDocuments(row)).toBe(2);
  });
});

describe('eventRequest.target', () => {
  it('accepts only the two target kinds and only real ids', () => {
    expect(assertTargetType('HOST')).toBe('HOST');
    expect(() => assertTargetType('CLUB')).toThrow('Invalid target');
    expect(() => parseObjectId('nope', 'target id')).toThrow('Invalid target id');
    expect(parseObjectId(venueId, 'target id').toHexString()).toBe(venueId);
  });

  it('loads only a live, approved venue and only an account that holds the HOST role', async () => {
    const draft = await makeVenue(ownerId, { status: 'DRAFT' });
    const paused = await makeVenue(ownerId, { is_active: false });
    expect(await loadTarget('VENUE', new Types.ObjectId(venueId))).toMatchObject({ name: 'Cafe Uno', ownerId });
    expect(await loadTarget('VENUE', new Types.ObjectId(draft))).toBeNull();
    expect(await loadTarget('VENUE', new Types.ObjectId(paused))).toBeNull();

    expect(await loadTarget('HOST', new Types.ObjectId(hostId))).toMatchObject({ name: 'Meera Rao', ownerId: hostId });
    expect(await loadTarget('HOST', new Types.ObjectId(memberId))).toBeNull();
  });

  it('reads the venues a partner owns today, and a host answers only for themself', async () => {
    const second = await makeVenue(ownerId);
    await makeVenue(memberId);
    const owned = (await ownedTargetIds('VENUE', ownerId)).map(String).sort((a, b) => a.localeCompare(b));
    expect(owned).toEqual([venueId, second].sort((a, b) => a.localeCompare(b)));
    expect((await ownedTargetIds('HOST', hostId)).map(String)).toEqual([hostId]);

    expect(await ownsTarget('VENUE', new Types.ObjectId(venueId), ownerId)).toBe(true);
    expect(await ownsTarget('VENUE', new Types.ObjectId(venueId), memberId)).toBe(false);
    expect(await ownsTarget('HOST', new Types.ObjectId(hostId), hostId)).toBe(true);
    expect(await ownsTarget('HOST', new Types.ObjectId(hostId), memberId)).toBe(false);
  });
});

describe('asking for an event', () => {
  it("stores the ask with both names, tells the venue's owner, and reports the member's state", async () => {
    const state = await askVenue(memberId, '  Quiz night please  ');

    expect(state).toMatchObject({ is_owner: false, requested: true });
    const stored = await EventRequestModel.findById(state.request_id).lean();
    expect(stored).toMatchObject({
      target_type: 'VENUE',
      target_name: 'Cafe Uno',
      requester_name: 'Asha Rao',
      note: 'Quiz night please',
      status: 'OPEN',
    });
    expect(state.requested_at).toBe(stored?.created_at.toISOString());
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New event request',
        body: 'Asha Rao would like an event at Cafe Uno.',
        scope: 'USER',
        target_user_ids: [ownerId],
        link_url: expect.stringMatching(/\/venues\/event-requests$/),
      })
    );
    expect(await eventRequestService.myState(memberId, 'VENUE', venueId)).toEqual(state);
  });

  it('asks a host with the host copy and the host link', async () => {
    await eventRequestService.request(memberId, { target_type: 'HOST', target_id: hostId });
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Asha Rao would like you to host an event.',
        target_user_ids: [hostId],
        link_url: expect.stringMatching(/\/host\/event-requests$/),
      })
    );
  });

  it('is idempotent: asking again returns the same open ask and tells nobody twice', async () => {
    const first = await askVenue();
    const again = await askVenue(memberId, 'a different note');
    expect(again.request_id).toBe(first.request_id);
    expect(await EventRequestModel.countDocuments({})).toBe(1);
    expect(createNotification).toHaveBeenCalledTimes(1);
  });

  it('settles two racing taps on the row that won, without a second note', async () => {
    const competitor = new Types.ObjectId();
    const create = jest.spyOn(EventRequestModel, 'create').mockImplementationOnce((async () => {
      // The other tap's row lands between this one's read and its write.
      await EventRequestModel.collection.insertOne({
        _id: competitor,
        target_type: 'VENUE',
        target_id: new Types.ObjectId(venueId),
        requester_id: new Types.ObjectId(memberId),
        status: 'OPEN',
        created_at: new Date(),
      });
      throw Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
    }) as never);

    const state = await askVenue();

    expect(state.request_id).toBe(competitor.toHexString());
    expect(await EventRequestModel.countDocuments({})).toBe(1);
    expect(createNotification).not.toHaveBeenCalled();
    create.mockRestore();
  });

  it('passes on a write failure that is not the race', async () => {
    const create = jest.spyOn(EventRequestModel, 'create').mockRejectedValueOnce(new Error('disk full') as never);
    await expect(askVenue()).rejects.toThrow('disk full');
    create.mockRestore();
  });

  it('still records the ask when the note to the owner cannot be sent', async () => {
    createNotification.mockRejectedValueOnce(new Error('push down'));
    const warn = jest.spyOn(logs.server, 'warn');
    const state = await askVenue();
    expect(state.requested).toBe(true);
    expect(await EventRequestModel.countDocuments({ status: 'OPEN' })).toBe(1);
    expect(warn).toHaveBeenCalledWith('event-request', 'tellOwner', expect.objectContaining({ target_type: 'VENUE' }));
    warn.mockRestore();
  });

  it('names a requester without a profile "A member"', async () => {
    const ghost = new Types.ObjectId().toHexString();
    const state = await askVenue(ghost);
    expect((await EventRequestModel.findById(state.request_id).lean())?.requester_name).toBe('A member');
  });

  it('accepts a note of exactly the limit and refuses one character more', async () => {
    await expect(askVenue(memberId, 'x'.repeat(EVENT_REQUEST_NOTE_MAX))).resolves.toMatchObject({ requested: true });
    const other = await makeUser('Kiran');
    expect(await refusal(() => askVenue(other, 'x'.repeat(EVENT_REQUEST_NOTE_MAX + 1)))).toEqual({
      code: 'BAD_USER_INPUT',
      message: 'Note is too long',
    });
  });

  it('refuses asking yourself — as the venue owner or as the host', async () => {
    expect(await refusal(() => askVenue(ownerId))).toMatchObject({ code: 'BAD_USER_INPUT' });
    expect(
      await refusal(() => eventRequestService.request(hostId, { target_type: 'HOST', target_id: hostId }))
    ).toMatchObject({ code: 'BAD_USER_INPUT', message: 'You cannot request an event from yourself' });
    expect(await EventRequestModel.countDocuments({})).toBe(0);
  });

  it('refuses a target that is not there, a bad kind, and a bad id', async () => {
    const draft = await makeVenue(ownerId, { status: 'DRAFT' });
    expect(await refusal(() => askVenue(memberId, null, draft))).toMatchObject({ code: 'NOT_FOUND' });
    expect(
      await refusal(() => eventRequestService.request(memberId, { target_type: 'HOST', target_id: memberId }))
    ).toMatchObject({ code: 'NOT_FOUND' });
    expect(
      await refusal(() => eventRequestService.request(memberId, { target_type: 'POD', target_id: venueId }))
    ).toMatchObject({ code: 'BAD_USER_INPUT' });
    expect(await refusal(() => askVenue(memberId, null, 'not-an-id'))).toMatchObject({ code: 'BAD_USER_INPUT' });
  });

  it('tells the owner on their own page that there is nothing to ask', async () => {
    expect(await eventRequestService.myState(ownerId, 'VENUE', venueId)).toEqual({
      is_owner: true,
      requested: false,
      request_id: null,
      requested_at: null,
    });
  });
});

describe('closing a request', () => {
  const editor = (roles: string[]) => ({ id: new Types.ObjectId().toHexString(), email: null, roles, assigned_city: null, assigned_zones: [] });
  const asUser = (id: string) => ({ ...editor([]), id });

  it("lets the venue's owner dismiss it, stamps who and when, and treats a repeat as a no-op", async () => {
    const { request_id } = await askVenue();
    const id = String(request_id);

    const closed = await eventRequestService.updateStatus(asUser(ownerId), id, 'DISMISSED');
    expect(closed).toMatchObject({ id, status: 'DISMISSED', fulfilled_pod_id: null });
    expect(closed.closed_at).toEqual(expect.any(String));
    const stored = await EventRequestModel.findById(id).lean();
    expect(String(stored?.closed_by_id)).toBe(ownerId);

    const again = await eventRequestService.updateStatus(asUser(ownerId), id, 'DISMISSED');
    expect(again.closed_at).toBe(closed.closed_at);
  });

  it('refuses to move a closed request to another closed status', async () => {
    const { request_id } = await askVenue();
    await eventRequestService.updateStatus(asUser(ownerId), String(request_id), 'DISMISSED');
    expect(await refusal(() => eventRequestService.updateStatus(asUser(ownerId), String(request_id), 'FULFILLED'))).toEqual({
      code: 'CONFLICT',
      message: 'This request is already closed',
    });
  });

  it('lets the member ask again once their request is closed', async () => {
    const first = await askVenue();
    await eventRequestService.updateStatus(asUser(ownerId), String(first.request_id), 'FULFILLED');
    const second = await askVenue();
    expect(second.request_id).not.toBe(first.request_id);
    expect(createNotification).toHaveBeenCalledTimes(2);
  });

  it("refuses a stranger and the console of the other kind, and lets the venue console's editor close it", async () => {
    const { request_id } = await askVenue();
    const id = String(request_id);
    expect(await refusal(() => eventRequestService.updateStatus(asUser(memberId), id, 'DISMISSED'))).toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(
      await refusal(() => eventRequestService.updateStatus(editor(['ALL_HOSTS_ACCESS']), id, 'DISMISSED'))
    ).toMatchObject({ code: 'FORBIDDEN' });
    await expect(eventRequestService.updateStatus(editor(['ALL_VENUES_ACCESS']), id, 'FULFILLED')).resolves.toMatchObject({
      status: 'FULFILLED',
    });
  });

  it('lets a host close what was asked of them', async () => {
    const { request_id } = await eventRequestService.request(memberId, { target_type: 'HOST', target_id: hostId });
    await expect(eventRequestService.updateStatus(asUser(hostId), String(request_id), 'DISMISSED')).resolves.toMatchObject({
      status: 'DISMISSED',
    });
  });

  it('refuses a status other than the two closes, a bad id and a missing request', async () => {
    const { request_id } = await askVenue();
    for (const status of ['OPEN', 'DONE']) {
      expect(await refusal(() => eventRequestService.updateStatus(asUser(ownerId), String(request_id), status))).toMatchObject({
        code: 'BAD_USER_INPUT',
      });
    }
    expect(await refusal(() => eventRequestService.updateStatus(asUser(ownerId), 'nope', 'DISMISSED'))).toMatchObject({
      code: 'BAD_USER_INPUT',
    });
    expect(
      await refusal(() => eventRequestService.updateStatus(asUser(ownerId), new Types.ObjectId().toHexString(), 'DISMISSED'))
    ).toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe("the owner's and the consoles' lists", () => {
  async function seedMixed() {
    const otherOwner = await makeUser('Dev');
    const otherVenue = await makeVenue(otherOwner, { venue_name: 'Elsewhere' });
    const kiran = await makeUser('Kiran');
    const open = await askVenue(memberId);
    const closed = await askVenue(kiran);
    await eventRequestService.updateStatus(
      { id: ownerId, email: null, roles: [], assigned_city: null, assigned_zones: [] },
      String(closed.request_id),
      'DISMISSED'
    );
    await askVenue(memberId, null, otherVenue);
    await eventRequestService.request(memberId, { target_type: 'HOST', target_id: hostId });
    return { open, otherVenue };
  }

  it("shows a partner only the requests to the venues they own, with counts by status", async () => {
    const { open } = await seedMixed();
    const table = await eventRequestService.ownerTable(ownerId, 'VENUE', { page: 1, page_size: 10 });
    expect(table.total).toBe(2);
    expect(table.rows.every((row) => row.target_id === venueId)).toBe(true);
    expect(table.rows.map((row) => row.id)).toContain(open.request_id);
    expect(await eventRequestService.ownerCounts(ownerId, 'VENUE')).toEqual({ open: 1, fulfilled: 0, dismissed: 1, total: 2 });
    expect(await eventRequestService.ownerCounts(hostId, 'HOST')).toEqual({ open: 1, fulfilled: 0, dismissed: 0, total: 1 });
    expect(await eventRequestService.ownerCounts(memberId, 'VENUE')).toEqual({ open: 0, fulfilled: 0, dismissed: 0, total: 0 });
  });

  it('shows the venues console every venue request, filterable by status, and none of the host ones', async () => {
    await seedMixed();
    expect(await eventRequestService.consoleCounts('VENUE')).toEqual({ open: 2, fulfilled: 0, dismissed: 1, total: 3 });
    const openOnly = await eventRequestService.consoleTable('VENUE', {
      filters: [{ field: 'status', op: 'eq', value: 'OPEN' }],
    });
    expect(openOnly.rows).toHaveLength(2);
    expect(openOnly.rows.every((row) => row.status === 'OPEN' && row.target_type === 'VENUE')).toBe(true);
    const searched = await eventRequestService.consoleTable('VENUE', { search: 'Elsewhere' });
    expect(searched.rows.map((row) => row.target_name)).toEqual(['Elsewhere']);
    expect((await eventRequestService.consoleTable('HOST')).total).toBe(1);
  });
});

describe('eventRequest resolvers', () => {
  it('asks a signed-in caller to sign in first, everywhere a member acts', async () => {
    const guest = makeContext(null);
    expect(() => Query.myEventRequestState(null, { target_type: 'VENUE', target_id: venueId }, guest)).toThrow(
      'Not authenticated'
    );
    expect(() => Mutation.requestEvent(null, { input: { target_type: 'VENUE', target_id: venueId } }, guest)).toThrow(
      'Not authenticated'
    );
    expect(() => Query.myReceivedEventRequestsTable(null, { target_type: 'VENUE' }, guest)).toThrow('Not authenticated');
    expect(() => Query.myReceivedEventRequestCounts(null, { target_type: 'VENUE' }, guest)).toThrow('Not authenticated');
    expect(() => Mutation.updateEventRequestStatus(null, { id: venueId, status: 'DISMISSED' }, guest)).toThrow(
      'Not authenticated'
    );
  });

  it('runs a member through ask, then the owner through their list and the close', async () => {
    const asked = await Mutation.requestEvent(
      null,
      { input: { target_type: 'VENUE', target_id: venueId } },
      makeContext({ id: memberId })
    );
    expect(await Query.myEventRequestState(null, { target_type: 'VENUE', target_id: venueId }, makeContext({ id: memberId }))).toEqual(
      asked
    );
    const owner = makeContext({ id: ownerId });
    expect((await Query.myReceivedEventRequestsTable(null, { target_type: 'VENUE' }, owner)).total).toBe(1);
    expect((await Query.myReceivedEventRequestCounts(null, { target_type: 'VENUE' }, owner)).open).toBe(1);
    await expect(
      Mutation.updateEventRequestStatus(null, { id: String(asked.request_id), status: 'DISMISSED' }, owner)
    ).resolves.toMatchObject({ status: 'DISMISSED' });
  });

  it("opens each console's list only to that console's readers", async () => {
    await askVenue();
    const member = makeContext({ id: memberId, roles: ['USER'] });
    const venuesDesk = makeContext({ roles: ['ALL_VENUES_ACCESS'] });
    const hostsDesk = makeContext({ roles: ['ALL_HOSTS_ACCESS'] });

    expect(() => Query.eventRequestsTable(null, { target_type: 'VENUE' }, member)).toThrow('Access Denied');
    expect(() => Query.eventRequestCounts(null, { target_type: 'VENUE' }, hostsDesk)).toThrow('Access Denied');
    expect(() => Query.eventRequestsTable(null, { target_type: 'HOST' }, venuesDesk)).toThrow('Access Denied');

    expect((await Query.eventRequestsTable(null, { target_type: 'VENUE' }, venuesDesk)).total).toBe(1);
    expect(await Query.eventRequestCounts(null, { target_type: 'HOST' }, hostsDesk)).toEqual({
      open: 0,
      fulfilled: 0,
      dismissed: 0,
      total: 0,
    });
    expect((await Query.eventRequestsTable(null, { target_type: 'VENUE' }, makeContext({ roles: ['SUPER_ADMIN'] }))).total).toBe(1);
  });
});
