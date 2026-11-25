import {
  applyStatusCheck,
  IDLE_CALL,
  restoredCall,
  type ActiveCall,
  type CallState,
} from '../callLine';

/** How a status check changes a call on the CRM call line. */

const active = (over: Partial<ActiveCall> = {}): ActiveCall => ({
  id: 'log1',
  entity_id: 'v1',
  status: 'IN_PROGRESS',
  answered_at: '2026-11-25T10:00:00.000Z',
  muted: true,
  on_hold: false,
  transcript_segments: [{ seq: 1, speaker: 'AGENT', text: 'Hello' }],
  ...over,
});
const placed: CallState = { ...IDLE_CALL, logId: 'log1', status: 'INITIATED' };

describe('restoredCall', () => {
  it('picks the live call back up with its pick-up time, mute, hold and transcript', () => {
    expect(restoredCall(active())).toEqual({
      ...IDLE_CALL,
      logId: 'log1',
      status: 'IN_PROGRESS',
      answeredAt: '2026-11-25T10:00:00.000Z',
      muted: true,
      onHold: false,
      segments: [{ seq: 1, speaker: 'AGENT', text: 'Hello' }],
    });
  });

  it('reads a status it does not know as connecting, and no pick-up time as none', () => {
    const call = restoredCall(active({ status: 'queued', answered_at: undefined }));
    expect(call.status).toBe('INITIATED');
    expect(call.answeredAt).toBeNull();
  });
});

describe('applyStatusCheck', () => {
  it('takes Twilio’s re-synced status first, and clears a lost connection', () => {
    const next = applyStatusCheck({ ...placed, connectionLost: true }, 'RINGING', null);
    expect(next.status).toBe('RINGING');
    expect(next.connectionLost).toBe(false);
  });

  it('falls back to the live call’s own status, then keeps the last one', () => {
    expect(applyStatusCheck(placed, null, active()).status).toBe('IN_PROGRESS');
    expect(applyStatusCheck(placed, 'unknown', null).status).toBe('INITIATED');
  });

  it('takes the pick-up time, mute, hold and new transcript lines from this call only', () => {
    const withLine = { ...placed, segments: [{ seq: 1, speaker: 'AGENT', text: 'Hello' }] };
    const next = applyStatusCheck(
      withLine,
      'IN_PROGRESS',
      active({
        on_hold: true,
        transcript_segments: [
          { seq: 2, speaker: 'LEAD', text: 'Hi' },
          { seq: 1, speaker: 'AGENT', text: 'Hello' },
        ],
      }),
    );
    expect(next).toMatchObject({
      answeredAt: '2026-11-25T10:00:00.000Z',
      muted: true,
      onHold: true,
    });
    expect(next.segments.map((s) => s.text)).toEqual(['Hello', 'Hi']);

    const other = applyStatusCheck(placed, 'RINGING', active({ id: 'someone-else', muted: true }));
    expect(other.muted).toBe(false);
    expect(other.segments).toEqual([]);
  });

  it('keeps the known pick-up time when a check has none', () => {
    const answered = { ...placed, answeredAt: '2026-11-25T10:00:05.000Z' };
    expect(applyStatusCheck(answered, null, active({ answered_at: null })).answeredAt).toBe(
      '2026-11-25T10:00:05.000Z',
    );
  });
});
