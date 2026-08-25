import { useEffect, useRef, useState } from 'react';
import { logs } from '@duncit/logs';
import { USERNAME_PATTERN, normalizeUsername, type UsernameRejection } from '@duncit/utils';

import { MobileUsernameAvailabilityDocument } from '@/graphql/username';
import { graphqlRequest } from '@/services/graphql.client';

/** Long enough that typing a whole handle costs one request, short enough that
 * the answer arrives before the reader's finger leaves the key. */
const DEBOUNCE_MS = 400;

export interface UsernameCheck {
  checking: boolean;
  /** The answer for the CURRENT value, or null while there is not one. */
  available: boolean | null;
  reason: UsernameRejection | null;
}

const IDLE: UsernameCheck = { checking: false, available: null, reason: null };

/**
 * Ask the server whether a handle is free, once the typing stops — RN twin of
 * mWeb's `useUsernameCheck` (rule 27).
 *
 * Two things make it correct rather than merely debounced: the answer is
 * stamped with the value it was asked about and a reply for a value no longer
 * in the field is dropped (otherwise a slow "taken" for `rav` lands after a
 * fast "available" for `ravi`), and a malformed value never leaves the device,
 * because its shape is decidable here.
 */
export function useUsernameCheck(value: string, current: string | null): UsernameCheck {
  const [check, setCheck] = useState<UsernameCheck>(IDLE);
  const latest = useRef('');

  useEffect(() => {
    const candidate = normalizeUsername(value);
    latest.current = candidate;

    if (!candidate || candidate === current || !USERNAME_PATTERN.test(candidate)) {
      setCheck(IDLE);
      return undefined;
    }

    setCheck({ checking: true, available: null, reason: null });
    const timer = setTimeout(() => {
      graphqlRequest(MobileUsernameAvailabilityDocument, { username: candidate }, { auth: true })
        .then((data) => {
          if (latest.current !== candidate) return;
          const answer = data.usernameAvailability;
          setCheck({
            checking: false,
            available: answer.available,
            reason: (answer.reason as UsernameRejection | null) ?? null,
          });
        })
        .catch((error) => {
          // An unreachable check is not a refusal: leave the field waiting
          // rather than telling somebody their handle is taken because the
          // network blinked. Save stays disabled either way.
          logs.mobileApp.error('useUsernameCheck', 'availability', { error, candidate });
          if (latest.current === candidate) setCheck(IDLE);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [current, value]);

  return check;
}
