/**
 * The eight WhatsApp scenarios no domain event can fire.
 *
 * Nothing in the server notices that a pod starts tomorrow, that a finished pod
 * was never completed, that a venue has sat on a slot request, that a released
 * seat was never taken, or that a pod has ended and the people who were there
 * could be asked how it went. Those are all the passage of time, so they need a
 * sweep rather than a call site.
 *
 * SINGLE REPLICA ONLY. There is no distributed lock anywhere in this server —
 * `src/config` has redis.ts and redisResponseCache.ts and neither offers one,
 * and `deploy/docker-compose.yml` declares no replicas. Every replica added
 * would run its own copy of these sweeps. The send log's unique index makes the
 * duplicate a wasted insert rather than a second billed message, so the failure
 * is noise and not money, but SCALING THIS SERVICE OUT NEEDS A LOCK FIRST.
 *
 * Two things keep a sweep safe:
 *   - THE CUTOFF. On the first tick nothing has ever been messaged, so a naive
 *     "everything that has finished" query would message every pod in the
 *     platform's history at once. Nothing before {@link sweepCutoff} is looked
 *     at.
 *   - THE entityId. Every send carries the pod / slot / backout id, which is
 *     what the funnel's unique partial index on
 *     (event_key, entity_id, destination) is keyed on. Running a sweep twice is
 *     a rejected insert, not a second bill.
 */
import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { loadPodClubSlugMap } from '@modules/pods/pod/pod.service';
import { BackoutRequestModel } from '@modules/pods/podMember/backoutRequest.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { WaEventSettingModel, WA_GLOBAL_KEY } from './waEventSetting.model';
// `notifyEach`, not `whatsappService.sendEach`: every scenario this file
// sweeps for now goes out as an email too — the pod reminder, the complete-pod
// nudge, the unanswered slot request, the unfilled backout and all four
// feedback asks — filled from the very same `params` arrays. A reminder is
// exactly the message that must not depend on a channel somebody may have
// opted out of or changed phone on.
import { notifyEach, type NotifyInput } from '@services/notify/notify.service';
import { trimTrailingSlash } from '@utils/url';

const HOUR_MS = 60 * 60_000;
const SWEEP_INTERVAL_MS = 30 * 60_000;
const FIRST_SWEEP_DELAY_MS = 90_000;

/** How far ahead of a pod its attendees are reminded. */
const POD_REMINDER_LEAD_MS = 24 * HOUR_MS;
/** How close to the pod an unanswered slot request gets chased. */
const SLOT_REMINDER_LEAD_MS = 48 * HOUR_MS;
/** How long a finished pod may sit uncompleted before the host is nudged. */
const COMPLETE_REMINDER_AFTER_MS = 24 * HOUR_MS;

/**
 * How wide each sweep's window is. Three ticks, so a tick that dies on a
 * database error — or never happens because the process restarted — cannot step
 * over an entity entirely; the next two ticks still see it. The repeat sends
 * that creates cost nothing: the unique index rejects them.
 */
const WINDOW_MS = 3 * SWEEP_INTERVAL_MS;

/**
 * The pod fields the sweeps project.
 *
 * The ids are loose, as they are on every lean document in this repo: each one
 * is an ObjectId that is only ever turned into a string — to key a map, to fill
 * `entityId`, or to feed an `$in` — and never read into.
 */
interface SweptPod {
  _id: any;
  pod_id: string;
  pod_title: string;
  pod_date_time: Date;
  pod_attendees?: any[];
  pod_hosts_id?: any[];
  club_id?: any;
  venue_id?: any;
}

interface SweptSlot {
  _id: any;
  start_at: Date;
  owner_user_id: any;
  booked_by_pod_id: any;
}

type UserLike = Record<string, any>;
type UsersById = Map<string, UserLike>;

