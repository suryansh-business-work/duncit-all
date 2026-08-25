import { useEffect, useState } from 'react';
import { logs } from '@duncit/logs';
import { IDLE_USERNAME_CHECK, scheduleUsernameCheck, type UsernameCheckState } from '@duncit/utils';

import { MobileUsernameAvailabilityDocument } from '@/graphql/username';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * Ask the server whether a handle is free, once the typing stops.
 *
 * The debounce, the shape guard and the drop-a-stale-reply rule are
 * `scheduleUsernameCheck` in @duncit/utils — mWeb runs the same logic (rule
 * 40). What is left here is the transport.
 */
export function useUsernameCheck(value: string, current: string | null): UsernameCheckState {
  const [check, setCheck] = useState<UsernameCheckState>(IDLE_USERNAME_CHECK);

  useEffect(
    () =>
      scheduleUsernameCheck({
        value,
        current,
        ask: (candidate) =>
          graphqlRequest(
            MobileUsernameAvailabilityDocument,
            { username: candidate },
            { auth: true },
          ).then((data) => ({
            available: data.usernameAvailability.available,
            reason: data.usernameAvailability.reason ?? null,
          })),
        onState: setCheck,
        onError: (error, candidate) =>
          logs.mobileApp.error('useUsernameCheck', 'availability', { error, candidate }),
      }),
    [current, value],
  );

  return check;
}
