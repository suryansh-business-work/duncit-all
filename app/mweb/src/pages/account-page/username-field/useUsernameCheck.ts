import { useEffect, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { USERNAME_PATTERN, normalizeUsername } from '@duncit/utils';
import { logs } from '@duncit/logs';
import { USERNAME_AVAILABILITY, type UsernameAvailability } from './queries';

/** Long enough that typing a whole handle costs one request, short enough that
 * the answer arrives before the reader's finger leaves the key. */
const DEBOUNCE_MS = 400;

export interface UsernameCheck {
  checking: boolean;
  /** The answer for the CURRENT value, or null while there is not one. */
  available: boolean | null;
  reason: UsernameAvailability['reason'];
}

const IDLE: UsernameCheck = { checking: false, available: null, reason: null };

/**
 * Ask the server whether a handle is free, once the typing stops.
 *
 * Two things make this correct rather than merely debounced:
 *  - the answer is stamped with the value it was asked about, and a reply for a
 *    value that is no longer in the field is dropped. Without that, a slow
 *    "taken" for `rav` lands after a fast "available" for `ravi` and the field
 *    reports the wrong one;
 *  - a malformed value never leaves the browser. The shape is decidable here,
 *    so a request for it would be a round trip whose answer was already known.
 */
export function useUsernameCheck(value: string, current: string | null): UsernameCheck {
  const client = useApolloClient();
  const [check, setCheck] = useState<UsernameCheck>(IDLE);
  // The value the newest request was fired for — the guard against an
  // out-of-order reply overwriting a newer answer.
  const latest = useRef('');

  useEffect(() => {
    const candidate = normalizeUsername(value);
    latest.current = candidate;

    if (!candidate || candidate === current || !USERNAME_PATTERN.test(candidate)) {
      setCheck(IDLE);
      return undefined;
    }

    setCheck({ checking: true, available: null, reason: null });
    const timer = globalThis.setTimeout(() => {
      client
        .query<{ usernameAvailability: UsernameAvailability }>({
          query: USERNAME_AVAILABILITY,
          variables: { username: candidate },
          fetchPolicy: 'network-only',
        })
        .then((result) => {
          if (latest.current !== candidate) return;
          const answer = result.data.usernameAvailability;
          setCheck({ checking: false, available: answer.available, reason: answer.reason });
        })
        .catch((error) => {
          // An unreachable check is not a refusal: leave the field waiting
          // rather than telling somebody their handle is taken because the
          // network blinked. Save stays disabled either way.
          logs.mWeb.error('useUsernameCheck', 'availability', { error, candidate });
          if (latest.current === candidate) setCheck(IDLE);
        });
    }, DEBOUNCE_MS);

    return () => globalThis.clearTimeout(timer);
  }, [client, current, value]);

  return check;
}
