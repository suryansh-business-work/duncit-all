import { Types } from 'mongoose';
import { getAppTimeZone } from '@utils/app-time';
import { isPodHidden } from '@utils/hidden';
import { PodModel } from '@modules/pods/pod/pod.model';
import type { RunContext } from '../runs/marketingRun.service';
import { PodPromoModel, type PodPromoDoc, type PodPromoSettingsDoc } from './podPromo.model';
import { isEditable, isOut, postState, removePromoPost, rewritePromoPost, type PostState } from './podPromo.post';
import { generateCarousel } from './podPromo.generate';
import { postSlot } from './podPromo.schedule';

/**
 * Keep each waiting post in step with its pod.
 *
 * - The post went out: the promotion is PUBLISHED, with its link.
 * - The post failed, or a person deleted it: recorded, nothing re-made.
 * - The pod was cancelled, unpublished or hidden: the waiting post is removed
 *   (its approval run closed) and the promotion CANCELLED.
 * - The pod moved: a fresh carousel (the slides print the date) and the post
 *   moves to the new slot — or is removed when the new start is too close.
 *
 * Mirror-only changes are written straight away; changes that act on a post
 * are returned as work for the planner's run, so a quiet tick leaves no run.
 */
const MOVED_MS = 60_000;
const SYNC_LIMIT = 200;

interface PodNow {
  _id: Types.ObjectId;
  pod_date_time: Date;
  deleted_at?: Date | null;
  completed_at?: Date | null;
  is_active?: boolean;
  is_hidden?: boolean;
  hidden_by_club?: boolean;
  venue_approval_status?: string;
}

export type SyncAction = { kind: 'CANCEL'; promo: PodPromoDoc; reason: string } | { kind: 'MOVE'; promo: PodPromoDoc; pod: PodNow; state: PostState };

/** Why the pod should no longer be promoted, or '' when it still should. */
export function goneReason(pod: PodNow | null): string {
  if (!pod || pod.deleted_at) return 'The pod was cancelled.';
  if (pod.completed_at) return 'The pod is over.';
  if (pod.is_active === false || ['PENDING', 'DECLINED'].includes(pod.venue_approval_status ?? '')) return 'The pod is no longer published.';
  if (isPodHidden(pod)) return 'The pod was hidden from members.';
  return '';
}

const mirror = (promo: PodPromoDoc, set: Record<string, unknown>) => PodPromoModel.updateOne({ _id: promo._id, status: promo.status }, { $set: set });

/** Read every waiting promotion, record what is only bookkeeping, and return the changes that need a run. */
export async function findSyncActions(): Promise<SyncAction[]> {
  const waiting = await PodPromoModel.find({ status: 'SCHEDULED' }).sort({ scheduled_at: 1 }).limit(SYNC_LIMIT).lean<PodPromoDoc[]>();
  const pods = await PodModel.find({ _id: { $in: waiting.map((promo) => promo.pod_id) } })
    .setOptions({ includeDeleted: true })
    .select('pod_date_time deleted_at completed_at is_active is_hidden hidden_by_club venue_approval_status')
    .lean<PodNow[]>();
  const byId = new Map(pods.map((pod) => [String(pod._id), pod]));
  const actions: SyncAction[] = [];
  for (const promo of waiting) {
    const state = await postState(promo.scheduled_post_id);
    if (!state) {
      await mirror(promo, { status: 'CANCELLED', post_status: '', error: 'The post was deleted in Publishing.' });
    } else if (isOut(state)) {
      await mirror(promo, { status: 'PUBLISHED', post_status: state.status, permalink: state.permalink, published_at: state.published_at });
    } else if (state.status === 'FAILED') {
      await mirror(promo, { status: 'FAILED', post_status: state.status, error: state.error || 'The post failed to go out; retry it from Publishing.' });
    } else if (isEditable(state)) {
      const pod = byId.get(String(promo.pod_id)) ?? null;
      const reason = goneReason(pod);
      if (reason) actions.push({ kind: 'CANCEL', promo, reason });
      else if (pod && Math.abs(pod.pod_date_time.getTime() - promo.pod_start.getTime()) > MOVED_MS) actions.push({ kind: 'MOVE', promo, pod, state });
      else if (state.status !== promo.post_status) await mirror(promo, { post_status: state.status, scheduled_at: state.scheduled_at });
    }
  }
  return actions;
}

async function cancel(promo: PodPromoDoc, reason: string): Promise<string> {
  if (!(await removePromoPost(promo.scheduled_post_id))) return 'the post is going out right now; checked again next tick';
  await mirror(promo, { status: 'CANCELLED', post_status: '', error: reason });
  return reason;
}

async function move(action: Extract<SyncAction, { kind: 'MOVE' }>, settings: PodPromoSettingsDoc, run: RunContext, now: Date): Promise<string> {
  const { promo, pod, state } = action;
  const slot = postSlot({ start: pod.pod_date_time, now, daysBefore: settings.days_before, postHour: settings.post_hour, zone: getAppTimeZone() });
  if (!slot) {
    await removePromoPost(promo.scheduled_post_id);
    await mirror(promo, { status: 'SKIPPED', pod_start: pod.pod_date_time, post_status: '', error: 'The pod moved too close to its start to promote.' });
    return 'moved too close to promote; post removed';
  }
  const userId = settings.updated_by ? String(settings.updated_by) : String(promo.created_by ?? '');
  const made = await generateCarousel(
    { podId: String(promo.pod_id), style: promo.style, size: promo.banner_style, cta_text: settings.cta_text, utm_prefix: settings.utm_prefix, userId, stepPrefix: `${String(promo.pod_id)}:move` },
    run
  );
  const post = await rewritePromoPost(
    String(promo.scheduled_post_id),
    state,
    { text: state.text, slides: made.slides, account_ids: state.account_ids, scheduled_at: slot, needs_approval: settings.needs_approval, pod_id: String(promo.pod_id), collaborators: promo.collaborators },
    userId
  );
  await mirror(promo, { pod_start: pod.pod_date_time, slides: made.slides, scheduled_at: slot, post_status: post.status, error: '' });
  return `moved to ${slot.toISOString()}`;
}

/** Carry out one change as a step of the planner's run. */
export function applySyncAction(action: SyncAction, settings: PodPromoSettingsDoc, run: RunContext, now: Date): Promise<string> {
  const key = `${String(action.promo.pod_id)}:sync`;
  if (action.kind === 'CANCEL') return run.step(key, `Cancel: ${action.promo.pod_title}`, () => cancel(action.promo, action.reason), { summarize: (s) => s });
  return run.step(key, `Move: ${action.promo.pod_title}`, () => move(action, settings, run, now), { summarize: (s) => s });
}
