import { z } from 'zod';
import { mediaTypeForUrl } from '@duncit/utils';
import type { Translate } from '@duncit/shell';
import { PLATFORM_LABEL } from '../copy';
import type { SocialAccount, SocialPlatform } from '../queries';
import type { SocialPostMedia, SocialPostType, SocialPublishMode, SocialScheduledPost, SocialScheduledPostInput } from '../publish.queries';
import { collaboratorsSchema } from '../../../components/collaborators';
import { PUBLISH_RULES, platformProblems } from './publish-rules';

/** A minute of grace, matching the server, so "now-ish" is not refused as the past. */
const PAST_GRACE_MS = 60_000;

export interface SocialPostFormValues {
  account_ids: string[];
  text: string;
  /** In the order the networks show them; one item is a plain post, more a carousel. */
  media: SocialPostMedia[];
  /** ISO string; '' when not picked. */
  scheduled_at: string;
  /** Which button was pressed — it decides what has to be valid. */
  mode: SocialPublishMode;
  /** Park the post for a manager instead of sending it straight out. */
  needs_approval: boolean;
  /** Instagram usernames invited as collaborators; only sent when an Instagram account is picked. */
  collaborators: string[];
  /** FEED, REEL or STORY; Reels and Stories are Instagram's. */
  post_type: SocialPostType;
  /** A network's own caption, by network; an empty one means the main text. */
  captions: Record<string, string>;
  /** Posted under the Instagram post or reel once it is out. */
  first_comment: string;
}

export const blankSocialPostValues = (initial?: Partial<SocialPostFormValues>): SocialPostFormValues => ({
  account_ids: [],
  text: '',
  media: [],
  scheduled_at: '',
  mode: 'SCHEDULE',
  needs_approval: false,
  collaborators: [],
  post_type: 'FEED',
  captions: {},
  first_comment: '',
  ...initial,
});

const isPlatform = (key: string): key is SocialPlatform => Object.hasOwn(PUBLISH_RULES, key);

const positive = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

/** An item with only the measurements it really has — and only the fields the input takes (a row read back carries __typename). */
export const keepMeasured = (item: SocialPostMedia): SocialPostMedia => ({
  url: item.url,
  type: item.type,
  ...(positive(item.width) && positive(item.height) ? { width: item.width, height: item.height } : {}),
  ...(positive(item.duration_s) ? { duration_s: item.duration_s } : {}),
});

/** A saved post's type, captions and first comment as the form holds them. */
export const postOptionsOf = (post: Pick<SocialScheduledPost, 'post_type' | 'captions' | 'first_comment'>) => ({
  post_type: post.post_type,
  captions: Object.fromEntries(post.captions.map((caption) => [caption.platform, caption.text])),
  first_comment: post.first_comment,
});

/** A media item for a URL nobody typed a kind for — the kind is read off the address. */
export const mediaFromUrl = (url: string): SocialPostMedia => ({ url, type: mediaTypeForUrl(url) });

/** A post's media list, falling back to the single URL posts carried before carousels. */
export function postMedia(post: Pick<SocialScheduledPost, 'media' | 'media_url' | 'media_type'>): SocialPostMedia[] {
  if (post.media.length > 0) return post.media.map(keepMeasured);
  if (!post.media_url) return [];
  return [{ url: post.media_url, type: post.media_type ?? mediaTypeForUrl(post.media_url) }];
}

/** The reviewer's note, which is for the author on the draft the post came back as — not once it is on its way again. */
export const sentBackNote = (post: Pick<SocialScheduledPost, 'status' | 'review_note'>): string | null =>
  post.status === 'DRAFT' ? post.review_note : null;

type Ctx = z.RefinementCtx;

function addScheduleIssue(values: SocialPostFormValues, ctx: Ctx, t: Translate) {
  if (values.mode !== 'SCHEDULE') return;
  const at = Date.parse(values.scheduled_at);
  if (!values.scheduled_at || Number.isNaN(at) || at < Date.now() - PAST_GRACE_MS) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scheduled_at'], message: t('marketing.social.pickFutureTime') });
  }
}

function addPlatformIssues(values: SocialPostFormValues, ctx: Ctx, t: Translate, accounts: SocialAccount[]) {
  const chosen = new Set(values.account_ids);
  const platforms = new Set(accounts.filter((account) => chosen.has(account.id)).map((account) => account.platform));
  const options = { post_type: values.post_type, captions: values.captions, first_comment: values.first_comment };
  for (const platform of platforms) {
    const network = t(PLATFORM_LABEL[platform]);
    for (const problem of platformProblems(platform, values.text, values.media, options)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: problem.field.split('.'),
        message: t(problem.key, { vars: { ...problem.vars, network } }),
      });
    }
  }
}

/**
 * A draft only needs something in it. Publishing now also needs accounts
 * that can each take it; scheduling needs all that and a time ahead.
 */
export const socialPostSchema = (t: Translate, accounts: SocialAccount[]) =>
  z
    .object({
      account_ids: z.array(z.string()),
      text: z.string(),
      media: z.array(
        z.object({
          url: z.string(),
          type: z.enum(['IMAGE', 'VIDEO']),
          width: z.number().nullish(),
          height: z.number().nullish(),
          duration_s: z.number().nullish(),
        })
      ),
      scheduled_at: z.string(),
      mode: z.enum(['DRAFT', 'SCHEDULE', 'NOW']),
      needs_approval: z.boolean(),
      collaborators: collaboratorsSchema(t),
      post_type: z.enum(['FEED', 'REEL', 'STORY']),
      captions: z.record(z.string(), z.string()),
      first_comment: z.string(),
    })
    .superRefine((values, ctx) => {
      if (!values.text.trim() && values.media.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['text'], message: t('marketing.social.writeSomething') });
      }
      if (values.mode === 'DRAFT') return;
      if (values.account_ids.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['account_ids'], message: t('marketing.social.pickAccount') });
      }
      addScheduleIssue(values, ctx, t);
      addPlatformIssues(values, ctx, t, accounts);
    });

export function toSocialPostInput(values: SocialPostFormValues, ideaId: string | null, reelProjectId: string | null = null): SocialScheduledPostInput {
  return {
    text: values.text,
    media: values.media.map(keepMeasured),
    account_ids: values.account_ids,
    mode: values.mode,
    scheduled_at: values.scheduled_at || null,
    idea_id: ideaId,
    needs_approval: values.needs_approval,
    reel_project_id: reelProjectId,
    collaborators: values.collaborators,
    post_type: values.post_type,
    // Only networks with words of their own; the server keeps the ones the post goes to.
    captions: Object.entries(values.captions).flatMap(([platform, text]) =>
      isPlatform(platform) && text.trim() ? [{ platform, text: text.trim() }] : []
    ),
    first_comment: values.first_comment.trim(),
  };
}

export interface SocialPostFormProps {
  accounts: SocialAccount[];
  initial: SocialPostFormValues;
  /** What the last submit failed with (the server's rules are the final word). */
  errorMessage?: string | null;
  /** A reviewer's note on a post sent back to the author. */
  reviewNote?: string | null;
  onCancel: () => void;
  onSubmit: (values: SocialPostFormValues) => Promise<void>;
}
