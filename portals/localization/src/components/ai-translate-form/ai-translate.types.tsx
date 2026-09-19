import { z } from 'zod';
import type { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * What a run sends, in the order the form offers them. OUTDATED leads because
 * it is the one that keeps a language honest: the gaps AND every key whose
 * English changed since it was translated — "sync with English".
 */
export const AI_TRANSLATE_SCOPES = ['OUTDATED', 'MISSING', 'ALL'] as const;
export type AiTranslateScope = (typeof AI_TRANSLATE_SCOPES)[number];

export const aiTranslateSchema = (t: Translate) =>
  z.object({
    locales: z.array(z.string()).min(1, t('localization.ai.languagesRequired')),
    scope: z.enum(AI_TRANSLATE_SCOPES),
  });

export type AiTranslateValues = z.infer<ReturnType<typeof aiTranslateSchema>>;

/** Narrow a run to one page of keys — the surface + page a namespace shares. */
export interface AiTranslateNamespace {
  surface: string;
  page: string;
}

/** How many keys a run would send for one language. */
export interface PendingRow {
  locale: string;
  keys: number;
}
