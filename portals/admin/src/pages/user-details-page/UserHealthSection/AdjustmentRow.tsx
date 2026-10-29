import { Box, Chip, Paper, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitIconButton } from '@duncit/buttons';
import { HEALTH_APPEAL_STATUS_COLOR, HEALTH_APPEAL_STATUS_KEY } from '@duncit/utils';
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
  const appeal = adjustment.appeal_status;

  return (
    <Paper variant="outlined" sx={{ p: 1 }} data-testid={`admin-user-health-row-${adjustment.id}`}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        {/* A deduction Legal lifted on appeal no longer counts: faded, struck through. */}
        <Chip
          size="small"
          color={color}
          label={sign}
          sx={{
            fontWeight: 900,
            textDecoration: adjustment.waived ? 'line-through' : 'none',
            opacity: (theme) => (adjustment.waived ? theme.palette.action.disabledOpacity : 1),
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2">{remark || '—'}</Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {adjustment.created_by_name} ·{' '}
            {formatDateTime(adjustment.created_at)}
          </Typography>
        </Box>
        {appeal && (
          <Chip
            size="small"
            variant="outlined"
            color={HEALTH_APPEAL_STATUS_COLOR[appeal]}
            label={t(HEALTH_APPEAL_STATUS_KEY[appeal])}
            data-testid={`admin-user-health-appeal-${adjustment.id}`}
          />
        )}
        <Tooltip title={t('shell.common.edit')}>
          <span>
            <DuncitIconButton
              size="small"
              aria-label={t('shell.common.edit')}
              data-testid="health-adjustment-edit"
              disabled={busy}
              onClick={() => onEdit(adjustment)}
            >
              <EditIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('shell.common.delete')}>
          <span>
            <DuncitIconButton
              size="small"
              color="error"
              aria-label={t('shell.common.delete')}
              data-testid="health-adjustment-delete"
              disabled={busy}
              onClick={() => onDelete(adjustment)}
            >
              <DeleteIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
      </Stack>
    </Paper>
  );
}
