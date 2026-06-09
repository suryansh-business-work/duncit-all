import EditIcon from '@mui/icons-material/Edit';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { Chip, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';

interface Props {
  hosts: any[];
  onEdit: (host: any) => void;
  onReview: (host: any) => void;
}

export default function HostsTable({ hosts, onEdit, onReview }: Readonly<Props>) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Host</TableCell>
          <TableCell>Contact</TableCell>
          <TableCell>Documents</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Submitted</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {hosts.map((host) => (
          <TableRow key={host.id} hover>
            <TableCell>
              <Typography variant="body2" fontWeight={700}>{host.full_name || '—'}</Typography>
              <Typography variant="caption" color="text.secondary">{host.user_id}</Typography>
            </TableCell>
            <TableCell>
              <Typography variant="body2">{host.email || '—'}</Typography>
              <Typography variant="caption" color="text.secondary">{host.phone || '—'}</Typography>
            </TableCell>
            <TableCell>
              <Typography variant="caption" display="block">PAN: {host.pan_number || '—'}</Typography>
              <Typography variant="caption" display="block">Aadhar: {host.aadhar_number || '—'}</Typography>
            </TableCell>
            <TableCell><Chip size="small" label={host.status} /></TableCell>
            <TableCell>{host.submitted_at ? new Date(host.submitted_at).toLocaleDateString() : '—'}</TableCell>
            <TableCell align="right">
              <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(host)}><EditIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Review"><IconButton size="small" onClick={() => onReview(host)}><RateReviewIcon fontSize="small" /></IconButton></Tooltip>
            </TableCell>
          </TableRow>
        ))}
        {hosts.length === 0 && (
          <TableRow><TableCell colSpan={6} align="center">No hosts found.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}