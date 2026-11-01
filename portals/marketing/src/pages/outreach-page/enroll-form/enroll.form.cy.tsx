import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTranslation } from '@duncit/app-settings';
import { ENROLLABLE_STAGES, blankEnrollValues, enrollSchema, toLeadFilter } from './enroll.form';
import type { OutreachSequence } from '../queries';

const translator = () => renderHook(() => useTranslation()).result.current.t;

const sequence: OutreachSequence = {
  id: 'seq1',
  name: 'Venue intro',
  description: '',
  pipeline: 'VENUE',
  steps: [],
  daily_limit: 50,
  quiet_start_hour: 21,
  quiet_end_hour: 9,
  stop_on_reply: true,
  active: true,
  counts: { total: 0, active: 0, paused: 0, replied: 0, opted_out: 0, done: 0, failed: 0 },
  sent_today: 0,
  created_by: '',
  updated_by: '',
  created_at: null,
  updated_at: null,
};

describe('enroll filter', () => {
  it('starts on the sequence’s own pipeline, or any when it takes every pipeline', () => {
    expect(blankEnrollValues(sequence)).toEqual({ pipeline: 'VENUE', stage: '', city: '' });
    expect(blankEnrollValues({ ...sequence, pipeline: null })).toEqual({ pipeline: '', stage: '', city: '' });
    expect(blankEnrollValues(null)).toEqual({ pipeline: '', stage: '', city: '' });
  });

  it('offers only the stages a lead can still be enrolled from', () => {
    expect(ENROLLABLE_STAGES).toEqual(['NEW', 'CONTACTED', 'REPLIED', 'QUALIFIED']);
  });

  it('keeps the city under 80 characters and refuses a final stage', () => {
    const schema = enrollSchema(translator());
    expect(schema.safeParse({ pipeline: '', stage: 'NEW', city: 'Pune' }).success).toBe(true);
    const long = schema.safeParse({ pipeline: '', stage: '', city: 'x'.repeat(81) });
    expect(long.success ? [] : long.error.issues.map((issue) => issue.message)).toEqual(['Keep it under 80 characters.']);
    expect(schema.safeParse({ pipeline: '', stage: 'LOST', city: '' }).success).toBe(false);
  });

  it('sends an empty field as null, so it narrows nothing', () => {
    expect(toLeadFilter({ pipeline: '', stage: '', city: '  ' })).toEqual({ pipeline: null, stage: null, city: null });
    expect(toLeadFilter({ pipeline: 'HOST', stage: 'NEW', city: ' Pune ' })).toEqual({ pipeline: 'HOST', stage: 'NEW', city: 'Pune' });
  });
});
