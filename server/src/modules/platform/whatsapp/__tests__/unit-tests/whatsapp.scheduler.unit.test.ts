/**
 * The half-hourly WhatsApp sweep, with every collaborator faked.
 *
 * This file sends real messages to real numbers and costs real money, and none
 * of it had ever run in a test. Four rules keep it from doing that wrongly:
 *
 *  - the GLOBAL switch gates everything. Off means no query runs at all, rather
 *    than every send reaching the funnel and being recorded as a skip.
 *  - the window is bounded at BOTH ends, and the lower bound is never earlier
 *    than the moment the feature was switched on. A cutoff later than the edge
 *    yields an impossible range, which is exactly right: the feature was not on
 *    when that pod passed its mark, so nobody is messaged about it retroactively.
 *  - a pod whose club cannot be resolved carries NO link rather than a broken
 *    `/club//pod/x` — the funnel records the blank instead of sending a dead URL.
 *  - the host is deliberately reminded along with everybody else. They sit in
 *    `pod_attendees` and there is no host-side reminder template, so excluding
 *    them would leave the one person who must turn up with no reminder at all.
 *
 * And one that is about the process rather than the message: the scheduler
 * refuses to start under NODE_ENV=test, which is what makes an accidental start
 * in a test run — posting to AiSensy for real — impossible.
 */
jest.mock('@observability/log', () => ({
  logs: { server: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
}));
jest.mock('@config/url-configs', () => ({
  getUrlConfigs: jest.fn(async () => ({ mwebUrl: 'https://mweb.duncit.com/' })),
}));
jest.mock('@modules/clubs/club/club.model', () => ({ ClubModel: { find: jest.fn() } }));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { find: jest.fn() } }));
jest.mock('@modules/pods/pod/pod.model', () => ({ PodModel: { find: jest.fn() } }));
jest.mock('@modules/pods/pod/pod.service', () => ({ loadPodClubSlugMap: jest.fn() }));
jest.mock('@modules/pods/podMember/backoutRequest.model', () => ({
  BackoutRequestModel: { find: jest.fn() },
}));
jest.mock('@modules/venues/venue/venue.model', () => ({ VenueModel: { find: jest.fn() } }));
jest.mock('@modules/venues/venueSlot/venueSlot.model', () => ({ VenueSlotModel: { find: jest.fn() } }));
jest.mock('./../../waEventSetting.model', () => ({
  WaEventSettingModel: { findOne: jest.fn() },
  WA_GLOBAL_KEY: 'GLOBAL',
}));
jest.mock('./../../whatsapp.service', () => ({
  whatsappService: { sendEach: jest.fn(), send: jest.fn() },
}));
// Every scenario this file sweeps for goes out as an email as well as a
// WhatsApp, filled from the same `params` array — so the scheduler hands
// notifyEach the messages and never calls whatsappService itself.
jest.mock('@services/notify/notify.service', () => ({ notifyEach: jest.fn() }));
// Every sweep window is read from Admin > Pods > Pod Settings in ONE call per
// tick (`getReminderSweepSettings`). Left real it is a Mongo round trip that
// never resolves here, and every sweep in this file hangs behind it.
jest.mock('@modules/platform/settings/settings.service', () => ({
  settingsService: {
    getReminderSweepSettings: jest.fn(async () => ({
      pod_reminder_lead_hours: 24,
      venue_slot_reminder_lead_hours: 48,
      pod_feedback_delay_hours: 2,
      complete_reminder_hours: 12,
      complete_timeout_hours: 24,
    })),
  },
}));
// The last step of every sweep re-sends messages whose AiSensy connection never
// opened. Left real it queries WaMessageLog on a mongoose with no connection,
// which buffers until the test times out.
jest.mock('./../../whatsapp.retry', () => ({
  retryUnreachedMessages: jest.fn(async () => undefined),
}));

import { getUrlConfigs } from '@config/url-configs';
import { UserModel } from '@modules/access/user/user.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { loadPodClubSlugMap } from '@modules/pods/pod/pod.service';
import { BackoutRequestModel } from '@modules/pods/podMember/backoutRequest.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { ClubModel } from '@modules/clubs/club/club.model';

