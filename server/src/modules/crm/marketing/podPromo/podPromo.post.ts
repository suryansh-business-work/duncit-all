import { GraphQLError } from 'graphql';
import { SocialScheduledPostModel } from '../social/social.publish.model';
import { socialPublishService } from '../social/social.publish.service';
import type { BannerSlide } from './podPromo.types';

/**
 * The promotion's post in Publishing, made and changed only through the
 * composer's own service — so the same checks (each network's rules, expired
 * accounts, the approval run) apply as to a post a person writes, and it shows
 * on the Calendar, Queue and Approvals like any other.
 */
export interface PromoPost {
  text: string;
  slides: readonly BannerSlide[];
  account_ids: readonly string[];
  scheduled_at: Date;
  needs_approval: boolean;
  pod_id: string;
  collaborators: readonly string[];
}

/** A post in these states has not gone out and can still be changed or removed. */
const EDITABLE = new Set(['DRAFT', 'PENDING_APPROVAL', 'SCHEDULED']);
const OUT = new Set(['PUBLISHED', 'PARTIAL']);

export interface PostState {
  status: string;
  scheduled_at: Date | null;
  account_ids: string[];
  permalink: string;
  published_at: Date | null;
  error: string;
  text: string;
}

const media = (slides: readonly BannerSlide[]) => slides.map((slide) => ({ url: slide.url, type: 'IMAGE' as const }));

export async function createPromoPost(post: PromoPost, userId: string) {
  return socialPublishService.create(
    {
      text: post.text,
      media: media(post.slides),
      account_ids: [...post.account_ids],
      mode: 'SCHEDULE',
      scheduled_at: post.scheduled_at.toISOString(),
      needs_approval: post.needs_approval,
      pod_id: post.pod_id,
      collaborators: [...post.collaborators],
    },
    userId
  );
}

export async function postState(postId: unknown): Promise<PostState | null> {
  if (!postId) return null;
  const doc = await SocialScheduledPostModel.findById(postId)
    .select('status scheduled_at targets published_at text')
    .lean<{ status: string; scheduled_at: Date | null; published_at: Date | null; text?: string; targets: { account_id: string; permalink?: string; error?: string }[] }>();
  if (!doc) return null;
  return {
    status: doc.status,
    scheduled_at: doc.scheduled_at,
    account_ids: doc.targets.map((t) => t.account_id),
    permalink: doc.targets.find((t) => t.permalink)?.permalink ?? '',
    published_at: doc.published_at,
    error: doc.targets.map((t) => t.error).filter(Boolean).join('; '),
    text: doc.text ?? '',
  };
}

export const isEditable = (state: PostState | null) => !!state && EDITABLE.has(state.status);
export const isOut = (state: PostState | null) => !!state && OUT.has(state.status);

/**
 * Put new slides, text or time on a post that has not gone out. A post a
 * reviewer sent back stays a draft; one waiting for approval waits again
 * under a fresh run (the composer's update does that), since what it shows
 * has changed.
 */
export async function rewritePromoPost(postId: string, state: PostState, post: PromoPost, userId: string) {
  if (!EDITABLE.has(state.status)) {
    throw new GraphQLError('This post has already gone out and cannot be changed.', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return socialPublishService.update(
    postId,
    {
      text: post.text,
      media: media(post.slides),
      account_ids: state.account_ids,
      mode: state.status === 'DRAFT' ? 'DRAFT' : 'SCHEDULE',
      scheduled_at: post.scheduled_at.toISOString(),
      needs_approval: post.needs_approval,
      pod_id: post.pod_id,
      collaborators: [...post.collaborators],
    },
    userId
  );
}

/** Take a waiting post off the queue (closing its approval run). One that is going out right now is left. */
export async function removePromoPost(postId: unknown): Promise<boolean> {
  const state = await postState(postId);
  if (!state) return true;
  if (!EDITABLE.has(state.status)) return false;
  return socialPublishService.remove(String(postId));
}
