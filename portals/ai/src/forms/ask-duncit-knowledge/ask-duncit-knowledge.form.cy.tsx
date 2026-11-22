import { describe, expect, it } from 'vitest';
import { askDuncitKnowledgeDefaults, buildAskDuncitKnowledgeSchema, splitTags } from './ask-duncit-knowledge.types';

const t = (key: string) => key;
const schema = buildAskDuncitKnowledgeSchema(t as never);
const article = { ...askDuncitKnowledgeDefaults, title: 'Refund policy', body: 'Refunds are issued within five working days.' };

const issues = (values: Record<string, unknown>) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('Ask Duncit knowledge article validation', () => {
  it('accepts a titled article with a body, for every role by default', () => {
    expect(issues(article)).toEqual([]);
    expect(schema.parse(article).audience_roles).toEqual([]);
  });

  it('refuses a too-short title or body with their own messages', () => {
    expect(issues({ ...article, title: 'Hi' })).toEqual(['title: ai.askDuncit.validation.titleMin']);
    expect(issues({ ...article, body: 'short' })).toEqual(['body: ai.askDuncit.validation.bodyMin']);
  });

  it('refuses more than twenty tags', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `t${i}`).join(',');
    expect(issues({ ...article, tags })).toEqual(['tags: ai.askDuncit.validation.tagsCount']);
  });

  it('splits tags on commas, trimming and de-duplicating', () => {
    expect(splitTags(' refunds, pods ,refunds,, ')).toEqual(['refunds', 'pods']);
  });
});
