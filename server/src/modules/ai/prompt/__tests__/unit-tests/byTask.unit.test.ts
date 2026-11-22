/**
 * The AI Features ↔ code prompts join.
 *
 * It is derived from each catalogue prompt's `tasks`, so it must agree with the
 * catalogue exactly: every prompt appears under each feature it names and under
 * no other, in catalogue order (SYSTEM above its USER turn), and the declared
 * prompt-less features are real features with no prompt and a reason.
 */
import { CODE_PROMPTS } from '../../catalog';
import {
  CODE_PROMPTS_BY_TASK,
  PROMPTLESS_TASKS,
  codePromptsForTask,
  promptlessReason,
} from '../../catalog/byTask';
import { OPENAI_TASK_KEYS } from '@modules/ai/openaiUsage/openaiUsage.tasks';

describe('CODE_PROMPTS_BY_TASK', () => {
  it('files every catalogue prompt under each feature it names, and nowhere else', () => {
    for (const prompt of CODE_PROMPTS) {
      for (const task of prompt.tasks) {
        expect(CODE_PROMPTS_BY_TASK.get(task)).toContain(prompt);
      }
    }
    for (const [task, prompts] of CODE_PROMPTS_BY_TASK) {
      for (const prompt of prompts) expect(prompt.tasks).toContain(task);
    }
  });

  it('only uses feature keys from the AI Features catalogue', () => {
    for (const task of CODE_PROMPTS_BY_TASK.keys()) {
      expect(OPENAI_TASK_KEYS).toContain(task);
    }
  });

  it('keeps a feature’s SYSTEM turn above its USER turn', () => {
    expect(codePromptsForTask('moderation.pod').map((prompt) => [prompt.key, prompt.role])).toEqual([
      ['moderation.pod', 'SYSTEM'],
      ['moderation.pod.user', 'USER'],
    ]);
  });

  it('lists every prompt pair of a feature served by more than one', () => {
    const keys = codePromptsForTask('crm.lead_parse').map((prompt) => prompt.key);

    expect(keys).toEqual(expect.arrayContaining(['crm.parse_lead', 'crm.parse_lead.user', 'crm.parse_leads']));
  });
});

describe('codePromptsForTask', () => {
  it('answers an empty list for an unknown or prompt-less feature', () => {
    expect(codePromptsForTask('not.a.feature')).toEqual([]);
    expect(codePromptsForTask('automation.compose')).toEqual([]);
  });
});

describe('PROMPTLESS_TASKS', () => {
  it('names only real features that truly have no code prompt, each with a reason', () => {
    for (const [task, reason] of Object.entries(PROMPTLESS_TASKS)) {
      expect(OPENAI_TASK_KEYS).toContain(task);
      expect(codePromptsForTask(task)).toHaveLength(0);
      expect(reason?.trim()).not.toBe('');
    }
  });

  it('covers every feature the catalogue leaves without a prompt', () => {
    const uncovered = OPENAI_TASK_KEYS.filter(
      (task) => codePromptsForTask(task).length === 0 && promptlessReason(task) === null,
    );

    expect(uncovered).toEqual([]);
  });
});

describe('promptlessReason', () => {
  it('gives the reason for a prompt-less feature and null otherwise', () => {
    expect(promptlessReason('automation.classify')).toMatch(/flow builder/);
    expect(promptlessReason('moderation.pod')).toBeNull();
    expect(promptlessReason('not.a.feature')).toBeNull();
  });
});
