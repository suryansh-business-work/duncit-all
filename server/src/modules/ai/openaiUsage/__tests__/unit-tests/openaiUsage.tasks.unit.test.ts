/**
 * The OpenAI task catalogue is also the AI Features registry: every key gets an
 * On/Off switch, so every key must say what it does and what the product does
 * instead while it is off — and a client-supplied key is only a feature if it
 * is really in the catalogue (not an inherited object property).
 */
import {
  OPENAI_TASKS,
  OPENAI_TASK_KEYS,
  isOpenAiTaskKey,
  openAiModules,
  openAiTaskOptions,
} from '../../openaiUsage.tasks';

describe('OPENAI_TASKS as the AI Features registry', () => {
  it.each(OPENAI_TASK_KEYS)('%s explains itself and its switched-off fallback', (key) => {
    const meta = OPENAI_TASKS[key];

    expect(meta.label.trim()).not.toBe('');
    expect(meta.module.trim()).not.toBe('');
    expect(meta.description.trim()).not.toBe('');
    expect(meta.when_off.trim()).not.toBe('');
  });
});

describe('isOpenAiTaskKey', () => {
  it('accepts every catalogue key', () => {
    expect(OPENAI_TASK_KEYS.every((key) => isOpenAiTaskKey(key))).toBe(true);
  });

  it.each(['', 'moderation', 'moderation.pod ', 'MODERATION.POD', 'toString', '__proto__', 'constructor'])(
    'rejects %p',
    (key) => {
      expect(isOpenAiTaskKey(key)).toBe(false);
    },
  );
});

describe('catalogue options', () => {
  it('offers one option per task, labelled from the catalogue', () => {
    const options = openAiTaskOptions();

    expect(options).toHaveLength(OPENAI_TASK_KEYS.length);
    expect(options.find((option) => option.key === 'askbot.navigation')).toEqual({
      key: 'askbot.navigation',
      label: OPENAI_TASKS['askbot.navigation'].label,
      module: 'Ask Bot',
    });
  });

  it('lists each module once, sorted', () => {
    const modules = openAiModules();

    expect(new Set(modules).size).toBe(modules.length);
    expect([...modules].sort((a, b) => a.localeCompare(b))).toEqual(modules);
  });
});
