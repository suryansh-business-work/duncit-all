import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { needsOtp, type PodAttendanceBoard, type PodAttendanceRow } from '@duncit/utils';
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
  /** The attendee a Club Admin is about to force, or null. */
  forceRow: PodAttendanceRow | null;
  /** Row's Mark button: opens the OTP dialog, or writes straight away. */
  startMark: (row: PodAttendanceRow) => void;
  /** OTP dialog succeeded — spend the challenge on the row it was raised for. */
  finishMark: (challengeId: string) => void;
  cancelOtp: () => void;
  cancelForce: () => void;
  confirmForce: (row: PodAttendanceRow) => void;
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
  const { data, loading, error, refetch } = useQuery(POD_ATTENDANCE_BOARD, {
    variables: { pod_doc_id: podId },
    skip: !podId,
    fetchPolicy: 'cache-and-network',
  });
  const [markAttendance] = useMutation(HOST_MARK_ATTENDANCE);
  const [forceAttendance] = useMutation(FORCE_ATTENDANCE);
  const [busyId, setBusyId] = useState('');
  const [otpRow, setOtpRow] = useState<PodAttendanceRow | null>(null);
  const [forceRow, setForceRow] = useState<PodAttendanceRow | null>(null);

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
      // A Club Admin never proves anything — their path is the override, and it
      // asks for a confirmation instead.
      if (board.viewer === 'CLUB_ADMIN') {
        setForceRow(row);
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
      if (row) markNow(row, challengeId, row.name);
    },
    [markNow, otpRow]
  );

  const confirmForce = useCallback(
    (row: PodAttendanceRow) => {
      setForceRow(null);
      run(
        row.membership_id,
        () =>
          forceAttendance({
            variables: { pod_doc_id: podId, membership_id: row.membership_id },
          }),
        row.name
      );
    },
    [forceAttendance, podId, run]
  );

  return {
    board,
    loading: loading && !board,
    errorText: error?.message ?? '',
    refetch: reload,
    busyId,
    otpRow,
    forceRow,
    startMark,
    finishMark,
    cancelOtp: useCallback(() => setOtpRow(null), []),
    cancelForce: useCallback(() => setForceRow(null), []),
    confirmForce,
  };
}
