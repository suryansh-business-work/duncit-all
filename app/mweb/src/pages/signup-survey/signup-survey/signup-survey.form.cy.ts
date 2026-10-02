import { describe, expect, it } from 'vitest';
import { signupSurveySchema, toSignupSurveyInput } from './signup-survey.form';

const errorText = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message).join(' ');

describe('signupSurveySchema', () => {
  it('rejects empty interests', () => {
    const result = signupSurveySchema.safeParse({ interest_category_ids: [], other_interests: '' });
    expect(errorText(result)).toMatch(/interest/i);
  });
  it('rejects more than 20 interests', () => {
    const result = signupSurveySchema.safeParse({
      interest_category_ids: Array.from({ length: 21 }, (_, i) => `c${i}`),
      other_interests: '',
    });
    expect(errorText(result)).toMatch(/20/);
  });
  it('rejects long free-text notes', () => {
    const result = signupSurveySchema.safeParse({ interest_category_ids: ['c1'], other_interests: 'x'.repeat(501) });
    expect(errorText(result)).toMatch(/notes/i);
  });
  it('accepts a valid survey', () => {
    const result = signupSurveySchema.safeParse({ interest_category_ids: ['c1'], other_interests: 'Anything outdoor' });
    expect(result.success).toBe(true);
  });
});

describe('toSignupSurveyInput', () => {
  it('nullifies empty notes', () => {
    const input = toSignupSurveyInput({ interest_category_ids: ['c1'], other_interests: '' });
    expect(input.other_interests).toBeNull();
  });
});
