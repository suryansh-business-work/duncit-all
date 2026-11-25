import { describe, expect, it } from 'vitest';
import {
  CRM_LOG_GRANULARITY_LABEL,
  CRM_LOG_HISTORY_VIEW,
  crmGroupLogs,
  crmLogHistory,
  crmLogKey,
  crmLogPeopleIds,
} from '../src/crm-manual-logs';

/** A lead's Manual Logs: windows, days, history and the people it names. */

const NOW = new Date(2026, 10, 25, 15, 0, 0);
const at = (daysAgo: number, hour = 10) => new Date(2026, 10, 25 - daysAgo, hour, 0, 0).toISOString();

const logs = [
  { id: 'n1', type: 'NOTE', created_at: at(0, 9), created_by: 'u2' },
  { id: 'n2', type: 'NOTE', created_at: at(0, 12), created_by: 'u1', updated_by: 'u3' },
  { id: 'n3', type: 'NOTE', created_at: at(3), created_by: 'u1', deleted_by: 'u4' },
  { id: 'n4', type: 'NOTE', created_at: at(20) },
  { id: 'n5', type: 'NOTE', created_at: at(45) },
  { id: null, type: 'NOTE_CREATED', created_at: at(0, 9), created_by: 'u5' },
  { id: null, type: 'NOTE_DELETED', created_at: at(10), created_by: 'u6' },
  { id: null, type: 'EMAIL', created_at: at(0), created_by: 'u9' },
];

describe('crmGroupLogs', () => {
  it('groups every note by local day, newest first, leaving out everything else', () => {
    const groups = crmGroupLogs(logs, 'all', NOW);
    expect(groups.map(([, entries]) => entries.map((e) => e.id))).toEqual([['n2', 'n1'], ['n3'], ['n4'], ['n5']]);
    expect(groups[0]?.[0]).toBe('2026-11-25');
  });

  it('keeps only the window asked for', () => {
    expect(crmGroupLogs(logs, 'today', NOW).flatMap(([, e]) => e.map((x) => x.id))).toEqual(['n2', 'n1']);
    expect(crmGroupLogs(logs, 'week', NOW).flatMap(([, e]) => e.map((x) => x.id))).toEqual(['n2', 'n1', 'n3']);
    expect(crmGroupLogs(logs, 'month', NOW).flatMap(([, e]) => e.map((x) => x.id))).toEqual(['n2', 'n1', 'n3', 'n4']);
  });

  it('files a note without a time under the epoch day, and works from today by default', () => {
    const [group] = crmGroupLogs([{ type: 'NOTE', created_at: null }], 'all');
    expect(group?.[1]).toHaveLength(1);
    expect(crmGroupLogs([{ type: 'NOTE', created_at: null }, { type: 'NOTE' }], 'all')).toHaveLength(1);
    expect(crmGroupLogs([{ type: 'NOTE', created_at: null }], 'today', NOW)).toEqual([]);
  });
});

describe('crmLogHistory', () => {
  it('lists the created / updated / deleted entries in the window, newest first', () => {
    expect(crmLogHistory(logs, 'all', NOW).map((e) => e.type)).toEqual(['NOTE_CREATED', 'NOTE_DELETED']);
    expect(crmLogHistory(logs, 'week', NOW).map((e) => e.type)).toEqual(['NOTE_CREATED']);
    expect(crmLogHistory([], 'all')).toEqual([]);
  });

  it('labels each change with its key and tone', () => {
    expect(CRM_LOG_HISTORY_VIEW.NOTE_UPDATED).toEqual({ labelKey: 'crm.manualLogs.historyUpdated', tone: 'info' });
    expect(CRM_LOG_GRANULARITY_LABEL.week).toBe('crm.components.last7Days');
  });
});

describe('crmLogPeopleIds', () => {
  it('collects authors, editors, deleters and history actors once, sorted, ignoring other entries', () => {
    expect(crmLogPeopleIds(logs)).toEqual(['u1', 'u2', 'u3', 'u4', 'u5', 'u6']);
  });
});

describe('crmLogKey', () => {
  it('uses the id, or the log’s own fields for a legacy one', () => {
    expect(crmLogKey({ id: 'n1', type: 'NOTE' })).toBe('n1');
    expect(crmLogKey({ type: 'NOTE', created_at: 't', created_by: 'u', summary: 's', body_text: 'b' })).toBe('t|u|s|b');
    expect(crmLogKey({ type: 'NOTE' })).toBe('|||');
  });
});
