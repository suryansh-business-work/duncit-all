import { IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import EmailIcon from '@mui/icons-material/Email';
import CallIcon from '@mui/icons-material/Call';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import type { VenueLead } from '../../api/crm.types';
import { PriorityChip, StatusChip } from '../../components/StatusChips';

interface Props {
  leads: VenueLead[];
  onEdit: (lead: VenueLead) => void;
  onEmail: (lead: VenueLead) => void;
  onCall: (lead: VenueLead) => void;
  onDelete: (lead: VenueLead) => void;
}

const fmt = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'dd MMM yyyy');
};

export default function VenueLeadsTable({ leads, onEdit, onEmail, onCall, onDelete }: Props) {
  if (leads.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No venue leads yet.</Typography>;
  }
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Venue</TableCell>
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
                <Typography variant="body2" fontWeight={600}>{lead.venue_name}</Typography>
                <Typography variant="caption" color="text.secondary">{lead.contacts?.[0]?.mobile_number || '—'}</Typography>
              </TableCell>
              <TableCell>{lead.city}</TableCell>
              <TableCell><StatusChip value={lead.lead_status} /></TableCell>
              <TableCell><PriorityChip value={lead.priority} /></TableCell>
              <TableCell>{fmt(lead.next_follow_up_date)}</TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  <Tooltip title="Email via Vobiz"><IconButton size="small" onClick={() => onEmail(lead)}><EmailIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Call via Vobiz"><IconButton size="small" onClick={() => onCall(lead)}><CallIcon fontSize="small" /></IconButton></Tooltip>
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
