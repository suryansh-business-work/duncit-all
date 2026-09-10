import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AVAILABILITY_CHECK_DEBOUNCE_MS } from '../src/availability-check';
import {
  IDLE_SIGNUP_CONTACT_CHECK,
  scheduleSignupContactCheck,
  signupContactBlocksContinue,
  signupContactLines,
  signupContactStatus,
  signupContactsBlockContinue,
  signupEmailCandidate,
  signupPhoneCandidate,
  type SignupContactCheckState,
  type SignupContactStatus,
} from '../src/signup-contact';

/**
 * The shapes the signup schema hands in. Written out here rather than imported
 * because this package takes no @duncit/* dependency — which is the very reason
 * the functions accept a RegExp instead of owning one.
 */
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const DIAL_CODE = /^\+\d{1,4}$/;
const PHONE_INTL = /^\d{6,14}$/;
const SHAPES = { extension: DIAL_CODE, number: PHONE_INTL };

const check = (over: Partial<SignupContactCheckState> = {}): SignupContactCheckState => ({
  ...IDLE_SIGNUP_CONTACT_CHECK,
  ...over,
});

describe('what a contact box is saying', () => {
  it('says nothing at all until the value is worth asking about', () => {
    expect(signupContactStatus(null, check())).toBe('IDLE');
    expect(signupContactStatus('', check())).toBe('IDLE');
  });

  it('reports the ask while it is in flight', () => {
    expect(signupContactStatus('riya@duncit.com', check({ checking: true }))).toBe('CHECKING');
  });

  it('still reads as checking between the debounce and the answer', () => {
    // checking has been turned off but no answer has landed — the gap a naive
    // "answer === null means available" would render as a green tick.
    expect(signupContactStatus('riya@duncit.com', check({ answer: null }))).toBe('CHECKING');
  });

  it('answers available or taken once the server has', () => {
    expect(signupContactStatus('riya@duncit.com', check({ answer: true }))).toBe('AVAILABLE');
    expect(signupContactStatus('riya@duncit.com', check({ answer: false }))).toBe('TAKEN');
  });

  it('reports a failed ask as unknown rather than as an answer', () => {
    expect(signupContactStatus('riya@duncit.com', check({ failed: true }))).toBe('UNKNOWN');
  });

  it('prefers checking over a stale answer for the value being typed', () => {
    expect(signupContactStatus('riya@duncit.com', check({ checking: true, answer: false }))).toBe(
      'CHECKING',
    );
  });
});

describe('whether the step can be left', () => {
  it('blocks on taken, and on an answer still in flight', () => {
    expect(signupContactBlocksContinue('TAKEN')).toBe(true);
    // A fast typist reaching Continue mid-flight is the case this exists for.
    expect(signupContactBlocksContinue('CHECKING')).toBe(true);
  });

  it('does not block on idle, available, or an ask that failed', () => {
    expect(signupContactBlocksContinue('IDLE')).toBe(false);
    expect(signupContactBlocksContinue('AVAILABLE')).toBe(false);
    // An outage of the hint must never become an outage of signup.
    expect(signupContactBlocksContinue('UNKNOWN')).toBe(false);
  });

  it('blocks the whole step when any one box does', () => {
    const clear: SignupContactStatus[] = ['AVAILABLE', 'UNKNOWN'];
    expect(signupContactsBlockContinue(clear)).toBe(false);
    expect(signupContactsBlockContinue([...clear, 'TAKEN'])).toBe(true);
    expect(signupContactsBlockContinue([])).toBe(false);
  });
});

describe('the email worth asking about', () => {
  it('normalises to how auth.email is stored', () => {
    expect(signupEmailCandidate('  Riya@Duncit.COM  ', EMAIL)).toBe('riya@duncit.com');
  });

  it('asks nothing for an address still being typed', () => {
    expect(signupEmailCandidate('riya@', EMAIL)).toBeNull();
    expect(signupEmailCandidate('riya@duncit', EMAIL)).toBeNull();
    expect(signupEmailCandidate('', EMAIL)).toBeNull();
    expect(signupEmailCandidate('   ', EMAIL)).toBeNull();
  });

  it('survives a field the form has not registered yet', () => {
    // Typed `string`, but a form reads undefined before its field mounts — the
    // cast is the untyped caller this guard exists for.
    expect(signupEmailCandidate(undefined as unknown as string, EMAIL)).toBeNull();
  });
});

