import { useState } from 'react';
import { Alert, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { DuncitButton } from '@duncit/buttons';
import {
  canScanTickets,
  earningsBodyFor,
  splitAttendance,
  type PodAttendanceLabels,
  type PodAttendanceRow as AttendanceRowData,
  type PodAttendanceViewer,
} from '@duncit/utils';
import AttendanceRow from './AttendanceRow';
import AttendanceDialogs from './AttendanceDialogs';
import AttendanceSummary from './AttendanceSummary';
import {
  ClubAdminHelpCard,
  EarningsNotice,
  LockedNotice,
  ScanCta,
} from './AttendanceNotices';
import TicketScanDialog from '../ticket-scan/TicketScanDialog';
import { useAttendanceBoard } from './useAttendanceBoard';

interface Props {
  podId: string;
  labels: PodAttendanceLabels;
  formatDateTime: (iso: string) => string;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
}

/** One list section — marked, or still to do. */
function RosterSection({
  heading,
  rows,
  labels,
  canMark,
  viewer,
  busyId,
  formatDateTime,
  onMark,
}: Readonly<{
  heading: string;
  rows: AttendanceRowData[];
  labels: PodAttendanceLabels;
  canMark: boolean;
  viewer: PodAttendanceViewer;
  busyId: string;
  formatDateTime: (iso: string) => string;
  onMark?: (row: AttendanceRowData) => void;
}>) {
  if (rows.length === 0) return null;
  return (
    <Stack spacing={1}>
      <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary' }}>
        {heading} · {rows.length}
      </Typography>
      {rows.map((row) => (
        <AttendanceRow
          key={row.membership_id}
          row={row}
          labels={labels}
          canMark={canMark}
          viewer={viewer}
          busy={busyId === row.membership_id}
          formatDateTime={formatDateTime}
          onMark={onMark}
        />
      ))}
    </Stack>
  );
}

/**
 * The attendance roster: who is marked, who is not, and the one action that
 * changes it.
 *
 * This used to live inside the Complete-pod dialog, under a money preview,
 * where the only way to mark anybody was a Scan button on each unmarked line —
 * so a host who could not scan had no path at all, and the list they were
 * reading was three levels deep in a form about something else. It is its own
 * surface now: marked and unmarked are separated, every row carries its own
 * action, and the scanner is one deliberate button at the bottom rather than
 * the only door.
 */
export default function PodAttendanceView({
  podId,
  labels,
  formatDateTime,
  notifySuccess,
  notifyError,
}: Readonly<Props>) {
  const api = useAttendanceBoard(podId, notifySuccess, notifyError);
  const [scanOpen, setScanOpen] = useState(false);
  const { board } = api;

  if (api.loading) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          py: 4
        }}>
        <CircularProgress size={22} />
      </Stack>
    );
  }

  if (!board) {
    return (
      <Stack spacing={1.5} sx={{
        alignItems: "flex-start"
      }}>
        <Alert severity="error">{api.errorText}</Alert>
        <DuncitButton onClick={api.refetch} variant="outlined" sx={{ borderRadius: 999 }}>
          {labels.retry}
        </DuncitButton>
      </Stack>
    );
  }

  const { marked, unmarked } = splitAttendance(board.rows);
  // Hoisted out of the JSX so the conditional sits at nesting 0 (Sonar S3358).
  const onMark = board.can_mark ? api.startMark : undefined;
  // A virtual pod's door is the meeting link: the payout sentence and the scanner follow the kind.
  const earningsBody = earningsBodyFor(board, labels);
  const showScan = canScanTickets(board);

  return (
    <Stack spacing={2} data-testid="pod-attendance-view">
      <AttendanceSummary board={board} labels={labels} />
      {board.can_mark ? <EarningsNotice labels={labels} body={earningsBody} /> : <LockedNotice lock={board.lock} labels={labels} />}

      {board.rows.length === 0 && (
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {labels.emptyRoster}
        </Typography>
      )}

      <RosterSection
        heading={labels.unmarkedHeading}
        rows={unmarked}
        labels={labels}
        canMark={board.can_mark}
        viewer={board.viewer}
        busyId={api.busyId}
        formatDateTime={formatDateTime}
        onMark={onMark}
      />
      {unmarked.length === 0 && board.rows.length > 0 && (
        <Alert severity="success">{labels.allMarked}</Alert>
      )}
      {marked.length > 0 && unmarked.length > 0 && <Divider />}
      <RosterSection
        heading={labels.markedHeading}
        rows={marked}
        labels={labels}
        canMark={board.can_mark}
        viewer={board.viewer}
        busyId={api.busyId}
        formatDateTime={formatDateTime}
      />

      {/* Only the host has a door to scan at (a virtual pod has none); a Club
          Admin reading the same board is fixing a record after the fact.
          The dialog is MOUNTED behind the same condition, not merely left
          closed: it reads the host-actions config, which only a surface with a
          host area supplies — so mounting it unconditionally threw the whole
          board away on every surface that has no scanner to configure.
          Closing it re-reads the board, so a guest scanned at the door moves
          into the marked list behind it — the roster and the counts can never
          be one scan out of date. */}
      {showScan && (
        <>
          <ScanCta labels={labels} onScan={() => setScanOpen(true)} icon={<QrCodeScannerIcon />} />
          <TicketScanDialog
            pod={scanOpen ? { id: board.pod_id, pod_title: board.pod_title } : null}
            onClose={() => {
              setScanOpen(false);
              api.refetch();
            }}
          />
        </>
      )}

      {/* Only useful to a host who has run out of options — a Club Admin
          reading their own section does not need their own phone number. */}
      {board.viewer === 'HOST' && (
        <ClubAdminHelpCard admins={board.club_admins} labels={labels} />
      )}

      <AttendanceDialogs podId={podId} labels={labels} api={api} />
    </Stack>
  );
}
