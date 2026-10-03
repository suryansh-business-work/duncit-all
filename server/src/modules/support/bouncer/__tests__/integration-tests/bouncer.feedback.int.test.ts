/**
 * Rating a pod, against the real models. The attendance service (who the host
 * marked present), the coin reward, the host notification and the socket
 * server are faked; the aspect rules and the summary are real. What is under
 * test is the attendance gate on every door, one opinion per guest per pod
 * (re-rating edits it, and only the first rating pings the host), the derived
 * category, the reward never costing the rating, the feedback form and the
 * pod's summary, and the "rate your last pod" prompt with its snooze.
 */
import { Types } from 'mongoose';

jest.mock('@observability/log', () => ({
  logs: { server: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
}));
jest.mock('@realtime/io', () => ({ getIo: jest.fn() }));
jest.mock('@modules/engagement/notification/notification.service', () => ({
  notificationService: { create: jest.fn() },
}));
jest.mock('@modules/finance/coin/coin.service', () => ({ coinService: { creditForPodFeedback: jest.fn() } }));
jest.mock('@modules/pods/ticket/attendance.service', () => ({
  hasMarkedAttendance: jest.fn(),
  markedPodIdsFor: jest.fn(),
}));

import { logs } from '@observability/log';
import { getIo } from '@realtime/io';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { coinService } from '@modules/finance/coin/coin.service';
import { hasMarkedAttendance, markedPodIdsFor } from '@modules/pods/ticket/attendance.service';
import { UserModel } from '@modules/access/user/user.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { BouncerFeedbackModel, PodFeedbackReminderModel } from '../../bouncer.model';
import { bouncerService } from '../../bouncer.service';

const io = getIo as jest.Mock;
const notify = notificationService.create as jest.Mock;
const coins = coinService.creditForPodFeedback as jest.Mock;
const attended = hasMarkedAttendance as jest.Mock;
const markedPods = markedPodIdsFor as jest.Mock;
const logError = logs.server.error as jest.Mock;

const fails = (code: string, message: string) =>
  expect.objectContaining({ message, extensions: expect.objectContaining({ code }) });

const HOUR = 60 * 60 * 1000;
let emitted: Array<{ room: string; event: string }>;

const flush = async () => {
  for (let i = 0; i < 5; i += 1) await new Promise((r) => setImmediate(r));
};

async function seedPod(over: Record<string, unknown> = {}) {
  const _id = new Types.ObjectId();
  await PodModel.collection.insertOne({
    _id,
    pod_id: `pod-${_id}`,
    pod_title: 'Sunday Run',
    pod_mode: 'PHYSICAL',
    pod_date_time: new Date(Date.now() - 5 * HOUR),
    pod_hosts_id: [],
    ...over,
  } as never);
  return _id;
}

async function seedHost() {
  const _id = new Types.ObjectId();
  await UserModel.collection.insertOne({
    _id,
    profile: { first_name: 'Hari', last_name: 'Host' },
    auth: { email: `host-${_id}@example.test` },
  } as never);
  return _id;
}

beforeEach(() => {
  emitted = [];
  io.mockReturnValue({
    to: (room: string) => ({ emit: (event: string) => emitted.push({ room, event }) }),
  });
  notify.mockResolvedValue(undefined);
  coins.mockResolvedValue(undefined);
  attended.mockResolvedValue(true);
  markedPods.mockResolvedValue([]);
});

describe('bouncerService.submitFeedback', () => {
  it('refuses someone the host did not mark present, writing nothing', async () => {
    const pod = await seedPod();
    const user = String(new Types.ObjectId());
    attended.mockResolvedValue(false);

    await expect(bouncerService.submitFeedback(user, { pod_id: String(pod), rating: 4 })).rejects.toEqual(
      fails('FORBIDDEN', 'Only an attendee the host has marked present can rate this pod')
    );
    expect(attended).toHaveBeenCalledWith(String(pod), user);
    expect(await BouncerFeedbackModel.countDocuments()).toBe(0);
  });

  it('refuses a malformed or unknown pod', async () => {
    const user = String(new Types.ObjectId());
    await expect(bouncerService.submitFeedback(user, { pod_id: 'nope', rating: 3 })).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Invalid pod_id')
    );
    await expect(
      bouncerService.submitFeedback(user, { pod_id: String(new Types.ObjectId()), rating: 3 })
    ).rejects.toEqual(fails('NOT_FOUND', 'Pod not found'));
  });

  it('stores only the aspects this pod has, derives the category, rewards and pings the host once', async () => {
    const host = await seedHost();
    const venue = new Types.ObjectId();
    await VenueModel.collection.insertOne({ _id: venue, venue_name: 'Park Gate' } as never);
    const pod = await seedPod({ pod_hosts_id: [host], venue_id: venue });
    const user = String(new Types.ObjectId());

    const pub = await bouncerService.submitFeedback(user, {
      pod_id: String(pod),
      rating: 4,
      message: '  Host was late  ',
      ratings: [
        { aspect: 'OVERALL', rating: 4 },
        { aspect: 'HOST', rating: 2 },
        { aspect: 'VENUE', rating: 5 },
        { aspect: 'CLUB_ADMIN', rating: 1 },
        { aspect: 'HOST', rating: 5 },
        { aspect: 'FOOD', rating: 9 },
      ],
    });
    await flush();

    const stored = await BouncerFeedbackModel.findById(pub.id).lean();
    expect(stored).toMatchObject({
      user_id: new Types.ObjectId(user),
      pod_id: pod,
      host_id: host,
      rating: 4,
      // CLUB_ADMIN is not an aspect of a pod with no club; the duplicate and the
      // out-of-range score are dropped; OVERALL lives on `rating`.
      ratings: [
        { aspect: 'HOST', rating: 2 },
        { aspect: 'VENUE', rating: 5 },
      ],
      category: 'HOST',
      message: 'Host was late',
    });
    expect(pub).toMatchObject({
      user: { id: user, name: 'User', phone: null, avatar_url: null },
      host: { id: String(host), name: 'Hari Host' },
      pod: { id: String(pod), venue_name: 'Park Gate', feedback_aspects: ['OVERALL', 'HOST', 'VENUE', 'SAFETY', 'FOOD', 'OTHER'] },
      rating: 4,
      ratings: [
        { aspect: 'HOST', rating: 2 },
        { aspect: 'VENUE', rating: 5 },
      ],
      category: 'HOST',
      message: 'Host was late',
    });
    expect(coins).toHaveBeenCalledWith({ userId: user, feedbackId: pub.id, reason: 'Feedback on "Sunday Run"' });
    expect(emitted).toEqual([
      { room: 'admin:bouncers', event: 'bouncer:feedback_new' },
      { room: `host:${host}`, event: 'bouncer:feedback_new' },
    ]);
    expect(notify).toHaveBeenCalledWith({
      title: 'New 4★ feedback on "Sunday Run"',
      body: 'HOST: Host was late',
      scope: 'USER',
      target_user_ids: [String(host)],
      link_url: `/bouncers?feedback=${pub.id}`,
    });

    // Re-rating rewrites the same row and does not ping the host again.
    notify.mockClear();
    const again = await bouncerService.submitFeedback(user, {
      pod_id: String(pod),
      rating: 5,
      category: 'VENUE',
      ratings: [{ aspect: 'VENUE', rating: 5 }],
    });
    await flush();

    expect(again.id).toBe(pub.id);
    expect(await BouncerFeedbackModel.countDocuments()).toBe(1);
    expect(again).toMatchObject({ rating: 5, category: 'VENUE', message: '' });
    expect(notify).not.toHaveBeenCalled();
    expect(coins).toHaveBeenCalledTimes(2);
  });

  it('labels a message-less first rating by its category, and an all-good rating as OTHER', async () => {
    const host = await seedHost();
    const pod = await seedPod({ pod_hosts_id: [host] });

    await bouncerService.submitFeedback(String(new Types.ObjectId()), { pod_id: String(pod), rating: 5 });
    await flush();

    expect(notify.mock.calls[0][0].body).toBe('Category: OTHER');
  });

  it('keeps the rating when the coin reward fails, and logs the failure', async () => {
    const pod = await seedPod();
    const boom = new Error('ledger locked');
    coins.mockRejectedValue(boom);

    const pub = await bouncerService.submitFeedback(String(new Types.ObjectId()), { pod_id: String(pod), rating: 3 });

    expect(await BouncerFeedbackModel.countDocuments()).toBe(1);
    expect(logError).toHaveBeenCalledWith('bouncer', 'submitFeedback', {
      error: boom,
      msg: 'Pod feedback coin reward failed',
      feedbackId: pub.id,
    });
    // No host on the pod: nobody to ping, only the admin room hears about it.
    expect(notify).not.toHaveBeenCalled();
    expect(emitted.map((e) => e.room)).toEqual(['admin:bouncers']);
  });
});

