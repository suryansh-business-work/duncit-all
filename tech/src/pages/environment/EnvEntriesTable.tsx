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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveIcon from '@mui/icons-material/Remove';
import type { EnvEntry } from './queries';

function LastTested({ entry }: { entry: EnvEntry }) {
  if (entry.last_test_ok == null || !entry.last_tested_at) {
    return <Tooltip title="Not tested yet"><RemoveIcon fontSize="small" color="disabled" /></Tooltip>;
  }
  const when = new Date(entry.last_tested_at).toLocaleString();
  return entry.last_test_ok ? (
    <Tooltip title={`Passed · ${when}`}><CheckCircleIcon fontSize="small" color="success" /></Tooltip>
  ) : (
    <Tooltip title={`Failed · ${when}`}><CancelIcon fontSize="small" color="error" /></Tooltip>
  );
}

interface Props {
  entries: EnvEntry[];
  onEdit: (e: EnvEntry) => void;
  onDelete: (e: EnvEntry) => void;
  onSetDefault: (e: EnvEntry) => void;
  onTest: (e: EnvEntry) => void;
}

export default function EnvEntriesTable({ entries, onEdit, onDelete, onSetDefault, onTest }: Props) {
  if (!entries.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        No entries yet. Add one — you can add multiple and pick a default.
      </Typography>
    );
  }
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="center">Last tested</TableCell>
            <TableCell>Assigned portals</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((e) => (
            <TableRow key={e.id} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={700}>{e.name}</Typography>
                <Typography variant="caption" color="text.secondary">{e.description}</Typography>
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.5}>
                  {e.is_default && <Chip size="small" color="primary" label="Default" />}
                  <Chip size="small" variant="outlined" color={e.is_active ? 'success' : 'default'} label={e.is_active ? 'Active' : 'Off'} />
                </Stack>
              </TableCell>
              <TableCell align="center"><LastTested entry={e} /></TableCell>
              <TableCell>
                {e.assigned_portals.length
                  ? <Typography variant="caption">{e.assigned_portals.join(', ')}</Typography>
                  : <Typography variant="caption" color="text.secondary">—</Typography>}
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Test connection"><IconButton size="small" onClick={() => onTest(e)}><ScienceIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(e)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Set default"><IconButton size="small" onClick={() => onSetDefault(e)}>{e.is_default ? <StarIcon fontSize="small" color="primary" /> : <StarBorderIcon fontSize="small" />}</IconButton></Tooltip>
                <Tooltip title="Delete"><IconButton size="small" onClick={() => onDelete(e)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
