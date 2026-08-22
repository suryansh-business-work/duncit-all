import { useMemo } from 'react';
import { useTranslation } from '@duncit/app-settings';
import { promptCopy, type PromptCopy } from '../copy';

/**
 * The Prompt Library's copy, in the reader's language.
 *
 * The AI portal mounts the `ai.*` namespace through `mountPortal`, so the
 * console's own translator already answers every `ai.library.*` key; this hook
 * only shapes them into the object the components render from.
 */
export function usePromptCopy(): PromptCopy {
  const { t } = useTranslation();
  return useMemo(() => promptCopy(t), [t]);
}
