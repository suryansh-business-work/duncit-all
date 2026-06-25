import { describe, expect, it } from 'vitest';
import { meetingReasonSchema } from './meeting-reason.form';
import { blankMeetingReasonValues, type MeetingReasonValues } from './meeting-reason.types';

const issuesOf = (values: MeetingReasonValues) => {
  const result = meetingReasonSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('meetingReasonSchema', () => {
  it('accepts a non-empty reason', () => {
    expect(meetingReasonSchema.safeParse({ reason: 'Slot clashes with work' }).success).toBe(true);
  });

  it('requires a reason', () => {
    expect(issuesOf({ reason: '' })).toContain('reason');
    expect(issuesOf({ reason: '   ' })).toContain('reason');
  });

  it('caps the reason length', () => {
    expect(issuesOf({ reason: 'x'.repeat(501) })).toContain('reason');
  });

  it('starts blank', () => {
    expect(blankMeetingReasonValues.reason).toBe('');
  });
});
