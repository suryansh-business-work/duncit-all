// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The console's interest form steps over the public mutations. Apollo is the
 * subject of its own package, so each mutation is a stand-in that records its
 * variables and answers what the test queues.
 */
const mocks = vi.hoisted(() => ({
  calls: new Map<string, ReturnType<typeof vi.fn>>(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('@apollo/client/react', () => ({
  useMutation: (doc: { definitions: { name: { value: string } }[] }) => {
    const name = doc.definitions[0].name.value;
    if (!mocks.calls.has(name)) mocks.calls.set(name, vi.fn());
    return [mocks.calls.get(name)];
  },
}));
vi.mock('@duncit/dialogs', () => ({ notifyError: mocks.notifyError, notifySuccess: mocks.notifySuccess }));
vi.mock('@duncit/logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/logs')>()),
  logs: { portal: { venues: { warn: mocks.warn } } },
}));

import { useVenueKitOtp } from '../../../src/pages/venue-kit/interest-form';

const op = (name: string) => {
  if (!mocks.calls.has(name)) mocks.calls.set(name, vi.fn());
  return mocks.calls.get(name) as ReturnType<typeof vi.fn>;
};
const CODE = { expires_in_minutes: 10, sent: true, test_code: null };

beforeEach(() => {
  for (const fn of mocks.calls.values()) fn.mockReset();
  vi.clearAllMocks();
});

function setup() {
  const onRegistered = vi.fn();
  const hook = renderHook(() => useVenueKitOtp(onRegistered));
  const act$ = async <T,>(run: () => Promise<T>) => {
    let value: T | undefined;
    await act(async () => {
      value = await run();
    });
    return value;
  };
  return { hook, onRegistered, act$ };
}

