import { describe, expect, it } from 'vitest';
import { podIdeaFormSchema, toPodIdeaInput } from './pod-idea.form';

describe('podIdeaFormSchema', () => {
  it('rejects empty title', async () => {
    const error = await podIdeaFormSchema
      .validate({ title: '', description: 'A solid description here.' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/title/i);
  });
  it('rejects title too long', async () => {
    const error = await podIdeaFormSchema
      .validate({ title: 'x'.repeat(161), description: 'A solid description here.' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/title/i);
  });
  it('rejects short description', async () => {
    const error = await podIdeaFormSchema
      .validate({ title: 'Hiking', description: 'short' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/description/i);
  });
  it('accepts a valid idea', async () => {
    await podIdeaFormSchema.validate({ title: 'Sunday hike', description: 'A monthly Sunday hike around the city.' });
  });
});

describe('toPodIdeaInput', () => {
  it('trims values', () => {
    const input = toPodIdeaInput({ title: '  Hike  ', description: '   Hike together every Sunday    ' });
    expect(input.title).toBe('Hike');
    expect(input.description).toBe('Hike together every Sunday');
  });
});
