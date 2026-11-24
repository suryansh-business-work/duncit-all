import { CALL_TYPE, type CallLogEntry, type DirectoryMatch } from 'crm-telephony';

import { callKey, directionOf, outcomeOf, planCall } from '../callPlan';

/**
 * Which phone calls become CRM call logs. A mistake here either uploads a
 * personal call or loses a sales call, so every branch is pinned.
 */

const entry = (over: Partial<CallLogEntry> = {}): CallLogEntry => ({
  id: '4211',
  number: '+91 98110 00001',
  type: CALL_TYPE.OUTGOING,
  date: Date.UTC(2026, 10, 24, 10, 30),
  durationSeconds: 134,
  cachedName: 'Rohit',
  ...over,
});

const lead: DirectoryMatch = { entityType: 'VENUE_LEAD', leadId: 'lead-1', leadName: 'Smash Arena', contactName: 'Rohit', others: 0 };

describe('callKey', () => {
  it.each([
    ['+91 98110 00001', '9811000001'],
    ['098110-00001', '9811000001'],
    ['1234567', '1234567'],
  ])('compares %s as %s, the server rule', (raw, key) => {
    expect(callKey(raw)).toBe(key);
  });

  it.each(['12345', '', null, undefined, 'private'])('cannot identify anyone from %p', (raw) => {
    expect(callKey(raw)).toBe('');
  });
});

describe('directionOf', () => {
  it('reads outgoing as OUTBOUND and incoming, missed and rejected as INBOUND', () => {
    expect(directionOf(CALL_TYPE.OUTGOING)).toBe('OUTBOUND');
    expect(directionOf(CALL_TYPE.INCOMING)).toBe('INBOUND');
    expect(directionOf(CALL_TYPE.MISSED)).toBe('INBOUND');
    expect(directionOf(CALL_TYPE.REJECTED)).toBe('INBOUND');
  });

  it('skips voicemail and blocked calls, which are not conversations', () => {
    expect(directionOf(CALL_TYPE.VOICEMAIL)).toBeNull();
    expect(directionOf(CALL_TYPE.BLOCKED)).toBeNull();
  });
});

describe('outcomeOf', () => {
  it('calls a connected call COMPLETED', () => {
    expect(outcomeOf({ type: CALL_TYPE.INCOMING, durationSeconds: 5 })).toBe('COMPLETED');
  });

  it('calls a call that never connected NO_ANSWER', () => {
    expect(outcomeOf({ type: CALL_TYPE.OUTGOING, durationSeconds: 0 })).toBe('NO_ANSWER');
    expect(outcomeOf({ type: CALL_TYPE.MISSED, durationSeconds: 0 })).toBe('NO_ANSWER');
  });

  it('never calls a missed call COMPLETED, even if the phone logged seconds against it', () => {
    expect(outcomeOf({ type: CALL_TYPE.MISSED, durationSeconds: 3 })).toBe('NO_ANSWER');
    expect(outcomeOf({ type: CALL_TYPE.REJECTED, durationSeconds: 3 })).toBe('NO_ANSWER');
  });
});

describe('planCall', () => {
  it('describes a call with a CRM contact, keyed by install and call log row', () => {
    expect(planCall(entry(), lead, 'install-a')).toEqual({
      clientCallId: 'install-a:4211',
      entry: entry(),
      lead,
      entityType: 'VENUE_LEAD',
      direction: 'OUTBOUND',
      outcome: 'COMPLETED',
      startedAt: '2026-11-24T10:30:00.000Z',
    });
  });

  it('never plans a call with a number that is not in the CRM — personal calls stay on the phone', () => {
    expect(planCall(entry(), null, 'install-a')).toBeNull();
  });

  it('refuses a directory row whose kind the API does not know', () => {
    expect(planCall(entry(), { ...lead, entityType: 'USER_LEAD' }, 'install-a')).toBeNull();
  });

  it('skips a hidden or too-short number and a voicemail', () => {
    expect(planCall(entry({ number: '' }), lead, 'i')).toBeNull();
    expect(planCall(entry({ type: CALL_TYPE.VOICEMAIL }), lead, 'i')).toBeNull();
  });
});
