import { IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import type { HostLead } from '../../api/crm.types';
import { PriorityChip, StatusChip } from '../../components/StatusChips';

interface Props {
  leads: HostLead[];
  onEdit: (lead: HostLead) => void;
  onDelete: (lead: HostLead) => void;
}

const fmt = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'dd MMM yyyy');
};

export default function HostLeadsTable({ leads, onEdit, onDelete }: Props) {
  if (leads.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No host leads yet.</Typography>;
  }
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Host</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>City</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Priority</TableCell>
            <TableCell>Follow-up</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>{lead.host_name}</Typography>
                <Typography variant="caption" color="text.secondary">{lead.contacts?.[0]?.mobile_number || '—'}</Typography>
              </TableCell>
              <TableCell>{lead.host_type || '—'}</TableCell>
              <TableCell>{lead.city || '—'}</TableCell>
              <TableCell><StatusChip value={lead.lead_status} /></TableCell>
              <TableCell><PriorityChip value={lead.priority} /></TableCell>
              <TableCell>{fmt(lead.next_follow_up_date)}</TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(lead)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => onDelete(lead)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
