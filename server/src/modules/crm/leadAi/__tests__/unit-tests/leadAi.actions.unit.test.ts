/**
 * The model's proposals are untrusted: only a complete email draft, a dated
 * reminder, or a change to one of THIS lead's reminders may reach the panel.
 */
import { describeAction, MAX_ACTIONS, parseLeadAiActions } from '../../leadAi.actions';

const reminders = [{ id: 'rem-1', title: 'Call back', status: 'PENDING' }];
const ctx = { reminders, fallbackTo: 'owner@cafe.test' };

describe('parseLeadAiActions — email drafts', () => {
  it('keeps a complete draft and its valid recipient', () => {
    const [draft] = parseLeadAiActions(
      [{ type: 'EMAIL_DRAFT', to: 'priya@cafe.test', subject: '  Follow-up  ', body_html: '<p>Hi Priya</p>' }],
      ctx
    );
    expect(draft).toMatchObject({
      type: 'EMAIL_DRAFT',
      status: 'PROPOSED',
      to: 'priya@cafe.test',
      subject: 'Follow-up',
      body_html: '<p>Hi Priya</p>',
    });
  });

  it('falls back to the lead’s own email when the model gives an invalid recipient', () => {
    const [draft] = parseLeadAiActions([{ type: 'EMAIL_DRAFT', to: 'not an email', subject: 'Hi', body_html: '<p>x</p>' }], ctx);
    expect(draft.to).toBe('owner@cafe.test');
  });

  it('drops a draft with no subject or no body', () => {
    expect(parseLeadAiActions([{ type: 'EMAIL_DRAFT', subject: 'Hi', body_html: '   ' }], ctx)).toEqual([]);
    expect(parseLeadAiActions([{ type: 'EMAIL_DRAFT', subject: '', body_html: '<p>x</p>' }], ctx)).toEqual([]);
  });

  it('caps an oversized subject at 200 characters', () => {
    const [draft] = parseLeadAiActions([{ type: 'EMAIL_DRAFT', subject: 'x'.repeat(500), body_html: '<p>x</p>' }], ctx);
    expect(draft.subject).toHaveLength(200);
  });
});

describe('parseLeadAiActions — reminders', () => {
  it('keeps a new reminder with a parseable due date', () => {
    const [r] = parseLeadAiActions(
      [{ type: 'CREATE_REMINDER', title: 'Send menu', due_at: '2026-11-24T10:00:00+05:30', notes: 'Ask for veg options' }],
      ctx
    );
    expect(r.type).toBe('CREATE_REMINDER');
    expect(r.due_at?.toISOString()).toBe('2026-11-24T04:30:00.000Z');
    expect(r.notes).toBe('Ask for veg options');
  });

  it('drops a new reminder whose date cannot be read', () => {
    expect(parseLeadAiActions([{ type: 'CREATE_REMINDER', title: 'Send menu', due_at: 'next tuesday' }], ctx)).toEqual([]);
    expect(parseLeadAiActions([{ type: 'CREATE_REMINDER', title: 'Send menu' }], ctx)).toEqual([]);
  });

  it('keeps a change to this lead’s reminder with only the changed fields', () => {
    const [u] = parseLeadAiActions([{ type: 'UPDATE_REMINDER', reminder_id: 'rem-1', status: 'DONE' }], ctx);
    expect(u).toMatchObject({ type: 'UPDATE_REMINDER', reminder_id: 'rem-1', reminder_status: 'DONE', title: '', due_at: null });
  });

  it('refuses a reminder that belongs to another lead', () => {
    expect(parseLeadAiActions([{ type: 'UPDATE_REMINDER', reminder_id: 'someone-else', status: 'DONE' }], ctx)).toEqual([]);
  });

  it('refuses a change that changes nothing, or an unknown status', () => {
    expect(parseLeadAiActions([{ type: 'UPDATE_REMINDER', reminder_id: 'rem-1' }], ctx)).toEqual([]);
    expect(parseLeadAiActions([{ type: 'UPDATE_REMINDER', reminder_id: 'rem-1', status: 'ARCHIVED' }], ctx)).toEqual([]);
  });
});

describe('parseLeadAiActions — shape', () => {
  it('returns nothing for a missing or non-array value', () => {
    expect(parseLeadAiActions(undefined, ctx)).toEqual([]);
    expect(parseLeadAiActions({ type: 'EMAIL_DRAFT' }, ctx)).toEqual([]);
  });

  it('skips unknown types and junk entries', () => {
    const out = parseLeadAiActions(
      [null, 'text', { type: 'DELETE_LEAD' }, { type: 'CREATE_REMINDER', title: 'Visit', due_at: '2026-12-01T09:00:00Z' }],
      ctx
    );
    expect(out.map((a) => a.type)).toEqual(['CREATE_REMINDER']);
  });

  it(`keeps at most ${MAX_ACTIONS} proposals`, () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ type: 'CREATE_REMINDER', title: `R${i}`, due_at: '2026-12-01T09:00:00Z' }));
    expect(parseLeadAiActions(many, ctx).map((a) => a.title)).toEqual(['R0', 'R1', 'R2']);
  });
});

describe('describeAction', () => {
  it('names a draft by subject and a reminder by title, with its outcome', () => {
    expect(describeAction({ type: 'EMAIL_DRAFT', status: 'DONE', subject: 'Menu' })).toBe('[email draft "Menu": DONE]');
    expect(describeAction({ type: 'UPDATE_REMINDER', status: 'DISMISSED', title: 'Call' })).toBe('[update reminder "Call": DISMISSED]');
  });
});
