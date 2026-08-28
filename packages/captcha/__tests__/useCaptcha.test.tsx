import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCaptcha } from '../src/mui/useCaptcha';

const URL = 'https://server.duncit.com/graphql';
const CHALLENGE = {
  token: 'cap_7f3a91',
  image: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
  expires_in: 120,
};

/** A probe that renders the hook's whole state as text. */
function Probe({ url = URL }: Readonly<{ url?: string }>) {
  const captcha = useCaptcha(url);
  return (
    <div>
      <span data-testid="token">{captcha.token}</span>
      <span data-testid="image">{captcha.image}</span>
      <span data-testid="loading">{String(captcha.loading)}</span>
      <span data-testid="failed">{String(captcha.failed)}</span>
      <button type="button" onClick={captcha.reload}>
        reload
      </button>
    </div>
  );
}

const answer = (challenge: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: { captchaChallenge: challenge } }) });

const text = (id: string) => screen.getByTestId(id).textContent;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useCaptcha', () => {
  it('fetches a challenge on mount and settles on it', async () => {
    vi.stubGlobal('fetch', answer(CHALLENGE));
    render(<Probe />);

    expect(text('loading')).toBe('true');
    await waitFor(() => expect(text('token')).toBe(CHALLENGE.token));
    expect(text('image')).toBe(CHALLENGE.image);
    expect(text('loading')).toBe('false');
    expect(text('failed')).toBe('false');
  });

  // The widget says so and offers a retry, rather than showing a blank frame.
  it('marks itself failed when the API answers with nothing', async () => {
    vi.stubGlobal('fetch', answer(null));
    render(<Probe />);

    await waitFor(() => expect(text('failed')).toBe('true'));
    expect(text('token')).toBe('');
    expect(text('loading')).toBe('false');
  });

  it('fetches a fresh code on reload, because a used code is a spent code', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: { captchaChallenge: CHALLENGE } }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { captchaChallenge: { ...CHALLENGE, token: 'cap_second' } } }),
      });
    vi.stubGlobal('fetch', fetchFn);
    const user = userEvent.setup();
    render(<Probe />);
    await waitFor(() => expect(text('token')).toBe(CHALLENGE.token));

    await user.click(screen.getByRole('button', { name: 'reload' }));

    await waitFor(() => expect(text('token')).toBe('cap_second'));
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('refetches when the API address it was given changes', async () => {
    const fetchFn = answer(CHALLENGE);
    vi.stubGlobal('fetch', fetchFn);
    const { rerender } = render(<Probe />);
    await waitFor(() => expect(text('token')).toBe(CHALLENGE.token));

    rerender(<Probe url="https://staging.server.duncit.com/graphql" />);

    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
    expect(fetchFn.mock.calls[1][0]).toBe('https://staging.server.duncit.com/graphql');
  });

  // Two reloads in quick succession would otherwise race their responses into
  // the same slot, and the loser could be the picture left on screen.
  it('drops a response that lands after the component is gone', async () => {
    let settle: (value: unknown) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise((resolve) => { settle = resolve; })),
    );
    const { unmount } = render(<Probe />);
    unmount();

    await act(async () => {
      settle({ ok: true, json: () => Promise.resolve({ data: { captchaChallenge: CHALLENGE } }) });
    });

    expect(screen.queryByTestId('token')).not.toBeInTheDocument();
  });

  it('aborts the request in flight when it unmounts', async () => {
    const signals: AbortSignal[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: { signal: AbortSignal }) => {
        signals.push(init.signal);
        return new Promise(() => undefined);
      }),
    );
    const { unmount } = render(<Probe />);

    unmount();

    expect(signals[0].aborted).toBe(true);
  });
});
