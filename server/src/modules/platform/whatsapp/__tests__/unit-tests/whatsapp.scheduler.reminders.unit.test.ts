/**
 * The two pod reminders the main scheduler suite does not reach: the same-day
 * reminder to guests (where it is and what time) and the reminder to the venue
 * that a pod is booked there. Every collaborator is faked, as there.
 *
 * What matters: who is told, with what, and who is quietly left out — a pod
 * with no venue is "Online", a pod whose club cannot be resolved still carries
 * a link (the app's own), and a venue that no longer exists, or whose owner no
 * longer exists, is not messaged at all.
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
jest.mock('@modules/pods/podMember/backoutRequest.model', () => ({ BackoutRequestModel: { find: jest.fn() } }));
jest.mock('@modules/venues/venue/venue.model', () => ({ VenueModel: { find: jest.fn() } }));
jest.mock('@modules/venues/venueSlot/venueSlot.model', () => ({ VenueSlotModel: { find: jest.fn() } }));
jest.mock('../../waEventSetting.model', () => ({
  WaEventSettingModel: { findOne: jest.fn() },
  WA_GLOBAL_KEY: 'GLOBAL',
}));
jest.mock('../../whatsapp.service', () => ({ whatsappService: { sendEach: jest.fn(), send: jest.fn() } }));
jest.mock('@services/notify/notify.service', () => ({ notifyEach: jest.fn() }));
jest.mock('@modules/platform/settings/settings.service', () => ({ settingsService: { getReminderSweepSettings: jest.fn() } }));
jest.mock('../../whatsapp.retry', () => ({ retryUnreachedMessages: jest.fn(async () => undefined) }));
jest.mock('@modules/pods/ticket/attendance.service', () => ({
  ...jest.requireActual('@modules/pods/ticket/attendance.service'),
  markedUserIdsByPod: jest.fn(async () => new Map()),
}));

import { UserModel } from '@modules/access/user/user.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { loadPodClubSlugMap } from '@modules/pods/pod/pod.service';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { BackoutRequestModel } from '@modules/pods/podMember/backoutRequest.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { notifyEach } from '@services/notify/notify.service';
import { WaEventSettingModel } from '../../waEventSetting.model';
import { runWhatsappSweeps } from '../../whatsapp.scheduler';

const find = (model: unknown) => (model as { find: jest.Mock }).find;
const notify = notifyEach as jest.Mock;
const HOUR = 60 * 60_000;
const CUTOFF = new Date('2026-01-01T00:00:00.000Z');

const chain = (value: unknown) => ({ select: () => chain(value), sort: () => chain(value), lean: () => Promise.resolve(value) });

const clocks = (over: Record<string, number> = {}) => ({
  pod_reminder_lead_hours: 24, venue_slot_reminder_lead_hours: 48, pod_feedback_delay_hours: 2,
  pod_sameday_reminder_hours: 3, complete_reminder_hours: 12, complete_timeout_hours: 24, ...over,
});

const person = (id: string, first: string) => ({
  _id: id, profile: { first_name: first, last_name: 'N' }, auth: { phone: { number: '9000000001' } }, communication: { whatsapp: {} },
});

const pod = (over: Record<string, unknown> = {}) => ({
  _id: 'pod-doc-1', pod_id: 'sunday-badminton', pod_title: 'Sunday Badminton', pod_date_time: new Date(Date.now() + 3 * HOUR),
  pod_attendees: ['u-guest'], pod_hosts_id: ['u-host'], club_id: 'club-1', venue_id: 'venue-1', ...over,
});

/** Which sweep is asking: the same-day reminder reads a 3h edge, the venue reminder filters on a venue. */
function route(sameDay: unknown[], venueReminder: unknown[]) {
  find(PodModel).mockImplementation((filter: { venue_id?: unknown; pod_date_time?: { $lte?: Date } }) => {
    if (filter.venue_id) return chain(venueReminder);
    const edge = filter.pod_date_time?.$lte;
    const hours = edge instanceof Date ? Math.round((edge.getTime() - Date.now()) / HOUR) : null;
    return chain(hours === 3 ? sameDay : []);
  });
}

const eventsOf = (name: string) =>
  notify.mock.calls.flatMap((call) => call[0] as { event: string; params: string[]; name: string }[]).filter((e) => e.event === name);

