import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  needsOtp,
  type NamedCompanionInput,
  type PodAttendanceBoard,
  type PodAttendanceRow,
} from '@duncit/utils';
import { FORCE_ATTENDANCE, HOST_MARK_ATTENDANCE, POD_ATTENDANCE_BOARD } from './queries';
import { writeFailure } from '../write-failure';

export interface AttendanceBoardApi {
  board: PodAttendanceBoard | undefined;
  loading: boolean;
  errorText: string;
  refetch: () => void;
  /** The membership currently being written, so only its row shows busy. */
  busyId: string;
  /** The attendee whose phone is being proved, or null. */
  otpRow: PodAttendanceRow | null;
  /** The attendee a Club Admin is picking a door for, or null. */
  choiceRow: PodAttendanceRow | null;
  /** The attendee a Club Admin is about to mark by hand, or null. */
  forceRow: PodAttendanceRow | null;
  /** The page-level by-name search is open (Club Admin only). */
  directOpen: boolean;
  /** Row's Mark button: the host's next step, or the Club Admin's choice. */
  startMark: (row: PodAttendanceRow) => void;
  /** OTP dialog succeeded — spend the challenge on the row it was raised for. */
  finishMark: (challengeId: string) => void;
  /** Club Admin picked the code door. */
  chooseOtp: () => void;
  /** Club Admin picked the by-name door. */
  chooseDirect: () => void;
  /** Open the page-level by-name search. */
  openDirect: () => void;
  /** A booking was picked out of that search — confirm it like any other. */
  pickDirect: (row: PodAttendanceRow) => void;
  cancelOtp: () => void;
  cancelChoice: () => void;
  cancelForce: () => void;
  cancelDirect: () => void;
  confirmForce: (row: PodAttendanceRow, companions: readonly NamedCompanionInput[]) => void;
}

/**
 * The attendance page as one state machine.
 *
 * mWeb renders it as a page and the Partners console as a section, but the
 * states are identical — which row is being written, whose phone is being
 * proved, which forced mark is awaiting a confirmation — so both read them from
 * here and keep only their own chrome.
 *
 * Marking always re-reads the board rather than patching a row locally: the
 * counts, the lock and the roster all move together, and a client that edited
 * one of them would be the thing that disagrees with the payout.
 */
export function useAttendanceBoard(
  podId: string,
  /** Stable references, please — they sit in this hook's callback deps. */
  notifySuccess: (message: string) => void,
  notifyError: (message: string) => void
): AttendanceBoardApi {
  const { data, loading, error, refetch } = useQuery<any>(POD_ATTENDANCE_BOARD, {
    variables: { pod_doc_id: podId },
    skip: !podId,
    fetchPolicy: 'cache-and-network',
  });
  const [markAttendance] = useMutation<any>(HOST_MARK_ATTENDANCE);
  const [forceAttendance] = useMutation<any>(FORCE_ATTENDANCE);
  const [busyId, setBusyId] = useState('');
  const [otpRow, setOtpRow] = useState<PodAttendanceRow | null>(null);
  const [choiceRow, setChoiceRow] = useState<PodAttendanceRow | null>(null);
  const [forceRow, setForceRow] = useState<PodAttendanceRow | null>(null);
  const [directOpen, setDirectOpen] = useState(false);

  const board: PodAttendanceBoard | undefined = data?.podAttendanceBoard;

  const reload = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  /** The one write path, so success/failure is handled identically everywhere. */
  const run = useCallback(
    (membershipId: string, mutate: () => Promise<unknown>, message: string) => {
      setBusyId(membershipId);
      mutate()
        .then(() => {
          notifySuccess(message);
          reload();
        })
        .catch((e: unknown) => notifyError(writeFailure(e, message)))
        .finally(() => setBusyId(''));
    },
    [notifyError, notifySuccess, reload]
  );

  /** The Club Admin's write. Both extras are optional — that is the point. */
  const markAsClubAdmin = useCallback(
    (
      row: PodAttendanceRow,
      challengeId: string | null,
      companions: readonly NamedCompanionInput[]
    ) => {
      run(
        row.membership_id,
        () =>
          forceAttendance({
            variables: {
              pod_doc_id: podId,
              membership_id: row.membership_id,
              otp_challenge_id: challengeId,
              companions: companions.length > 0 ? companions : null,
            },
          }),
        row.name
      );
    },
    [forceAttendance, podId, run]
  );

  const markNow = useCallback(
    (row: PodAttendanceRow, challengeId: string | null, message: string) => {
      run(
        row.membership_id,
        () =>
          markAttendance({
            variables: {
              pod_doc_id: podId,
              membership_id: row.membership_id,
              otp_challenge_id: challengeId,
            },
          }),
        message
      );
    },
    [markAttendance, podId, run]
  );

  const startMark = useCallback(
    (row: PodAttendanceRow) => {
      if (!board) return;
      // A Club Admin gets asked WHICH door first: a code they send the attendee,
      // or a mark from the names they were read. The host's board has no such
      // question — the setting already answers it for them.
      if (board.viewer === 'CLUB_ADMIN') {
        setChoiceRow(row);
        return;
      }
      if (needsOtp(board)) {
        setOtpRow(row);
        return;
      }
      markNow(row, null, row.name);
    },
    [board, markNow]
  );

  const finishMark = useCallback(
    (challengeId: string) => {
      const row = otpRow;
      setOtpRow(null);
      if (!row) return;
      // Same verified challenge, different mutation: the host's mark is closed
      // to a Club Admin, and theirs is the one that records CLUB_ADMIN_FORCE.
      if (board?.viewer === 'CLUB_ADMIN') {
        markAsClubAdmin(row, challengeId, []);
        return;
      }
      markNow(row, challengeId, row.name);
    },
    [board, markAsClubAdmin, markNow, otpRow]
  );

  /** Close the chooser and open whichever door it picked. Read outside the
   * setter on purpose: a state updater that calls another one is run twice
   * under StrictMode. */
  const handOff = useCallback(
    (to: (row: PodAttendanceRow) => void) => {
      const row = choiceRow;
      setChoiceRow(null);
      if (row) to(row);
    },
    [choiceRow]
  );

  const confirmForce = useCallback(
    (row: PodAttendanceRow, companions: readonly NamedCompanionInput[]) => {
      setForceRow(null);
      markAsClubAdmin(row, null, companions);
    },
    [markAsClubAdmin]
  );

  /**
   * A booking picked out of the by-name search.
   *
   * Straight to the force dialog rather than back through the chooser: the
   * admin has already said which door this is by opening the by-name one, and
   * the warning that names the person is the step that must not be skipped
   * (rule 41).
   */
  const pickDirect = useCallback((row: PodAttendanceRow) => {
    setDirectOpen(false);
    setForceRow(row);
  }, []);

  return {
    board,
    loading: loading && !board,
    errorText: error?.message ?? '',
    refetch: reload,
    busyId,
    otpRow,
    choiceRow,
    forceRow,
    directOpen,
    startMark,
    finishMark,
    pickDirect,
    chooseOtp: useCallback(() => handOff(setOtpRow), [handOff]),
    chooseDirect: useCallback(() => handOff(setForceRow), [handOff]),
    openDirect: useCallback(() => setDirectOpen(true), []),
    cancelOtp: useCallback(() => setOtpRow(null), []),
    cancelChoice: useCallback(() => setChoiceRow(null), []),
    cancelForce: useCallback(() => setForceRow(null), []),
    cancelDirect: useCallback(() => setDirectOpen(false), []),
    confirmForce,
  };
}
