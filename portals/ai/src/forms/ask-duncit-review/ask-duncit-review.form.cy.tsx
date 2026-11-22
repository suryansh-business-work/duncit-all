import { describe, expect, it } from 'vitest';
import { askDuncitReviewDefaults, buildAskDuncitReviewSchema } from './ask-duncit-review.types';

const t = (key: string) => key;
const schema = buildAskDuncitReviewSchema(t as never);

const issues = (values: Record<string, unknown>) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('Ask Duncit feedback review validation', () => {
  it('accepts or dismisses with no note', () => {
    expect(issues(askDuncitReviewDefaults)).toEqual([]);
    expect(issues({ ...askDuncitReviewDefaults, status: 'DISMISSED' })).toEqual([]);
  });

  it('needs a real corrected answer before drafting a knowledge article', () => {
    expect(issues({ status: 'ACCEPTED', note: 'short', add_to_knowledge: true })).toEqual(['note: ai.askDuncit.validation.noteForKnowledge']);
    expect(issues({ status: 'ACCEPTED', note: 'Refunds take five working days.', add_to_knowledge: true })).toEqual([]);
  });

  it('never drafts an article from a dismissed rating', () => {
    expect(issues({ status: 'DISMISSED', note: 'Refunds take five working days.', add_to_knowledge: true })).toEqual(['note: ai.askDuncit.validation.noteForKnowledge']);
  });

  it('refuses an unknown decision', () => {
    expect(issues({ ...askDuncitReviewDefaults, status: 'PENDING' })).toHaveLength(1);
  });
});