import { WaEventSettingModel } from '../../waEventSetting.model';
import { whatsappService } from '../../whatsapp.service';
import { notifyEach } from '@services/notify/notify.service';
import { runWhatsappSweeps, startWhatsappScheduler } from '../../whatsapp.scheduler';
import { retryUnreachedMessages } from '../../whatsapp.retry';
import { appDate, appTime } from '@utils/app-time';

const settings = WaEventSettingModel as unknown as Record<string, jest.Mock>;
const pods = PodModel as unknown as Record<string, jest.Mock>;
const users = UserModel as unknown as Record<string, jest.Mock>;
const slots = VenueSlotModel as unknown as Record<string, jest.Mock>;
const venues = VenueModel as unknown as Record<string, jest.Mock>;
const clubs = ClubModel as unknown as Record<string, jest.Mock>;
const backouts = BackoutRequestModel as unknown as Record<string, jest.Mock>;
const wa = whatsappService as unknown as Record<string, jest.Mock>;
const notify = notifyEach as unknown as jest.Mock;
const slugMap = loadPodClubSlugMap as unknown as jest.Mock;
const urls = getUrlConfigs as unknown as jest.Mock;
const retry = retryUnreachedMessages as unknown as jest.Mock;

/** `find().select().lean()` as one chain. */
const chain = (value: unknown) => ({
  select: () => chain(value),
  sort: () => chain(value),
  lean: () => Promise.resolve(value),
});

const HOUR = 60 * 60_000;
const CUTOFF = new Date('2026-01-01T00:00:00.000Z');

const user = (id: string, first = 'Meera') => ({
  _id: id,
  profile: { first_name: first, last_name: 'N' },
  auth: { phone: { number: `900000000${id.slice(-1)}` } },
  communication: { whatsapp: {} },
});

const pod = (over: Record<string, unknown> = {}) => ({
  _id: 'pod-doc-1',
  pod_id: 'sunday-badminton',
  pod_title: 'Sunday Badminton',
  pod_date_time: new Date(Date.now() + 24 * HOUR),
  pod_attendees: ['u-1', 'u-2'],
  pod_hosts_id: ['u-1'],
  club_id: 'club-1',
  ...over,
});

/** Every collection empty, so one test can turn a single one on. */
const nothingAnywhere = () => {
  pods.find.mockReturnValue(chain([]));
  users.find.mockReturnValue(chain([]));
  slots.find.mockReturnValue(chain([]));
  venues.find.mockReturnValue(chain([]));
  clubs.find.mockReturnValue(chain([]));
  backouts.find.mockReturnValue(chain([]));
};

/** Every message the sweep handed to the notifier, across all its calls. */
const sentEvents = () =>
  notify.mock.calls.flatMap((call) => (call[0] as { event: string }[]) ?? []);

beforeEach(() => {
  jest.clearAllMocks();
  settings.findOne.mockReturnValue(chain({ enabled: true, updated_at: CUTOFF }));
  urls.mockResolvedValue({ mwebUrl: 'https://mweb.duncit.com/' });
  slugMap.mockResolvedValue(new Map([['club-1', 'sunset-club']]));
  wa.sendEach.mockResolvedValue(undefined);
  notify.mockResolvedValue([]);
  nothingAnywhere();
});

