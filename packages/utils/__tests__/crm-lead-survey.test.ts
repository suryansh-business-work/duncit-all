import { describe, expect, it } from 'vitest';
import {
  crmFirstUnanswered,
  crmSeedSurveyAnswers,
  crmSplitSurveySections,
  crmSurveyAnswer,
  crmSurveyAnswerInput,
  crmSurveyEntryStatus,
  crmSurveyLinkLive,
  crmSurveyLinkUrl,
  crmToggleSurveyOption,
} from '../src/crm-lead-survey';

/** A lead's onboarding survey: steps, answers, what is missing, the link and the log. */

const q = (qid: string, type: string, over: Record<string, unknown> = {}) => ({
  qid,
  type,
  label: qid.toUpperCase(),
  help: null,
  required: false,
  multi: false,
  ...over,
});

describe('crmSplitSurveySections', () => {
  it('starts a step at every section and puts loose questions under the fallback title', () => {
    const sections = crmSplitSurveySections(
      [q('a', 'TEXT'), q('s1', 'SECTION', { label: 'Space', help: 'About the venue' }), q('b', 'MCQ'), q('s2', 'SECTION', { label: '' }), q('c', 'TEXTAREA')],
      'Survey'
    );
    expect(sections.map((s) => [s.title, s.questions.map((x) => x.qid)])).toEqual([
      ['Survey', ['a']],
      ['Space', ['b']],
      ['Survey', ['c']],
    ]);
    expect(sections[1]?.help).toBe('About the venue');
  });

  it('drops sections without questions and defaults the title to Details', () => {
    expect(crmSplitSurveySections([q('s', 'SECTION', { label: 'Empty' }), q('x', 'SECTION', { label: '' }), q('a', 'TEXT')])).toEqual([
      { title: 'Details', help: null, questions: [q('a', 'TEXT')] },
    ]);
    expect(crmSplitSurveySections([])).toEqual([]);
  });
});

describe('answers', () => {
  it('seeds from a saved entry, an absent value reading as blank', () => {
    expect(crmSeedSurveyAnswers([{ qid: 'a', value: null, values: ['x'] }, { qid: 'b', value: 'hi', values: [] }])).toEqual({
      a: { value: '', values: ['x'] },
      b: { value: 'hi', values: [] },
    });
    expect(crmSeedSurveyAnswers(null)).toEqual({});
    expect(crmSeedSurveyAnswers()).toEqual({});
  });

  it('reads an untouched question as empty', () => {
    expect(crmSurveyAnswer({}, 'a')).toEqual({ value: '', values: [] });
  });

  it('ticks and unticks one option', () => {
    const once = crmToggleSurveyOption({ value: '', values: ['A'] }, 'B');
    expect(once.values).toEqual(['A', 'B']);
    expect(crmToggleSurveyOption(once, 'A').values).toEqual(['B']);
  });
});

describe('crmFirstUnanswered', () => {
  const questions = [q('opt', 'TEXT'), q('name', 'TEXT', { required: true }), q('tags', 'MCQ', { required: true, multi: true })];

  it('finds the first required question left blank, spaces counting as blank', () => {
    expect(crmFirstUnanswered(questions, { name: { value: '  ', values: [] } })?.qid).toBe('name');
    expect(crmFirstUnanswered(questions, { name: { value: 'Asha', values: [] } })?.qid).toBe('tags');
  });

  it('lets the step move on once every required question is answered', () => {
    expect(crmFirstUnanswered(questions, { name: { value: 'Asha', values: [] }, tags: { value: '', values: ['Pets'] } })).toBeNull();
  });
});

describe('crmSurveyAnswerInput', () => {
  it('sends picked options for a multi-choice and text for everything else', () => {
    const questions = [q('name', 'TEXT'), q('pick', 'MCQ'), q('tags', 'MCQ', { multi: true })];
    expect(crmSurveyAnswerInput(questions, { name: { value: 'Asha', values: [] }, tags: { value: '', values: ['A'] } })).toEqual([
      { qid: 'name', value: 'Asha' },
      { qid: 'pick', value: '' },
      { qid: 'tags', values: ['A'] },
    ]);
  });
});

describe('links and the log', () => {
  it('builds the public fill page on the given host', () => {
    expect(crmSurveyLinkUrl('https://crm.duncit.com', 'tok1')).toBe('https://crm.duncit.com/s/tok1');
  });

  it('reads a revoked link, a filled entry and a pending one', () => {
    expect(crmSurveyEntryStatus({ source: 'LINK', token_revoked: true, filled: true })).toEqual({ labelKey: 'crm.components.revoked', tone: 'default' });
    expect(crmSurveyEntryStatus({ source: 'MANUAL', token_revoked: true, filled: true })).toEqual({ labelKey: 'crm.components.filled', tone: 'success' });
    expect(crmSurveyEntryStatus({ source: 'LINK', token_revoked: false, filled: false })).toEqual({ labelKey: 'crm.components.pending', tone: 'warning' });
  });

  it('treats only an unrevoked link with a token as live', () => {
    expect(crmSurveyLinkLive({ source: 'LINK', token_revoked: false, filled: false, token: 't' })).toBe(true);
    expect(crmSurveyLinkLive({ source: 'LINK', token_revoked: true, filled: false, token: 't' })).toBe(false);
    expect(crmSurveyLinkLive({ source: 'LINK', token_revoked: false, filled: false, token: null })).toBe(false);
    expect(crmSurveyLinkLive({ source: 'MANUAL', token_revoked: false, filled: true, token: 't' })).toBe(false);
  });
});