beforeEach(() => {
  jest.clearAllMocks();
  (WaEventSettingModel.findOne as jest.Mock).mockReturnValue(chain({ enabled: true, updated_at: CUTOFF }));
  (settingsService.getReminderSweepSettings as jest.Mock).mockResolvedValue(clocks());
  (loadPodClubSlugMap as jest.Mock).mockResolvedValue(new Map([['club-1', 'sunset-club']]));
  notify.mockResolvedValue([]);
  for (const model of [UserModel, VenueModel, VenueSlotModel, ClubModel, BackoutRequestModel]) find(model).mockReturnValue(chain([]));
  find(UserModel).mockReturnValue(chain([person('u-guest', 'Vikram'), person('u-host', 'Meera'), person('u-owner', 'Owner')]));
  find(VenueModel).mockReturnValue(chain([{ _id: 'venue-1', owner_user_id: 'u-owner', venue_name: 'Court 5' }]));
  route([], []);
});

describe('USER_POD_REMINDER_SAMEDAY', () => {
  it('tells each guest the title, the time, the venue and the pod link', async () => {
    route([pod()], []);
    await runWhatsappSweeps();
    const [sent] = eventsOf('USER_POD_REMINDER_SAMEDAY');
    expect(eventsOf('USER_POD_REMINDER_SAMEDAY')).toHaveLength(1);
    expect(sent.name).toBe('Vikram N');
    expect(sent.params[0]).toBe('Vikram N');
    expect(sent.params[1]).toBe('Sunday Badminton');
    expect(sent.params[3]).toBe('Court 5');
    expect(sent.params[4]).toBe('https://mweb.duncit.com/club/sunset-club/pod/sunday-badminton');
  });

  it('says Online for a pod with no venue, without reading any venue', async () => {
    route([pod({ venue_id: null })], []);
    await runWhatsappSweeps();
    expect(eventsOf('USER_POD_REMINDER_SAMEDAY')[0].params[3]).toBe('Online');
    expect(find(VenueModel)).not.toHaveBeenCalled();
  });

  it('says Online when the venue no longer exists', async () => {
    find(VenueModel).mockReturnValue(chain([]));
    route([pod()], []);
    await runWhatsappSweeps();
    expect(eventsOf('USER_POD_REMINDER_SAMEDAY')[0].params[3]).toBe('Online');
  });

  it('falls back to the app address when the pod’s club cannot be resolved', async () => {
    (loadPodClubSlugMap as jest.Mock).mockResolvedValue(new Map());
    route([pod()], []);
    await runWhatsappSweeps();
    expect(eventsOf('USER_POD_REMINDER_SAMEDAY')[0].params[4]).toBe('https://mweb.duncit.com');
  });

  it('is switched off by a clock of zero, and sends nothing when no pod is due', async () => {
    (settingsService.getReminderSweepSettings as jest.Mock).mockResolvedValue(clocks({ pod_sameday_reminder_hours: 0 }));
    route([pod()], []);
    await runWhatsappSweeps();
    expect(eventsOf('USER_POD_REMINDER_SAMEDAY')).toHaveLength(0);
    (settingsService.getReminderSweepSettings as jest.Mock).mockResolvedValue(clocks());
    route([], []);
    await runWhatsappSweeps();
    expect(eventsOf('USER_POD_REMINDER_SAMEDAY')).toHaveLength(0);
  });
});

describe('VENUE_POD_REMINDER', () => {
  it('tells the venue owner which pod is booked, when, how many, and who hosts it', async () => {
    route([], [pod({ pod_date_time: new Date(Date.now() + 24 * HOUR) })]);
    await runWhatsappSweeps();
    const [sent] = eventsOf('VENUE_POD_REMINDER');
    expect(eventsOf('VENUE_POD_REMINDER')).toHaveLength(1);
    expect(sent.name).toBe('Owner N');
    expect(sent.params[1]).toBe('Sunday Badminton');
    expect(sent.params[4]).toBe('1');
    expect(sent.params[5]).toBe('Meera N');
  });

  it('names the host "there" when the pod has no host left on it', async () => {
    route([], [pod({ pod_hosts_id: [], pod_date_time: new Date(Date.now() + 24 * HOUR) })]);
    await runWhatsappSweeps();
    expect(eventsOf('VENUE_POD_REMINDER')[0].params[5]).toBe('there');
  });

  it('sends nothing when no pod is booked at a venue soon', async () => {
    route([], []);
    await runWhatsappSweeps();
    expect(eventsOf('VENUE_POD_REMINDER')).toHaveLength(0);
  });

  it('skips a pod whose venue no longer exists, and one whose owner no longer exists', async () => {
    find(VenueModel).mockReturnValue(chain([]));
    route([], [pod()]);
    await runWhatsappSweeps();
    expect(eventsOf('VENUE_POD_REMINDER')).toHaveLength(0);
    find(VenueModel).mockReturnValue(chain([{ _id: 'venue-1', owner_user_id: 'u-gone', venue_name: 'Court 5' }]));
    await runWhatsappSweeps();
    expect(eventsOf('VENUE_POD_REMINDER')).toHaveLength(0);
  });
});
