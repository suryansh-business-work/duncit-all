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
import type { EmailTemplate } from '../../api/emailTemplates.gql';

interface Props {
  templates: EmailTemplate[];
  onEdit: (t: EmailTemplate) => void;
  onDelete: (t: EmailTemplate) => void;
}

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');

const TARGET_LABEL: Record<string, string> = { VENUE: 'Venue', HOST: 'Host', STATIC: 'Static' };

export default function TemplatesTable({ templates, onEdit, onDelete }: Readonly<Props>) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Slug</TableCell>
          <TableCell>For</TableCell>
          <TableCell>Subject</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Updated</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {templates.map((t) => (
          <TableRow key={t.template_id} hover sx={{ cursor: 'pointer' }} onClick={() => onEdit(t)}>
            <TableCell><Typography variant="body2" fontWeight={700}>{t.name}</Typography></TableCell>
            <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{t.slug}</Typography></TableCell>
            <TableCell><Chip size="small" variant="outlined" color="primary" label={TARGET_LABEL[t.target] ?? t.target} /></TableCell>
            <TableCell><Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 280 }}>{t.subject}</Typography></TableCell>
            <TableCell><Chip size="small" color={t.is_active ? 'success' : 'default'} label={t.is_active ? 'Active' : 'Inactive'} /></TableCell>
            <TableCell><Typography variant="caption" color="text.secondary">{fmt(t.updated_at)}</Typography></TableCell>
            <TableCell align="right" onClick={(e) => e.stopPropagation()}>
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => onEdit(t)} aria-label={`Edit ${t.name}`}><EditIcon fontSize="small" /></IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={() => onDelete(t)} aria-label={`Delete ${t.name}`}><DeleteIcon fontSize="small" /></IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
