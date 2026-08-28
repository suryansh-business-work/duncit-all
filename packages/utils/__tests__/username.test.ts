import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  IDLE_USERNAME_CHECK,
  USERNAME_CHECK_DEBOUNCE_MS,
  USERNAME_PATTERN,
  buildUsernameLabels,
  canSaveUsername,
  isUsernameError,
  normalizeUsername,
  profileUrl,
  scheduleUsernameCheck,
  usernameBlocksSave,
  usernameFieldState,
  usernameStatus,
  type UsernameStatus,
} from '../src/username';

const CURRENT = 'ravi-9x3m';
const idle = { current: CURRENT, checking: false, available: null, reason: null } as const;

describe('normalizeUsername', () => {
  it('trims and lower-cases, exactly as the server does before it checks', () => {
    expect(normalizeUsername('  Ravi-Plays  ')).toBe('ravi-plays');
  });

  it('answers with an empty string for anything absent', () => {
    expect(normalizeUsername(null)).toBe('');
    expect(normalizeUsername(undefined)).toBe('');
  });
});

describe('USERNAME_PATTERN', () => {
  it.each(['abc', 'ravi-9x3m', 'ravi-plays-badminton', 'a1b2c3'])('accepts %s', (value) => {
    expect(USERNAME_PATTERN.test(value)).toBe(true);
  });

  it.each(['ab', 'Ravi', 'ravi plays', '-ravi', 'ravi-', 'ravi--plays', 'r'.repeat(31)])(
    'rejects %s',
    (value) => {
      expect(USERNAME_PATTERN.test(value)).toBe(false);
    },
  );
});

describe('usernameStatus', () => {
  it('reads an empty field as IDLE', () => {
    expect(usernameStatus({ ...idle, value: '' })).toBe('IDLE');
  });

  it('reads the account OWN handle as CURRENT, never as taken', () => {
    expect(usernameStatus({ ...idle, value: CURRENT })).toBe('CURRENT');
  });

  it('decides a malformed handle locally, before anything is sent', () => {
    expect(usernameStatus({ ...idle, value: 'Ravi Plays' })).toBe('INVALID');
  });

  it('stays CHECKING while a request is in flight and while no answer has landed', () => {
    expect(usernameStatus({ ...idle, value: 'ravi-plays', checking: true })).toBe('CHECKING');
    expect(usernameStatus({ ...idle, value: 'ravi-plays' })).toBe('CHECKING');
  });

  it('reports the server answer once it arrives', () => {
    expect(usernameStatus({ ...idle, value: 'ravi-plays', available: true })).toBe('AVAILABLE');
    expect(
      usernameStatus({ ...idle, value: 'ravi-plays', available: false, reason: 'TAKEN' }),
    ).toBe('TAKEN');
    expect(usernameStatus({ ...idle, value: 'admin-x', available: false, reason: 'RESERVED' })).toBe(
      'RESERVED',
    );
    expect(usernameStatus({ ...idle, value: 'ravi-plays', available: false, reason: 'FORMAT' })).toBe(
      'INVALID',
    );
    expect(usernameStatus({ ...idle, value: 'ravi-plays', available: false, reason: null })).toBe(
      'TAKEN',
    );
  });

  it('treats an account with no handle as having nothing to be CURRENT against', () => {
    expect(usernameStatus({ ...idle, current: null, value: 'ravi-plays', available: true })).toBe(
      'AVAILABLE',
    );
  });
});

describe('canSaveUsername / isUsernameError', () => {
  it('only ever saves a free, well-formed handle that is not already yours', () => {
    expect(canSaveUsername('AVAILABLE')).toBe(true);
    expect(canSaveUsername('CURRENT')).toBe(false);
    expect(canSaveUsername('CHECKING')).toBe(false);
  });

  it('styles a refusal as an error, and progress as not one', () => {
    expect(isUsernameError('TAKEN')).toBe(true);
    expect(isUsernameError('RESERVED')).toBe(true);
    expect(isUsernameError('INVALID')).toBe(true);
    expect(isUsernameError('CHECKING')).toBe(false);
    expect(isUsernameError('CURRENT')).toBe(false);
  });
});

