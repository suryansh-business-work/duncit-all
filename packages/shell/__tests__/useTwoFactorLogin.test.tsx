/**
 * The authenticator step of a console sign-in. It recognises the door's
 * TWO_FACTOR_REQUIRED refusal (and nothing else), trades the challenge plus the
 * code for the session through the page's own `acceptSession`, sends an expired
 * challenge back to the sign-in form, and rethrows any other refusal as a
 * message the code box can show.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { print, type DocumentNode } from 'graphql';

const apollo = vi.hoisted(() => ({ useMutation: vi.fn() }));
vi.mock('@apollo/client/react', () => apollo);

import { useTwoFactorLogin } from '../src/portal-login/useTwoFactorLogin';

const complete = vi.fn();
const mutationState = { loading: false };
const onSession = vi.fn();
const onExpired = vi.fn();
const resolveError = vi.fn((error: unknown) => `R:${(error as Error).message}`);
const EXTRA: readonly string[] = ['avatar_url'];

const gqlError = (code: string, extensions: Record<string, unknown> = {}) =>
  Object.assign(new Error(code), { errors: [{ message: code, extensions: { code, ...extensions } }] });

const REQUIRED = gqlError('TWO_FACTOR_REQUIRED', { challenge_token: 'chal-9' });

const mountHook = () =>
  renderHook(() => useTwoFactorLogin({ extraUserFields: EXTRA, onSession, onExpired, resolveError }));

beforeEach(() => {
  complete.mockReset();
  onSession.mockReset();
  onExpired.mockReset();
  resolveError.mockClear();
  mutationState.loading = false;
  apollo.useMutation.mockReset().mockImplementation(() => [complete, { loading: mutationState.loading }]);
});

describe('useTwoFactorLogin', () => {
  it('builds the completion document with the portal extra user fields', () => {
    mountHook();
    const doc = apollo.useMutation.mock.calls[0][0] as DocumentNode;

    expect(print(doc)).toContain('completeTwoFactorLogin');
    expect(print(doc)).toContain('avatar_url');
  });

  it('starts closed and reports the mutation as busy while it runs', () => {
    mutationState.loading = true;
    const { result } = mountHook();

    expect(result.current.open).toBe(false);
    expect(result.current.busy).toBe(true);
  });

  it('leaves an ordinary refusal to the caller', () => {
    const { result } = mountHook();
    let intercepted = true;
    act(() => {
      intercepted = result.current.intercept(new Error('Wrong password'));
    });

    expect(intercepted).toBe(false);
    expect(result.current.open).toBe(false);
  });

  it('opens the step for a TWO_FACTOR_REQUIRED refusal, and cancel closes it', () => {
    const { result } = mountHook();
    let intercepted = false;
    act(() => {
      intercepted = result.current.intercept(REQUIRED);
    });
    expect(intercepted).toBe(true);
    expect(result.current.open).toBe(true);

    act(() => result.current.cancel());
    expect(result.current.open).toBe(false);
  });

  it('does nothing when a code arrives with no challenge open', async () => {
    const { result } = mountHook();
    await act(() => result.current.submit('123456'));

    expect(complete).not.toHaveBeenCalled();
    expect(onSession).not.toHaveBeenCalled();
  });

  it('trades the challenge and the code for the session, through the page', async () => {
    const payload = { token: 'T', user: { roles: ['ADMIN'] } };
    complete.mockResolvedValue({ data: { completeTwoFactorLogin: payload } });
    const { result } = mountHook();
    act(() => {
      result.current.intercept(REQUIRED);
    });

    await act(() => result.current.submit('123456'));

    expect(complete).toHaveBeenCalledWith({ variables: { input: { challenge_token: 'chal-9', code: '123456' } } });
    expect(onSession).toHaveBeenCalledWith(payload);
  });

  it('hands the page an empty answer as-is, for its own gate to refuse', async () => {
    complete.mockResolvedValue({});
    const { result } = mountHook();
    act(() => {
      result.current.intercept(REQUIRED);
    });

    await act(() => result.current.submit('123456'));

    expect(onSession).toHaveBeenCalledWith(undefined);
  });

  it('closes and sends the reader back to the form when the challenge expired', async () => {
    const expired = gqlError('TWO_FACTOR_CHALLENGE_EXPIRED');
    complete.mockRejectedValue(expired);
    const { result } = mountHook();
    act(() => {
      result.current.intercept(REQUIRED);
    });

    await act(() => result.current.submit('123456'));

    expect(result.current.open).toBe(false);
    expect(onExpired).toHaveBeenCalledWith('R:TWO_FACTOR_CHALLENGE_EXPIRED');
    expect(onSession).not.toHaveBeenCalled();
  });

  it('rethrows any other refusal as a readable message and keeps the step open', async () => {
    complete.mockRejectedValue(gqlError('INVALID_TWO_FACTOR_CODE'));
    const { result } = mountHook();
    act(() => {
      result.current.intercept(REQUIRED);
    });

    await act(async () => {
      await expect(result.current.submit('000000')).rejects.toThrow('R:INVALID_TWO_FACTOR_CODE');
    });

    expect(result.current.open).toBe(true);
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('rethrows the page refusing the session (e.g. no access) the same way', async () => {
    complete.mockResolvedValue({ data: { completeTwoFactorLogin: { token: 'T', user: { roles: [] } } } });
    onSession.mockImplementation(() => {
      throw new Error('no access here');
    });
    const { result } = mountHook();
    act(() => {
      result.current.intercept(REQUIRED);
    });

    await act(async () => {
      await expect(result.current.submit('123456')).rejects.toThrow('R:no access here');
    });
    expect(result.current.open).toBe(true);
  });
});
