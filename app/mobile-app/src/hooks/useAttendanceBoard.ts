import { useCallback, useEffect, useState } from 'react';
import { needsOtp, type PodAttendanceBoard, type PodAttendanceRow } from '@duncit/utils';

import { HostMarkAttendanceDocument, PodAttendanceBoardDocument } from '@/graphql/attendance';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * The attendance roster, as state.
 *
 * The Tamagui twin of `@duncit/host-pod-actions`' `useAttendanceBoard` (rule
 * 27). The two cannot literally be one hook — that one is built on Apollo and
 * this app has no Apollo at all — but everything they DECIDE (whether a code is
 * needed, what a row's state is, how the counts add up) comes from the shared
 * `@duncit/utils` helpers, so only the fetching differs.
 */
export function useAttendanceBoard(podId: string) {
  const [board, setBoard] = useState<PodAttendanceBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [otpRow, setOtpRow] = useState<PodAttendanceRow | null>(null);

  const load = useCallback(async () => {
    const res = await graphqlRequest(
      PodAttendanceBoardDocument,
      { pod_doc_id: podId },
      { auth: true },
    );
    setBoard(res.podAttendanceBoard as PodAttendanceBoard);
    setError('');
  }, [podId]);

  const refetch = useCallback(() => {
    load().catch((e: unknown) => setError((e as Error)?.message ?? ''));
  }, [load]);

  useEffect(() => {
    if (!podId) return;
    let active = true;
    setIsLoading(true);
    load()
      .catch((e: unknown) => active && setError((e as Error)?.message ?? ''))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [podId, load]);

  /** The one write path, so both entry points report the same way. */
  const mark = useCallback(
    async (row: PodAttendanceRow, challengeId: string | null) => {
      setBusyId(row.membership_id);
      try {
        await graphqlRequest(
          HostMarkAttendanceDocument,
          {
            pod_doc_id: podId,
            membership_id: row.membership_id,
            otp_challenge_id: challengeId,
          },
          { auth: true },
        );
        // The row turning green IS the confirmation, so there is no toast to
        // raise — just re-read the board it came from.
        await load();
      } catch (e: unknown) {
        setError((e as Error)?.message ?? '');
      } finally {
        setBusyId('');
      }
    },
    [load, podId],
  );

  /** A row's Mark button: prove the number first when the platform asks for it. */
  const startMark = useCallback(
    (row: PodAttendanceRow) => {
      if (!board) return;
      if (needsOtp(board)) {
        setOtpRow(row);
        return;
      }
      mark(row, null).catch(() => undefined);
    },
    [board, mark],
  );

  /** The code checked out — spend it on the row it was raised for. */
  const finishMark = useCallback(
    (challengeId: string) => {
      const row = otpRow;
      setOtpRow(null);
      if (row) mark(row, challengeId).catch(() => undefined);
    },
    [mark, otpRow],
  );

  return {
    board,
    isLoading: isLoading && !board,
    error,
    busyId,
    otpRow,
    refetch,
    startMark,
    finishMark,
    cancelOtp: useCallback(() => setOtpRow(null), []),
  };
}
