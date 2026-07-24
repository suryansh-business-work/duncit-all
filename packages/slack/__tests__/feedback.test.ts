import { describe, expect, it } from 'vitest';
import {
  buildAppFeedbackInput,
  buildFeedbackBlocks,
  FEEDBACK_CATEGORIES,
} from '../src/feedback';
import { header, section } from '../src/blocks';

describe('feedback helpers', () => {
  it('offers the standard feedback categories', () => {
    expect(FEEDBACK_CATEGORIES).toEqual(['Bug', 'Idea', 'Question', 'Other']);
  });

  it('builds a header + section body block', () => {
    expect(buildFeedbackBlocks({ category: 'Bug', message: 'it broke' })).toEqual([
      header('📝 Bug'),
      section('it broke'),
    ]);
  });

  it('builds the mutation input with a serialised body and platform', () => {
    const input = buildAppFeedbackInput({ category: 'Idea', message: 'add dark mode', platform: 'web' });
    expect(input).toEqual({
      category: 'Idea',
      message: 'add dark mode',
      platform: 'web',
      blocks_json: JSON.stringify(buildFeedbackBlocks({ category: 'Idea', message: 'add dark mode' })),
    });
  });

  it('leaves platform undefined when not supplied', () => {
    expect(buildAppFeedbackInput({ category: 'Other', message: 'hi' }).platform).toBeUndefined();
  });
});
