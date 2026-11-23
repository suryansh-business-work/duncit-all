import { z } from 'zod';

/** Rename a conversation: 1–120 characters, trimmed (the server applies the same limit). */

type Translate = (key: string, opts?: { vars?: Record<string, string | number> }) => string;

export const TITLE_MAX = 120;

export const makeRenameSchema = (t: Translate) =>
  z.object({
    title: z.string().trim().min(1, t('intel.chats.rename.required')).max(TITLE_MAX, t('intel.chats.rename.tooLong', { vars: { max: TITLE_MAX } })),
  });

export type RenameValues = z.input<ReturnType<typeof makeRenameSchema>>;
export type RenameOutput = z.output<ReturnType<typeof makeRenameSchema>>;
