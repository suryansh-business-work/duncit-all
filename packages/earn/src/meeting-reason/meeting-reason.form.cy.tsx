import { describe, expect, it } from 'vitest';
import { buildEarnMeetingLabels } from '../labels';
import { buildMeetingReasonSchema } from './meeting-reason.form';
import { blankMeetingReasonValues, type MeetingReasonValues } from './meeting-reason.types';

// The schema reads its messages from the surface's labels; outside React the
// key itself stands in for a translator.
const meetingReasonSchema = buildMeetingReasonSchema(
  buildEarnMeetingLabels((key) => key, 'mweb'),
);

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