describe('usernameBlocksSave', () => {
  it('lets the profile save on the two statuses that are settled', () => {
    expect(usernameBlocksSave('AVAILABLE', true)).toBe(false);
    expect(usernameBlocksSave('CURRENT', true)).toBe(false);
  });

  it('blocks while the answer is still in flight, so Save never reports the previous handle', () => {
    expect(usernameBlocksSave('CHECKING', true)).toBe(true);
  });

  it.each(['TAKEN', 'RESERVED', 'INVALID'] as UsernameStatus[])('blocks on %s', (status) => {
    expect(usernameBlocksSave(status, true)).toBe(true);
  });

  it('refuses to let a handle be emptied, but lets a pre-handle account save anyway', () => {
    expect(usernameBlocksSave('IDLE', true)).toBe(true);
    expect(usernameBlocksSave('IDLE', false)).toBe(false);
  });
});

describe('profileUrl', () => {
  it('builds the /u/ address the handle is shared as', () => {
    expect(profileUrl('https://mweb.duncit.com', CURRENT)).toBe(
      'https://mweb.duncit.com/u/ravi-9x3m',
    );
  });
});

describe('usernameFieldState', () => {
  const ORIGIN = 'https://mweb.duncit.com';
  const state = (value: string, check = IDLE_USERNAME_CHECK, current: string | null = CURRENT) =>
    usernameFieldState({ value, current, check, origin: ORIGIN });

  it('shows the link that works today while the typed handle is unsettled', () => {
    expect(state('ravi-plays')).toEqual({
      status: 'CHECKING',
      link: `${ORIGIN}/u/${CURRENT}`,
      errored: false,
    });
  });

  it('previews the NEW link the moment the server says the handle is free', () => {
    const free = { checking: false, available: true, reason: null };
    expect(state('ravi-plays', free)).toEqual({
      status: 'AVAILABLE',
      link: `${ORIGIN}/u/ravi-plays`,
      errored: false,
    });
  });

  it('keeps the old link and flags the error when the handle is taken', () => {
    const taken = { checking: false, available: false, reason: 'TAKEN' } as const;
    expect(state('ravi-plays', taken)).toEqual({
      status: 'TAKEN',
      link: `${ORIGIN}/u/${CURRENT}`,
      errored: true,
    });
  });

  it('has no link at all for an account with no handle and nothing usable typed', () => {
    expect(state('', IDLE_USERNAME_CHECK, null)).toEqual({
      status: 'IDLE',
      link: '',
      errored: false,
    });
  });
});