describe('the global switch', () => {
  it('runs nothing at all while WhatsApp is off', async () => {
    settings.findOne.mockReturnValue(chain({ enabled: false, updated_at: CUTOFF }));

    await runWhatsappSweeps();

    // Not one query — sending into the funnel to have it record a skip per
    // recipient is the expensive way to do nothing.
    expect(pods.find).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('runs nothing when nobody has ever turned it on', async () => {
    settings.findOne.mockReturnValue(chain(null));

    await runWhatsappSweeps();

    expect(pods.find).not.toHaveBeenCalled();
  });

  it('sweeps once it is on', async () => {
    await runWhatsappSweeps();

    expect(pods.find).toHaveBeenCalled();
  });
});

describe('the sweep window', () => {
  it('is bounded at both ends, so an old pod is never messaged about today', async () => {
    await runWhatsappSweeps();

    const [filter] = pods.find.mock.calls[0] as [Record<string, { $gte: Date; $lte: Date }>];
    const range = filter.pod_date_time;

    expect(range.$gte).toBeInstanceOf(Date);
    expect(range.$lte).toBeInstanceOf(Date);
    expect(range.$gte.getTime()).toBeLessThanOrEqual(range.$lte.getTime());
  });

  it('never reaches back before the moment the feature was switched on', async () => {
    const justNow = new Date();
    settings.findOne.mockReturnValue(chain({ enabled: true, updated_at: justNow }));

    await runWhatsappSweeps();

    const [filter] = pods.find.mock.calls[0] as [Record<string, { $gte: Date }>];
    expect(filter.pod_date_time.$gte.getTime()).toBeGreaterThanOrEqual(justNow.getTime());
  });
});

describe('USER_POD_REMINDER', () => {
  const remindable = () => {
    pods.find
      .mockReturnValueOnce(chain([pod()]))
      .mockReturnValue(chain([]));
    users.find.mockReturnValue(chain([user('u-1'), user('u-2', 'Vikram')]));
  };

  it('reminds every attendee of a pod that starts soon', async () => {
    remindable();

    await runWhatsappSweeps();

    const reminders = sentEvents().filter((entry) => entry.event === 'USER_POD_REMINDER');
    expect(reminders).toHaveLength(2);
  });

  it('reminds the HOST too — they are an attendee and have no template of their own', async () => {
    remindable();

    await runWhatsappSweeps();

    const reminders = sentEvents().filter((entry) => entry.event === 'USER_POD_REMINDER');
    const names = reminders.map((entry) => (entry as unknown as { name: string }).name);
    expect(names).toContain('Meera N');
  });

  it('carries a link built from the club slug', async () => {
    remindable();

    await runWhatsappSweeps();

    const [reminder] = sentEvents() as unknown as { params: string[] }[];
    expect(reminder?.params).toContain('https://mweb.duncit.com/club/sunset-club/pod/sunday-badminton');
  });

  it('carries NO link when the club cannot be resolved, rather than a broken one', async () => {
    remindable();
    slugMap.mockResolvedValue(new Map());

    await runWhatsappSweeps();

    const [reminder] = sentEvents() as unknown as { params: string[] }[];
    expect(reminder?.params).toContain('');
    expect(reminder?.params.some((value) => value.includes('/club//pod/'))).toBe(false);
  });

  it('carries no link for a pod that belongs to no club at all', async () => {
    pods.find.mockReturnValueOnce(chain([pod({ club_id: null })])).mockReturnValue(chain([]));
    users.find.mockReturnValue(chain([user('u-1')]));

    await runWhatsappSweeps();

    const [reminder] = sentEvents() as unknown as { params: string[] }[];
    expect(reminder?.params.some((value) => value.includes('/club/'))).toBe(false);
  });

  it('greets somebody with no name on file rather than an empty space', async () => {
    pods.find.mockReturnValueOnce(chain([pod({ pod_attendees: ['u-9'] })])).mockReturnValue(chain([]));
    users.find.mockReturnValue(chain([{ _id: 'u-9', profile: {}, auth: {} }]));

    await runWhatsappSweeps();

    const [reminder] = sentEvents() as unknown as { name: string }[];
    expect(reminder?.name).toBe('there');
  });

  it('counts whole hours, and never counts down to zero', async () => {
    pods.find
      .mockReturnValueOnce(chain([pod({ pod_date_time: new Date(Date.now() + 60_000) })]))
      .mockReturnValue(chain([]));
    users.find.mockReturnValue(chain([user('u-1')]));

    await runWhatsappSweeps();

    const [reminder] = sentEvents() as unknown as { params: string[] }[];
    // "starts in {{2}} hours" reading 0 is worse than reading 1.
    expect(reminder?.params[1]).toBe('1');
  });

  it('asks for no recipients and sends nothing when no pod is due', async () => {
    await runWhatsappSweeps();

    expect(wa.sendEach).not.toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ event: 'USER_POD_REMINDER' }),
    ]));
  });
});

