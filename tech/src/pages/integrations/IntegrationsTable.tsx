import {
  Box,
  Chip,
  IconButton,
  Stack,
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
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ScienceIcon from '@mui/icons-material/Science';
import type { IntegrationProvider } from './queries';

interface Props {
  providers: IntegrationProvider[];
  onEdit: (p: IntegrationProvider) => void;
  onDelete: (p: IntegrationProvider) => void;
  onSetDefault: (p: IntegrationProvider) => void;
  onTest: (p: IntegrationProvider) => void;
}

const TYPE_LABEL: Record<string, string> = {
  IMAGEKIT: 'ImageKit',
  PEXELS: 'Pexels',
  GOOGLE: 'Google',
  TWILIO: 'Twilio',
  AI: 'AI',
};

export default function IntegrationsTable({ providers, onEdit, onDelete, onSetDefault, onTest }: Props) {
  if (!providers.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        No integrations yet. Add one to get started.
      </Typography>
    );
  }
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Last used</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {providers.map((p) => (
            <TableRow key={p.id} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={700}>{p.name}</Typography>
                <Typography variant="caption" color="text.secondary">{p.description}</Typography>
              </TableCell>
              <TableCell><Chip size="small" label={TYPE_LABEL[p.type] ?? p.type} /></TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.5}>
                  {p.is_default && <Chip size="small" color="primary" label="Default" />}
                  <Chip
                    size="small"
                    variant="outlined"
                    color={p.is_active ? 'success' : 'default'}
                    label={p.is_active ? 'Active' : 'Off'}
                  />
                </Stack>
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {p.last_used_at ? new Date(p.last_used_at).toLocaleString() : '—'}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Test connection"><IconButton size="small" onClick={() => onTest(p)}><ScienceIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(p)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Set default"><IconButton size="small" onClick={() => onSetDefault(p)}>{p.is_default ? <StarIcon fontSize="small" color="primary" /> : <StarBorderIcon fontSize="small" />}</IconButton></Tooltip>
                <Tooltip title="Delete"><IconButton size="small" onClick={() => onDelete(p)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