describe('scheduleUsernameCheck', () => {
  const ask = vi.fn();
  const onState = vi.fn();
  const onError = vi.fn();
  const schedule = (value: string, current: string | null = CURRENT) =>
    scheduleUsernameCheck({ value, current, ask, onState, onError });

  beforeEach(() => {
    vi.useFakeTimers();
    ask.mockReset();
    onState.mockReset();
    onError.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['an empty field', ''],
    ['the handle already held', CURRENT],
    ['a malformed handle', 'Ravi Plays'],
  ])('never leaves the device for %s', async (_label, value) => {
    schedule(value);
    await vi.advanceTimersByTimeAsync(USERNAME_CHECK_DEBOUNCE_MS * 2);
    expect(ask).not.toHaveBeenCalled();
    expect(onState).toHaveBeenCalledWith(IDLE_USERNAME_CHECK);
  });

  // Even the no-op path hands back a cleanup, because the caller is a React
  // effect and an effect that sometimes returns nothing is a warning.
  it('hands back a cleanup that does nothing for a value that never left the device', () => {
    const cancel = schedule(CURRENT);

    expect(cancel()).toBeUndefined();
    expect(ask).not.toHaveBeenCalled();
  });

  it('debounces, then reports the answer', async () => {
    ask.mockResolvedValue({ available: true, reason: null });
    schedule('ravi-plays');
    expect(onState).toHaveBeenCalledWith({ checking: true, available: null, reason: null });

    await vi.advanceTimersByTimeAsync(USERNAME_CHECK_DEBOUNCE_MS - 1);
    expect(ask).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(ask).toHaveBeenCalledWith('ravi-plays');
    expect(onState).toHaveBeenLastCalledWith({
      checking: false,
      available: true,
      reason: null,
    });
  });

  it('treats a missing reason on a refusal as no reason rather than undefined', async () => {
    ask.mockResolvedValue({ available: false });
    schedule('ravi-plays');
    await vi.advanceTimersByTimeAsync(USERNAME_CHECK_DEBOUNCE_MS);
    expect(onState).toHaveBeenLastCalledWith({
      checking: false,
      available: false,
      reason: null,
    });
  });

  it('never fires a request that was cancelled before the debounce elapsed', async () => {
    schedule('ravi-plays')();
    await vi.advanceTimersByTimeAsync(USERNAME_CHECK_DEBOUNCE_MS * 2);
    expect(ask).not.toHaveBeenCalled();
  });

  it('drops a reply for a value that is no longer in the field', async () => {
    let settle: (answer: { available: boolean }) => void = () => undefined;
    ask.mockReturnValue(
      new Promise((resolve) => {
        settle = resolve;
      }),
    );
    const cancel = schedule('rav-x');
    await vi.advanceTimersByTimeAsync(USERNAME_CHECK_DEBOUNCE_MS);
    cancel();
    onState.mockReset();

    settle({ available: false });
    await vi.advanceTimersByTimeAsync(1);
    expect(onState).not.toHaveBeenCalled();
  });

  it('leaves the field waiting when the ask fails, and reports the error', async () => {
    const boom = new Error('offline');
    ask.mockRejectedValue(boom);
    schedule('ravi-plays');
    await vi.advanceTimersByTimeAsync(USERNAME_CHECK_DEBOUNCE_MS);
    expect(onError).toHaveBeenCalledWith(boom, 'ravi-plays');
    expect(onState).toHaveBeenLastCalledWith(IDLE_USERNAME_CHECK);
  });

  it('says nothing at all once a failed ask has been cancelled', async () => {
    ask.mockRejectedValue(new Error('offline'));
    const cancel = schedule('ravi-plays');
    await vi.advanceTimersByTimeAsync(USERNAME_CHECK_DEBOUNCE_MS - 1);
    cancel();
    await vi.advanceTimersByTimeAsync(10);
    expect(onError).not.toHaveBeenCalled();
  });

  // Cancelled AFTER the ask went out, so the rejection lands on a field that
  // has moved on. Reporting it would put an error under a value nobody typed.
  it('drops a failure that arrives after the field moved on', async () => {
    let fail: (error: unknown) => void = () => undefined;
    ask.mockReturnValue(
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
    );
    const cancel = schedule('ravi-plays');
    await vi.advanceTimersByTimeAsync(USERNAME_CHECK_DEBOUNCE_MS);
    expect(ask).toHaveBeenCalledWith('ravi-plays');
    cancel();
    onState.mockReset();

    fail(new Error('offline'));
    await vi.advanceTimersByTimeAsync(1);

    expect(onError).not.toHaveBeenCalled();
    expect(onState).not.toHaveBeenCalled();
  });
});

describe('buildUsernameLabels', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
  const labels = buildUsernameLabels(t);

  it('renders the handle with its @', () => {
    expect(labels.handle(CURRENT)).toBe('@ravi-9x3m');
  });

  it('names the handle in the available line, and only there', () => {
    expect(labels.status('AVAILABLE', 'ravi-plays')).toBe(
      'mweb.account.username.available:{"username":"ravi-plays"}',
    );
    expect(labels.status('TAKEN', 'ravi-plays')).toBe('mweb.account.username.taken');
  });

  it('says nothing at all while the field is empty', () => {
    expect(labels.status('IDLE', '')).toBe('');
  });

  it('pulls every other line straight from the catalogue', () => {
    expect(labels.label).toBe('mweb.account.username.label');
    expect(labels.placeholder).toBe('mweb.account.username.placeholder');
    expect(labels.hint).toBe('mweb.account.username.hint');
    expect(labels.linkLabel).toBe('mweb.account.username.linkLabel');
    expect(labels.saveFailed).toBe('mweb.account.username.saveFailed');
    expect(labels.copyLink).toBe('mweb.account.username.copyLink');
    expect(labels.linkCopied).toBe('mweb.account.username.linkCopied');
    expect(labels.status('CHECKING', '')).toBe('mweb.account.username.checking');
    expect(labels.status('CURRENT', '')).toBe('mweb.account.username.current');
    expect(labels.status('INVALID', '')).toBe('mweb.account.username.format');
    expect(labels.status('RESERVED', '')).toBe('mweb.account.username.reserved');
  });
});
