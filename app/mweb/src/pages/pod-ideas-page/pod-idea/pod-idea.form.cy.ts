import { describe, expect, it } from 'vitest';
import { podIdeaFormSchema, toPodIdeaInput } from './pod-idea.form';

const errorText = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message).join(' ');

describe('podIdeaFormSchema', () => {
  it('rejects empty title', () => {
    const result = podIdeaFormSchema.safeParse({ title: '', description: 'A solid description here.' });
    expect(errorText(result)).toMatch(/title/i);
  });
  it('rejects title too long', () => {
    const result = podIdeaFormSchema.safeParse({ title: 'x'.repeat(161), description: 'A solid description here.' });
    expect(errorText(result)).toMatch(/title/i);
  });
  it('rejects short description', () => {
    const result = podIdeaFormSchema.safeParse({ title: 'Hiking', description: 'short' });
    expect(errorText(result)).toMatch(/description/i);
  });
  it('accepts a valid idea', () => {
    const result = podIdeaFormSchema.safeParse({ title: 'Sunday hike', description: 'A monthly Sunday hike around the city.' });
    expect(result.success).toBe(true);
  });
});

describe('toPodIdeaInput', () => {
  it('trims values', () => {
    const input = toPodIdeaInput({ title: '  Hike  ', description: '   Hike together every Sunday    ' });
    expect(input.title).toBe('Hike');
    expect(input.description).toBe('Hike together every Sunday');
  });
});
