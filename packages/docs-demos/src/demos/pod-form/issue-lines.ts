import type { makePodSchema } from '@duncit/pod-form';

/** What a Zod result says is still missing, one line per issue. */
export const issueLines = (parsed: ReturnType<ReturnType<typeof makePodSchema>['safeParse']>) =>
  parsed.success
    ? []
    : parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '(form)'} — ${issue.message}`)
        .slice(0, 12);
