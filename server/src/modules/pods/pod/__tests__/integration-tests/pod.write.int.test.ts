/**
 * The pod write paths the broader pod suite does not reach: the host guard on
 * the creation funnel, a virtual pod answering its hosts' event requests at
 * birth, the capacity range each kind of viewer may resize within (and the
 * writes it guards), the host's own edit and its attendee emails, and status
 * media.
 */
import { Types } from 'mongoose';
import { podService } from '../../pod.service';
import { PodModel } from '../../pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { EventRequestModel } from '@modules/venues/eventRequest/eventRequest.model';
import * as fulfil from '@modules/venues/eventRequest/eventRequest.fulfil';
import { notificationService } from '@modules/engagement/notification/notification.service';
import * as emailService from '@services/email/email.service';
import { logs } from '@observability/log';

const IMG = { url: 'https://cdn.example.com/pod.jpg', type: 'IMAGE' };
const DAY_MS = 86_400_000;

const virtualInput = (hostId: Types.ObjectId, over: Record<string, unknown> = {}) => ({
  pod_title: `Virtual pod ${new Types.ObjectId().toString()}`,
  club_id: String(new Types.ObjectId()),
  pod_hosts_id: [String(hostId)],
  pod_mode: 'VIRTUAL',
  meeting_url: 'https://meet.example.com/x',
  pod_description: 'desc',
  pod_type: 'FREE',
  pod_date_time: new Date(Date.now() + DAY_MS).toISOString(),
  pod_end_date_time: new Date(Date.now() + DAY_MS + 7_200_000).toISOString(),
  pod_images_and_videos: [IMG],
  ...over,
});

const seedPod = (over: Record<string, unknown> = {}) =>
  PodModel.create({
    pod_id: `pw-${new Types.ObjectId().toString()}`,
    pod_title: 'Board games',
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_type: 'FREE',
    pod_date_time: new Date(Date.now() + DAY_MS),
    pod_images_and_videos: [IMG],
    is_active: true,
    ...over,
  });

const seedUser = (first: string, last: string) =>
  UserModel.create({
    auth: { email: `${first.toLowerCase()}-${new Types.ObjectId().toString()}@x.com` },
    profile: { first_name: first, last_name: last },
  } as never);

/** The thrown error's GraphQL code — the contract a client branches on. */
const codeOf = async (run: Promise<unknown>) => {
  try {
    await run;
    return 'OK';
  } catch (err) {
    return (err as { extensions?: { code?: string } }).extensions?.code ?? 'THROWN';
  }
};

/** Polls until `check` passes — the event-request fan-out is queued, not awaited. */
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

afterEach(() => {
  jest.restoreAllMocks();
});

describe('create — the one funnel every pod is born through', () => {
  it('refuses a pod with no host before writing anything', async () => {
    const run = podService.create(virtualInput(new Types.ObjectId(), { pod_hosts_id: [] }));
    await expect(run).rejects.toMatchObject({
      message: 'At least one host is required',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(await PodModel.countDocuments({})).toBe(0);
  });

  it("answers the hosts' open event requests when a virtual pod goes live at birth", async () => {
    const createNote = jest.spyOn(notificationService, 'create').mockResolvedValue({} as never);
    const answer = jest.spyOn(fulfil, 'fulfilEventRequestsForPod');
    const host = await seedUser('Meera', 'Rao');
    const asker = new Types.ObjectId();
    const request = await EventRequestModel.create({ target_type: 'HOST', target_id: host._id, requester_id: asker });

    const created = await podService.create(virtualInput(host._id as Types.ObjectId, { pod_title: 'Online chess' }));

    expect(answer).toHaveBeenCalledTimes(1);
    const [handed] = answer.mock.calls[0];
    expect(String(handed._id)).toBe(created!.id);
    expect(handed.pod_title).toBe('Online chess');
    await eventually(async () => {
      const stored = await EventRequestModel.findById(request._id).lean();
      expect(stored?.status).toBe('FULFILLED');
      expect(String(stored?.fulfilled_pod_id)).toBe(created!.id);
    });
    await eventually(() =>
      expect(createNote).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "You asked Meera Rao for an event — it's live",
          scope: 'USER',
          target_user_ids: [String(asker)],
        })
      )
    );
  });

  it('leaves the requests open for a virtual pod created offline', async () => {
    const answer = jest.spyOn(fulfil, 'fulfilEventRequestsForPod');
    const host = new Types.ObjectId();
    const request = await EventRequestModel.create({
      target_type: 'HOST',
      target_id: host,
      requester_id: new Types.ObjectId(),
    });

    const created = await podService.create(virtualInput(host, { is_active: false }));

    expect(created?.is_active).toBe(false);
    expect(answer).not.toHaveBeenCalled();
    expect((await EventRequestModel.findById(request._id).lean())?.status).toBe('OPEN');
  });
});

