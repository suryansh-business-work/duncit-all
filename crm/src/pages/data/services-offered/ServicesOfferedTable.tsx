import {
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { CrmServiceOffered } from '../../../api/data.gql';

interface Props {
  services: CrmServiceOffered[];
  onEdit: (service: CrmServiceOffered) => void;
  onDelete: (service: CrmServiceOffered) => void;
}

const dash = (v?: string | null) => (v && v.trim() ? v : '—');

const targetLabel = (s: CrmServiceOffered) =>
  s.applies_to_venue && s.applies_to_host ? 'Both' : s.applies_to_venue ? 'Venue' : s.applies_to_host ? 'Host' : '—';

/** Services Offered listing — Title plus the Super → Category → Sub it belongs to. */
export default function ServicesOfferedTable({ services, onEdit, onDelete }: Props) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Title</TableCell>
          <TableCell>Super Category</TableCell>
          <TableCell>Category</TableCell>
          <TableCell>Sub Category</TableCell>
          <TableCell>Applies to</TableCell>
          <TableCell>Status</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {services.map((s) => (
          <TableRow key={s.id} hover>
            <TableCell><Typography variant="body2" fontWeight={700}>{s.title}</Typography></TableCell>
            <TableCell><Typography variant="body2">{dash(s.super_category_name)}</Typography></TableCell>
            <TableCell><Typography variant="body2" color="text.secondary">{dash(s.category_name)}</Typography></TableCell>
            <TableCell><Typography variant="body2" color="text.secondary">{dash(s.sub_category_name)}</Typography></TableCell>
            <TableCell><Chip size="small" variant="outlined" color="primary" label={targetLabel(s)} /></TableCell>
            <TableCell>
              <Chip size="small" color={s.is_active ? 'success' : 'default'} label={s.is_active ? 'Active' : 'Inactive'} />
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => onEdit(s)} aria-label={`Edit ${s.title}`}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={() => onDelete(s)} aria-label={`Delete ${s.title}`}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
