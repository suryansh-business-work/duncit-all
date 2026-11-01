import { Types } from 'mongoose';
import { isDuplicateKeyError } from '@utils/mongo-error';
import { PodPromoModel, type PodPromoDoc } from './podPromo.model';
import { RESTARTABLE_STATUSES, type BannerStyle, type PodPromoSource } from './podPromo.types';

/**
 * Who works on a pod's promotion, decided atomically.
 *
 * A promotion row is unique per pod, and a worker holds it by setting
 * `locked_until`; a crashed worker's lock simply runs out. Everything that
 * makes something (a link, a carousel, a post) happens while the row is held,
 * so two planner ticks, two servers or a tick and a person can never both
 * make a post for one pod.
 */
export const LOCK_MS = 10 * 60_000;
/** The planner gives a failed promotion this many tries before leaving it to a person. */
export const MAX_AUTO_ATTEMPTS = 3;

const unlocked = (now: Date) => ({ $or: [{ locked_until: null }, { locked_until: { $lt: now } }] });

export interface ClaimInput {
  podId: Types.ObjectId;
  podStart: Date;
  style: BannerStyle;
  source: PodPromoSource;
  now: Date;
  /** A person may start again a cancelled, skipped or failed promotion; the planner only resumes or retries. */
  restart: boolean;
  userId: string | null;
}

/** A new row for a pod that never had one; null when someone else just made it. */
async function claimNew(input: ClaimInput): Promise<PodPromoDoc | null> {
  try {
    const doc = await PodPromoModel.create({
      pod_id: input.podId,
      pod_start: input.podStart,
      style: input.style,
      source: input.source,
      status: 'PLANNED',
      locked_until: new Date(input.now.getTime() + LOCK_MS),
      created_by: input.userId && Types.ObjectId.isValid(input.userId) ? input.userId : null,
    });
    return doc.toObject<PodPromoDoc>();
  } catch (error) {
    if (isDuplicateKeyError(error)) return null;
    throw error;
  }
}

/** The states the existing row may be picked up from. */
function claimable(input: ClaimInput): Record<string, unknown> {
  if (input.restart) return { status: { $in: [...RESTARTABLE_STATUSES, 'PLANNED', 'BANNER_READY'] } };
  return {
    $or: [
      { status: { $in: ['PLANNED', 'BANNER_READY'] } },
      // A failed attempt that never made a post is retried a few times; one with a post is a person's call.
      { status: 'FAILED', attempts: { $lt: MAX_AUTO_ATTEMPTS }, scheduled_post_id: null },
    ],
  };
}

/**
 * Hold the pod's promotion row: make it, or take over a resumable one.
 * Null when another worker holds it or it is past the point of starting over.
 */
export async function claimPromo(input: ClaimInput): Promise<PodPromoDoc | null> {
  const existing = await PodPromoModel.exists({ pod_id: input.podId });
  if (!existing) return claimNew(input);
  const restartReset = input.restart
    ? { status: 'PLANNED', source: input.source, slides: [], caption: '', hashtags: [], scheduled_post_id: null, post_status: '', permalink: '', scheduled_at: null, published_at: null, error: '', attempts: 0 }
    : {};
  return PodPromoModel.findOneAndUpdate(
    { pod_id: input.podId, $and: [unlocked(input.now), claimable(input)] },
    { $set: { ...restartReset, locked_until: new Date(input.now.getTime() + LOCK_MS) } },
    { new: true }
  ).lean<PodPromoDoc>();
}

/** Let go of the row with whatever the worker last wrote. */
export async function releasePromo(id: Types.ObjectId, set: Record<string, unknown>, inc?: Record<string, number>): Promise<PodPromoDoc | null> {
  return PodPromoModel.findByIdAndUpdate(id, { $set: { ...set, locked_until: null }, ...(inc ? { $inc: inc } : {}) }, { new: true }).lean<PodPromoDoc>();
}