describe('spotLimits — the range each viewer may resize a pod within', () => {
  const hostId = new Types.ObjectId();
  // Three people in the pod plus one extra seat a booking bought: four taken.
  const capacityPod = (over: Record<string, unknown> = {}) =>
    seedPod({
      pod_hosts_id: [hostId],
      pod_attendees: [hostId, new Types.ObjectId(), new Types.ObjectId()],
      extra_seats: 1,
      no_of_spots: 6,
      ...over,
    });
  const viewer = (id: unknown, isAdmin = false) => ({ id: String(id), roles: ['USER'], isAdmin });

  it('refuses an id that is not a pod id, and a pod that does not exist', async () => {
    await expect(podService.spotLimits('nope', viewer(hostId))).rejects.toMatchObject({
      message: 'Invalid pod id',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(await codeOf(podService.spotLimits(String(new Types.ObjectId()), viewer(hostId)))).toBe('NOT_FOUND');
  });

  it('lets a host only grow the pod — even a host who is also an admin', async () => {
    const pod = await capacityPod();
    const expected = {
      current: 6,
      min: 6,
      max: 10000,
      seats_taken: 4,
      venue_capacity: 0,
      min_pax: 0,
      slidable: false,
      can_decrease: false,
    };
    expect(await podService.spotLimits(String(pod._id), viewer(hostId))).toEqual(expected);
    expect(await podService.spotLimits(String(pod._id), viewer(hostId, true))).toEqual(expected);
  });

  it('lets an admin shrink it down to the seats already sold', async () => {
    const pod = await capacityPod();
    const limits = await podService.spotLimits(String(pod._id), viewer(new Types.ObjectId(), true));
    expect(limits).toMatchObject({ current: 6, min: 4, can_decrease: true });
  });

  it("lets the club's admin shrink it, and refuses anybody else", async () => {
    const clubAdmin = new Types.ObjectId();
    const club = await ClubModel.create({
      club_id: `club-${new Types.ObjectId().toString()}`,
      club_name: 'Capacity Club',
      admin_user_ids: [clubAdmin],
    });
    const pod = await capacityPod({ club_id: club._id });

    const limits = await podService.spotLimits(String(pod._id), viewer(clubAdmin));
    expect(limits).toMatchObject({ min: 4, can_decrease: true });
    expect(await codeOf(podService.spotLimits(String(pod._id), viewer(new Types.ObjectId())))).toBe('FORBIDDEN');
  });
});

describe('update — a portal resize is guarded by the same range', () => {
  it('refuses fewer spots than the seats already booked, and accepts shrinking down to them', async () => {
    const host = new Types.ObjectId();
    const created = await podService.create(virtualInput(host, { no_of_spots: 5 }));
    const id = created!.id;
    await PodModel.updateOne(
      { _id: id },
      { $set: { pod_attendees: [host, new Types.ObjectId(), new Types.ObjectId()] } }
    );

    await expect(podService.update(id, { no_of_spots: 2 })).rejects.toMatchObject({
      message: '3 seats are already booked — the pod cannot hold fewer than that',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect((await PodModel.findById(id).lean())?.no_of_spots).toBe(5);

    await podService.update(id, { no_of_spots: 3 });
    expect((await PodModel.findById(id).lean())?.no_of_spots).toBe(3);
  });
});

describe('hostUpdate — the host edits a live pod', () => {
  const edit = (over: Record<string, unknown> = {}) => ({
    pod_title: 'Board games night',
    pod_description: 'Bring a friend',
    pod_images_and_videos: [IMG],
    ...over,
  });

  it('refuses a title under three characters and an empty description', async () => {
    const host = new Types.ObjectId();
    const pod = await seedPod({ pod_hosts_id: [host] });

    await expect(podService.hostUpdate(String(pod._id), String(host), edit({ pod_title: '  ab ' }))).rejects.toMatchObject({
      message: 'Title is too short',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    await expect(
      podService.hostUpdate(String(pod._id), String(host), edit({ pod_description: '   ' }))
    ).rejects.toMatchObject({ message: 'Description is required', extensions: { code: 'BAD_USER_INPUT' } });
    expect((await PodModel.findById(pod._id).lean())?.pod_title).toBe('Board games');
  });

  it('grows the pod but never shrinks it', async () => {
    const host = new Types.ObjectId();
    const pod = await seedPod({ pod_hosts_id: [host], pod_attendees: [host], no_of_spots: 4 });

    await expect(
      podService.hostUpdate(String(pod._id), String(host), edit({ no_of_spots: 3 }))
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect((await PodModel.findById(pod._id).lean())?.no_of_spots).toBe(4);

    await podService.hostUpdate(String(pod._id), String(host), edit({ no_of_spots: 6 }));
    expect((await PodModel.findById(pod._id).lean())?.no_of_spots).toBe(6);
  });

  it('emails every attendee but the host that the pod changed', async () => {
    const sent = jest.spyOn(emailService, 'sendPodUpdatedEmail').mockResolvedValue(undefined as never);
    const host = await seedUser('Hari', 'Host');
    const asha = await seedUser('Asha', 'Rao');
    const kiran = await seedUser('Kiran', 'Das');
    const pod = await seedPod({ pod_hosts_id: [host._id], pod_attendees: [host._id, asha._id, kiran._id] });

    await podService.hostUpdate(String(pod._id), String(host._id), edit());

    expect(sent).toHaveBeenCalledTimes(2);
    const recipients = sent.mock.calls.map(([opts]) => (opts as { to: string }).to).sort((a, b) => a.localeCompare(b));
    expect(recipients).toEqual(
      [String(asha.get('auth.email')), String(kiran.get('auth.email'))].sort((a, b) => a.localeCompare(b))
    );
    expect(sent).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Asha Rao', pod_title: 'Board games night', when: expect.any(String) })
    );
  });

  it('keeps the edit and logs when the attendee emails cannot be prepared', async () => {
    const sent = jest.spyOn(emailService, 'sendPodUpdatedEmail').mockResolvedValue(undefined as never);
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    jest.spyOn(UserModel, 'find').mockImplementationOnce(() => {
      throw new Error('db down');
    });
    const host = new Types.ObjectId();
    const pod = await seedPod({ pod_hosts_id: [host], pod_attendees: [host, new Types.ObjectId()] });

    const updated = await podService.hostUpdate(String(pod._id), String(host), edit());

    expect(updated?.pod_title).toBe('Board games night');
    expect((await PodModel.findById(pod._id).lean())?.pod_description).toBe('Bring a friend');
    expect(sent).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      'pod',
      'update',
      expect.objectContaining({ msg: 'update emails failed', error: expect.any(Error) })
    );
  });
});

describe('addStatus — status media on a pod', () => {
  const host = new Types.ObjectId();
  const video = { url: '  https://cdn.example.com/status.mp4  ', type: 'VIDEO' };

  it('refuses an id that is not a pod id, and a pod that does not exist', async () => {
    expect(await codeOf(podService.addStatus('nope', String(host), video))).toBe('BAD_USER_INPUT');
    expect(await codeOf(podService.addStatus(String(new Types.ObjectId()), String(host), video))).toBe('NOT_FOUND');
  });

  it('refuses anybody who is neither a host nor an admin', async () => {
    const pod = await seedPod({ pod_hosts_id: [host] });

    await expect(podService.addStatus(String(pod._id), String(new Types.ObjectId()), video)).rejects.toMatchObject({
      message: 'Only pod hosts can add status media',
      extensions: { code: 'FORBIDDEN' },
    });
    expect((await PodModel.findById(pod._id).lean())?.pod_images_and_videos).toHaveLength(1);
  });

  it("appends a host's uploaded media, trimmed and typed", async () => {
    const pod = await seedPod({ pod_hosts_id: [host] });

    const updated = await podService.addStatus(String(pod._id), String(host), video);

    expect(updated?.pod_images_and_videos).toHaveLength(2);
    const stored = (await PodModel.findById(pod._id).lean())?.pod_images_and_videos ?? [];
    expect(stored[1]).toMatchObject({ url: 'https://cdn.example.com/status.mp4', type: 'VIDEO' });
  });

  it('lets an admin add media to a pod they do not host', async () => {
    const pod = await seedPod({ pod_hosts_id: [host] });

    await podService.addStatus(String(pod._id), String(new Types.ObjectId()), { url: 'https://cdn.example.com/s.jpg' }, true);

    const stored = (await PodModel.findById(pod._id).lean())?.pod_images_and_videos ?? [];
    expect(stored[1]).toMatchObject({ url: 'https://cdn.example.com/s.jpg', type: 'IMAGE' });
  });

  it('refuses media that was never uploaded', async () => {
    const pod = await seedPod({ pod_hosts_id: [host] });

    await expect(podService.addStatus(String(pod._id), String(host), { url: 'blob:local-file' })).rejects.toThrow(
      'Status media must be uploaded before saving'
    );
    expect((await PodModel.findById(pod._id).lean())?.pod_images_and_videos).toHaveLength(1);
  });
});