describe('bouncerService.getPodFeedbackForm', () => {
  it('refuses a malformed or unknown pod', async () => {
    const user = String(new Types.ObjectId());
    await expect(bouncerService.getPodFeedbackForm(user, 'nope')).rejects.toEqual(fails('BAD_USER_INPUT', 'Invalid pod_id'));
    await expect(bouncerService.getPodFeedbackForm(user, String(new Types.ObjectId()))).rejects.toEqual(
      fails('NOT_FOUND', 'Pod not found')
    );
  });

  it('tells a non-attendee they cannot rate, without reading any rating', async () => {
    const pod = await seedPod({ pod_mode: 'VIRTUAL' });
    attended.mockResolvedValue(false);

    const form = await bouncerService.getPodFeedbackForm(String(new Types.ObjectId()), String(pod));

    expect(form).toMatchObject({ can_rate: false, mine: null, pod: { id: String(pod), feedback_aspects: ['OVERALL', 'HOST', 'SAFETY', 'OTHER'] } });
  });

  it('opens filled in with the guest’s own earlier rating', async () => {
    const pod = await seedPod();
    const user = new Types.ObjectId();
    await BouncerFeedbackModel.create({
      user_id: user,
      pod_id: pod,
      rating: 4,
      ratings: [{ aspect: 'HOST', rating: 3 }],
      category: 'HOST',
      message: 'Good run',
    });

    const form = await bouncerService.getPodFeedbackForm(String(user), String(pod));

    expect(form.can_rate).toBe(true);
    expect(form.mine).toEqual({
      rating: 4,
      ratings: [{ aspect: 'HOST', rating: 3 }],
      message: 'Good run',
      created_at: expect.any(String),
      updated_at: expect.any(String),
    });
  });

  it('opens empty for an attendee who has not rated yet', async () => {
    const pod = await seedPod();
    const form = await bouncerService.getPodFeedbackForm(String(new Types.ObjectId()), String(pod));
    expect(form).toMatchObject({ can_rate: true, mine: null });
  });
});

