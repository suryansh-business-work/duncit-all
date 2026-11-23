import { describe, expect, it } from 'vitest';
import { makeChatSchema, makeModelsSchema } from './models.types';

const t = (key: string, options?: { vars?: Record<string, string | number> }) => (options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key);
const models = makeModelsSchema(t);
const chat = makeChatSchema(t);
const gpt4o = { id: 'gpt-4o', label: 'GPT-4o', enabled: true, is_default: true };
const mini = { id: 'gpt-4o-mini', label: 'GPT-4o mini', enabled: true, is_default: false };
const issues = (schema: typeof models | typeof chat, values: Record<string, unknown>) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('model list validation', () => {
  it('accepts one enabled default among several models', () => {
    expect(issues(models, { models: [gpt4o, mini] })).toEqual([]);
  });

  it('needs exactly one enabled default', () => {
    expect(issues(models, { models: [{ ...gpt4o, is_default: false }, mini] })).toEqual(['models: intel.settings.models.oneDefault']);
    expect(issues(models, { models: [gpt4o, { ...mini, is_default: true }] })).toEqual(['models: intel.settings.models.oneDefault']);
    expect(issues(models, { models: [{ ...gpt4o, enabled: false }, mini] })).toEqual(['models: intel.settings.models.oneDefault']);
  });

  it('refuses duplicate ids, empty lists and malformed ids', () => {
    expect(issues(models, { models: [gpt4o, { ...mini, id: 'gpt-4o' }] })).toEqual(['models: intel.settings.models.unique']);
    expect(issues(models, { models: [] })).toContain('models: intel.settings.models.atLeastOne');
    expect(issues(models, { models: [{ ...gpt4o, id: 'gpt 4o' }] })).toEqual(['models.0.id: intel.settings.common.modelId']);
  });
});

describe('answer settings validation', () => {
  it('accepts decimals for temperature and coerces numeric text', () => {
    expect(chat.parse({ temperature: '0.2', max_output_tokens: '1800', max_tool_rounds: '5', history_turns: '12' })).toEqual({ temperature: 0.2, max_output_tokens: 1800, max_tool_rounds: 5, history_turns: 12 });
  });

  it('bounds temperature to 0–2 and tool rounds to 8', () => {
    expect(issues(chat, { temperature: 2.1, max_output_tokens: 1800, max_tool_rounds: 5, history_turns: 12 })).toEqual(['temperature: intel.settings.common.max({"max":2})']);
    expect(issues(chat, { temperature: 0.2, max_output_tokens: 1800, max_tool_rounds: 9, history_turns: 12 })).toEqual(['max_tool_rounds: intel.settings.common.max({"max":8})']);
  });
});
