import { useEffect, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { IDLE_USERNAME_CHECK, scheduleUsernameCheck, type UsernameCheckState } from '@duncit/utils';
import { logs } from '@duncit/logs';
import { USERNAME_AVAILABILITY, type UsernameAvailability } from './queries';

/**
 * Ask the server whether a handle is free, once the typing stops.
 *
 * The debounce, the shape guard and the drop-a-stale-reply rule are
 * `scheduleUsernameCheck` in @duncit/utils — the native app runs the same
 * logic (rule 40). What is left here is the transport: Apollo, and the one
 * place that answers `network-only`, because a cached "available" is exactly
 * the answer that goes stale.
 */
export function useUsernameCheck(value: string, current: string | null): UsernameCheckState {
  const client = useApolloClient();
  const [check, setCheck] = useState<UsernameCheckState>(IDLE_USERNAME_CHECK);

  useEffect(
    () =>
      scheduleUsernameCheck({
        value,
        current,
        ask: (candidate) =>
          client
            .query<{ usernameAvailability: UsernameAvailability }>({
              query: USERNAME_AVAILABILITY,
              variables: { username: candidate },
              fetchPolicy: 'network-only',
            })
            // Apollo 4 types `data` optional — a query that errored has none,
            // and the caller's contract is an answer, not a maybe.
            .then((result) => {
              const answer = result.data?.usernameAvailability;
              if (!answer) throw new Error('No availability answer');
              return answer;
            }),
        onState: setCheck,
        onError: (error, candidate) =>
          logs.mWeb.error('useUsernameCheck', 'availability', { error, candidate }),
      }),
    [client, current, value],
  );

  return check;
}
