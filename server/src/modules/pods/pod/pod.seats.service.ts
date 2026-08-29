import { GraphQLError } from 'graphql';
import { Types, type ClientSession } from 'mongoose';
import { PodModel } from './pod.model';
import { normalizeSeats, podSeatsTaken } from './pod.seats';
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { getUrlConfigs } from '@config/url-configs';
import { logs } from '@observability/log';
import { notifyEvent } from '@services/notify/notify.service';
import { podImageAssets } from '@modules/platform/whatsapp/whatsapp.assets';

/** A pod or user id, however the caller happens to be holding it. */
type PodRef = string | Types.ObjectId;

/**
 * The only writer of `pod_attendees` + `extra_seats`.
 *
 * Occupancy is a pair — an identity list and a counter — and it was being
 * maintained by read-modify-write in two places (the join path and the payment
 * capture path). Both read the pod, decided there was room, mutated the loaded
 * document and called `save()`, which emits `extra_seats` as an absolute `$set`.
 * Two concurrent multi-seat bookings therefore both passed the capacity gate and
 * the second save overwrote the first one's increment: the pod was oversold AND
 * the counter under-reported it. `pod_attendees` escaped only because Mongoose
 * compiles `.push()` to an atomic `$push`.
 *
 * Here the capacity test and the mutation are one `findOneAndUpdate`: the filter
 * carries an `$expr` that re-checks capacity against the document the server is
 * about to write, so a seat that went while we were pricing fails the claim
 * instead of overselling it.
 */

/** Seats this claim consumes: someone already listed only needs their extras. */
const NEEDED_SEATS = (seats: number) => ({
  $cond: [{ $in: ['$$uid', { $ifNull: ['$pod_attendees', []] }] }, seats - 1, seats],
});

const fullName = (user: any) =>
  `${user?.profile?.first_name ?? ''} ${user?.profile?.last_name ?? ''}`.trim();

// WhatsApp templates print the day and the clock time as two separate
// placeholders, the same split pod.service and ticket.service make.
const dateOnly = (value?: Date | null) =>
  value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium' }) : '';
const timeOnly = (value?: Date | null) =>
  value ? new Date(value).toLocaleString('en-IN', { timeStyle: 'short' }) : '';

/**
 * Tell the host their pod just sold its last spot.
 *
 * `gained` is how far THIS claim moved occupancy, so `taken - gained` is what
 * the pod held a moment before it: the message goes out on the transition and
 * only on the transition. Firing on "the pod is full" instead would send again
 * for every later claim against a full pod, every restored backout and every
 * replayed finalization — the news is that the last spot went, and that happens
 * once.
 *
 * Not awaited by the claim: an AiSensy round trip inside the payment
 * finalizer's transaction would hold it open for the length of an HTTP call,
 * and the funnel's own (event, entity, destination) index is what keeps a
 * retried transaction from sending twice.
 */
async function announcePodFilled(pod: any, gained: number): Promise<void> {
  const capacity = pod.no_of_spots ?? 0;
  // 0 spots is unlimited — there is no last spot to sell — and a claim that
  // moved nothing cannot be the claim that took it.
  if (capacity <= 0 || gained <= 0) return;
  const taken = podSeatsTaken(pod);
  if (taken < capacity || taken - gained >= capacity) return;

  const [{ mwebUrl }, club] = await Promise.all([
    getUrlConfigs(),
    ClubModel.findById(pod.club_id).select('club_id club_name admin_user_ids').lean(),
  ]);
  // `auth.phone` and `communication.whatsapp` are what the funnel resolves a
  // number from — a projection without them skips the send in silence.
  const [host, clubAdmin] = await Promise.all([
    UserModel.findById((pod.pod_hosts_id ?? [])[0])
      // `auth.email` is selected for the same reason `auth.phone` is: the
      // notify funnel reads the address off this document, so a narrower
      // projection would send the WhatsApp message and quietly skip the email.
      .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
      .lean(),
    UserModel.findById((club as any)?.admin_user_ids?.[0])
      .select('profile.first_name profile.last_name')
      .lean(),
  ]);
  const hostName = fullName(host) || 'there';
  const clubSlug = (club as any)?.club_id ?? '';
  await notifyEvent({
    event: 'HOST_POD_FULL',
    // The pod itself: one "your pod is full" per pod, however many times the
    // last spot changes hands.
    entityId: String(pod._id),
    user: host,
    name: hostName,
    assets: podImageAssets(pod.pod_images_and_videos),
    params: [
      hostName,
      pod.pod_title,
      dateOnly(pod.pod_date_time),
      timeOnly(pod.pod_date_time),
      `${mwebUrl.replace(/\/+$/, '')}/club/${clubSlug}/pod/${pod.pod_id}`,
      // A blank value is recorded FAILED and never sent, so a club whose admin
      // seat is empty is named by the club instead.
      fullName(clubAdmin) || (club as any)?.club_name || 'Duncit',
    ],
  });
}

/**
 * Take `seats` on a pod for one person, or fail.
 *
 * `$addToSet` keeps the identity list deduped (a person appears once however
 * many seats they hold) and `$inc` composes under concurrency, so the pair stays
 * consistent without a transaction.
 *
 * A `session` joins the caller's transaction: the payment finalizer claims the
 * seat and writes the membership together, so a failure downstream gives the
 * seat back instead of leaving it held by nobody.
 *
 * @throws POD_FULL when the seats are gone — the caller must not book.
 */
