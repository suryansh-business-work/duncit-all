import { Alert, Chip, CircularProgress, IconButton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { format } from 'date-fns';

interface Props {
  loading: boolean;
  pods: any[];
  clubName: (id: string) => string;
  venueName: (id?: string | null) => string;
  onEdit?: (pod: any) => void;
}

/** Status label for a pod row. */
const podStatusLabel = (pod: any): string => {
  if (pod.completed_at) return 'Completed';
  return pod.is_active ? 'Active' : 'Draft';
};

/** Chip colour matching the pod status label. */
const podStatusColor = (pod: any): 'success' | 'info' | 'default' => {
  if (pod.completed_at) return 'success';
  return pod.is_active ? 'info' : 'default';
};

export default function PartnerPodsTable({ loading, pods, clubName, venueName, onEdit }: Readonly<Props>) {
  if (loading) return <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} /></Stack>;
  if (pods.length === 0) return <Alert severity="info">No pods created from your partner account yet.</Alert>;
  return (
    <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1.25 }}>
      <Table size="small">
        <TableHead><TableRow><TableCell>Pod</TableCell><TableCell>Place</TableCell><TableCell>Date</TableCell><TableCell>Attendees</TableCell><TableCell>Status</TableCell>{onEdit && <TableCell align="right">Edit</TableCell>}</TableRow></TableHead>
        <TableBody>
          {pods.map((pod) => <TableRow key={pod.id} hover>
            <TableCell><Typography fontWeight={900}>{pod.pod_title}</Typography><Typography variant="caption" color="text.secondary">{clubName(pod.club_id)}</Typography></TableCell>
            <TableCell>{pod.pod_mode === 'VIRTUAL' ? 'Virtual pod' : venueName(pod.venue_id)}</TableCell>
            <TableCell>{pod.pod_date_time ? format(new Date(pod.pod_date_time), 'dd MMM yyyy, h:mm a') : 'Not scheduled'}</TableCell>
            <TableCell>{pod.pod_attendees?.length ?? 0}</TableCell>
            <TableCell><Chip size="small" label={podStatusLabel(pod)} color={podStatusColor(pod)} /></TableCell>
            {onEdit && (
              <TableCell align="right">
                <Tooltip title="Edit name, description & images">
                  <span>
                    <IconButton size="small" onClick={() => onEdit(pod)} disabled={!!pod.completed_at}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            )}
          </TableRow>)}
        </TableBody>
      </Table>
    </TableContainer>
  );
}