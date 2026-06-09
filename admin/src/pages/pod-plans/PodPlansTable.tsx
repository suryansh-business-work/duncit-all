import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { PodPlanFormValues } from './PodPlanFormDialog';

export interface PlanRow extends PodPlanFormValues {
  id: string;
  updated_at?: string;
}

interface Props {
  loading: boolean;
  hasData: boolean;
  error: { message: string } | null;
  rows: PlanRow[];
  onEdit: (row: PlanRow) => void;
  onDelete: (row: PlanRow) => void;
}

export default function PodPlansTable({ loading, hasData, error, rows, onEdit, onDelete }: Readonly<Props>) {
  if (loading && !hasData) {
    return (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Key</TableCell>
          <TableCell>Price label</TableCell>
          <TableCell>Features</TableCell>
          <TableCell>Status</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id} hover>
            <TableCell>
              <Stack direction="row" spacing={1.5} alignItems="center">
                {r.image_url && (
                  <Box
                    component="img"
                    src={r.image_url}
                    alt=""
                    sx={{ width: 36, height: 36, borderRadius: 1, objectFit: 'cover' }}
                  />
                )}
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {r.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.description?.slice(0, 60)}
                    {r.description && r.description.length > 60 ? '…' : ''}
                  </Typography>
                </Box>
              </Stack>
            </TableCell>
            <TableCell>
              <code>{r.key}</code>
            </TableCell>
            <TableCell>{r.price_label || '—'}</TableCell>
            <TableCell>{(r.features ?? []).length}</TableCell>
            <TableCell>
              <Stack direction="row" spacing={0.5}>
                <Chip
                  size="small"
                  label={r.is_active ? 'Active' : 'Inactive'}
                  color={r.is_active ? 'success' : 'default'}
                />
                {r.is_coming_soon && <Chip size="small" label="Coming soon" color="warning" />}
              </Stack>
            </TableCell>
            <TableCell align="right">
              <IconButton size="small" onClick={() => onEdit(r)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => onDelete(r)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} align="center">
              <Typography variant="body2" color="text.secondary">
                No plans yet. Click <strong>New plan</strong> to create one.
              </Typography>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