/**
 * The moment automatic WhatsApp was last switched on, or null while it is off.
 *
 * The global row's `updated_at` rather than a new `enabled_at` field: it needs
 * no schema change and no console change to maintain, and its behaviour is the
 * one we want. Switching the product off and back on moves the cutoff forward,
 * so the pause is a gap and not a backlog that fires the moment the switch
 * returns — which is the same protection the cutoff exists to give on day one.
 *
 * An absent row means nobody has turned it on (WA_GLOBAL_DEFAULT_ENABLED), and
 * an off switch skips every query below rather than sending into the funnel and
 * having it record a skip per recipient.
 */
async function sweepCutoff(): Promise<Date | null> {
  const global = await WaEventSettingModel.findOne({ event_key: WA_GLOBAL_KEY })
    .select('enabled updated_at')
    .lean();
  if (!global?.enabled) return null;
  return global.updated_at;
}

/**
 * Whatever crossed `edge` inside this sweep's window, never earlier than the
 * cutoff. A cutoff later than the edge yields an impossible range, which is
 * exactly right: the feature was not on yet when that entity passed its mark.
 */
function crossing(edge: number, cutoff: Date) {
  return {
    $gte: new Date(Math.max(edge - WINDOW_MS, cutoff.getTime())),
    $lte: new Date(edge),
  };
}

/**
 * Recipients, loaded with the two paths `destinationFor` reads the number off.
 * A narrower projection is the quiet way to make every send in a sweep skip.
 */
async function waUsers(ids: readonly unknown[]): Promise<UsersById> {
  const unique = [...new Set(ids.map(String).filter(Boolean))];
  if (unique.length === 0) return new Map();
  const users = await UserModel.find({ _id: { $in: unique } })
    // `auth.email` beside the two phone paths: `notifyEvent` reads the address
    // off these documents, so a narrower projection would send every WhatsApp
    // message and skip every email without a word.
    .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
    .lean();
  return new Map(users.map((user: any) => [String(user._id), user]));
}

const nameOf = (user?: UserLike | null) =>
  `${user?.profile?.first_name ?? ''} ${user?.profile?.last_name ?? ''}`.trim() || 'there';

/** Templates print the day and the clock time as two separate placeholders. */
const dateLabel = (value: Date) => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium' });
const timeLabel = (value: Date) => new Date(value).toLocaleString('en-IN', { timeStyle: 'short' });

/**
 * Whole hours from now until `when`. The reminder templates read "starts in
 * {{2}} hours", so this is a count and not a time; it never goes below 1,
 * because a message that says 0 hours is only sent while the thing is ahead.
 */
const hoursUntil = (when: Date) =>
  String(Math.max(1, Math.round((new Date(when).getTime() - Date.now()) / HOUR_MS)));

/** Both apps route a pod by club slug and pod slug, so a pod whose club cannot
 * be resolved carries no link — the funnel records the blank rather than
 * sending a broken `/club//pod/x`. */
function podUrl(mwebUrl: string, pod: SweptPod, slugById: Map<string, string>) {
  const slug = pod.club_id ? slugById.get(String(pod.club_id)) : '';
  return slug ? `${trimTrailingSlash(mwebUrl)}/club/${slug}/pod/${pod.pod_id}` : '';
}

/** The rating form both apps route as `/pod/:podId/feedback` — the link a host
 * already shares with their guests, keyed on the pod's document id. */
const feedbackUrl = (mwebUrl: string, pod: SweptPod) =>
  `${trimTrailingSlash(mwebUrl)}/pod/${String(pod._id)}/feedback`;

const firstHostId = (pod: SweptPod) => String((pod.pod_hosts_id ?? [])[0] ?? '');

/* ------------------------------------------------------------------ *
 * 1. USER_POD_REMINDER — a joined pod starts soon.
 * ------------------------------------------------------------------ */

function podReminders(
  pod: SweptPod,
  users: UsersById,
  slugById: Map<string, string>,
  mwebUrl: string
): NotifyInput[] {
  const hostName = nameOf(users.get(firstHostId(pod)));
  const link = podUrl(mwebUrl, pod, slugById);
  const hours = hoursUntil(pod.pod_date_time);
  return (pod.pod_attendees ?? []).map((attendeeId) => {
    const user = users.get(String(attendeeId));
    const name = nameOf(user);
    return {
      event: 'USER_POD_REMINDER',
      entityId: String(pod._id),
      user,
      name,
      params: [
        name,
        hours,
        pod.pod_title,
        dateLabel(pod.pod_date_time),
        timeLabel(pod.pod_date_time),
        link,
        hostName,
      ],
    };
  });
}

