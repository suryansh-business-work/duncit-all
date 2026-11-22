import { describe, expect, it } from 'vitest';
import { buildAskDuncitKillSwitchSchema } from './ask-duncit-kill-switch.types';

const schema = buildAskDuncitKillSwitchSchema(((key: string) => key) as never);

describe('Ask Duncit kill switch reason', () => {
  it('requires a reason of at least three characters, trimmed', () => {
    expect(schema.safeParse({ reason: '  ' }).success).toBe(false);
    expect(schema.parse({ reason: '  Model leaking data  ' })).toEqual({ reason: 'Model leaking data' });
  });

  it('refuses a reason over 300 characters with its own message', () => {
    const result = schema.safeParse({ reason: 'x'.repeat(301) });
    expect(result.success ? [] : result.error.issues.map((i) => i.message)).toEqual(['ai.askDuncit.validation.reasonMax']);
  });
});
