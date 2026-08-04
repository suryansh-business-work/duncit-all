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
import ScannedAttendeeCard from './ScannedAttendeeCard';
import ScannerViewport from './ScannerViewport';
import { HOST_SCAN_POD_TICKET, type HostTicketScanResult } from './queries';

export interface ScanTarget {
  id: string;
  pod_title: string;
}

interface Props {
  pod: ScanTarget | null;
  onClose: () => void;
}

/** Camera check-in for one pod: scan a ticket QR, mark the attendee present and
 * show who they are. Stays open so a host can work through a queue at the door. */
export default function TicketScanDialog({ pod, onClose }: Readonly<Props>) {
  const [result, setResult] = useState<HostTicketScanResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [scan, scanState] = useMutation(HOST_SCAN_POD_TICKET);

  // Scanning pauses while a code is in flight and while its result is on
  // screen — otherwise every frame re-submits the same ticket.
  const scanning = !!pod && !result && !scanState.loading;

  const submit = async (token: string) => {
    setFailure(null);
    try {
      const res = await scan({ variables: { pod_doc_id: pod?.id, token } });
      setResult(res.data?.hostScanPodTicket ?? null);
    } catch (e: any) {
      setFailure(e?.message ?? 'Could not read that ticket');
    }
  };

  const close = () => {
    setResult(null);
    setFailure(null);
    onClose();
  };

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
              <Alert severity={result.ok ? 'success' : 'error'}>{result.message}</Alert>
              {result.attendee && (
                <ScannedAttendeeCard
                  attendee={result.attendee}
                  alreadyCheckedIn={result.already_checked_in}
                  ticketCode={result.ticket?.ticket_code}
                  seats={result.ticket?.seats ?? 1}
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
