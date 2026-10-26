import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { downloadBase64File, firstGraphQLError } from '@duncit/utils';
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
import { useTranslation } from '@duncit/shell';

export default function EventTicketsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [token, setToken] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [verifyQr] = useMutation<any>(VERIFY_EVENT_TICKET);
  const [checkIn, checkInState] = useMutation<any>(CHECK_IN_EVENT_TICKET);
  // The multi-seat ticket whose group still needs naming, if any.
  const [group, setGroup] = useState<{ ticket: EventTicketRow; required: number } | null>(null);

  const fetchRows = useApolloTableFetch<EventTicketRow>(client, EVENT_TICKETS_TABLE, 'eventTicketsTable');

  const onDownload = async (t: EventTicketRow) => {
    try {
      const res = await client.query<any>({ query: EVENT_TICKET_PDF, variables: { id: t.id }, fetchPolicy: 'no-cache' });
      downloadBase64File(res.data.eventTicketPdfBase64, `ticket-${t.ticket_code}.pdf`, 'application/pdf');
    } catch (e: any) {
      notifyError(e.message);
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
      // Apollo 4 puts the GraphQL errors on `errors` (v3 used `graphQLErrors`).
      const detail = firstGraphQLError(e)?.extensions;
      if (detail?.code === 'COMPANIONS_REQUIRED') {
        setGroup({ ticket: t, required: Number(detail.companions_required ?? 1) });
        return;
      }
      notifyError(e.message);
    }
  };
  // Verify is disabled until a token is pasted, so there is always one here.
  const onVerify = async () => {
    try {
      const res = await verifyQr({ variables: { token: token.trim() } });
      setVerifyResult(res.data?.verifyEventTicketQr ?? null);
    } catch (e: any) {
      setVerifyResult({ ok: false, message: e.message });
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
      notifyError(e.message);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" component="h1" data-testid="event-tickets-title" sx={{
          fontWeight: 900
        }}>
          {t('admin.eventTickets.title')}
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('admin.eventTickets.subtitle')}
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              mb: 1
            }}>
            <QrCodeScannerIcon color="primary" />
            <Typography variant="subtitle1" sx={{
              fontWeight: 900
            }}>
              {t('admin.eventTickets.checkInByQr')}
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              fullWidth
              label={t('admin.eventTickets.pasteToken')}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              slotProps={{ htmlInput: { 'data-testid': 'event-tickets-token' } }}
            />
            <DuncitButton variant="outlined" onClick={onVerify} disabled={!token.trim()} data-testid="event-tickets-verify">
              Verify
            </DuncitButton>
            <DuncitButton variant="contained" onClick={onCheckInToken} disabled={!verifyResult?.ok} data-testid="event-tickets-check-in">
              {t('admin.eventTickets.checkIn')}
            </DuncitButton>
          </Stack>
          {verifyResult && (
            <Alert severity={verifyResult.ok ? 'success' : 'error'} sx={{ mt: 1.5 }} data-testid={`event-tickets-verify-${verifyResult.ok ? 'ok' : 'error'}`}>
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
          if (group) onCheckIn(group.ticket, companions).catch((e: Error) => notifyError(e.message));
        }}
      />
    </Stack>
  );
}
