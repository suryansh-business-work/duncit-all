import { describe, expect, it } from 'vitest';
import {
  crmCallStatusView,
  crmCanStartCall,
  crmElapsedSeconds,
  crmFilterSegments,
  crmFormatDuration,
  crmIsTerminalCallStatus,
  crmMergeSegment,
  crmToCallStatus,
  type CrmCallStatus,
} from '../src';

/** The CRM call line: what each status reads as, the live transcript and the call clock. */

const seg = (seq: number, speaker: string, text = '') => ({ seq, speaker, text });

describe('crmIsTerminalCallStatus', () => {
  it('treats every way a call ends as over, and a live one as not', () => {
    for (const status of ['COMPLETED', 'NO_ANSWER', 'BUSY', 'FAILED'] as const) {
      expect(crmIsTerminalCallStatus(status)).toBe(true);
    }
    for (const status of ['INITIATED', 'RINGING', 'IN_PROGRESS'] as const) {
      expect(crmIsTerminalCallStatus(status)).toBe(false);
    }
  });
});

describe('crmToCallStatus', () => {
  it('reads a status the API sends, and nothing else', () => {
    expect(crmToCallStatus('RINGING')).toBe('RINGING');
    expect(crmToCallStatus('ringing')).toBeNull();
    expect(crmToCallStatus(null)).toBeNull();
    expect(crmToCallStatus(undefined)).toBeNull();
  });
});

describe('crmCallStatusView', () => {
  it('reads "Ready" before a call is placed and "On hold" for a held call', () => {
    expect(crmCallStatusView(null)).toEqual({ labelKey: 'crm.call.statusReady', tone: 'default' });
    expect(crmCallStatusView('IN_PROGRESS', true)).toEqual({ labelKey: 'crm.call.statusOnHold', tone: 'warning' });
  });

  it('gives each status its label and tone', () => {
    expect(crmCallStatusView('RINGING')).toEqual({ labelKey: 'crm.call.statusRinging', tone: 'warning' });
    expect(crmCallStatusView('IN_PROGRESS')).toEqual({ labelKey: 'crm.call.statusInCall', tone: 'success' });
    expect(crmCallStatusView('FAILED')).toEqual({ labelKey: 'crm.call.statusFailed', tone: 'error' });
    expect(crmCallStatusView('COMPLETED', true)).toEqual({ labelKey: 'crm.call.statusOver', tone: 'default' });
  });

  it('reads a status the server adds later as connecting rather than failing', () => {
    expect(crmCallStatusView('QUEUED' as CrmCallStatus)).toEqual({ labelKey: 'crm.call.statusConnecting', tone: 'info' });
  });
});

describe('crmMergeSegment', () => {
  it('keeps the spoken order whatever order segments arrive in', () => {
    expect(crmMergeSegment([seg(2, 'LEAD')], seg(1, 'AGENT')).map((s) => s.seq)).toEqual([1, 2]);
  });

  it('ignores a repeat of the same speaker and number, returning the same array', () => {
    const start = [seg(1, 'AGENT')];
    expect(crmMergeSegment(start, seg(1, 'AGENT'))).toBe(start);
    expect(crmMergeSegment(start, seg(1, 'LEAD'))).toHaveLength(2);
  });
});

describe('crmFilterSegments', () => {
  const lines = [seg(1, 'AGENT', 'Hello, is this the cafe?'), seg(2, 'LEAD', 'Yes, CAFE here')];

  it('matches text case-insensitively', () => {
    expect(crmFilterSegments(lines, ' cafe ')).toHaveLength(2);
    expect(crmFilterSegments(lines, 'hello')).toEqual([lines[0]]);
    expect(crmFilterSegments(lines, 'pizza')).toEqual([]);
  });

  it('returns the same array when there is nothing to search for', () => {
    expect(crmFilterSegments(lines, '')).toBe(lines);
    expect(crmFilterSegments(lines, '   ')).toBe(lines);
  });
});

describe('crmFormatDuration', () => {
  it.each([
    [0, '0:00'],
    [9.7, '0:09'],
    [65, '1:05'],
    [3600, '1:00:00'],
    [3725, '1:02:05'],
    [-4, '0:00'],
  ])('shows %s seconds as %s', (seconds, text) => {
    expect(crmFormatDuration(seconds)).toBe(text);
  });
});

describe('crmElapsedSeconds', () => {
  const answered = '2026-11-25T10:00:00.000Z';

  it('counts whole seconds since the contact picked up', () => {
    expect(crmElapsedSeconds(answered, Date.parse(answered) + 12_900)).toBe(12);
  });

  it('is 0 before anyone answers, for an unreadable time, and never negative', () => {
    expect(crmElapsedSeconds(null)).toBe(0);
    expect(crmElapsedSeconds('soon')).toBe(0);
    expect(crmElapsedSeconds(answered, Date.parse(answered) - 5000)).toBe(0);
  });

  it('uses the current time when none is given', () => {
    expect(crmElapsedSeconds(new Date(Date.now() - 3000).toISOString())).toBeGreaterThanOrEqual(2);
  });
});

describe('crmCanStartCall', () => {
  const setup = { configured: true, from_number: '+15550100', agent_number: '+919811000001' };

  it('needs the line configured, both numbers and the contact’s number', () => {
    expect(crmCanStartCall(setup, '98123')).toBe(true);
    expect(crmCanStartCall(undefined, '98123')).toBe(false);
    expect(crmCanStartCall(null, '98123')).toBe(false);
    expect(crmCanStartCall({ ...setup, configured: false }, '98123')).toBe(false);
    expect(crmCanStartCall({ ...setup, from_number: null }, '98123')).toBe(false);
    expect(crmCanStartCall({ ...setup, agent_number: null }, '98123')).toBe(false);
    expect(crmCanStartCall(setup, '  ')).toBe(false);
    expect(crmCanStartCall(setup, undefined)).toBe(false);
  });
});
