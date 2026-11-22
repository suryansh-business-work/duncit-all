import { useMemo } from 'react';
import { gql, type TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import type { Query } from '@duncit/gql-types';
import {
  MY_POD_MIN_ADVANCE_DAYS_SDL,
  podMinAdvanceWindow,
  startOfDayInZone,
  type PodMinAdvanceWindow,
} from '@duncit/utils';
import { useDateFormat } from '../../../utils/dateFormat';

/** The host's own Minimum Advance Days — their Hosts-console override, else Pod Settings. */
export const MY_POD_MIN_ADVANCE_DAYS: TypedDocumentNode<Pick<Query, 'myPodMinAdvanceDays'>> =
  gql(MY_POD_MIN_ADVANCE_DAYS_SDL);

/** The rule as Create Pod applies it: the days, and the first day a pod may start. */
export interface PodMinAdvance extends PodMinAdvanceWindow {
  days: number;
}

/**
 * How far ahead this host's new pod must start, on the admin's clock and zone.
 * `null` until the server has answered: the calendar is not narrowed on a
 * guess, and the server refuses a pod that starts too soon either way.
 * Native twin: usePodMinAdvance.
 */
export function usePodMinAdvance(): PodMinAdvance | null {
  const fmt = useDateFormat();
  const { data } = useQuery(MY_POD_MIN_ADVANCE_DAYS, { fetchPolicy: 'cache-and-network' });
  const days = data?.myPodMinAdvanceDays;
  // The window only moves when the day does, so it is keyed on today.
  const today = fmt.dayKey(fmt.clock.nowMs());
  const { timeZone } = fmt;
  return useMemo(() => {
    if (typeof days !== 'number') return null;
    return { days, ...podMinAdvanceWindow(startOfDayInZone(today, timeZone), timeZone, days) };
  }, [days, today, timeZone]);
}
