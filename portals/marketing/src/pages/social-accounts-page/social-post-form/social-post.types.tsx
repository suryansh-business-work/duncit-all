import { z } from 'zod';
import { mediaTypeForUrl } from '@duncit/utils';
import type { Translate } from '@duncit/shell';
import { PLATFORM_LABEL } from '../copy';
import type { SocialAccount } from '../queries';
import type { SocialPublishMode, SocialScheduledPostInput } from '../publish.queries';
import { platformProblems } from './publish-rules';

/** A minute of grace, matching the server, so "now-ish" is not refused as the past. */
const PAST_GRACE_MS = 60_000;

export interface SocialPostFormValues {
  account_ids: string[];
  text: string;
  media_url: string;
  /** ISO string; '' when not picked. */
  scheduled_at: string;
  /** Which button was pressed — it decides what has to be valid. */
  mode: SocialPublishMode;
}

export const blankSocialPostValues = (initial?: Partial<SocialPostFormValues>): SocialPostFormValues => ({
  account_ids: [],
  text: '',
  media_url: '',
  scheduled_at: '',
  mode: 'SCHEDULE',
  ...initial,
});

type Ctx = z.RefinementCtx;

function addScheduleIssue(values: SocialPostFormValues, ctx: Ctx, t: Translate) {
  if (values.mode !== 'SCHEDULE') return;
  const at = Date.parse(values.scheduled_at);
  if (!values.scheduled_at || Number.isNaN(at) || at < Date.now() - PAST_GRACE_MS) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scheduled_at'], message: t('marketing.social.pickFutureTime') });
  }
}

function addPlatformIssues(values: SocialPostFormValues, ctx: Ctx, t: Translate, accounts: SocialAccount[]) {
  const media = values.media_url ? mediaTypeForUrl(values.media_url) : null;
  const chosen = new Set(values.account_ids);
  const platforms = new Set(accounts.filter((account) => chosen.has(account.id)).map((account) => account.platform));
  for (const platform of platforms) {
    const network = t(PLATFORM_LABEL[platform]);
    for (const problem of platformProblems(platform, values.text, media)) {
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
      media_url: z.string().trim(),
      scheduled_at: z.string(),
      mode: z.enum(['DRAFT', 'SCHEDULE', 'NOW']),
    })
    .superRefine((values, ctx) => {
      if (!values.text.trim() && !values.media_url) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['text'], message: t('marketing.social.writeSomething') });
      }
      if (values.mode === 'DRAFT') return;
      if (values.account_ids.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['account_ids'], message: t('marketing.social.pickAccount') });
      }
      addScheduleIssue(values, ctx, t);
      addPlatformIssues(values, ctx, t, accounts);
    });

export function toSocialPostInput(values: SocialPostFormValues, ideaId: string | null): SocialScheduledPostInput {
  const media = values.media_url.trim();
  return {
    text: values.text,
    media_url: media || null,
    media_type: media ? mediaTypeForUrl(media) : null,
    account_ids: values.account_ids,
    mode: values.mode,
    scheduled_at: values.scheduled_at || null,
    idea_id: ideaId,
  };
}

export interface SocialPostFormProps {
  accounts: SocialAccount[];
  initial: SocialPostFormValues;
  /** What the last submit failed with (the server's rules are the final word). */
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (values: SocialPostFormValues) => Promise<void>;
}
