/**
 * Meta's messaging window and what it lets go out: free replies inside 24
 * hours, a person's human-agent reply up to 7 days, nothing after — and an
 * automation never past the first 24 hours. Plus the messaging permission
 * each network needs.
 */
import { DM_LIMIT, HUMAN_AGENT_WINDOW_MS, STANDARD_WINDOW_MS, messagingWindow, missingDmPermission, sendTerms } from '../../social.window';

const NOW = Date.UTC(2026, 10, 24, 12, 0, 0);
const HOUR = 3_600_000;
const ago = (ms: number) => new Date(NOW - ms);

describe('messagingWindow', () => {
  it('is open for 24 hours after the person last wrote, and says when it closes', () => {
    expect(messagingWindow(ago(HOUR), NOW)).toEqual({ state: 'OPEN', closes_at: new Date(NOW - HOUR + STANDARD_WINDOW_MS) });
    expect(messagingWindow(ago(STANDARD_WINDOW_MS - 1), NOW).state).toBe('OPEN');
  });

  it('is human-agent only from the 24th hour to the 7th day', () => {
    expect(messagingWindow(ago(STANDARD_WINDOW_MS), NOW)).toEqual({ state: 'HUMAN_AGENT', closes_at: new Date(NOW - STANDARD_WINDOW_MS + HUMAN_AGENT_WINDOW_MS) });
    expect(messagingWindow(ago(HUMAN_AGENT_WINDOW_MS - 1), NOW).state).toBe('HUMAN_AGENT');
  });

  it('is closed after 7 days, and for someone who never wrote at all', () => {
    expect(messagingWindow(ago(HUMAN_AGENT_WINDOW_MS), NOW)).toEqual({ state: 'CLOSED', closes_at: null });
    expect(messagingWindow(null, NOW)).toEqual({ state: 'CLOSED', closes_at: null });
    expect(messagingWindow(undefined, NOW).state).toBe('CLOSED');
    expect(messagingWindow('not a date', NOW).state).toBe('CLOSED');
  });

  it('reads an ISO string the same as a Date', () => {
    expect(messagingWindow(ago(HOUR).toISOString(), NOW).state).toBe('OPEN');
  });
});

describe('sendTerms', () => {
  const open = messagingWindow(ago(HOUR), NOW);
  const agent = messagingWindow(ago(2 * STANDARD_WINDOW_MS), NOW);
  const closed = messagingWindow(null, NOW);

  it('sends a plain response inside 24 hours, for a person and an automation alike', () => {
    expect(sendTerms(open, false)).toEqual({ messaging_type: 'RESPONSE', tag: '' });
    expect(sendTerms(open, true)).toEqual({ messaging_type: 'RESPONSE', tag: '' });
  });

  it('lets only a person reply between 24 hours and 7 days, on the HUMAN_AGENT tag', () => {
    expect(sendTerms(agent, false)).toEqual({ messaging_type: 'MESSAGE_TAG', tag: 'HUMAN_AGENT' });
    expect(sendTerms(agent, true)).toBeNull();
  });

  it('lets nothing go once the window has closed', () => {
    expect(sendTerms(closed, false)).toBeNull();
    expect(sendTerms(closed, true)).toBeNull();
  });
});

describe('missingDmPermission', () => {
  it('names the messaging permission an account lacks, and nothing when it has it', () => {
    expect(missingDmPermission({ platform: 'INSTAGRAM', scopes: ['instagram_basic', 'instagram_manage_messages'] })).toBeNull();
    expect(missingDmPermission({ platform: 'INSTAGRAM', scopes: ['instagram_basic'] })).toBe('instagram_manage_messages');
    expect(missingDmPermission({ platform: 'FACEBOOK', scopes: ['pages_messaging'] })).toBeNull();
    expect(missingDmPermission({ platform: 'FACEBOOK', scopes: null })).toBe('pages_messaging');
  });

  it('refuses a network Duncit does not message on', () => {
    expect(missingDmPermission({ platform: 'X', scopes: ['dm.write'] })).toBe('messaging');
    expect(DM_LIMIT).toEqual({ INSTAGRAM: 1000, FACEBOOK: 2000 });
  });
});
