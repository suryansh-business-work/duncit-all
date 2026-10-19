import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTranslation } from '../../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../../theme';
import type { CreatePodForm } from '../create-pod.types';

/**
 * One time or Recurring — asked before the first date is picked, so the host
 * knows the date they choose next is where the series starts. The repeat
 * details follow under the date (PodRepeatSection). Native twin.
 */
export default function PodRepeatModeToggle({ form }: Readonly<{ form: CreatePodForm }>) {
  const { t } = useTranslation();
  const recurring = form.watch('repeat_enabled');
  // A Pod Request's slot is one agreed date — it has nothing to repeat.
  if (form.watch('partner_request_id')) return null;
  return (
    <Stack spacing={1} sx={{ ...SURFACE_SX, p: 2 }} data-testid="pod-repeat-mode">
      <Typography variant="subtitle2" component="h3">{t('mweb.podSeries.title')}</Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={recurring ? 'RECURRING' : 'ONE_TIME'}
        onChange={(_e, next: string | null) => {
          if (next) form.setValue('repeat_enabled', next === 'RECURRING', { shouldDirty: true });
        }}
        aria-label={t('mweb.podSeries.title')}
      >
        <ToggleButton value="ONE_TIME" data-testid="pod-repeat-one-time">{t('mweb.podSeries.oneTime')}</ToggleButton>
        <ToggleButton value="RECURRING" data-testid="pod-repeat-recurring">{t('mweb.podSeries.recurring')}</ToggleButton>
      </ToggleButtonGroup>
      {recurring && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }} data-testid="pod-repeat-mode-hint">
          {t('mweb.podSeries.modeHint')}
        </Typography>
      )}
    </Stack>
  );
}