export async function claimSeats(
  podId: PodRef,
  userId: PodRef,
  seats = 1,
  session?: ClientSession
) {
  const want = normalizeSeats(seats);
  const uid = new Types.ObjectId(userId.toString());
  // Read BEFORE the claim, because afterwards the answer is gone: `$addToSet`
  // leaves the buyer on the list either way, and whether THIS claim put them
  // there is the difference between taking a seat and taking none. Safe as its
  // own read — a pod is contended by other people arriving, never by this same
  // buyer twice.
  const alreadyListed = await PodModel.exists({ _id: podId, pod_attendees: uid }).session(
    session ?? null
  );
  const pod = await PodModel.findOneAndUpdate(
    {
      _id: podId,
      $expr: {
        $let: {
          vars: { uid },
          in: {
            $or: [
              // 0 spots means unlimited — there is nothing to run out of.
              { $lte: [{ $ifNull: ['$no_of_spots', 0] }, 0] },
              {
                $lte: [
                  {
                    $add: [
                      { $size: { $ifNull: ['$pod_attendees', []] } },
                      { $ifNull: ['$extra_seats', 0] },
                      NEEDED_SEATS(want),
                    ],
                  },
                  '$no_of_spots',
                ],
              },
            ],
          },
        },
      },
    },
    { $addToSet: { pod_attendees: uid }, $inc: { extra_seats: want - 1 } },
    { new: true, session },
  );
  if (!pod) {
    throw new GraphQLError('Pod is full', { extensions: { code: 'POD_FULL' } });
  }
  // Past the guard, so this caller is the one that won the seats — the racer
  // that lost threw above and must not announce anything.
  announcePodFilled(pod, alreadyListed ? want - 1 : want).catch((error) =>
    logs.server.error('pods', 'announcePodFilled', {
      error,
      podId: podId.toString(),
      userId: userId.toString(),
    })
  );
  return pod;
}

/**
 * Take MORE seats for someone already in the pod — restoring a partial backout.
 *
 * Same capacity gate as `claimSeats`, but it never touches the identity list:
 * the person never left, only their seats did.
 *
 * @throws POD_FULL when those seats have since been taken.
 */
export async function claimExtraSeats(podId: PodRef, userId: PodRef, count: number) {
  const want = Math.max(0, Math.floor(Number(count) || 0));
  if (want === 0) return null;
  const pod = await PodModel.findOneAndUpdate(
    {
      _id: podId,
      $expr: {
        $or: [
          { $lte: [{ $ifNull: ['$no_of_spots', 0] }, 0] },
          {
            $lte: [
              {
                $add: [
                  { $size: { $ifNull: ['$pod_attendees', []] } },
                  { $ifNull: ['$extra_seats', 0] },
                  want,
                ],
              },
              '$no_of_spots',
            ],
          },
        ],
      },
    },
    { $inc: { extra_seats: want } },
    { new: true }
  );
  if (!pod) {
    throw new GraphQLError('Those seats have already been taken', {
      extensions: { code: 'POD_FULL' },
    });
  }
  // The identity list is untouched here, so the seats taken are exactly `want`.
  announcePodFilled(pod, want).catch((error) =>
    logs.server.error('pods', 'announcePodFilled', {
      error,
      podId: podId.toString(),
      userId: userId.toString(),
    })
  );
  return pod;
}

/**
 * Give back the person and every seat they held.
 *
 * The counter is clamped at zero inside the update rather than after it, so a
 * concurrent release cannot drive it negative. A clamp that actually fired means
 * the counter had already drifted from the memberships — that is a real defect,
 * so it is logged rather than silently absorbed the way the old helper did.
 */
export async function releaseSeats(podId: PodRef, userId: PodRef, seats = 1) {
  const uid = new Types.ObjectId(userId.toString());
  return giveBack(podId, Math.max(normalizeSeats(seats) - 1, 0), uid, userId.toString());
}

/**
 * Give back SOME of a booking's seats while the buyer keeps the rest.
 *
 * A partial backout is not a smaller version of leaving — the person is still
 * coming, so their id must stay in the identity list (chat, permissions, their
 * own ticket) and only the counter moves.
 */
export async function releaseExtraSeats(podId: PodRef, userId: PodRef, count: number) {
  const give = Math.max(0, Math.floor(Number(count) || 0));
  if (give === 0) return null;
  return giveBack(podId, give, null, userId.toString());
}

/** The one write both releases share: drop the id (or not) and the seats. */
async function giveBack(
  podId: PodRef,
  extra: number,
  removeUid: Types.ObjectId | null,
  userId: string
) {
  const nextAttendees = removeUid
    ? {
        $filter: {
          input: { $ifNull: ['$pod_attendees', []] },
          cond: { $ne: ['$$this', removeUid] },
        },
      }
    : { $ifNull: ['$pod_attendees', []] };
  const before = await PodModel.findOneAndUpdate(
    { _id: podId },
    [
      {
        $set: {
          pod_attendees: nextAttendees,
          extra_seats: {
            $max: [0, { $subtract: [{ $ifNull: ['$extra_seats', 0] }, extra] }],
          },
        },
      },
    ],
    { new: false }
  );
  if (before && (before.extra_seats ?? 0) - extra < 0) {
    logs.server.error('pods', 'releaseSeats', {
      msg: 'extra_seats would have gone negative — the counter has drifted from the memberships',
      podId: podId.toString(),
      userId,
      extra_seats: before.extra_seats ?? 0,
      releasing: extra,
    });
  }
  return before;
}