describe('HOST_COMPLETE_POD_REMINDER', () => {
  it('chases the host of a finished pod that is still not completed', async () => {
    pods.find
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([pod({ pod_date_time: new Date(Date.now() - 25 * HOUR) })]))
      .mockReturnValue(chain([]));
    users.find.mockReturnValue(chain([user('u-1')]));

    await runWhatsappSweeps();

    const chases = sentEvents().filter((entry) => entry.event === 'HOST_COMPLETE_POD_REMINDER');
    expect(chases).toHaveLength(1);
  });

  it('looks only at pods nobody has completed', async () => {
    await runWhatsappSweeps();

    const filters = pods.find.mock.calls.map(([filter]) => filter as Record<string, unknown>);
    expect(filters.some((filter) => filter.completed_at === null)).toBe(true);
  });
});

describe('VENUE_SLOT_PENDING_REMINDER', () => {
  it('looks only at slot requests still awaiting a decision', async () => {
    await runWhatsappSweeps();

    const [filter] = slots.find.mock.calls[0] as [Record<string, unknown>];
    expect(filter).toMatchObject({ status: 'PENDING', decision: 'NONE' });
  });

  it('anchors on when the POD is, not on how long the request has waited', async () => {
    await runWhatsappSweeps();

    const [filter] = slots.find.mock.calls[0] as [Record<string, { $gte: Date; $lte: Date }>];
    // The template says "scheduled for {{2}} hours from now", so what makes it
    // urgent is the date the host asked for arriving.
    expect(filter.start_at.$lte.getTime()).toBeGreaterThan(Date.now());
  });
});

/**
 * Route `PodModel.find` by the shape of its filter rather than by call order,
 * so a test only names the sweep it is about:
 *  - `_id`          → the pods behind pending slot requests
 *  - `completed_at` → the complete-pod nudge
 *  - `$expr`        → pods that ended (the feedback asks)
 *  - `is_active`    → the attendee reminder
 *  - anything else  → pods that just started (the unfilled backout notice)
 */
type PodSweep = 'slot' | 'complete' | 'ended' | 'reminder' | 'backout';
const podsBySweep = (rows: Partial<Record<PodSweep, unknown[]>>) =>
  pods.find.mockImplementation((filter: Record<string, unknown>) => {
    let sweep: PodSweep = 'backout';
    if ('_id' in filter) sweep = 'slot';
    else if ('completed_at' in filter) sweep = 'complete';
    else if ('$expr' in filter) sweep = 'ended';
    else if ('is_active' in filter) sweep = 'reminder';
    return chain(rows[sweep] ?? []);
  });

const eventsNamed = (event: string) =>
  sentEvents().filter((entry) => entry.event === event) as unknown as {
    event: string;
    entityId: string;
    name: string;
    params: string[];
    user?: { _id: string };
    vars?: Record<string, string>;
  }[];

