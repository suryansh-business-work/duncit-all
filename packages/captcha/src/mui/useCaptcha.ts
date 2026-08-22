import { useCallback, useEffect, useState } from 'react';
import { requestCaptchaChallenge } from '../client';

/**
 * One live challenge, held outside the form.
 *
 * The token is NOT form state: nobody types it, resetting the form must not
 * clear it, and it changes on its own every time a code is spent. Keeping it
 * here means the form only ever owns the one value a person actually enters.
 */
export interface CaptchaState {
  /** Send with the mutation. Empty while a challenge is in flight. */
  token: string;
  /** SVG data URI for an `<img src>`. */
  image: string;
  loading: boolean;
  /** The API could not be reached — the widget says so and offers a retry. */
  failed: boolean;
  /** Fetch a fresh code. Call after EVERY submit: a used code is a spent code. */
  reload: () => void;
}

export function useCaptcha(graphqlUrl: string): CaptchaState {
  const [challenge, setChallenge] = useState({ token: '', image: '' });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    // Two reloads in quick succession would otherwise race their responses
    // into the same slot, and the loser could be the picture on screen.
    let current = true;
    const abort = new AbortController();
    setLoading(true);
    setFailed(false);
    setChallenge({ token: '', image: '' });
    requestCaptchaChallenge(graphqlUrl, abort.signal)
      .then((next) => {
        if (!current) return;
        setChallenge(next ? { token: next.token, image: next.image } : { token: '', image: '' });
        setFailed(!next);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
      abort.abort();
    };
  }, [graphqlUrl, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { token: challenge.token, image: challenge.image, loading, failed, reload };
}
