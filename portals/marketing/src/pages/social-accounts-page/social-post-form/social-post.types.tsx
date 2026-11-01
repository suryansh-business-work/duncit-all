import { z } from 'zod';
import { mediaTypeForUrl } from '@duncit/utils';
import type { Translate } from '@duncit/shell';
import { PLATFORM_LABEL } from '../copy';
import type { SocialAccount } from '../queries';
import type { SocialPostMedia, SocialPublishMode, SocialScheduledPost, SocialScheduledPostInput } from '../publish.queries';
import { collaboratorsSchema } from '../../../components/collaborators';
import { platformProblems } from './publish-rules';

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
}

export const blankSocialPostValues = (initial?: Partial<SocialPostFormValues>): SocialPostFormValues => ({
  account_ids: [],
  text: '',
  media: [],
  scheduled_at: '',
  mode: 'SCHEDULE',
  needs_approval: false,
  collaborators: [],
  ...initial,
});

/** A media item for a URL nobody typed a kind for — the kind is read off the address. */
export const mediaFromUrl = (url: string): SocialPostMedia => ({ url, type: mediaTypeForUrl(url) });

/** A post's media list, falling back to the single URL posts carried before carousels. */
export function postMedia(post: Pick<SocialScheduledPost, 'media' | 'media_url' | 'media_type'>): SocialPostMedia[] {
  if (post.media.length > 0) return post.media.map(({ url, type }) => ({ url, type }));
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
  for (const platform of platforms) {
    const network = t(PLATFORM_LABEL[platform]);
    for (const problem of platformProblems(platform, values.text, values.media)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [problem.field],
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
      media: z.array(z.object({ url: z.string(), type: z.enum(['IMAGE', 'VIDEO']) })),
      scheduled_at: z.string(),
      mode: z.enum(['DRAFT', 'SCHEDULE', 'NOW']),
      needs_approval: z.boolean(),
      collaborators: collaboratorsSchema(t),
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
    // Only the two fields the input takes — a row read back from the server also carries __typename.
    media: values.media.map(({ url, type }) => ({ url, type })),
    account_ids: values.account_ids,
    mode: values.mode,
    scheduled_at: values.scheduled_at || null,
    idea_id: ideaId,
    needs_approval: values.needs_approval,
    reel_project_id: reelProjectId,
    collaborators: values.collaborators,
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