describe('useVenueKitOtp', () => {
  it('walks email → phone → submit, spending both proofs', async () => {
    op('ConsoleVenueKitEmailOtp').mockResolvedValue({ data: { requestVenueKitEmailOtp: CODE } });
    op('ConsoleVenueKitVerifyEmail').mockResolvedValue({ data: { verifyVenueKitEmailOtp: { token: 'email-proof' } } });
    op('ConsoleVenueKitPhoneOtp').mockResolvedValue({ data: { requestVenueKitPhoneOtp: CODE } });
    op('ConsoleVenueKitVerifyPhone').mockResolvedValue({ data: { verifyVenueKitPhoneOtp: { token: 'phone-proof' } } });
    op('ConsoleVenueKitSubmit').mockResolvedValue({ data: { submitVenueKitInterest: { ok: true, already_registered: false } } });
    const { hook, onRegistered, act$ } = setup();

    expect(await act$(() => hook.result.current.actions.sendEmail('Cafe', 'owner@cafe.in'))).toBe(true);
    expect(op('ConsoleVenueKitEmailOtp')).toHaveBeenCalledWith({ variables: { input: { name: 'Cafe', email: 'owner@cafe.in' } } });
    expect(hook.result.current.state.emailNote).toBe('We sent a 6-digit code to owner@cafe.in. It expires in 10 minutes.');

    await act$(() => hook.result.current.actions.verifyEmail('owner@cafe.in', '123456'));
    expect(hook.result.current.state.emailToken).toBe('email-proof');

    await act$(() => hook.result.current.actions.sendPhone('9876543210'));
    expect(op('ConsoleVenueKitPhoneOtp')).toHaveBeenCalledWith({
      variables: { input: { email_token: 'email-proof', phone_extension: '+91', phone_number: '9876543210' } },
    });
    expect(hook.result.current.state.phoneNote).toBe('We sent a 6-digit code to +91 9876543210. It expires in 10 minutes.');

    await act$(() => hook.result.current.actions.verifyPhone('9876543210', '654321'));
    expect(op('ConsoleVenueKitVerifyPhone')).toHaveBeenCalledWith({ variables: { input: { phone_extension: '+91', phone_number: '9876543210', code: '654321' } } });
    expect(hook.result.current.state.phoneToken).toBe('phone-proof');

    expect(await act$(() => hook.result.current.actions.submit({ name: 'Cafe', phone_number: '9876543210' }))).toBe(true);
    expect(op('ConsoleVenueKitSubmit')).toHaveBeenCalledWith({
      variables: { input: { name: 'Cafe', email_token: 'email-proof', phone_extension: '+91', phone_number: '9876543210', phone_token: 'phone-proof' } },
    });
    expect(mocks.notifySuccess).toHaveBeenCalledWith('You are on the list');
    expect(onRegistered).toHaveBeenCalledTimes(1);
    expect(hook.result.current.state).toEqual({ emailNote: null, emailToken: null, phoneNote: null, phoneToken: null, busy: null });
  });

  it('submits without a phone proof, and says so when the mailbox was already on the list', async () => {
    op('ConsoleVenueKitVerifyEmail').mockResolvedValue({ data: { verifyVenueKitEmailOtp: { token: 'email-proof' } } });
    op('ConsoleVenueKitSubmit').mockResolvedValue({ data: { submitVenueKitInterest: { ok: true, already_registered: true } } });
    const { hook, act$ } = setup();
    await act$(() => hook.result.current.actions.verifyEmail('owner@cafe.in', '123456'));
    await act$(() => hook.result.current.actions.submit({ name: 'Cafe', phone_number: '9876543210' }));
    expect(op('ConsoleVenueKitSubmit').mock.calls[0][0].variables.input).not.toHaveProperty('phone_token');
    expect(mocks.notifySuccess).toHaveBeenCalledWith('You were already on the list, so we updated your details.');
  });

  it('shows the test code while no provider is set up', async () => {
    op('ConsoleVenueKitEmailOtp').mockResolvedValue({ data: { requestVenueKitEmailOtp: { ...CODE, sent: false, test_code: '123456' } } });
    const { hook, act$ } = setup();
    await act$(() => hook.result.current.actions.sendEmail('Cafe', 'owner@cafe.in'));
    expect(hook.result.current.state.emailNote).toBe('No provider is set up on this server yet. Use the code 123456.');
  });

  it('tells the person why a step failed, logs it, and reports false', async () => {
    op('ConsoleVenueKitVerifyEmail').mockRejectedValue(new Error('Incorrect code — 4 attempts left'));
    const { hook, act$ } = setup();
    expect(await act$(() => hook.result.current.actions.verifyEmail('owner@cafe.in', '000000'))).toBe(false);
    expect(mocks.notifyError).toHaveBeenCalledWith('Incorrect code — 4 attempts left');
    expect(mocks.warn).toHaveBeenCalledWith('venueKit', 'verifyEmail', expect.objectContaining({ reason: 'Incorrect code — 4 attempts left' }));
    expect(hook.result.current.state.emailToken).toBeNull();
    expect(hook.result.current.state.busy).toBeNull();
  });

  it('reads a missing answer as no proof rather than crashing', async () => {
    op('ConsoleVenueKitEmailOtp').mockResolvedValue({ data: null });
    op('ConsoleVenueKitVerifyEmail').mockResolvedValue({ data: null });
    op('ConsoleVenueKitPhoneOtp').mockResolvedValue({ data: null });
    op('ConsoleVenueKitVerifyPhone').mockResolvedValue({ data: null });
    op('ConsoleVenueKitSubmit').mockResolvedValue({ data: null });
    const { hook, act$ } = setup();
    await act$(() => hook.result.current.actions.sendEmail('Cafe', 'owner@cafe.in'));
    expect(hook.result.current.state.emailNote).toContain('owner@cafe.in');
    await act$(() => hook.result.current.actions.verifyEmail('owner@cafe.in', '123456'));
    await act$(() => hook.result.current.actions.sendPhone('9876543210'));
    expect(op('ConsoleVenueKitPhoneOtp').mock.calls[0][0].variables.input.email_token).toBe('');
    await act$(() => hook.result.current.actions.verifyPhone('9876543210', '123456'));
    await act$(() => hook.result.current.actions.submit({ name: 'Cafe', phone_number: '9876543210' }));
    expect(hook.result.current.state.emailToken).toBeNull();
    expect(mocks.notifySuccess).toHaveBeenCalledWith('You are on the list');
  });

  it('reset drops every proof', async () => {
    op('ConsoleVenueKitVerifyEmail').mockResolvedValue({ data: { verifyVenueKitEmailOtp: { token: 'email-proof' } } });
    const { hook, act$ } = setup();
    await act$(() => hook.result.current.actions.verifyEmail('owner@cafe.in', '123456'));
    act(() => hook.result.current.actions.reset());
    expect(hook.result.current.state.emailToken).toBeNull();
  });
});
