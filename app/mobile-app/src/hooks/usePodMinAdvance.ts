import { useEffect, useMemo, useState } from 'react';
import { logs } from '@duncit/logs';
import { podMinAdvanceWindow, startOfDayInZone, type PodMinAdvanceWindow } from '@duncit/utils';

import { MyPodMinAdvanceDaysDocument } from '@/graphql/pod-min-advance';
import { useDateFormat } from '@/hooks/useDateFormat';
import { graphqlRequest } from '@/services/graphql.client';

/** The rule as Create Pod applies it: the days, and the first day a pod may start. */
export interface PodMinAdvance extends PodMinAdvanceWindow {
  days: number;
}

/**
 * How far ahead this host's new pod must start, on the admin's clock and zone.
 * `null` until the server has answered, when the read fails, and whenever
 * `enabled` is off (a Club Admin's pod is not held to it): the calendar is not
 * narrowed on a guess, and the server refuses a host's pod that starts too
 * soon either way. mWeb twin: create-pod/usePodMinAdvance.
 */
export function usePodMinAdvance(enabled = true): PodMinAdvance | null {
  const fmt = useDateFormat();
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setDays(null);
      return undefined;
    }
    let active = true;
    graphqlRequest(MyPodMinAdvanceDaysDocument, {}, { auth: true })
      .then((res) => {
        // Only a real number narrows the calendar; anything else is "unknown".
        const answer: unknown = res?.myPodMinAdvanceDays;
        if (active) setDays(typeof answer === 'number' ? answer : null);
      })
      .catch((error: unknown) => {
        logs.mobileApp.warn('usePodMinAdvance', 'read', { error });
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  // The window only moves when the day does, so it is keyed on today.
  const today = fmt.dayKey(fmt.clock.nowMs());
  const { timeZone } = fmt;
  return useMemo(() => {
    if (days === null) return null;
    return { days, ...podMinAdvanceWindow(startOfDayInZone(today, timeZone), timeZone, days) };
  }, [days, today, timeZone]);
}