/**
 * The host is deliberately left in: they sit in `pod_attendees` like everybody
 * else and there is no host-side reminder template, so excluding them would
 * mean the one person who has to turn up gets no reminder at all.
 */
async function remindAttendees(now: number, cutoff: Date, mwebUrl: string) {
  const pods = await PodModel.find({
    is_active: true,
    pod_date_time: crossing(now + POD_REMINDER_LEAD_MS, cutoff),
  })
    .select('pod_id pod_title pod_date_time pod_attendees pod_hosts_id club_id')
    .lean<SweptPod[]>();
  if (pods.length === 0) return;
  const slugById = await loadPodClubSlugMap(pods);
  const users = await waUsers(
    pods.flatMap((pod) => [...(pod.pod_attendees ?? []), ...(pod.pod_hosts_id ?? [])])
  );
  await notifyEach(
    pods.flatMap((pod) => podReminders(pod, users, slugById, mwebUrl))
  );
}

/* ------------------------------------------------------------------ *
 * 2. HOST_COMPLETE_POD_REMINDER — a finished pod is still not completed.
 * ------------------------------------------------------------------ */

async function remindHostsToComplete(now: number, cutoff: Date) {
  const pods = await PodModel.find({
    is_active: true,
    completed_at: null,
    pod_date_time: crossing(now - COMPLETE_REMINDER_AFTER_MS, cutoff),
  })
    .select('pod_id pod_title pod_date_time pod_hosts_id')
    .lean<SweptPod[]>();
  if (pods.length === 0) return;
  const users = await waUsers(pods.map(firstHostId));
  await notifyEach(
    pods.map((pod) => {
      const host = users.get(firstHostId(pod));
      const name = nameOf(host);
      return {
        event: 'HOST_COMPLETE_POD_REMINDER',
        entityId: String(pod._id),
        user: host,
        name,
        params: [name, pod.pod_title, dateLabel(pod.pod_date_time), timeLabel(pod.pod_date_time)],
      };
    })
  );
}

/* ------------------------------------------------------------------ *
 * 3. VENUE_SLOT_PENDING_REMINDER — a slot request is still unanswered.
 * ------------------------------------------------------------------ */

/**
 * Anchored on when the POD is, not on how long the request has waited: the
 * template says "The request pod scheduled for {{2}} hours from now", so what
 * makes it urgent is the date the host asked for arriving.
 */
async function remindVenuesOfPendingSlots(now: number, cutoff: Date) {
  const slots = await VenueSlotModel.find({
    status: 'PENDING',
    decision: 'NONE',
    start_at: crossing(now + SLOT_REMINDER_LEAD_MS, cutoff),
  })
    .select('start_at owner_user_id booked_by_pod_id')
    .lean<SweptSlot[]>();
  if (slots.length === 0) return;
  const pods = await PodModel.find({ _id: { $in: slots.map((slot) => slot.booked_by_pod_id) } })
    .select('pod_id pod_title pod_hosts_id')
    .lean<SweptPod[]>();
  const podById = new Map(pods.map((pod) => [String(pod._id), pod]));
  const users = await waUsers([...slots.map((slot) => slot.owner_user_id), ...pods.map(firstHostId)]);
  await notifyEach(
    slots.map((slot) => {
      const pod = podById.get(String(slot.booked_by_pod_id));
      const owner = users.get(String(slot.owner_user_id));
      const name = nameOf(owner);
      return {
        event: 'VENUE_SLOT_PENDING_REMINDER',
        entityId: String(slot._id),
        user: owner,
        name,
        params: [
          name,
          hoursUntil(slot.start_at),
          pod?.pod_title ?? '',
          dateLabel(slot.start_at),
          timeLabel(slot.start_at),
          nameOf(pod ? users.get(firstHostId(pod)) : null),
        ],
      };
    })
  );
}

