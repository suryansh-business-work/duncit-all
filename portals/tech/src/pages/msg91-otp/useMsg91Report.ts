import { useCallback, useState } from 'react';
import type { TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import { useMsg91Configured } from './Msg91PageFrame';
import { windowEndingToday, type DateWindowValues } from './date-window';

interface WindowVars {
  start_date: string;
  end_date: string;
}

/**
 * One MSG91 report over a date window: the window itself, what MSG91 answered,
 * and a submit that re-asks even when the window did not move — MSG91's
 * records grow while the page is open, so "Load" on the same days is a refresh.
 * Nothing is asked until MSG91 is known to be configured.
 */
export function useMsg91Report<TData>(
  document: TypedDocumentNode<TData, WindowVars>,
  maxDays: number
) {
  const configured = useMsg91Configured();
  const [range, setRange] = useState<DateWindowValues>(() => windowEndingToday(maxDays));
  const query = useQuery(document, {
    variables: { start_date: range.start, end_date: range.end },
    skip: !configured,
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });
  const { refetch } = query;

  const onRange = useCallback(
    (next: DateWindowValues) => {
      if (next.start !== range.start || next.end !== range.end) {
        setRange(next);
        return;
      }
      // A failed refetch is already on screen through `error`; this only records it.
      refetch().catch((error: unknown) => {
        logs.portal.tech.warn('useMsg91Report', 'refetch', {
          error: error instanceof Error ? error.message : 'refetch failed',
        });
      });
    },
    [range, refetch]
  );

  return { range, onRange, data: query.data, loading: query.loading, error: query.error };
}
