import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLiteSession } from '../../../../shared/session';
import { useSignInPrompt } from '../../../app/providers/SignInPromptProvider';
import { meFixture, renderHookWithProviders, storeResetMocks } from '../../test-utils';

const usePromptAndSession = () => ({ prompt: useSignInPrompt(), session: useLiteSession() });

afterEach(() => {
  localStorage.clear();
});

describe('SignInPromptProvider', () => {
  it('lets a signed-in reader straight through without opening the dialog', async () => {
    const { result } = renderHookWithProviders(usePromptAndSession, { me: meFixture() });

    let allowed = false;
    await act(async () => {
      allowed = await result.current.prompt.requireSignIn();
    });

    expect(allowed).toBe(true);
    expect(result.current.prompt.dialogOpen).toBe(false);
  });

  it('opens the dialog for a visitor and answers false when they close it', async () => {
    const { result } = renderHookWithProviders(usePromptAndSession);

    let pending: Promise<boolean> = Promise.resolve(true);
    act(() => {
      pending = result.current.prompt.requireSignIn();
    });
    expect(result.current.prompt.dialogOpen).toBe(true);

    act(() => result.current.prompt.closeSignIn());

    await expect(pending).resolves.toBe(false);
    expect(result.current.prompt.dialogOpen).toBe(false);
  });

  it('answers every waiting page true, and closes the dialog, once the visitor signs in', async () => {
    const me = meFixture();
    const { result } = renderHookWithProviders(usePromptAndSession, { mocks: storeResetMocks(me) });

    let register: Promise<boolean> = Promise.resolve(false);
    let subscribe: Promise<boolean> = Promise.resolve(false);
    act(() => {
      register = result.current.prompt.requireSignIn();
      subscribe = result.current.prompt.requireSignIn();
    });
    expect(result.current.prompt.dialogOpen).toBe(true);

    await act(async () => {
      await result.current.session.completeSignIn('fresh-token');
    });

    await expect(register).resolves.toBe(true);
    await expect(subscribe).resolves.toBe(true);
    expect(result.current.prompt.dialogOpen).toBe(false);
    expect(result.current.session.signedIn).toBe(true);
  });

  it('opens and closes the dialog on demand, with nobody waiting', () => {
    const { result } = renderHookWithProviders(usePromptAndSession);

    act(() => result.current.prompt.openSignIn());
    expect(result.current.prompt.dialogOpen).toBe(true);

    act(() => result.current.prompt.closeSignIn());
    expect(result.current.prompt.dialogOpen).toBe(false);
  });

  it('does not answer an earlier, already-closed request again when the reader signs in later', async () => {
    const { result } = renderHookWithProviders(usePromptAndSession, { mocks: storeResetMocks(meFixture()) });
    const settled = vi.fn();

    act(() => {
      result.current.prompt.requireSignIn().then(settled, settled);
    });
    act(() => result.current.prompt.closeSignIn());
    await act(async () => {
      await result.current.session.completeSignIn('fresh-token');
    });

    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith(false);
  });
});

describe('useSignInPrompt', () => {
  it('refuses to run outside the provider', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useSignInPrompt())).toThrow('useSignInPrompt needs a SignInPromptProvider');
    quiet.mockRestore();
  });
});
