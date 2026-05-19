import { Alert, Chip, CircularProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { format } from 'date-fns';

interface Props { loading: boolean; pods: any[]; clubName: (id: string) => string; venueName: (id?: string | null) => string; }

export default function PartnerPodsTable({ loading, pods, clubName, venueName }: Props) {
  if (loading) return <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} /></Stack>;
  if (pods.length === 0) return <Alert severity="info">No pods created from your partner account yet.</Alert>;
  return (
    <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1.25 }}>
      <Table size="small">
        <TableHead><TableRow><TableCell>Pod</TableCell><TableCell>Place</TableCell><TableCell>Date</TableCell><TableCell>Attendees</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
        <TableBody>
          {pods.map((pod) => <TableRow key={pod.id} hover>
            <TableCell><Typography fontWeight={900}>{pod.pod_title}</Typography><Typography variant="caption" color="text.secondary">{clubName(pod.club_id)}</Typography></TableCell>
            <TableCell>{pod.pod_mode === 'VIRTUAL' ? 'Virtual pod' : venueName(pod.venue_id)}</TableCell>
            <TableCell>{pod.pod_date_time ? format(new Date(pod.pod_date_time), 'dd MMM yyyy, h:mm a') : 'Not scheduled'}</TableCell>
            <TableCell>{pod.pod_attendees?.length ?? 0}</TableCell>
            <TableCell><Chip size="small" label={pod.completed_at ? 'Completed' : pod.is_active ? 'Active' : 'Draft'} color={pod.completed_at ? 'success' : pod.is_active ? 'info' : 'default'} /></TableCell>
          </TableRow>)}
        </TableBody>
      </Table>
    </TableContainer>
  );
}