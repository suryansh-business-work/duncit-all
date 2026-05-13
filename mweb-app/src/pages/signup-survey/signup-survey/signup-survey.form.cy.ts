import { describe, expect, it } from 'vitest';
import { signupSurveySchema, toSignupSurveyInput } from './signup-survey.form';

describe('signupSurveySchema', () => {
  it('rejects empty interests', async () => {
    const error = await signupSurveySchema
      .validate({ interest_category_ids: [], other_interests: '' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/interest/i);
  });
  it('rejects more than 20 interests', async () => {
    const error = await signupSurveySchema
      .validate(
        { interest_category_ids: Array.from({ length: 21 }, (_, i) => `c${i}`), other_interests: '' },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/20/);
  });
  it('rejects long free-text notes', async () => {
    const error = await signupSurveySchema
      .validate({ interest_category_ids: ['c1'], other_interests: 'x'.repeat(501) }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/notes/i);
  });
  it('accepts a valid survey', async () => {
    await signupSurveySchema.validate({ interest_category_ids: ['c1'], other_interests: 'Anything outdoor' });
  });
});

describe('toSignupSurveyInput', () => {
  it('nullifies empty notes', () => {
    const input = toSignupSurveyInput({ interest_category_ids: ['c1'], other_interests: '' });
    expect(input.other_interests).toBeNull();
  });
});
