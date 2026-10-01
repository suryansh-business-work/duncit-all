import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import ScanBusy from './ScanBusy';
import ScanDialogTitle from './ScanDialogTitle';
import ScanResultPane from './ScanResultPane';
import { confirmationText } from './scan-result';
import ScanConfirmationDialog from '../ScanConfirmationDialog';
import ScannerViewport from '../ScannerViewport';
import { useHostPodActionsConfig } from '../../HostPodActionsProvider';
import { HOST_SCAN_POD_TICKET } from '../../queries';
import { writeFailure } from '../../write-failure';
import type { HostTicketScanResult, PodCompanionInput, ScanTarget } from '../../types';

interface Props {
  pod: ScanTarget | null;
  onClose: () => void;
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
    <Dialog open={!!pod} onClose={close} fullWidth maxWidth="xs" data-testid="ticket-scan-dialog">
      <ScanDialogTitle heading={labels.scanTitle} podTitle={pod?.pod_title} />
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {scanState.loading && <ScanBusy text={labels.scanChecking} />}

          {!result && !scanState.loading && (
            <ScannerViewport active={scanning} onCode={submit} onManualCode={submit} />
          )}

          {failure && (
            <Alert severity="error" data-testid="ticket-scan-error">
              {failure}
            </Alert>
          )}

          {result && (
            <ScanResultPane
              result={result}
              recorded={recorded}
              podId={podId}
              pendingToken={pendingToken}
              busy={scanState.loading}
              labels={labels}
              onCompanions={submit}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={close} data-testid="ticket-scan-close">
          {labels.close}
        </DuncitButton>
        {result && (
          <DuncitButton
            variant="contained"
            onClick={() => {
              setResult(null);
              setFailure(null);
            }}
            data-testid="ticket-scan-next"
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
