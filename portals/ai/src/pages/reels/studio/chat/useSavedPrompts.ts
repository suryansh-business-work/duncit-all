import { useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { AI_PROMPTS, CREATE_AI_PROMPT, DELETE_AI_PROMPT, type AiPrompt } from '@duncit/ai-prompts';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import type { ReelPromptFormValues } from '../../../../forms/reel-prompt';
import { REEL_PROMPT_CATEGORY } from '../../types';

const FILTER = { kind: 'AI', category: REEL_PROMPT_CATEGORY, is_active: true } as const;
const EMPTY: AiPrompt[] = [];

/**
 * Requests worth keeping — "cut a 15 second teaser with captions" — saved once
 * and reused on every reel.
 *
 * They are AI Library prompts, not a store of the studio's own: a saved request
 * is exactly what the library's AI kind is for, so it can be reworded, switched
 * off or deleted from AI Library like any other, and nothing here duplicates
 * that page. The studio only files them under its own category and reads that
 * category back.
 */
export function useSavedPrompts() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { data, refetch } = useQuery<{ aiPrompts: AiPrompt[] }>(AI_PROMPTS, {
    variables: { filter: FILTER },
    fetchPolicy: 'cache-and-network',
  });
  const [createPrompt, { loading: saving }] = useMutation(CREATE_AI_PROMPT);
  const [deletePrompt] = useMutation(DELETE_AI_PROMPT);

  /** Answers true when the prompt was saved, so the dialog knows to close. */
  const save = useCallback(
    async (values: ReelPromptFormValues): Promise<boolean> => {
      try {
        await createPrompt({
          variables: { input: { name: values.name, content: values.content, category: REEL_PROMPT_CATEGORY } },
        });
        await refetch();
        notifySuccess(t('ai.reels.prompts.saved'));
        return true;
      } catch (error) {
        notifyError(parseApiError(error, t('ai.reels.prompts.saveFailed')));
        return false;
      }
    },
    [createPrompt, refetch, t]
  );

  const remove = useCallback(
    async (prompt: AiPrompt) => {
      const ok = await confirm({
        title: t('ai.reels.prompts.deleteTitle'),
        message: t('ai.reels.prompts.deleteMessage', { vars: { name: prompt.name } }),
        confirmLabel: t('shell.common.delete'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await deletePrompt({ variables: { id: prompt.id } });
        await refetch();
        notifySuccess(t('ai.reels.prompts.deleted'));
      } catch (error) {
        notifyError(parseApiError(error, t('ai.reels.prompts.deleteFailed')));
      }
    },
    [confirm, deletePrompt, refetch, t]
  );

  return { prompts: data?.aiPrompts ?? EMPTY, save, saving, remove };
}

export type SavedPrompts = ReturnType<typeof useSavedPrompts>;