describe('feedback reads', () => {
  it('summarises one pod and lists its recent ratings, clamping the limit', async () => {
    const pod = await seedPod();
    await BouncerFeedbackModel.create({ user_id: new Types.ObjectId(), pod_id: pod, rating: 4, ratings: [{ aspect: 'HOST', rating: 2 }] });
    await BouncerFeedbackModel.create({ user_id: new Types.ObjectId(), pod_id: pod, rating: 5, ratings: [{ aspect: 'HOST', rating: 5 }] });
    await BouncerFeedbackModel.create({ user_id: new Types.ObjectId(), pod_id: new Types.ObjectId(), rating: 1 });

    const res = await bouncerService.podFeedback(String(pod), 0);

    expect(res).toMatchObject({
      pod_id: String(pod),
      total: 2,
      overall_average: 4.5,
      aspects: [
        { aspect: 'OVERALL', average: 4.5, count: 2 },
        { aspect: 'HOST', average: 3.5, count: 2 },
      ],
    });
    expect(res.recent).toHaveLength(1);
    expect(res.recent[0].pod.id).toBe(String(pod));
    await expect(bouncerService.podFeedback('nope')).rejects.toEqual(fails('BAD_USER_INPUT', 'Invalid pod_id'));
  });

  it('lists all feedback newest first, drawing a removed pod and a missing user', async () => {
    const gonePod = new Types.ObjectId();
    await BouncerFeedbackModel.create({ user_id: new Types.ObjectId(), pod_id: gonePod, rating: 2, category: 'SAFETY' });

    const [row] = await bouncerService.listFeedback(10);

    expect(row).toMatchObject({
      user: { name: 'User', phone: null },
      host: null,
      pod: { id: String(gonePod), title: '(pod removed)' },
      rating: 2,
      ratings: [],
      category: 'SAFETY',
      message: '',
    });
  });
});

