import { Box, Chip, Stack, Typography } from '@mui/material';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import { formatDistanceToNow } from 'date-fns';
import { DuncitButton } from '@duncit/buttons';
import { HEALTH_APPEAL_STATUS_COLOR, HEALTH_APPEAL_STATUS_KEY, healthAppealStateOf } from '@duncit/utils';
import type { HealthAdjustment } from './queries';
import { formatDateTime } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  adjustment: HealthAdjustment;
  onAppeal: (adjustment: HealthAdjustment) => void;
}

/**
 * One line of the health history. A deduction that still counts offers Appeal;
 * once appealed, the row says where the appeal stands instead. A deduction
 * lifted on appeal is faded and struck through — the record stays, the points
 * do not — while its "Appeal accepted" chip stays at full strength to say why.
 */
export default function HealthRemarkRow({ adjustment, onAppeal }: Readonly<Props>) {
  const { t } = useTranslation();
  const sign = adjustment.delta > 0 ? `+${adjustment.delta}` : `${adjustment.delta}`;
  const color: 'success' | 'error' = adjustment.delta > 0 ? 'success' : 'error';
  const appeal = healthAppealStateOf(adjustment);
  const points = Math.abs(adjustment.delta);

  return (
    <Stack
      data-testid={`health-remark-${adjustment.id}`}
      direction="row"
      spacing={1.5}
      sx={{ alignItems: 'center', px: 2, py: 1.75 }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        data-testid={adjustment.waived ? `health-remark-waived-${adjustment.id}` : undefined}
        sx={{
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
          opacity: (theme) => (adjustment.waived ? theme.palette.action.disabledOpacity : 1),
        }}
      >
        <Chip
          size="small"
          color={color}
          label={sign}
          sx={{ minWidth: 44, textDecoration: adjustment.waived ? 'line-through' : 'none' }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {adjustment.remark}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {adjustment.created_by_name} · {formatDateTime(adjustment.created_at)} ·{' '}
            {formatDistanceToNow(new Date(adjustment.created_at), { addSuffix: true })}
          </Typography>
        </Box>
      </Stack>
      {appeal === 'APPEALABLE' && (
        <DuncitButton
          size="small"
          variant="outlined"
          startIcon={<GavelRoundedIcon />}
          aria-label={t('healthAppeal.appealNamed', { vars: { points } })}
          onClick={() => onAppeal(adjustment)}
          data-testid={`health-appeal-${adjustment.id}`}
        >
          {t('healthAppeal.appeal')}
        </DuncitButton>
      )}
      {appeal && appeal !== 'APPEALABLE' && (
        <Chip
          size="small"
          variant="outlined"
          color={HEALTH_APPEAL_STATUS_COLOR[appeal]}
          label={t(HEALTH_APPEAL_STATUS_KEY[appeal])}
          data-testid={`health-appeal-status-${adjustment.id}`}
        />
      )}
    </Stack>
  );
}
