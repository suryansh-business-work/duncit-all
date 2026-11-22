import { Controller, type Control } from 'react-hook-form';
import { Chip, FormControlLabel, Stack, Switch, Tooltip } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { HostEngagementStatusesValues } from './host-engagement-statuses.types';

interface Props {
  control: Control<HostEngagementStatusesValues>;
  index: number;
  count: number;
  /** Empty for a row added here and not saved yet — only those can be removed. */
  savedKey: string;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

/** One status: its label, whether it is offered, its permanent key, and its place in the list. */
export default function StatusRow({ control, index, count, savedKey, onMove, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const moveUp = t('admin.podSettings.hostEngagement.moveUp');
  const moveDown = t('admin.podSettings.hostEngagement.moveDown');
  const removeNew = t('admin.podSettings.hostEngagement.removeNew');
  const offered = t('admin.podSettings.hostEngagement.statusOffered');
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
      data-testid={`host-status-row-${index}`}
    >
      <RhfTextField
        control={control}
        name={`statuses.${index}.label`}
        label={t('admin.podSettings.hostEngagement.statusLabelField')}
        size="small"
        slotProps={{ htmlInput: { 'data-testid': `host-status-label-${index}` } }}
      />
      <Chip
        size="small"
        variant="outlined"
        label={savedKey ? t('admin.podSettings.hostEngagement.statusKey', { vars: { key: savedKey } }) : t('admin.podSettings.hostEngagement.statusNew')}
      />
      <Controller
        control={control}
        name={`statuses.${index}.is_active`}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
                slotProps={{ input: { 'aria-label': `${offered} ${index + 1}` } }}
              />
            }
            label={offered}
          />
        )}
      />
      <Stack direction="row">
        <Tooltip title={moveUp}>
          <span>
            <DuncitIconButton size="small" aria-label={moveUp} disabled={index === 0} onClick={() => onMove(index, index - 1)}>
              <ArrowUpwardIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
        <Tooltip title={moveDown}>
          <span>
            <DuncitIconButton
              size="small"
              aria-label={moveDown}
              disabled={index === count - 1}
              onClick={() => onMove(index, index + 1)}
            >
              <ArrowDownwardIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
        {!savedKey && (
          <Tooltip title={removeNew}>
            <DuncitIconButton size="small" color="error" aria-label={removeNew} onClick={() => onRemove(index)}>
              <DeleteOutlineIcon fontSize="small" />
            </DuncitIconButton>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  );
}