describe('the number worth asking about', () => {
  it('joins the two boxes the way the code step prints them', () => {
    expect(signupPhoneCandidate(' +91 ', ' 9845012345 ', SHAPES)).toBe('+91 9845012345');
  });

  it('asks nothing until both boxes are filled', () => {
    expect(signupPhoneCandidate('', '9845012345', SHAPES)).toBeNull();
    // The dial code alone is never worth a round trip.
    expect(signupPhoneCandidate('+91', '', SHAPES)).toBeNull();
  });

  it('asks nothing while either box is short of its shape', () => {
    expect(signupPhoneCandidate('91', '9845012345', SHAPES)).toBeNull();
    expect(signupPhoneCandidate('+91', '98450', SHAPES)).toBeNull();
  });

  it('survives either box before the form has registered it', () => {
    const missing = undefined as unknown as string;
    expect(signupPhoneCandidate(missing, '9845012345', SHAPES)).toBeNull();
    expect(signupPhoneCandidate('+91', missing, SHAPES)).toBeNull();
  });
});

describe('the lines under the box', () => {
  const copy = {
    hint: 'We will send your code here.',
    checking: 'Checking…',
    taken: 'That number already has a Duncit account.',
  };

  it('takes the error line only while the contact is somebody else’s', () => {
    expect(signupContactLines('TAKEN', copy)).toEqual({ hint: copy.hint, error: copy.taken });
  });

  it('replaces the hint while the answer is in flight', () => {
    expect(signupContactLines('CHECKING', copy)).toEqual({ hint: copy.checking });
  });

  it('keeps the plain hint everywhere else, a failed ask included', () => {
    expect(signupContactLines('IDLE', copy)).toEqual({ hint: copy.hint });
    expect(signupContactLines('AVAILABLE', copy)).toEqual({ hint: copy.hint });
    // UNKNOWN says nothing rather than something wrong.
    expect(signupContactLines('UNKNOWN', copy)).toEqual({ hint: copy.hint });
  });
});

describe('the round trip', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('asks once the typing stops, and reports the answer', async () => {
    const onState = vi.fn();
    const onError = vi.fn();
    const ask = vi.fn().mockResolvedValue(true);

    const stop = scheduleSignupContactCheck({
      candidate: 'riya@duncit.com',
      ask,
      onState,
      onError,
    });

    expect(onState).toHaveBeenCalledWith({ checking: true, answer: null, failed: false });
    expect(ask).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(AVAILABILITY_CHECK_DEBOUNCE_MS);

    expect(ask).toHaveBeenCalledWith('riya@duncit.com');
    expect(onState).toHaveBeenLastCalledWith({ checking: false, answer: true, failed: false });
    expect(onError).not.toHaveBeenCalled();
    stop();
  });

  it('never asks about a candidate the device already ruled out', () => {
    const onState = vi.fn();
    const ask = vi.fn();

    const stop = scheduleSignupContactCheck({
      candidate: null,
      ask,
      onState,
      onError: vi.fn(),
    });

    expect(onState).toHaveBeenCalledWith(IDLE_SIGNUP_CONTACT_CHECK);
    expect(ask).not.toHaveBeenCalled();
    // The cleanup is still a function, so an effect can return it unconditionally.
    expect(stop()).toBeUndefined();
  });

  it('drops a reply for a value no longer in the box', async () => {
    const onState = vi.fn();
    const ask = vi.fn().mockResolvedValue(false);

    const stop = scheduleSignupContactCheck({
      candidate: 'riy@duncit.com',
      ask,
      onState,
      onError: vi.fn(),
    });
    stop();

    await vi.advanceTimersByTimeAsync(AVAILABILITY_CHECK_DEBOUNCE_MS);

    // Only the opening "checking" — a slow TAKEN for the old value must never
    // land on top of the answer for what is in the box now.
    expect(onState).toHaveBeenCalledTimes(1);
    expect(onState).toHaveBeenCalledWith({ checking: true, answer: null, failed: false });
  });

  it('reports a failed ask as failed, never as an answer', async () => {
    const onState = vi.fn();
    const onError = vi.fn();
    const blip = new Error('Network request failed');

    const stop = scheduleSignupContactCheck({
      candidate: '+91 9845012345',
      ask: vi.fn().mockRejectedValue(blip),
      onState,
      onError,
    });

    await vi.advanceTimersByTimeAsync(AVAILABILITY_CHECK_DEBOUNCE_MS);

    expect(onError).toHaveBeenCalledWith(blip, '+91 9845012345');
    expect(onState).toHaveBeenLastCalledWith({ checking: false, answer: null, failed: true });
    stop();
  });
});
