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

describe('the Reel Studio production line', () => {
  it.each(['reels.ideas', 'reels.script', 'reels.variants', 'reels.recommend'] as const)('%s is a Marketing feature with its own switch', (key) => {
    expect(isOpenAiTaskKey(key)).toBe(true);
    expect(OPENAI_TASKS[key].module).toBe('Marketing');
    expect(openAiTaskOptions().find((option) => option.key === key)).toEqual({ key, label: OPENAI_TASKS[key].label, module: 'Marketing' });
  });

  it('keeps the chat editor where it was', () => {
    expect(OPENAI_TASKS['reels.director'].module).toBe('Reel Studio');
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
