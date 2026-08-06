import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel } from './pod.model';
import { normalizeSeats } from './pod.seats';
import { logs } from '@observability/log';

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

/**
 * Take `seats` on a pod for one person, or fail.
 *
 * `$addToSet` keeps the identity list deduped (a person appears once however
 * many seats they hold) and `$inc` composes under concurrency, so the pair stays
 * consistent without a transaction.
 *
 * @throws POD_FULL when the seats are gone — the caller must not book.
 */
export async function claimSeats(podId: unknown, userId: unknown, seats = 1) {
  const want = normalizeSeats(seats);
  const uid = new Types.ObjectId(String(userId));
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
    { new: true },
  );
  if (!pod) {
    throw new GraphQLError('Pod is full', { extensions: { code: 'POD_FULL' } });
  }
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
export async function releaseSeats(podId: unknown, userId: unknown, seats = 1) {
  const extra = Math.max(normalizeSeats(seats) - 1, 0);
  const uid = new Types.ObjectId(String(userId));
  const before = await PodModel.findOneAndUpdate(
    { _id: podId },
    [
      {
        $set: {
          pod_attendees: {
            $filter: {
              input: { $ifNull: ['$pod_attendees', []] },
              cond: { $ne: ['$$this', uid] },
            },
          },
          extra_seats: {
            $max: [0, { $subtract: [{ $ifNull: ['$extra_seats', 0] }, extra] }],
          },
        },
      },
    ],
    { new: false },
  );
  if (before && (before.extra_seats ?? 0) - extra < 0) {
    logs.server.error('pods', 'releaseSeats', {
      msg: 'extra_seats would have gone negative — the counter has drifted from the memberships',
      podId: String(podId),
      userId: String(userId),
      extra_seats: before.extra_seats ?? 0,
      releasing: extra,
    });
  }
  return before;
}
