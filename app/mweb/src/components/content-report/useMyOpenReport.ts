import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import { MY_OPEN_REPORT } from './queries';

interface MyOpenReportData {
  myOpenReport: { id: string; report_no: string } | null;
}

/**
 * Has the viewer already reported this, with Legal not done with it yet?
 * Native twin: `useMyOpenReport` in hooks/useReportContent (rule 27).
 *
 * Read from the network on every open: Legal can close the earlier report at
 * any moment, and a cached "already reported" would keep the form locked after
 * it did. A failed check falls back to the form — the server refuses a repeat
 * anyway (REPORT_ALREADY_PENDING) — and is logged rather than dropped.
 */
export function useMyOpenReport(targetId: string | null) {
  const { data, loading, error } = useQuery<MyOpenReportData>(MY_OPEN_REPORT, {
    skip: !targetId,
    variables: { id: targetId },
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (error) logs.mWeb.warn('contentReport', 'myOpenReport', { error });
  }, [error]);

  return {
    checking: !!targetId && loading,
    pending: error ? null : (data?.myOpenReport ?? null),
  };
}