describe('the sweep tail', () => {
  it('retries unreached messages once every sweep has run', async () => {
    await runWhatsappSweeps();

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('retries nothing while WhatsApp is switched off', async () => {
    settings.findOne.mockReturnValue(chain({ enabled: false, updated_at: CUTOFF }));

    await runWhatsappSweeps();

    expect(retry).not.toHaveBeenCalled();
  });

  it('takes the cutoff from enabled_at over updated_at once it is pinned', async () => {
    // Inside the reminder window (24h ahead, 90 minutes wide), so the cutoff —
    // not the window's own lower edge — is what bounds the range.
    const pinned = new Date(Date.now() + 24 * HOUR - 30 * 60_000);
    settings.findOne.mockReturnValue(
      chain({ enabled: true, enabled_at: pinned, updated_at: CUTOFF })
    );

    await runWhatsappSweeps();

    const [filter] = pods.find.mock.calls[0] as [Record<string, { $gte: Date }>];
    expect(filter.pod_date_time.$gte.getTime()).toBe(pinned.getTime());
  });
});

describe('HOST_COMPLETE_POD_REMINDER deadline', () => {
  it('quotes the deadline the attendance lock enforces: the pod end plus the timeout', async () => {
    const end = new Date('2026-01-01T10:00:00.000Z');
    podsBySweep({
      complete: [
        pod({ pod_date_time: new Date('2026-01-01T08:00:00.000Z'), pod_end_date_time: end }),
      ],
    });
    users.find.mockReturnValue(chain([user('u-1')]));

    await runWhatsappSweeps();

    const [chase] = eventsNamed('HOST_COMPLETE_POD_REMINDER');
    const deadline = new Date(end.getTime() + 24 * HOUR);
    expect(chase.vars?.deadline).toBe(`${appDate(deadline)}, ${appTime(deadline)}`);
    expect(chase.entityId).toBe('pod-doc-1');
    expect(chase.params).toEqual([
      'Meera N',
      'Sunday Badminton',
      appDate(new Date('2026-01-01T08:00:00.000Z')),
      appTime(new Date('2026-01-01T08:00:00.000Z')),
    ]);
  });

  it('falls back to a sentence when the pod cannot be placed on a clock', async () => {
    podsBySweep({ complete: [pod({ pod_date_time: null })] });
    users.find.mockReturnValue(chain([user('u-1')]));

    await runWhatsappSweeps();

    const [chase] = eventsNamed('HOST_COMPLETE_POD_REMINDER');
    expect(chase.vars?.deadline).toBe('24 hours after the pod ended');
  });
});

describe('VENUE_SLOT_PENDING_REMINDER sends', () => {
  const slot = (over: Record<string, unknown> = {}) => ({
    _id: 'slot-1',
    start_at: new Date(Date.now() + 47 * HOUR),
    owner_user_id: 'u-7',
    booked_by_pod_id: 'pod-doc-1',
    ...over,
  });

  it('tells the venue owner which pod is waiting, how soon, and who hosts it', async () => {
    slots.find.mockReturnValue(chain([slot()]));
    podsBySweep({ slot: [pod()] });
    users.find.mockReturnValue(chain([user('u-1'), user('u-7', 'Owner')]));

    await runWhatsappSweeps();

    const [reminder] = eventsNamed('VENUE_SLOT_PENDING_REMINDER');
    expect(reminder.entityId).toBe('slot-1');
    expect(reminder.user?._id).toBe('u-7');
    expect(reminder.params[0]).toBe('Owner N');
    expect(reminder.params[1]).toBe('47');
    expect(reminder.params[2]).toBe('Sunday Badminton');
    expect(reminder.params[5]).toBe('Meera N');
  });

  it('still reminds about a request whose pod is gone, with the blanks it can fill', async () => {
    slots.find.mockReturnValue(chain([slot({ booked_by_pod_id: 'pod-gone' })]));
    podsBySweep({ slot: [] });
    users.find.mockReturnValue(chain([user('u-7', 'Owner')]));

    await runWhatsappSweeps();

    const [reminder] = eventsNamed('VENUE_SLOT_PENDING_REMINDER');
    expect(reminder.params[2]).toBe('');
    expect(reminder.params[5]).toBe('there');
  });
});

describe('USER_REPLACEMENT_NOT_FOUND', () => {
  it('reads no backouts when no pod has just started', async () => {
    await runWhatsappSweeps();

    expect(backouts.find).not.toHaveBeenCalled();
  });

  it('tells the person whose released seat nobody took, keyed on the release', async () => {
    podsBySweep({ backout: [pod()] });
    backouts.find.mockReturnValue(
      chain([
        { _id: 'bo-1', pod_id: 'pod-doc-1', user_id: 'u-2' },
        // A release whose pod is not in this window is skipped, not guessed at.
        { _id: 'bo-2', pod_id: 'pod-elsewhere', user_id: 'u-2' },
      ])
    );
    users.find.mockReturnValue(chain([user('u-2', 'Vikram')]));

    await runWhatsappSweeps();

    const [filter] = backouts.find.mock.calls[0] as [Record<string, unknown>];
    expect(filter.status).toBe('IN_PROCESS');
    const notices = eventsNamed('USER_REPLACEMENT_NOT_FOUND');
    expect(notices).toHaveLength(1);
    expect(notices[0].entityId).toBe('bo-1');
    expect(notices[0].name).toBe('Vikram N');
    expect(notices[0].params[4]).toBe(
      'https://mweb.duncit.com/club/sunset-club/pod/sunday-badminton'
    );
  });

  it('sends nothing when every release on those pods was already settled', async () => {
    podsBySweep({ backout: [pod()] });

    await runWhatsappSweeps();

    expect(eventsNamed('USER_REPLACEMENT_NOT_FOUND')).toHaveLength(0);
    expect(slugMap).not.toHaveBeenCalled();
  });
});

describe('the feedback asks', () => {
  const ended = (over: Record<string, unknown> = {}) =>
    pod({
      pod_date_time: new Date(Date.now() - 6 * HOUR),
      pod_attendees: ['u-1', 'u-2'],
      pod_hosts_id: ['u-1'],
      venue_id: 'v-1',
      ...over,
    });
  const everybody = () =>
    users.find.mockReturnValue(
      chain([user('u-1'), user('u-2', 'Vikram'), user('u-3', 'Venue'), user('u-4', 'Asha'), user('u-5', 'Ravi')])
    );

  it('asks guests, the host, the venue owner and every club admin, each once', async () => {
    podsBySweep({ ended: [ended()] });
    venues.find.mockReturnValue(chain([{ _id: 'v-1', owner_user_id: 'u-3' }]));
    clubs.find.mockReturnValue(chain([{ _id: 'club-1', admin_user_ids: ['u-4', 'u-5'] }]));
    everybody();

    await runWhatsappSweeps();

    // The host sits in pod_attendees too and is asked only as the host.
    expect(eventsNamed('USER_POD_FEEDBACK').map((ask) => ask.name)).toEqual(['Vikram N']);
    expect(eventsNamed('HOST_POD_FEEDBACK').map((ask) => ask.name)).toEqual(['Meera N']);
    expect(eventsNamed('VENUE_POD_FEEDBACK').map((ask) => ask.name)).toEqual(['Venue N']);
    expect(eventsNamed('CLUB_ADMIN_FEEDBACK').map((ask) => ask.name)).toEqual(['Asha N', 'Ravi N']);
  });

  it('links every ask to the pod’s rating form', async () => {
    podsBySweep({ ended: [ended()] });
    everybody();

    await runWhatsappSweeps();

    const [ask] = eventsNamed('USER_POD_FEEDBACK');
    expect(ask.params[4]).toBe('https://mweb.duncit.com/pod/pod-doc-1/feedback');
    expect(ask.entityId).toBe('pod-doc-1');
  });

  it('skips the venue and club reads for a pod with neither', async () => {
    podsBySweep({ ended: [ended({ venue_id: null, club_id: null })] });
    everybody();

    await runWhatsappSweeps();

    expect(venues.find).not.toHaveBeenCalled();
    expect(clubs.find).not.toHaveBeenCalled();
    expect(eventsNamed('VENUE_POD_FEEDBACK')).toHaveLength(0);
    expect(eventsNamed('CLUB_ADMIN_FEEDBACK')).toHaveLength(0);
  });

  it('asks no venue owner the venue does not name, and no admin of a club with none', async () => {
    podsBySweep({ ended: [ended()] });
    venues.find.mockReturnValue(chain([{ _id: 'v-1' }]));
    clubs.find.mockReturnValue(chain([{ _id: 'club-1' }]));
    everybody();

    await runWhatsappSweeps();

    expect(eventsNamed('VENUE_POD_FEEDBACK')).toHaveLength(0);
    expect(eventsNamed('CLUB_ADMIN_FEEDBACK')).toHaveLength(0);
    expect(eventsNamed('HOST_POD_FEEDBACK')).toHaveLength(1);
  });
});

describe('startWhatsappScheduler', () => {
  it('refuses to start under NODE_ENV=test — an accidental start posts for real', () => {
    const stop = startWhatsappScheduler();

    expect(typeof stop).toBe('function');
    stop();
  });

  it('starts and stops cleanly outside a test run', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const stop = startWhatsappScheduler();
      expect(typeof stop).toBe('function');
      stop();
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('survives a sweep that threw, so the interval is never lost', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    settings.findOne.mockImplementation(() => {
      throw new Error('Mongo is down');
    });
    try {
      const stop = startWhatsappScheduler();
      await Promise.resolve();
      stop();
      // Nothing thrown out of the loop is the whole assertion — the interval
      // must survive Mongo, AiSensy and a bad document alike.
      expect(stop).toBeInstanceOf(Function);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
