import { describe, expect, it } from 'vitest';
import { buildAskDuncitRolePolicySchema } from './ask-duncit-role-policy.types';

const t = (key: string, options?: { vars?: Record<string, unknown> }) => (options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key);
const schema = buildAskDuncitRolePolicySchema(t as never);

const member = {
  enabled: true,
  model: '',
  max_output_tokens: 1200,
  allow_write: true,
  approve_all_writes: true,
  messages_per_minute: 10,
  messages_per_day: 200,
  tokens_per_day: 300_000,
  allowed_categories: ['account', 'pods'],
  instructions: '',
};

const issues = (values: Record<string, unknown>) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('Ask Duncit role policy validation', () => {
  it('accepts the seeded member policy, with a blank model meaning the default', () => {
    expect(issues(member)).toEqual([]);
  });

  it('refuses quotas outside the server bounds', () => {
    expect(issues({ ...member, messages_per_minute: 0 })).toEqual(['messages_per_minute: ai.askDuncit.validation.min:{"min":1}']);
    expect(issues({ ...member, tokens_per_day: 500 })).toEqual(['tokens_per_day: ai.askDuncit.validation.min:{"min":1000}']);
    expect(issues({ ...member, messages_per_day: 10_001 })).toEqual(['messages_per_day: ai.askDuncit.validation.max:{"max":10000}']);
  });

  it('refuses over-long role instructions', () => {
    expect(issues({ ...member, instructions: 'x'.repeat(4001) })).toEqual(['instructions: ai.askDuncit.validation.instructionsMax']);
  });
});
