import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { useApolloTableFetch } from '@duncit/table';
import { downloadBase64File } from '@duncit/utils';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import EventTicketsTable from './EventTicketsTable';
import CompanionsDialog, { type CompanionValue } from './CompanionsDialog';
import {
  CHECK_IN_EVENT_TICKET,
  EVENT_TICKETS_TABLE,
  EVENT_TICKET_PDF,
  VERIFY_EVENT_TICKET,
  type EventTicketRow,
} from './queries';

export default function EventTicketsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [token, setToken] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [verifyQr] = useMutation(VERIFY_EVENT_TICKET);
  const [checkIn, checkInState] = useMutation(CHECK_IN_EVENT_TICKET);
  // The multi-seat ticket whose group still needs naming, if any.
  const [group, setGroup] = useState<{ ticket: EventTicketRow; required: number } | null>(null);

  const fetchRows = useApolloTableFetch<EventTicketRow>(client, EVENT_TICKETS_TABLE, 'eventTicketsTable');

  const onDownload = async (t: EventTicketRow) => {
    try {
      const res = await client.query({ query: EVENT_TICKET_PDF, variables: { id: t.id }, fetchPolicy: 'no-cache' });
      downloadBase64File(res.data.eventTicketPdfBase64, `ticket-${t.ticket_code}.pdf`, 'application/pdf');
    } catch (e: any) {
      notifyError(e.message ?? 'Could not download ticket');
    }
  };
  /**
   * Check a ticket in, collecting the rest of the group when it admits more
   * than one.
   *
   * The server has always refused a group check-in without those details. This
   * console only showed the refusal as a toast, so the operator read "add the
   * other 1 person" with nowhere to add them — the check-in simply could not be
   * completed here. COMPANIONS_REQUIRED now opens the form and re-submits.
   */
  const onCheckIn = async (t: EventTicketRow, companions?: CompanionValue[]) => {
    try {
      await checkIn({
        variables: { input: { ticket_doc_id: t.id, companions: companions ?? null } },
      });
      notifySuccess(`Checked in ${t.ticket_code}`);
      setGroup(null);
      refetchRef.current?.();
    } catch (e: any) {
      const detail = e?.graphQLErrors?.[0]?.extensions;
      if (detail?.code === 'COMPANIONS_REQUIRED') {
        setGroup({ ticket: t, required: Number(detail.companions_required ?? 1) });
        return;
      }
      notifyError(e.message ?? 'Could not check in');
    }
  };
  const onVerify = async () => {
    if (!token.trim()) return;
    try {
      const res = await verifyQr({ variables: { token: token.trim() } });
      setVerifyResult(res.data?.verifyEventTicketQr ?? null);
    } catch (e: any) {
      setVerifyResult({ ok: false, message: e.message ?? 'Verify failed' });
    }
  };
  const onCheckInToken = async () => {
    try {
      await checkIn({ variables: { input: { token: token.trim() } } });
      notifySuccess('Checked in');
      setToken('');
      setVerifyResult(null);
      refetchRef.current?.();
    } catch (e: any) {
      notifyError(e.message ?? 'Could not check in');
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={900}>
          Event Tickets
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Issued tickets, QR check-in and downloads.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <QrCodeScannerIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={900}>
              Check-in by QR
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              fullWidth
              label="Paste scanned QR token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <Button variant="outlined" onClick={onVerify} disabled={!token.trim()}>
              Verify
            </Button>
            <Button variant="contained" onClick={onCheckInToken} disabled={!verifyResult?.ok}>
              Check in
            </Button>
          </Stack>
          {verifyResult && (
            <Alert severity={verifyResult.ok ? 'success' : 'error'} sx={{ mt: 1.5 }}>
              {verifyResult.message}
            </Alert>
          )}
        </CardContent>
      </Card>

      <EventTicketsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onDownload={onDownload}
        onCheckIn={onCheckIn}
      />

      <CompanionsDialog
        ticketCode={group?.ticket.ticket_code ?? null}
        required={group?.required ?? 1}
        busy={checkInState.loading}
        onClose={() => setGroup(null)}
        onSubmit={(companions) => {
          if (group) onCheckIn(group.ticket, companions);
        }}
      />
    </Stack>
  );
}
