import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CompanionsForm from './CompanionsForm';
import ScannedAttendeeCard from './ScannedAttendeeCard';
import ScannerViewport from './ScannerViewport';
import { useTranslation } from '../../../i18n/useTranslation';
import {
  HOST_SCAN_POD_TICKET,
  type HostTicketScanResult,
  type PodCompanionInput,
} from './queries';

export interface ScanTarget {
  id: string;
  pod_title: string;
}

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

/** Camera check-in for one pod: scan a ticket QR, mark the attendee present and
 * show who they are. Stays open so a host can work through a queue at the door. */
export default function TicketScanDialog({ pod, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [result, setResult] = useState<HostTicketScanResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [scan, scanState] = useMutation(HOST_SCAN_POD_TICKET);

  // Scanning pauses while a code is in flight and while its result is on
  // screen — otherwise every frame re-submits the same ticket.
  const scanning = !!pod && !result && !scanState.loading;

  // The token of the ticket on screen, so the second call — the one carrying
  // the group's details — scans the same ticket without another QR read.
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  const submit = async (token: string, companions?: PodCompanionInput[]) => {
    setFailure(null);
    try {
      const res = await scan({
        variables: { pod_doc_id: pod?.id, token, companions: companions ?? null },
      });
      setPendingToken(token);
      setResult(res.data?.hostScanPodTicket ?? null);
    } catch (e: any) {
      setFailure(e?.message ?? 'Could not read that ticket');
    }
  };

  const close = () => {
    setResult(null);
    setFailure(null);
    setPendingToken(null);
    onClose();
  };

  // What a successful scan actually says. The server's `message` is written for
  // the failure cases; on success it left the host reading the same neutral line
  // whether one person or a group of four had just been checked in.
  const seats = result?.ticket?.seats ?? 1;
  const who = result?.attendee?.full_name ?? '';
  let confirmation = t('mweb.hostScan.attendanceMarked');
  if (result?.already_checked_in) {
    confirmation = t('mweb.hostScan.alreadyMarked');
  } else if (seats > 1) {
    confirmation = t('mweb.hostScan.attendanceMarkedGroup', {
      vars: { name: who, count: seats - 1 },
    });
  } else if (who) {
    confirmation = t('mweb.hostScan.attendanceMarkedOne', { vars: { name: who } });
  }

  return (
    <Dialog open={!!pod} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <QrCodeScannerIcon color="primary" />
        <Box sx={{ minWidth: 0 }}>
          <Typography component="span" sx={{ fontWeight: 700, display: 'block' }}>
            Scan attendee tickets
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {pod?.pod_title}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {scanState.loading && (
            <Stack alignItems="center" sx={{ py: 3 }} spacing={1}>
              <CircularProgress size={24} />
              <Typography variant="caption" color="text.secondary">
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
                {result.ok ? confirmation : result.message}
              </Alert>
              {result.attendee && (
                <ScannedAttendeeCard
                  attendee={result.attendee}
                  alreadyCheckedIn={result.already_checked_in}
                  ticketCode={result.ticket?.ticket_code}
                  seats={result.ticket?.seats ?? 1}
                />
              )}
              {result.requires_companions && pendingToken && (
                <CompanionsForm
                  seats={result.ticket?.seats ?? 1}
                  required={result.companions_required}
                  busy={scanState.loading}
                  onSubmit={(companions) => submit(pendingToken, companions)}
                />
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Close</Button>
        {result && (
          <Button
            variant="contained"
            onClick={() => {
              setResult(null);
              setFailure(null);
            }}
            sx={{ borderRadius: 999, fontWeight: 700 }}
          >
            Scan next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
