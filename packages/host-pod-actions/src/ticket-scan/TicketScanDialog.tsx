import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { DuncitButton } from '@duncit/buttons';
import CompanionsChecklist from './CompanionsChecklist';
import CompanionsForm from './CompanionsForm';
import ScanConfirmationDialog from './ScanConfirmationDialog';
import ScannedAttendeeCard from './ScannedAttendeeCard';
import ScannerViewport from './ScannerViewport';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import { HOST_SCAN_POD_TICKET } from '../queries';
import { writeFailure } from '../write-failure';
import type { HostPodActionLabels } from '../labels';
import type {
  HostTicketScanResult,
  PodCompanionInput,
  PodCompanionRecord,
  ScanTarget,
} from '../types';

interface Props {
  pod: ScanTarget | null;
  onClose: () => void;
}

/**
 * How a result should read.
 *
 * A ticket that needs the rest of the group is not an error — it is the next
 * step, and colouring it red made a working scan look broken.
 */
function resultSeverity(result: HostTicketScanResult): 'success' | 'info' | 'error' {
  if (result.ok) return 'success';
  return result.requires_companions ? 'info' : 'error';
}

/**
 * What a successful scan actually says.
 *
 * The server's `message` is written for the failure cases; on success it left
 * the host reading the same neutral line whether one person or a group of four
 * had just been checked in.
 */
function confirmationText(
  result: HostTicketScanResult | null,
  labels: HostPodActionLabels,
): string {
  const seats = result?.ticket?.seats ?? 1;
  const who = result?.attendee?.full_name ?? '';
  if (result?.already_checked_in) return labels.alreadyMarked;
  if (seats > 1) return labels.attendanceMarkedGroup(who, seats - 1);
  if (who) return labels.attendanceMarkedOne(who);
  return labels.attendanceMarked;
}

/**
 * What the green-tick roster says under a companion's name.
 *
 * The number on file, plus whether that number actually answered a code — the
 * host verified them one at a time, and this is where they see which of them
 * it worked for.
 */
/**
 * The numbers this booking has already spoken for.
 *
 * The buyer's own phone and WhatsApp, plus everyone already written onto the
 * ticket. A companion row may not repeat one — a single WhatsApp answering a
 * single code must never tick two seats.
 */
function reservedPhones(result: HostTicketScanResult | null): string[] {
  const attendee = result?.attendee;
  return [attendee?.phone ?? '', attendee?.whatsapp ?? ''].concat(
    (result?.companions ?? []).map((companion) => companion.phone_number),
  );
}

function companionLine(companion: PodCompanionRecord, labels: HostPodActionLabels): string {
  if (!companion.verified_at) return companion.phone_number;
  return `${companion.phone_number} · ${labels.companionVerified}`;
}

/** Camera check-in for one pod: scan a ticket QR, mark the attendee present and
 * show who they are. Stays open so a host can work through a queue at the door. */