/* ------------------------------------------------------------------ *
 * 4. USER_REPLACEMENT_NOT_FOUND — a released seat was never taken.
 * ------------------------------------------------------------------ */

/**
 * A backout stays IN_PROCESS until somebody books the seat (SPOT_FILLED) or the
 * user keeps it (CANCELLED). Nothing closes it when it simply runs out of time,
 * so "expired, never filled" is an IN_PROCESS request whose pod has now started
 * — the same line `podHasHappened` draws in podMember.service.
 */
async function noticeReplacementNotFound(now: number, cutoff: Date, mwebUrl: string) {
  const pods = await PodModel.find({ pod_date_time: crossing(now, cutoff) })
    .select('pod_id pod_title pod_date_time club_id')
    .lean<SweptPod[]>();
  if (pods.length === 0) return;
  const requests = await BackoutRequestModel.find({
    pod_id: { $in: pods.map((pod) => pod._id) },
    status: 'IN_PROCESS',
  })
    .select('pod_id user_id')
    .lean();
  if (requests.length === 0) return;
  const [slugById, users] = await Promise.all([
    loadPodClubSlugMap(pods),
    waUsers(requests.map((request) => request.user_id)),
  ]);
  const podById = new Map(pods.map((pod) => [String(pod._id), pod]));
  await notifyEach(
    requests.flatMap((request) => {
      const pod = podById.get(String(request.pod_id));
      if (!pod) return [];
      const user = users.get(String(request.user_id));
      const name = nameOf(user);
      return [
        {
          event: 'USER_REPLACEMENT_NOT_FOUND',
          // The RELEASE, not the pod: a booking can give back seats twice and
          // each release is answered on its own, exactly as
          // USER_REPLACEMENT_FOUND keys it.
          entityId: String(request._id),
          user,
          name,
          params: [
            name,
            pod.pod_title,
            dateLabel(pod.pod_date_time),
            timeLabel(pod.pod_date_time),
            podUrl(mwebUrl, pod, slugById),
          ],
        },
      ];
    })
  );
}

/* ------------------------------------------------------------------ *
 * 5-8. The feedback asks — user, host, venue, club admin.
 * ------------------------------------------------------------------ */

/** All four feedback templates take the same values in the same order. */
function feedbackAsk(
  event: string,
  pod: SweptPod,
  user: UserLike | undefined,
  mwebUrl: string
): NotifyInput {
  const name = nameOf(user);
  return {
    event,
    entityId: String(pod._id),
    user,
    name,
    params: [
      name,
      pod.pod_title,
      dateLabel(pod.pod_date_time),
      timeLabel(pod.pod_date_time),
      feedbackUrl(mwebUrl, pod),
    ],
  };
}

/**
 * Pods that have just ended.
 *
 * NOT anchored on `completed_at`: completion is host-initiated and optional —
 * which is the entire reason HOST_COMPLETE_POD_REMINDER exists — so hanging
 * feedback off it means the guests of every pod a host never got round to
 * completing are never asked. A pod with no end time recorded is treated as
 * ending when it starts; the create-pod form has required an end for long
 * enough that only pods far behind the cutoff can be in that state.
 */
async function endedPods(now: number, cutoff: Date): Promise<SweptPod[]> {
  const ended = crossing(now, cutoff);
  return PodModel.find({
    is_active: true,
    $or: [{ pod_end_date_time: ended }, { pod_end_date_time: null, pod_date_time: ended }],
  })
    .select('pod_id pod_title pod_date_time pod_attendees pod_hosts_id club_id venue_id')
    .lean<SweptPod[]>();
}

/** Everyone who came except the host — they sit in `pod_attendees` too, and are
 * asked as the host below. Two feedback templates to one person about one pod
 * is two messages and two bills. */
const guestsOf = (pod: SweptPod) =>
  (pod.pod_attendees ?? []).map(String).filter((id) => id !== firstHostId(pod));

async function askAttendeesForFeedback(pods: SweptPod[], mwebUrl: string) {
  const users = await waUsers(pods.flatMap(guestsOf));
  await notifyEach(
    pods.flatMap((pod) =>
      guestsOf(pod).map((id) => feedbackAsk('USER_POD_FEEDBACK', pod, users.get(id), mwebUrl))
    )
  );
}

