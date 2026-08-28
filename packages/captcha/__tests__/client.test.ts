import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CAPTCHA_CHALLENGE_SDL,
  captchaErrorCode,
  requestCaptchaChallenge,
} from '../src/client';

const URL = 'https://server.duncit.com/graphql';
const CHALLENGE = {
  token: 'cap_7f3a91',
  image: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
  expires_in: 120,
};

/** A fetch that answers one GraphQL body. */
const jsonFetch = (body: unknown, ok = true) =>
  vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestCaptchaChallenge', () => {
  it('posts the challenge query and hands back the code the server drew', async () => {
    const fetchFn = jsonFetch({ data: { captchaChallenge: CHALLENGE } });
    vi.stubGlobal('fetch', fetchFn);

    await expect(requestCaptchaChallenge(URL)).resolves.toEqual(CHALLENGE);
    expect(fetchFn).toHaveBeenCalledWith(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: CAPTCHA_CHALLENGE_SDL }),
      signal: undefined,
    });
  });

  it('passes an abort signal straight through, so a second reload can cancel the first', async () => {
    const fetchFn = jsonFetch({ data: { captchaChallenge: CHALLENGE } });
    vi.stubGlobal('fetch', fetchFn);
    const abort = new AbortController();

    await requestCaptchaChallenge(URL, abort.signal);

    expect(fetchFn.mock.calls[0][1].signal).toBe(abort.signal);
  });

  // Every caller is a form that has to decide what to show, and none of them
  // can do anything useful with an exception.
  it('is null rather than a throw when the API cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(requestCaptchaChallenge(URL)).resolves.toBeNull();
  });

  it('is null on a non-2xx response, without reading the body', async () => {
    const json = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json }));

    await expect(requestCaptchaChallenge(URL)).resolves.toBeNull();
    expect(json).not.toHaveBeenCalled();
  });

  it('is null when the answer carries no usable challenge', async () => {
    for (const body of [
      { data: { captchaChallenge: null } },
      { data: null },
      {},
      { data: { captchaChallenge: { ...CHALLENGE, token: '' } } },
      { errors: [{ message: 'boom' }] },
    ]) {
      vi.stubGlobal('fetch', jsonFetch(body));
      await expect(requestCaptchaChallenge(URL)).resolves.toBeNull();
    }
  });

  it('is null when the body is not JSON at all', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.reject(new Error('not json')) }),
    );

    await expect(requestCaptchaChallenge(URL)).resolves.toBeNull();
  });
});

describe('captchaErrorCode', () => {
  const withCode = (code: unknown) => [{ message: 'refused', extensions: { code } }];

  it('maps every refusal the server sends onto the copy key that explains it', () => {
    expect(captchaErrorCode(withCode('CAPTCHA_REQUIRED'))).toBe('required');
    expect(captchaErrorCode(withCode('CAPTCHA_WRONG'))).toBe('wrong');
    expect(captchaErrorCode(withCode('CAPTCHA_INVALID'))).toBe('expired');
    expect(captchaErrorCode(withCode('CAPTCHA_EXPIRED'))).toBe('expired');
  });

  it('finds the captcha refusal among errors that are about something else', () => {
    expect(
      captchaErrorCode([
        { message: 'name is required', extensions: { code: 'BAD_USER_INPUT' } },
        ...withCode('CAPTCHA_WRONG'),
      ]),
    ).toBe('wrong');
  });

  // Null means the form shows its own message rather than blaming the captcha.
  it('is null when the submit failed for some other reason entirely', () => {
    expect(captchaErrorCode([{ message: 'network', extensions: { code: 'INTERNAL' } }])).toBeNull();
    expect(captchaErrorCode([{ message: 'no extensions' }])).toBeNull();
    expect(captchaErrorCode([{ message: 'null extensions', extensions: null }])).toBeNull();
    expect(captchaErrorCode(withCode(42))).toBeNull();
    expect(captchaErrorCode(withCode(undefined))).toBeNull();
  });

  it('is null when there were no errors to read', () => {
    expect(captchaErrorCode([])).toBeNull();
    expect(captchaErrorCode(null)).toBeNull();
    expect(captchaErrorCode(undefined)).toBeNull();
  });
});
