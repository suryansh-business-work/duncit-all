import { useCallback, useState } from 'react';
import {
  needsOtp,
  type NamedCompanionInput,
  type PodAttendanceBoard,
  type PodAttendanceRow,
} from '@duncit/utils';

import {
  ClubAdminForceAttendanceDocument,
  HostMarkAttendanceDocument,
  PodAttendanceBoardDocument,
} from '@/graphql/attendance';
import { graphqlRequest } from '@/services/graphql.client';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';

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
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [otpRow, setOtpRow] = useState<PodAttendanceRow | null>(null);
  /** The attendee a Club Admin is picking a door for, or null. */
  const [choiceRow, setChoiceRow] = useState<PodAttendanceRow | null>(null);
  /** The attendee a Club Admin is about to mark by hand, or null. */
  const [forceRow, setForceRow] = useState<PodAttendanceRow | null>(null);
  /** The page-level by-name search is open (Club Admin only). */
  const [directOpen, setDirectOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await graphqlRequest(
      PodAttendanceBoardDocument,
      { pod_doc_id: podId },
      { auth: true },
    );
    setBoard(res.podAttendanceBoard as PodAttendanceBoard);
    setError('');
  }, [podId]);

  const { isLoading, refetch } = useReloadableQuery(load, {
    enabled: Boolean(podId),
    onError: (e) => setError((e as Error)?.message ?? ''),
  });

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

  /**
   * The Club Admin's write. Both extras are optional — that is the point.
   *
   * A separate mutation from the host's, not a flag on it: the server closes
   * `hostMarkPodAttendance` to anyone who is not the pod's host, so a Club
   * Admin pressing Mark used to get FORBIDDEN and nothing else. This is the
   * path that records CLUB_ADMIN_FORCE.
   */
  const markAsClubAdmin = useCallback(
    async (
      row: PodAttendanceRow,
      challengeId: string | null,
      companions: readonly NamedCompanionInput[],
    ) => {
      setBusyId(row.membership_id);
      try {
        await graphqlRequest(
          ClubAdminForceAttendanceDocument,
          {
            pod_doc_id: podId,
            membership_id: row.membership_id,
            otp_challenge_id: challengeId,
            companions: companions.length > 0 ? [...companions] : null,
          },
          { auth: true },
        );
        await load();
      } catch (e: unknown) {
        setError((e as Error)?.message ?? '');
      } finally {
        setBusyId('');
      }
    },
    [load, podId],
  );

  /**
   * A row's Mark button: the host's next step, or the Club Admin's choice.
   *
   * A Club Admin gets asked WHICH door first — a code they send the attendee,
   * or a mark from the names they were read. The host's board has no such
   * question; the admin setting has already answered it for them.
   */
  const startMark = useCallback(
    (row: PodAttendanceRow) => {
      if (!board) return;
      if (board.viewer === 'CLUB_ADMIN') {
        setChoiceRow(row);
        return;
      }
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
      if (!row) return;
      // Same verified challenge, different mutation: the host's mark is closed
      // to a Club Admin, and theirs is the one that records CLUB_ADMIN_FORCE.
      if (board?.viewer === 'CLUB_ADMIN') {
        markAsClubAdmin(row, challengeId, []).catch(() => undefined);
        return;
      }
      mark(row, challengeId).catch(() => undefined);
    },
    [board, mark, markAsClubAdmin, otpRow],
  );

  /** Close the chooser and open whichever door it picked. Read outside the
   * setter on purpose: a state updater that calls another one runs twice under
   * StrictMode. */
  const handOff = useCallback(
    (to: (row: PodAttendanceRow) => void) => {
      const row = choiceRow;
      setChoiceRow(null);
      if (row) to(row);
    },
    [choiceRow],
  );

  /**
   * A booking picked out of the by-name search.
   *
   * Straight to the warning rather than back through the chooser: opening the
   * by-name door already said which door this is, and the step that must not
   * be skipped is the one that NAMES the person being marked (rule 41).
   */
  const pickDirect = useCallback((row: PodAttendanceRow) => {
    setDirectOpen(false);
    setForceRow(row);
  }, []);

  const confirmForce = useCallback(
    (row: PodAttendanceRow, companions: readonly NamedCompanionInput[]) => {
      setForceRow(null);
      markAsClubAdmin(row, null, companions).catch(() => undefined);
    },
    [markAsClubAdmin],
  );

  return {
    board,
    isLoading: isLoading && !board,
    error,
    busyId,
    otpRow,
    choiceRow,
    forceRow,
    directOpen,
    refetch,
    startMark,
    finishMark,
    pickDirect,
    confirmForce,
    chooseOtp: useCallback(() => handOff(setOtpRow), [handOff]),
    chooseDirect: useCallback(() => handOff(setForceRow), [handOff]),
    openDirect: useCallback(() => setDirectOpen(true), []),
    cancelOtp: useCallback(() => setOtpRow(null), []),
    cancelChoice: useCallback(() => setChoiceRow(null), []),
    cancelForce: useCallback(() => setForceRow(null), []),
    cancelDirect: useCallback(() => setDirectOpen(false), []),
  };
}