async function askHostsForFeedback(pods: SweptPod[], mwebUrl: string) {
  const users = await waUsers(pods.map(firstHostId));
  await notifyEach(
    pods.map((pod) => feedbackAsk('HOST_POD_FEEDBACK', pod, users.get(firstHostId(pod)), mwebUrl))
  );
}

async function askVenuesForFeedback(pods: SweptPod[], mwebUrl: string) {
  const venueIds = pods.map((pod) => pod.venue_id).filter(Boolean);
  if (venueIds.length === 0) return;
  const venues = await VenueModel.find({ _id: { $in: venueIds } })
    .select('owner_user_id')
    .lean();
  const ownerByVenue = new Map(
    venues.map((venue: any) => [String(venue._id), String(venue.owner_user_id ?? '')])
  );
  const users = await waUsers([...ownerByVenue.values()]);
  await notifyEach(
    pods.flatMap((pod) => {
      const owner = users.get(ownerByVenue.get(String(pod.venue_id)) ?? '');
      return owner ? [feedbackAsk('VENUE_POD_FEEDBACK', pod, owner, mwebUrl)] : [];
    })
  );
}

/** A club can have several admins and every one of them ran the club that ran
 * the pod, so every one of them is asked. */
async function askClubAdminsForFeedback(pods: SweptPod[], mwebUrl: string) {
  const clubIds = pods.map((pod) => pod.club_id).filter(Boolean);
  if (clubIds.length === 0) return;
  const clubs = await ClubModel.find({ _id: { $in: clubIds } })
    .select('admin_user_ids')
    .lean();
  const adminsByClub = new Map(
    clubs.map((club: any) => [String(club._id), (club.admin_user_ids ?? []).map(String)])
  );
  const users = await waUsers([...adminsByClub.values()].flat());
  await notifyEach(
    pods.flatMap((pod) =>
      (adminsByClub.get(String(pod.club_id)) ?? []).map((adminId: string) =>
        feedbackAsk('CLUB_ADMIN_FEEDBACK', pod, users.get(adminId), mwebUrl)
      )
    )
  );
}

async function requestPodFeedback(now: number, cutoff: Date, mwebUrl: string) {
  const pods = await endedPods(now, cutoff);
  if (pods.length === 0) return;
  await askAttendeesForFeedback(pods, mwebUrl);
  await askHostsForFeedback(pods, mwebUrl);
  await askVenuesForFeedback(pods, mwebUrl);
  await askClubAdminsForFeedback(pods, mwebUrl);
}

/* ------------------------------------------------------------------ */

/** Run every sweep once. Safe to call twice — the second run is a no-op. */
export async function runWhatsappSweeps(): Promise<void> {
  const cutoff = await sweepCutoff();
  if (!cutoff) return;
  const now = Date.now();
  const { mwebUrl } = await getUrlConfigs();
  await remindAttendees(now, cutoff, mwebUrl);
  await remindHostsToComplete(now, cutoff);
  await remindVenuesOfPendingSlots(now, cutoff);
  await noticeReplacementNotFound(now, cutoff, mwebUrl);
  await requestPodFeedback(now, cutoff, mwebUrl);
}

/**
 * Start the half-hourly sweep loop (first run ~90s after boot). Returns a stop
 * function. No-ops under NODE_ENV=test — the guard here makes an accidental
 * start in a test run, which would post to AiSensy for real, impossible.
 */
export function startWhatsappScheduler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  const sweep = () => {
    // The interval must survive any failure (Mongo, AiSensy, a bad document).
    runWhatsappSweeps().catch((err) => {
      logs.server.error('whatsapp-scheduler', 'sweep', { error: err, msg: 'sweep failed' });
    });
  };
  const first = setTimeout(sweep, FIRST_SWEEP_DELAY_MS);
  const interval = setInterval(sweep, SWEEP_INTERVAL_MS);
  // Never keep the process alive just for WhatsApp sweeps.
  first.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
