import { Alert, Chip, CircularProgress, IconButton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { format } from 'date-fns';

interface Props {
  loading: boolean;
  pods: any[];
  venueName: (id?: string | null) => string;
  onEdit: (pod: any) => void;
  onDelete: (pod: any) => void;
}

const statusLabel = (pod: any): { label: string; color: 'success' | 'info' | 'default' } => {
  if (pod.completed_at) return { label: 'Completed', color: 'success' };
  if (pod.is_active) return { label: 'Active', color: 'info' };
  return { label: 'Draft', color: 'default' };
};

export default function ClubAdminPodsTable({ loading, pods, venueName, onEdit, onDelete }: Readonly<Props>) {
  if (loading) return <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} /></Stack>;
  if (pods.length === 0) return <Alert severity="info">This club has no pods yet. Create the first one.</Alert>;
  return (
    <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1.25 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Pod</TableCell>
            <TableCell>Place</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Attendees</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pods.map((pod) => {
            const status = statusLabel(pod);
            return (
              <TableRow key={pod.id} hover>
                <TableCell><Typography fontWeight={900}>{pod.pod_title}</Typography></TableCell>
                <TableCell>{pod.pod_mode === 'VIRTUAL' ? 'Virtual pod' : venueName(pod.venue_id)}</TableCell>
                <TableCell>{pod.pod_date_time ? format(new Date(pod.pod_date_time), 'dd MMM yyyy, h:mm a') : 'Not scheduled'}</TableCell>
                <TableCell>{pod.pod_attendees?.length ?? 0}</TableCell>
                <TableCell><Chip size="small" label={status.label} color={status.color} /></TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit pod">
                    <IconButton size="small" onClick={() => onEdit(pod)}><EditIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Delete pod">
                    <IconButton size="small" color="error" onClick={() => onDelete(pod)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
