import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, MenuItem, Stack, TextField, Typography } from '@mui/material';
import ContactDetailsDialog from '../contact-submissions-page/ContactDetailsDialog';
import SupportLogsTable from '../support-logs-page/SupportLogsTable';
import { STATUSES, TAG_RE, UPDATE_STATUS, type Submission } from '../support-logs-page/queries';
import { USER_SUPPORT_TICKETS } from './queries';

interface Props {
  email?: string | null;
}

export default function UserSupportTicketsSection({ email }: Readonly<Props>) {
  const [status, setStatus] = useState<string>('');
  const [open, setOpen] = useState<Submission | null>(null);
  const { data, loading, error, refetch } = useQuery<{ contactSubmissions: Submission[] }>(
    USER_SUPPORT_TICKETS,
    {
      variables: { email: email || null, status: status || null },
      skip: !email,
      fetchPolicy: 'cache-and-network',
    }
  );
  const [updateStatus] = useMutation(UPDATE_STATUS, { onCompleted: () => refetch() });

  const rows = useMemo(
    () => (data?.contactSubmissions ?? []).filter((submission) => TAG_RE.test(submission.subject)),
    [data?.contactSubmissions]
  );

  if (!email) return <Alert severity="info">This user does not have an email for support ticket matching.</Alert>;

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle1" fontWeight={700}>Support Tickets</Typography>
          <Typography variant="body2" color="text.secondary">Tickets opened from {email}.</Typography>
        </Stack>
        <TextField select size="small" label="Status" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 180 }}>
          {STATUSES.map((option) => <MenuItem key={option || 'all'} value={option}>{option || 'All'}</MenuItem>)}
        </TextField>
      </Stack>
      {error && <Alert severity="error">{error.message}</Alert>}
      <SupportLogsTable loading={loading} hasData={!!data} rows={rows} onView={setOpen} />
      {open && (
        <ContactDetailsDialog
          submission={open}
          onClose={() => setOpen(null)}
          onUpdateStatus={(id, next) => updateStatus({ variables: { id, status: next } })}
        />
      )}
    </Stack>
  );
}