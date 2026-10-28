import type { ReactNode } from 'react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LITE_ME } from '../../../shared/graphql/documents';
import { LiteSessionProvider, useLiteSession } from '../../../shared/session';
import { readCookie } from '../../../shared/storage';
import { meFixture } from '../test-utils';

const TOKEN_KEY = 'lite_token';
const COOKIE = 'lite_session';

const meAnswer = (name: string): MockedResponse => ({ request: { query: LITE_ME }, result: { data: { liteMe: meFixture({ name }) } } });
const unknownToken: MockedResponse = { request: { query: LITE_ME }, result: { data: { liteMe: null } } };

interface Setup {
  mocks?: MockedResponse[];
  initialToken?: string | null;
  cookieName?: string;
}

const renderSession = ({ mocks = [], initialToken, cookieName }: Setup = {}) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={mocks} mockLinkDefaultOptions={{ delay: 0 }}>
      <LiteSessionProvider tokenKey={TOKEN_KEY} initialToken={initialToken} cookieName={cookieName}>
        {children}
      </LiteSessionProvider>
    </MockedProvider>
  );
  return renderHook(() => useLiteSession(), { wrapper });
};

const clearCookie = () => {
  document.cookie = `${COOKIE}=; Path=/; Max-Age=0`;
};

beforeEach(() => {
  localStorage.clear();
  clearCookie();
});

afterEach(() => {
  localStorage.clear();
  clearCookie();
});

describe('LiteSessionProvider', () => {
  it('is signed out, with nothing to resolve, when there is no token anywhere', () => {
    const { result } = renderSession();
    expect(result.current.signedIn).toBe(false);
    expect(result.current.me).toBeNull();
    expect(result.current.resolving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('says why the account could not be read, keeping the token for a retry', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok-1');
    const { result } = renderSession({ mocks: [{ request: { query: LITE_ME }, error: new Error('Failed to fetch') }] });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error instanceof Error ? result.current.error.message : '').toBe('Failed to fetch');
    expect(result.current.signedIn).toBe(true);
    expect(result.current.me).toBeNull();
    expect(result.current.resolving).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok-1');
  });

  it('starts from the stored token on a page with no server render, resolving the account', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok-1');
    const { result } = renderSession({ mocks: [meAnswer('Asha Rao')] });

    expect(result.current.signedIn).toBe(true);
    expect(result.current.resolving).toBe(true);
    expect(result.current.me).toBeNull();

    await waitFor(() => expect(result.current.me?.name).toBe('Asha Rao'));
    expect(result.current.resolving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('keeps the token it was handed (here: none) when it has no cookie to keep in step', async () => {
    localStorage.setItem(TOKEN_KEY, 'stored-token');
    const { result } = renderSession({ initialToken: null, mocks: [meAnswer('Asha Rao')] });
    expect(result.current.signedIn).toBe(false);
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });
    expect(result.current.signedIn).toBe(false);
  });

  it('mirrors the token into the cookie after mount so the server can render signed-in pages', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok-1');
    const { result } = renderSession({ initialToken: 'tok-1', cookieName: COOKIE, mocks: [meAnswer('Asha Rao')] });
    expect(readCookie(COOKIE)).toBe('tok-1');
    await waitFor(() => expect(result.current.me?.name).toBe('Asha Rao'));
  });

  it('drops a page-load token signed out of since, and its cookie, so a remount cannot revive the session', async () => {
    document.cookie = `${COOKIE}=tok-1; Path=/`;
    const { result } = renderSession({ initialToken: 'tok-1', cookieName: COOKIE, mocks: [meAnswer('Asha Rao')] });
    await waitFor(() => expect(result.current.signedIn).toBe(false));
    expect(result.current.me).toBeNull();
    expect(readCookie(COOKIE)).toBeNull();
  });

  it('adopts a stored session the server did not render with, and writes its cookie', async () => {
    localStorage.setItem(TOKEN_KEY, 'older-token');
    const { result } = renderSession({ initialToken: null, cookieName: COOKIE, mocks: [meAnswer('Asha Rao')] });

    await waitFor(() => expect(result.current.signedIn).toBe(true));
    expect(readCookie(COOKIE)).toBe('older-token');
    await waitFor(() => expect(result.current.me?.name).toBe('Asha Rao'));
  });

  it('drops a token the API no longer recognises, from storage and the cookie', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired');
    const { result } = renderSession({ cookieName: COOKIE, mocks: [unknownToken] });

    await waitFor(() => expect(result.current.signedIn).toBe(false));
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(readCookie(COOKIE)).toBeNull();
    expect(result.current.me).toBeNull();
  });

  it('completes a sign-in: stores the token, sets the cookie and loads the account', async () => {
    const { result } = renderSession({ initialToken: null, cookieName: COOKIE, mocks: [meAnswer('Asha Rao')] });

    await act(async () => {
      await result.current.completeSignIn('fresh-token');
    });

    expect(result.current.signedIn).toBe(true);
    expect(localStorage.getItem(TOKEN_KEY)).toBe('fresh-token');
    expect(readCookie(COOKIE)).toBe('fresh-token');
    await waitFor(() => expect(result.current.me?.name).toBe('Asha Rao'));
  });

  it('signs out: forgets the token and the cookie', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok-1');
    // The second answer serves the store reset's refetch, should it run before the query is skipped.
    const { result } = renderSession({ initialToken: 'tok-1', cookieName: COOKIE, mocks: [meAnswer('Asha Rao'), meAnswer('Asha Rao')] });
    await waitFor(() => expect(result.current.me?.name).toBe('Asha Rao'));

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.signedIn).toBe(false);
    expect(result.current.me).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(readCookie(COOKIE)).toBeNull();
  });

  it('refreshes the account on demand', async () => {
    const { result } = renderSession({ initialToken: 'tok-1', mocks: [meAnswer('Asha Rao'), meAnswer('Asha R.')] });
    await waitFor(() => expect(result.current.me?.name).toBe('Asha Rao'));

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.me?.name).toBe('Asha R.'));
  });

  it('has nothing to refresh when signed out', async () => {
    const answered = vi.fn(() => ({ data: { liteMe: meFixture() } }));
    const { result } = renderSession({ mocks: [{ request: { query: LITE_ME }, result: answered }] });

    await act(async () => {
      await result.current.refresh();
    });

    expect(answered).not.toHaveBeenCalled();
    expect(result.current.signedIn).toBe(false);
  });
});

describe('useLiteSession', () => {
  it('refuses to run outside the provider', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useLiteSession())).toThrow('useLiteSession needs a LiteSessionProvider');
    quiet.mockRestore();
  });
});