describe('bouncerService.getPendingPodFeedback', () => {
  it('asks about nothing when the guest was marked present nowhere', async () => {
    await expect(bouncerService.getPendingPodFeedback(String(new Types.ObjectId()))).resolves.toBeNull();
  });

  it('skips pods the guest silenced (NEVER, or LATER still inside its window) and asks about the rest', async () => {
    const user = new Types.ObjectId();
    const never = await seedPod({ pod_title: 'Never Pod', pod_date_time: new Date(Date.now() - 2 * HOUR) });
    const snoozed = await seedPod({ pod_title: 'Snoozed Pod', pod_date_time: new Date(Date.now() - 3 * HOUR) });
    const expired = await seedPod({ pod_title: 'Expired Snooze Pod', pod_date_time: new Date(Date.now() - 48 * HOUR) });
    markedPods.mockResolvedValue([never, snoozed, expired]);
    await PodFeedbackReminderModel.collection.insertMany([
      { user_id: user, pod_id: never, choice: 'NEVER', updated_at: new Date(Date.now() - 72 * HOUR) },
      { user_id: user, pod_id: snoozed, choice: 'LATER', updated_at: new Date(Date.now() - HOUR) },
      { user_id: user, pod_id: expired, choice: 'LATER', updated_at: new Date(Date.now() - 25 * HOUR) },
    ] as never);

    const pending = await bouncerService.getPendingPodFeedback(String(user));

    expect(markedPods).toHaveBeenCalledWith(String(user));
    expect(pending).toMatchObject({ id: String(expired), title: 'Expired Snooze Pod' });
  });

  it('does not ask about a pod that has started but not yet ended', async () => {
    const user = new Types.ObjectId();
    const running = await seedPod({
      pod_date_time: new Date(Date.now() - HOUR),
      pod_end_date_time: new Date(Date.now() + HOUR),
    });
    const ended = await seedPod({
      pod_title: 'Ended Pod',
      pod_date_time: new Date(Date.now() - 4 * HOUR),
      pod_end_date_time: new Date(Date.now() - 2 * HOUR),
    });
    markedPods.mockResolvedValue([running, ended]);

    await expect(bouncerService.getPendingPodFeedback(String(user))).resolves.toMatchObject({ id: String(ended) });

    markedPods.mockResolvedValue([running]);
    await expect(bouncerService.getPendingPodFeedback(String(user))).resolves.toBeNull();
  });

  it('asks about nothing once every attended pod is silenced', async () => {
    const user = new Types.ObjectId();
    const pod = await seedPod();
    markedPods.mockResolvedValue([pod]);
    await PodFeedbackReminderModel.create({ user_id: user, pod_id: pod, choice: 'NEVER' });

    await expect(bouncerService.getPendingPodFeedback(String(user))).resolves.toBeNull();
  });
});

describe('bouncerService.remindPodFeedback', () => {
  it('refuses a malformed pod and a pod the guest was not marked present at', async () => {
    const user = String(new Types.ObjectId());
    await expect(bouncerService.remindPodFeedback(user, 'nope', 'LATER')).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Invalid pod_id')
    );
    attended.mockResolvedValue(false);
    await expect(bouncerService.remindPodFeedback(user, String(new Types.ObjectId()), 'LATER')).rejects.toEqual(
      fails('FORBIDDEN', 'Only an attendee the host has marked present can rate this pod')
    );
    expect(await PodFeedbackReminderModel.countDocuments()).toBe(0);
  });

  it('keeps one answer per guest per pod, the latest one winning', async () => {
    const user = new Types.ObjectId();
    const pod = new Types.ObjectId();

    await expect(bouncerService.remindPodFeedback(String(user), String(pod), 'LATER')).resolves.toBe(true);
    await expect(bouncerService.remindPodFeedback(String(user), String(pod), 'NEVER')).resolves.toBe(true);

    const rows = await PodFeedbackReminderModel.find({ user_id: user, pod_id: pod }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].choice).toBe('NEVER');
  });
});
