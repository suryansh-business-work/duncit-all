import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTranslation } from '@duncit/app-settings';
import {
  blankSequenceValues,
  blankStep,
  paramList,
  sequenceSchema,
  sequenceValuesFrom,
  toSequenceInput,
  toStepInput,
} from './sequence.form';
import type { SequenceFormValues } from './sequence.types';
import type { OutreachSequence, OutreachWaTemplate } from '../queries';

const translator = () => renderHook(() => useTranslation()).result.current.t;

const approved: OutreachWaTemplate = {
  key: 'venue_intro',
  description: 'Venue intro',
  template_name: 'venue_intro_v2',
  status: 'APPROVED',
  approved: true,
  param_count: 2,
  body: 'Hi {{1}} from {{2}}',
};
const pending: OutreachWaTemplate = { ...approved, key: 'pending_one', status: 'PENDING', approved: false };

const valid = (over: Partial<SequenceFormValues> = {}): SequenceFormValues => ({
  ...blankSequenceValues(),
  name: 'Venue intro',
  steps: [{ ...blankStep('EMAIL'), subject: 'Hello {name}', body: 'Hi {name}' }],
  ...over,
});

/** Each issue as [path, message], the way a field shows it. */
const issues = (values: SequenceFormValues, templates: OutreachWaTemplate[] = []) => {
  const result = sequenceSchema(translator(), templates).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => [issue.path.join('.'), issue.message]);
};

describe('the blank sequence', () => {
  it('starts with one email step, a 50-a-day limit, quiet 21:00 to 09:00 and stop on reply', () => {
    expect(blankSequenceValues()).toEqual({
      name: '',
      description: '',
      pipeline: '',
      steps: [{ kind: 'EMAIL', wait_days: '', subject: '', body: '', wa_template_key: '', wa_params: '' }],
      daily_limit: '50',
      quiet_start_hour: 21,
      quiet_end_hour: 9,
      stop_on_reply: true,
    });
    expect(blankStep('WAIT').wait_days).toBe('2');
  });
});

describe('sequenceSchema', () => {
  it('accepts a complete sequence', () => {
    expect(issues(valid())).toEqual([]);
  });

  it('needs a name, and keeps the name and description in bounds', () => {
    expect(issues(valid({ name: '  ' }))).toEqual([['name', 'Give the sequence a name.']]);
    expect(issues(valid({ name: 'x'.repeat(81), description: 'y'.repeat(301) }))).toEqual([
      ['name', 'Keep it under 80 characters.'],
      ['description', 'Keep it under 300 characters.'],
    ]);
  });

  it('holds the daily limit to a whole number from 1 to 500', () => {
    for (const daily_limit of ['', '0', '501', '2.5', 'abc']) {
      expect(issues(valid({ daily_limit }))).toEqual([['daily_limit', 'Enter a whole number from 1 to 500.']]);
    }
    expect(issues(valid({ daily_limit: ' 500 ' }))).toEqual([]);
  });

  it('asks an email for its subject and text, and a DM task for its text', () => {
    expect(issues(valid({ steps: [blankStep('EMAIL')] }))).toEqual([
      ['steps.0.subject', 'Write the subject.'],
      ['steps.0.body', 'Write the message.'],
    ]);
    expect(issues(valid({ steps: [{ ...blankStep('EMAIL'), subject: 's'.repeat(151), body: 'b'.repeat(4001) }] }))).toEqual([
      ['steps.0.subject', 'Keep it under 150 characters.'],
      ['steps.0.body', 'Keep it under 4000 characters.'],
    ]);
    expect(issues(valid({ steps: [blankStep('DM_TASK')] }))).toEqual([['steps.0.body', 'Write the message.']]);
  });

  it('holds a wait to 1-60 whole days and refuses a sequence that only waits or ends on a wait', () => {
    const email = valid().steps[0];
    expect(issues(valid({ steps: [email, { ...blankStep('WAIT'), wait_days: '61' }, email] }))).toEqual([
      ['steps.1.wait_days', 'Enter a whole number of days from 1 to 60.'],
    ]);
    expect(issues(valid({ steps: [blankStep('WAIT')] }))).toEqual([
      ['steps', 'Add at least one step that reaches the lead.'],
      ['steps', 'A sequence cannot end with a wait.'],
    ]);
    expect(issues(valid({ steps: [email, blankStep('WAIT')] }))).toEqual([['steps', 'A sequence cannot end with a wait.']]);
  });

  it('needs at least one step and at most twenty', () => {
    expect(issues(valid({ steps: [] }))).toEqual([['steps', 'Add at least one step.'], ['steps', 'Add at least one step that reaches the lead.']]);
    const email = valid().steps[0];
    expect(issues(valid({ steps: Array.from({ length: 21 }, () => email) }))).toEqual([['steps', 'Use at most 20 steps.']]);
  });

  it('asks a WhatsApp step for an approved template and exactly the values it takes', () => {
    const wa = (over: Partial<SequenceFormValues['steps'][number]>) => valid({ steps: [{ ...blankStep('WHATSAPP'), ...over }] });
    expect(issues(wa({}), [approved])).toEqual([['steps.0.wa_template_key', 'Pick a template.']]);
    expect(issues(wa({ wa_template_key: 'pending_one' }), [approved, pending])).toEqual([
      ['steps.0.wa_template_key', 'This template is not approved. Pick an approved one.'],
    ]);
    expect(issues(wa({ wa_template_key: 'gone' }), [approved])).toEqual([
      ['steps.0.wa_template_key', 'This template is not approved. Pick an approved one.'],
    ]);
    expect(issues(wa({ wa_template_key: 'venue_intro', wa_params: '{name}' }), [approved])).toEqual([
      ['steps.0.wa_params', 'This template takes 2 values.'],
    ]);
    expect(issues(wa({ wa_template_key: 'venue_intro', wa_params: '{name}\n\n {company} ' }), [approved])).toEqual([]);
    expect(issues(wa({ wa_template_key: 'venue_intro', wa_params: Array.from({ length: 11 }, (_v, i) => `v${i}`).join('\n') }), [approved])).toEqual([
      ['steps.0.wa_params', 'Use at most 10 values.'],
    ]);
    expect(issues(wa({ wa_template_key: 'venue_intro', wa_params: `a\n${'x'.repeat(201)}` }), [approved])).toEqual([
      ['steps.0.wa_params', 'Keep it under 200 characters.'],
    ]);
  });

  it('cannot judge approval before the templates have loaded, so it only asks for a key', () => {
    expect(issues(valid({ steps: [{ ...blankStep('WHATSAPP'), wa_template_key: 'anything', wa_params: 'one' }] }))).toEqual([]);
  });
});

