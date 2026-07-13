import { useQuery } from '@apollo/client';
import { Alert, Card, CardContent, Chip, CircularProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { format } from 'date-fns';
import { MY_HOST_PODS } from './queries';

export default function HostPodsList() {
  const { data, loading, error } = useQuery(MY_HOST_PODS, { fetchPolicy: 'cache-and-network' });
  const pods = data?.myHostPods ?? [];
  const emptyState = renderEmptyState(loading && !data, pods.length);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 0 }}>
        <Stack spacing={1.25} sx={{ p: 2, pb: 1 }}>
          <Typography variant="h6" fontWeight={950}>Your hosted pods</Typography>
          <Typography variant="body2" color="text.secondary">Pods assigned to your host profile appear here.</Typography>
          {error && <Alert severity="error">{error.message}</Alert>}
        </Stack>
        {emptyState ?? (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TableCell>Pod</TableCell><TableCell>Date</TableCell><TableCell>Attendees</TableCell><TableCell>Pod earning</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
              <TableBody>
                {pods.map((pod: any) => (
                  <TableRow key={pod.id} hover>
                    <TableCell><Typography fontWeight={900}>{pod.pod_title}</Typography></TableCell>
                    <TableCell>{formatDate(pod.pod_date_time)}</TableCell>
                    <TableCell>{pod.pod_attendees?.length ?? 0}</TableCell>
                    <TableCell>{formatMoney(Number(pod.pod_amount || 0) * (pod.pod_attendees?.length ?? 0))}</TableCell>
                    <TableCell><Chip size="small" label={podStatusLabel(pod)} color={podStatusColor(pod)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}

function renderEmptyState(isLoading: boolean, totalCount: number) {
  if (isLoading) return <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} /></Stack>;
  if (totalCount === 0) return <Alert severity="info" sx={{ m: 2 }}>No hosted pods yet.</Alert>;
  return null;
}

function podStatusLabel(pod: any) {
  if (pod.completed_at) return 'Completed';
  return pod.is_active ? 'Active' : 'Inactive';
}

function podStatusColor(pod: any): 'success' | 'info' | 'default' {
  if (pod.completed_at) return 'success';
  return pod.is_active ? 'info' : 'default';
}

function formatDate(value?: string) {
  return value ? format(new Date(value), 'dd MMM yyyy, h:mm a') : 'Not scheduled';
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}