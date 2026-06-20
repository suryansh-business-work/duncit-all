import {
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
import type { Challenge } from '../../graphql/challenges';

interface Props {
  rows: readonly Challenge[];
  onEdit: (challenge: Challenge) => void;
  onDelete: (challenge: Challenge) => void;
}

const dash = (v?: string | null) => v || '—';

export default function ChallengesTable({ rows, onEdit, onDelete }: Readonly<Props>) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Super category</TableCell>
          <TableCell>Category</TableCell>
          <TableCell>Sub-category</TableCell>
          <TableCell>Status</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} hover>
            <TableCell>
              <Typography variant="body2" fontWeight={700}>{row.name}</Typography>
              {row.description && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 320 }} noWrap>
                  {row.description}
                </Typography>
              )}
            </TableCell>
            <TableCell>{dash(row.super_category_name)}</TableCell>
            <TableCell>{dash(row.category_name)}</TableCell>
            <TableCell>{dash(row.sub_category_name)}</TableCell>
            <TableCell>
              <Chip
                size="small"
                color={row.is_active ? 'success' : 'default'}
                label={row.is_active ? 'Active' : 'Inactive'}
                variant={row.is_active ? 'filled' : 'outlined'}
              />
            </TableCell>
            <TableCell align="right">
              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => onEdit(row)} aria-label="Edit challenge">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" color="error" onClick={() => onDelete(row)} aria-label="Delete challenge">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
