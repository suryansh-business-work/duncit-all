import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { RECORD_AI_PROMPT_EVENT } from '../../detailQueries';
import type { PortalEventInput } from '../../detailTypes';

/**
 * Count one portal interaction with a prompt (a view, a copy, a hand-off).
 *
 * Analytics never stands in the operator's way: a failed count goes to the
 * console for whoever is debugging, and the action it describes carries on.
 */
export function usePromptEvent() {
  const [recordMutation] = useMutation<{ recordAiPromptEvent: boolean }>(RECORD_AI_PROMPT_EVENT);
  return useCallback(
    (promptId: string, input: PortalEventInput) => {
      recordMutation({ variables: { id: promptId, type: input.type, platform: input.platform ?? null } }).catch(
        (err: unknown) => console.warn('[ai-prompts] could not record a prompt event', err),
      );
    },
    [recordMutation],
  );
}