export default function TicketScanDialog({ pod, onClose }: Readonly<Props>) {
  const { labels } = useHostPodActionsConfig();
  const [result, setResult] = useState<HostTicketScanResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  // The scan that just FLIPPED the ticket — drives the confirmation dialog.
  // Kept separately from `result` so dismissing it leaves the pane's state.
  const [confirmed, setConfirmed] = useState<HostTicketScanResult | null>(null);
  const [scan, scanState] = useMutation<any>(HOST_SCAN_POD_TICKET);

  // Read once, up here: the dialog only renders its body while there IS a
  // pod, so reading it inside would be a guard no test could ever take.
  const podId = pod?.id ?? '';

  // Scanning pauses while a code is in flight and while its result is on
  // screen — otherwise every frame re-submits the same ticket.
  const scanning = !!pod && !result && !scanState.loading;

  // The token of the ticket on screen, so the second call — the one carrying
  // the group's details — scans the same ticket without another QR read.
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  // Closing does not cancel an in-flight scan, and the dialog stays mounted —
  // without this, a late response repopulates the cleared state and the next
  // open greets the host with the previous pod's ghost confirmation.
  const epochRef = useRef(0);

  const submit = async (token: string, companions?: PodCompanionInput[]) => {
    const epoch = epochRef.current;
    setFailure(null);
    try {
      const res = await scan({
        variables: { pod_doc_id: pod?.id, token, companions: companions ?? null },
      });
      if (epoch !== epochRef.current) return;
      const outcome: HostTicketScanResult | null = res.data?.hostScanPodTicket ?? null;
      setPendingToken(token);
      setResult(outcome);
      // Freshly marked (not a re-scan of someone already in) → confirm it
      // unmissably. A one-line text swap read as "nothing happened".
      if (outcome?.ok && !outcome.already_checked_in) setConfirmed(outcome);
    } catch (e: unknown) {
      if (epoch !== epochRef.current) return;
      setFailure(writeFailure(e, 'Could not read that ticket'));
    }
  };

  const close = () => {
    epochRef.current += 1;
    setResult(null);
    setFailure(null);
    setConfirmed(null);
    setPendingToken(null);
    onClose();
  };

  // Everyone this booking has accounted for — companions are on file even in
  // the collecting state (a partially-recorded group renders its ticks).
  const recorded = result?.companions ?? [];

  return (
    <Dialog open={!!pod} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <QrCodeScannerIcon color="primary" />
        <Box sx={{ minWidth: 0 }}>
          <Typography component="span" sx={{ fontWeight: 700, display: 'block' }}>
            Scan attendee tickets
          </Typography>
          <Typography
            variant="caption"
            noWrap
            sx={{
              color: "text.secondary",
              display: "block"
            }}>
            {pod?.pod_title}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {scanState.loading && (
            <Stack
              spacing={1}
              sx={{
                alignItems: "center",
                py: 3
              }}>
              <CircularProgress size={24} />
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                Checking the ticket…
              </Typography>
            </Stack>
          )}

          {!result && !scanState.loading && (
            <ScannerViewport active={scanning} onCode={submit} onManualCode={submit} />
          )}

          {failure && <Alert severity="error">{failure}</Alert>}

          {result && (
            <>
              {/* "Add the other person" is an INSTRUCTION, not a failure. Showing
                  it in red read as "the scan broke", and with the attendee card
                  between it and the form in an xs dialog, the form below was
                  missed entirely — reported as "nothing happens". */}
              <Alert severity={resultSeverity(result)}>
                {result.ok ? confirmationText(result, labels) : result.message}
              </Alert>
              {result.attendee && (
                <ScannedAttendeeCard
                  attendee={result.attendee}
                  alreadyCheckedIn={result.already_checked_in}
                  pending={result.requires_companions}
                  ticketCode={result.ticket?.ticket_code}
                  seats={result.ticket?.seats ?? 1}
                />
              )}
              {recorded.length > 0 && (
                <CompanionsChecklist
                  title={labels.checkedInList}
                  people={recorded.map((companion) => ({
                    key: `${companion.phone_number}-${companion.name}`,
                    primary: companion.name,
                    secondary: companionLine(companion, labels),
                  }))}
                />
              )}
              {result.requires_companions && pendingToken && result.ticket && (
                <CompanionsForm
                  /* Keyed on the booking: the form sizes its rows from
                     companions_required once, at mount. A different ticket
                     must therefore get a different form, while a re-scan of
                     the SAME one keeps what the host has already typed. */
                  key={result.ticket.membership_id}
                  podId={podId}
                  membershipId={result.ticket.membership_id}
                  seats={result.ticket.seats ?? 1}
                  required={result.companions_required}
                  reserved={reservedPhones(result)}
                  busy={scanState.loading}
                  onSubmit={(companions) => submit(pendingToken, companions)}
                />
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={close}>{labels.close}</DuncitButton>
        {result && (
          <DuncitButton
            variant="contained"
            onClick={() => {
              setResult(null);
              setFailure(null);
            }}
            sx={{ borderRadius: 999, fontWeight: 700 }}
          >
            Scan next
          </DuncitButton>
        )}
      </DialogActions>
      <ScanConfirmationDialog
        result={confirmed}
        text={confirmationText(confirmed, labels)}
        onDone={() => setConfirmed(null)}
      />
    </Dialog>
  );
}
