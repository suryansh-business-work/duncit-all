import EditIcon from '@mui/icons-material/Edit';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { Chip, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { commissionLabel } from '../../utils/commissionLabel';

interface HostCategory {
  super_category_name: string;
  category_name: string;
  sub_category_name: string;
  request_no: string;
}

interface Props {
  hosts: any[];
  onEdit: (host: any) => void;
  onReview: (host: any) => void;
}

const catPath = (c: HostCategory) =>
  [c.super_category_name, c.category_name, c.sub_category_name].filter(Boolean).join(' › ') || '—';

function CategoryCell({ categories }: Readonly<{ categories?: HostCategory[] }>) {
  if (!categories || categories.length === 0) {
    return <Typography variant="body2" color="text.secondary">—</Typography>;
  }
  return (
    <>
      {categories.map((c) => (
        <Typography key={c.request_no || catPath(c)} variant="body2" display="block">
          {catPath(c)}
        </Typography>
      ))}
    </>
  );
}

export default function HostsTable({ hosts, onEdit, onReview }: Readonly<Props>) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Host</TableCell>
          <TableCell>Contact</TableCell>
          <TableCell>Documents</TableCell>
          <TableCell>Category</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Commission</TableCell>
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
            <TableCell><CategoryCell categories={host.host_categories} /></TableCell>
            <TableCell><Chip size="small" label={host.status} /></TableCell>
            <TableCell><Chip size="small" variant="outlined" label={commissionLabel(host.host_commission_pct)} /></TableCell>
            <TableCell>{host.submitted_at ? new Date(host.submitted_at).toLocaleDateString() : '—'}</TableCell>
            <TableCell align="right">
              <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(host)}><EditIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Review"><IconButton size="small" onClick={() => onReview(host)}><RateReviewIcon fontSize="small" /></IconButton></Tooltip>
            </TableCell>
          </TableRow>
        ))}
        {hosts.length === 0 && (
          <TableRow><TableCell colSpan={8} align="center">No hosts found.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}