import { useMemo } from 'react';
import { makePodSchema } from './schema';
import type { Translate } from './i18n/useTranslation';
import type { PodFormConfig } from './types';

/**
 * The form's Zod schema.
 *
 * Rebuilt when the language changes: a Zod message is baked in at schema build
 * time, so a schema memoised on `config` alone would keep showing the language
 * that was active when the form first mounted.
 */
export function usePodSchema(config: PodFormConfig, t: Translate) {
  return useMemo(() => makePodSchema(config, t), [config, t]);
}
