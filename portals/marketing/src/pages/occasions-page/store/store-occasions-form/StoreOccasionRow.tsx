import { useWatch, type Control } from 'react-hook-form';
import { Box, Chip, Paper, Stack, Tooltip, Typography } from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { RhfDateTime, RhfOnOff } from '../../rhf-fields';
import { TWO_COLUMNS } from '../layout';
import StoreOccasionLook from './StoreOccasionLook';
import { isStoreOccasionLive, type StoreOccasionsValues } from './store-occasions.types';

interface Props {
  control: Control<StoreOccasionsValues>;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

/** One festive window on the ecomm store: its name and dates, the look it swaps in, and whether it is on. */
export default function StoreOccasionRow({ control, index, isFirst, isLast, onMoveUp, onMoveDown, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const { now } = useDateFormat();
  const label = t('marketing.storeOccasions.occasionN', { vars: { n: index + 1 } });
  const row = useWatch({ control, name: `occasions.${index}` });
  const path = `occasions.${index}` as const;

  return (
    <Paper variant="outlined" sx={{ p: 2 }} role="group" aria-label={label} data-testid="store-occasion-row">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography component="h3" variant="subtitle2">
            {label}
          </Typography>
          {isStoreOccasionLive(row, now()) && <Chip size="small" color="success" label={t('marketing.storeOccasions.live')} />}
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={t('marketing.storeOccasions.moveUp')}>
            <span>
              <DuncitIconButton aria-label={t('marketing.storeOccasions.moveUp')} onClick={onMoveUp} disabled={isFirst}>
                <ArrowUpwardIcon fontSize="small" />
              </DuncitIconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('marketing.storeOccasions.moveDown')}>
            <span>
              <DuncitIconButton aria-label={t('marketing.storeOccasions.moveDown')} onClick={onMoveDown} disabled={isLast}>
                <ArrowDownwardIcon fontSize="small" />
              </DuncitIconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('marketing.storeOccasions.remove')}>
            <DuncitIconButton aria-label={t('marketing.storeOccasions.removeNamed', { vars: { name: label } })} onClick={onRemove} color="error">
              <DeleteOutlineIcon fontSize="small" />
            </DuncitIconButton>
          </Tooltip>
        </Stack>
      </Stack>
      <Stack spacing={2}>
        <Box sx={TWO_COLUMNS}>
          <RhfTextField control={control} name={`${path}.label`} label={t('marketing.storeOccasions.name')} required />
          <RhfTextField control={control} name={`${path}.slug`} label={t('marketing.storeOccasions.key')} hint={t('marketing.storeOccasions.keyHint')} />
          <RhfDateTime control={control} name={`${path}.starts_at`} label={t('marketing.storeOccasions.starts')} required />
          <RhfDateTime control={control} name={`${path}.ends_at`} label={t('marketing.storeOccasions.ends')} required />
        </Box>
        <StoreOccasionLook control={control} index={index} rowLabel={label} />
        <Box sx={TWO_COLUMNS}>
          <RhfOnOff control={control} name={`${path}.is_active`} label={t('marketing.storeOccasions.active')} />
          <RhfTextField control={control} name={`${path}.sort_order`} label={t('marketing.storeOccasions.order')} hint={t('marketing.storeOccasions.orderHint')} type="number" />
        </Box>
      </Stack>
    </Paper>
  );
}
