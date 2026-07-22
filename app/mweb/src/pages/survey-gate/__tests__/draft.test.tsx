import { describe, it, expect, beforeEach } from 'vitest';
import {
  getGateDraft,
  setGateDraft,
  clearGateDraft,
  type GateDraft,
} from '../draft';
import type { SurveyKind } from '../queries';

const makeDraft = (): GateDraft => ({
  step: 'category',
  scope: null,
  survey: null,
  answers: {},
  submittedAnswers: [],
});

const KIND: SurveyKind = 'HOST';

describe('survey-gate draft cache', () => {
  beforeEach(() => {
    clearGateDraft('HOST');
    clearGateDraft('VENUE');
    clearGateDraft('ECOMM');
    clearGateDraft('CLUB_ADMIN');
  });

  it('returns undefined when no draft is stored', () => {
    expect(getGateDraft(KIND)).toBeUndefined();
  });

  it('stores and retrieves a draft by kind', () => {
    const draft = makeDraft();
    setGateDraft(KIND, draft);
    expect(getGateDraft(KIND)).toBe(draft);
  });

  it('keeps drafts isolated per kind', () => {
    const host = makeDraft();
    const venue: GateDraft = { ...makeDraft(), step: 'survey' };
    setGateDraft('HOST', host);
    setGateDraft('VENUE', venue);
    expect(getGateDraft('HOST')?.step).toBe('category');
    expect(getGateDraft('VENUE')?.step).toBe('survey');
    expect(getGateDraft('ECOMM')).toBeUndefined();
  });

  it('overwrites an existing draft for the same kind', () => {
    const first = makeDraft();
    const second: GateDraft = { ...makeDraft(), step: 'meeting' };
    setGateDraft(KIND, first);
    setGateDraft(KIND, second);
    expect(getGateDraft(KIND)).toBe(second);
    expect(getGateDraft(KIND)?.step).toBe('meeting');
  });

  it('clears a stored draft', () => {
    setGateDraft(KIND, makeDraft());
    clearGateDraft(KIND);
    expect(getGateDraft(KIND)).toBeUndefined();
  });

  it('clearing a missing draft is a no-op', () => {
    expect(() => clearGateDraft('CLUB_ADMIN')).not.toThrow();
    expect(getGateDraft('CLUB_ADMIN')).toBeUndefined();
  });
});
