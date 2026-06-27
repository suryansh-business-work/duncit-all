import { Box, Chip, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import type { AdminHealthAdjustment } from './queries';

interface Props {
  adjustment: AdminHealthAdjustment;
  busy: boolean;
  onEdit: (adjustment: AdminHealthAdjustment) => void;
  onDelete: (adjustment: AdminHealthAdjustment) => void;
}

export default function AdjustmentRow({ adjustment, busy, onEdit, onDelete }: Readonly<Props>) {
  const sign = adjustment.delta > 0 ? `+${adjustment.delta}` : `${adjustment.delta}`;
  const color: 'success' | 'error' = adjustment.delta > 0 ? 'success' : 'error';
  const remark = adjustment.remark?.trim();

  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Chip size="small" color={color} label={sign} sx={{ fontWeight: 900 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2">{remark ? remark : '—'}</Typography>
          <Typography variant="caption" color="text.secondary">
            {adjustment.created_by_name} ·{' '}
            {format(new Date(adjustment.created_at), 'dd MMM yyyy, hh:mm a')}
          </Typography>
        </Box>
        <Tooltip title="Edit">
          <span>
            <IconButton size="small" disabled={busy} onClick={() => onEdit(adjustment)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Delete">
          <span>
            <IconButton
              size="small"
              color="error"
              disabled={busy}
              onClick={() => onDelete(adjustment)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Paper>
  );
}
