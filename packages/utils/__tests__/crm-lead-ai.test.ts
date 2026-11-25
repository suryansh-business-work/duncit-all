import { describe, expect, it } from 'vitest';
import {
  CRM_LEAD_AI_ACTION_HEADING,
  CRM_LEAD_AI_SOURCE_LABEL,
  CRM_LEAD_AI_SUGGESTIONS,
  crmLeadAiKb,
  crmLeadAiReminderUpdate,
  crmTextPreview,
} from '../src/crm-lead-ai';

/** Ask AI on a lead: starters, sources, headings and the proposals it carries out. */

describe('Ask AI copy', () => {
  it('offers the three starters and names every source and proposal kind with a literal key', () => {
    expect(CRM_LEAD_AI_SUGGESTIONS).toHaveLength(3);
    expect(CRM_LEAD_AI_SOURCE_LABEL.calls).toBe('crm.askAi.source.calls');
    expect(CRM_LEAD_AI_ACTION_HEADING.UPDATE_REMINDER).toBe('crm.askAi.reminderChange');
  });

  it('sizes the context in kilobytes to one decimal', () => {
    expect(crmLeadAiKb(2048)).toBe('2.0');
    expect(crmLeadAiKb(1536)).toBe('1.5');
  });
});

describe('crmLeadAiReminderUpdate', () => {
  it('sends only what the assistant proposed to change', () => {
    expect(
      crmLeadAiReminderUpdate({ title: 'Call back', due_at: '2026-11-26T10:00:00.000Z', notes: 'Ask about pricing', reminder_status: 'DONE' })
    ).toEqual({ title: 'Call back', due_at: '2026-11-26T10:00:00.000Z', notes: 'Ask about pricing', status: 'DONE' });
    expect(crmLeadAiReminderUpdate({ title: null, due_at: '', notes: undefined, reminder_status: null })).toEqual({});
  });
});

describe('crmTextPreview', () => {
  it('folds whitespace and cuts a long text with an ellipsis', () => {
    expect(crmTextPreview('  Hi\n\nthere  ')).toBe('Hi there');
    expect(crmTextPreview('abcdef', 3)).toBe('abc…');
    expect(crmTextPreview('x'.repeat(180))).toHaveLength(180);
  });
});
