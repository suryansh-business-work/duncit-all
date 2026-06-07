import { useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { notifyError, notifySuccess } from '../../components/notify';
import EventTicketsTable from './EventTicketsTable';
import {
  CHECK_IN_EVENT_TICKET,
  EVENT_TICKETS,
  EVENT_TICKET_PDF,
  VERIFY_EVENT_TICKET,
  type EventTicketRow,
} from './queries';

function downloadPdf(base64: string, filename: string) {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EventTicketsPage() {
  const client = useApolloClient();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [token, setToken] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; message: string } | null>(null);
  const { data, loading, error, refetch } = useQuery(EVENT_TICKETS, {
    variables: { filter: { status: status || undefined, search: search || undefined } },
    fetchPolicy: 'cache-and-network',
  });
  const [verifyQr] = useMutation(VERIFY_EVENT_TICKET);
  const [checkIn] = useMutation(CHECK_IN_EVENT_TICKET);

  const tickets: EventTicketRow[] = data?.eventTickets ?? [];

  const onDownload = async (t: EventTicketRow) => {
    try {
      const res = await client.query({ query: EVENT_TICKET_PDF, variables: { id: t.id }, fetchPolicy: 'no-cache' });
      downloadPdf(res.data.eventTicketPdfBase64, `ticket-${t.ticket_code}.pdf`);
    } catch (e: any) {
      notifyError(e.message ?? 'Could not download ticket');
    }
  };
  const onCheckIn = async (t: EventTicketRow) => {
    try {
      await checkIn({ variables: { input: { ticket_doc_id: t.id } } });
      notifySuccess(`Checked in ${t.ticket_code}`);
      refetch();
    } catch (e: any) {
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
      refetch();
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

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          size="small"
          label="Search code / attendee / event"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1 }}
        />
        <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="VALID">Valid</MenuItem>
          <MenuItem value="CHECKED_IN">Checked in</MenuItem>
          <MenuItem value="CANCELLED">Cancelled</MenuItem>
        </TextField>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}
      <EventTicketsTable loading={loading} tickets={tickets} onDownload={onDownload} onCheckIn={onCheckIn} />
    </Stack>
  );
}
