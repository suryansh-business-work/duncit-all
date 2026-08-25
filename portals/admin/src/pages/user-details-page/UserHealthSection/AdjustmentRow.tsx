import { Box, Chip, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { AdminHealthAdjustment } from './queries';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

interface Props {
  adjustment: AdminHealthAdjustment;
  busy: boolean;
  onEdit: (adjustment: AdminHealthAdjustment) => void;
  onDelete: (adjustment: AdminHealthAdjustment) => void;
}

export default function AdjustmentRow({ adjustment, busy, onEdit, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const sign = adjustment.delta > 0 ? `+${adjustment.delta}` : `${adjustment.delta}`;
  const color: 'success' | 'error' = adjustment.delta > 0 ? 'success' : 'error';
  const remark = adjustment.remark?.trim();

  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <Chip size="small" color={color} label={sign} sx={{ fontWeight: 900 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2">{remark || '—'}</Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {adjustment.created_by_name} ·{' '}
            {formatDateTime(adjustment.created_at)}
          </Typography>
        </Box>
        <Tooltip title={t('shell.common.edit')}>
          <span>
            <IconButton size="small" disabled={busy} onClick={() => onEdit(adjustment)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('shell.common.delete')}>
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
