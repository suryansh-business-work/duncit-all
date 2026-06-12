import { describe, expect, it } from 'vitest';
import { podDeleteSchema } from './pod-delete.form';
import {
  POD_DELETE_REASON_SUBJECTS,
  blankPodDeleteValues,
  type PodDeleteValues,
} from './pod-delete.types';

const valid = (over: Partial<PodDeleteValues> = {}): PodDeleteValues => ({
  reason_subject: 'Event cancelled',
  reason_note: '',
  ...over,
});

const issuesOf = (values: PodDeleteValues) => {
  const result = podDeleteSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('podDeleteSchema', () => {
  it('accepts a subject without a note', () => {
    expect(podDeleteSchema.safeParse(valid()).success).toBe(true);
  });

  it('requires a subject', () => {
    expect(issuesOf(valid({ reason_subject: '' }))).toContain('reason_subject');
  });

  it('requires a note when the subject is Other', () => {
    expect(issuesOf(valid({ reason_subject: 'Other', reason_note: ' ' }))).toContain('reason_note');
    expect(
      podDeleteSchema.safeParse(valid({ reason_subject: 'Other', reason_note: 'Family emergency' }))
        .success,
    ).toBe(true);
  });

  it('caps the note length', () => {
    expect(issuesOf(valid({ reason_note: 'x'.repeat(501) }))).toContain('reason_note');
  });

  it('offers the dropdown subjects including Other', () => {
    expect(POD_DELETE_REASON_SUBJECTS).toContain('Other');
    expect(POD_DELETE_REASON_SUBJECTS.length).toBeGreaterThanOrEqual(3);
    expect(blankPodDeleteValues.reason_subject).toBe('');
  });
});
