import { describe, expect, it } from 'vitest';
import { makeOpenAiSchema } from './openai.types';

const t = (key: string) => key;
const schema = makeOpenAiSchema(t, ['65a1b2c3d4e5f6a7b8c9d0e1']);

describe('OpenAI entry validation', () => {
  it('accepts the Tech portal default and any offered entry', () => {
    expect(schema.safeParse({ env_entry_id: '' }).success).toBe(true);
    expect(schema.safeParse({ env_entry_id: '65a1b2c3d4e5f6a7b8c9d0e1' }).success).toBe(true);
  });

  it('refuses an entry that was not offered (deleted, inactive or another category)', () => {
    const result = schema.safeParse({ env_entry_id: '000000000000000000000000' });
    expect(result.success ? [] : result.error.issues.map((i) => i.message)).toEqual(['intel.settings.openai.entryInvalid']);
  });
});