describe('to and from the server', () => {
  const sequence: OutreachSequence = {
    id: 'seq1',
    name: 'Venue intro',
    description: 'First touch',
    pipeline: null,
    steps: [
      { kind: 'EMAIL', wait_days: 0, subject: 'Hi', body: 'Hello', wa_template_key: '', wa_params: [] },
      { kind: 'WAIT', wait_days: 3, subject: '', body: '', wa_template_key: '', wa_params: [] },
      { kind: 'WHATSAPP', wait_days: 0, subject: '', body: '', wa_template_key: 'venue_intro', wa_params: ['{name}', '{company}'] },
      { kind: 'DM_TASK', wait_days: 0, subject: '', body: 'Hey', wa_template_key: '', wa_params: [] },
    ],
    daily_limit: 40,
    quiet_start_hour: 22,
    quiet_end_hour: 8,
    stop_on_reply: false,
    active: true,
    counts: { total: 0, active: 0, paused: 0, replied: 0, opted_out: 0, done: 0, failed: 0 },
    sent_today: 0,
    created_by: '',
    updated_by: '',
    created_at: null,
    updated_at: null,
  };

  it('fills the form from a saved sequence, the values one per line and a wait as text', () => {
    const values = sequenceValuesFrom(sequence);
    expect(values.pipeline).toBe('');
    expect(values.daily_limit).toBe('40');
    expect(values.steps.map((step) => [step.kind, step.wait_days, step.wa_params])).toEqual([
      ['EMAIL', '', ''],
      ['WAIT', '3', ''],
      ['WHATSAPP', '', '{name}\n{company}'],
      ['DM_TASK', '', ''],
    ]);
    expect(sequenceValuesFrom({ ...sequence, pipeline: 'VENUE' }).pipeline).toBe('VENUE');
  });

  it('sends only the fields each step kind reads, trimmed, and null for any pipeline', () => {
    expect(toSequenceInput({ ...sequenceValuesFrom(sequence), name: ' Venue intro ', description: ' First touch ' })).toEqual({
      name: 'Venue intro',
      description: 'First touch',
      pipeline: null,
      steps: [
        { kind: 'EMAIL', subject: 'Hi', body: 'Hello' },
        { kind: 'WAIT', wait_days: 3 },
        { kind: 'WHATSAPP', wa_template_key: 'venue_intro', wa_params: ['{name}', '{company}'] },
        { kind: 'DM_TASK', body: 'Hey' },
      ],
      daily_limit: 40,
      quiet_start_hour: 22,
      quiet_end_hour: 8,
      stop_on_reply: false,
    });
    expect(toSequenceInput({ ...valid(), pipeline: 'HOST' }).pipeline).toBe('HOST');
    expect(toStepInput({ ...blankStep('DM_TASK'), body: '  Hey  ', subject: 'ignored' })).toEqual({ kind: 'DM_TASK', body: 'Hey' });
    expect(paramList(' a \n\n b ')).toEqual(['a', 'b']);
  });
});
