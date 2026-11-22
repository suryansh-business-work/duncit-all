import type { OpenAiTaskKey } from '@modules/ai/openaiUsage/openaiUsage.tasks';
import type { InAppPromptDef } from '../prompt.types';
import { CODE_PROMPTS } from './index';

/**
 * The join between AI Features and the AI Library's code prompts, read from ONE
 * place.
 *
 * Every catalogue prompt already declares the feature keys it runs under
 * (`tasks`), typed against the feature catalogue, so a prompt cannot name a
 * feature that does not exist. Everything that answers "which prompt does this
 * feature run on" (the AI Features column, both dashboards, the check:prompts
 * gate) derives from this map, so there is no second list to fall out of step
 * with the catalogue.
 *
 * Catalogue order is kept, so a feature's SYSTEM turn sits above its USER turn.
 */
export const CODE_PROMPTS_BY_TASK: ReadonlyMap<string, readonly InAppPromptDef[]> = (() => {
  const byTask = new Map<string, InAppPromptDef[]>();
  for (const prompt of CODE_PROMPTS) {
    for (const task of prompt.tasks) {
      const list = byTask.get(task) ?? [];
      list.push(prompt);
      byTask.set(task, list);
    }
  }
  return byTask;
})();

/**
 * Features that run with no catalogue prompt, and why.
 *
 * An automation AI step chooses its own AI Library prompt in the flow builder,
 * so no single code prompt belongs to it. Listing the exceptions here (rather
 * than letting any feature go without a prompt) is what lets the check:prompts
 * gate fail the build when a new feature ships with no prompt mapped.
 */
export const PROMPTLESS_TASKS: Readonly<Partial<Record<OpenAiTaskKey, string>>> = {
  'automation.compose': 'Each AI reply step uses the AI Library prompt picked on that step in the flow builder.',
  'automation.classify': 'Each AI sort step uses the AI Library prompt picked on that step in the flow builder.',
  'ask_duncit.transcribe': 'Speech-to-text: the audio is the whole input, there is no prompt.',
  'ask_duncit.speak': 'Text-to-speech: the answer being read aloud is the whole input, there is no prompt.',
};

/** The code prompts one feature runs on; empty for an unknown or prompt-less feature. */
export const codePromptsForTask = (task: string): readonly InAppPromptDef[] =>
  CODE_PROMPTS_BY_TASK.get(task) ?? [];

/** Why a feature has no code prompt, or null when it has one (or is unknown). */
export const promptlessReason = (task: string): string | null =>
  (PROMPTLESS_TASKS as Record<string, string | undefined>)[task] ?? null;
