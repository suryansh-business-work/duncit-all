import { Box, Stack, Typography } from '@mui/material';
import { MAX_POD_MIN_ADVANCE_DAYS, MIN_POD_MIN_ADVANCE_DAYS } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import NumberSettingCard from './NumberSettingCard';
import type { PodSettingsSectionProps } from './queries';

/**
 * Pod creation — the rules a host's own new pod is held to. One number today:
 * Minimum Advance Days for Pod Creation, 1–30, exactly the range the server
 * keeps, so the box refuses anything else rather than saving a number never
 * applied. A host's own value in the Hosts console wins over it.
 */
export default function PodCreationSettings({ settings, loading, onSave }: Readonly<PodSettingsSectionProps>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {t('admin.podSettings.podCreationGroupTitle')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('admin.podSettings.podCreationGroupDesc')}
        </Typography>
      </Box>
      <NumberSettingCard
        title={t('admin.podSettings.minAdvanceDaysTitle')}
        description={t('admin.podSettings.minAdvanceDaysDesc')}
        label={t('admin.podSettings.minAdvanceDaysLabel')}
        helperText={t('admin.podSettings.minAdvanceDaysMin')}
        invalidText={t('admin.podSettings.minAdvanceDaysInvalid')}
        min={MIN_POD_MIN_ADVANCE_DAYS}
        max={MAX_POD_MIN_ADVANCE_DAYS}
        loading={loading}
        value={settings?.pod_min_advance_days ?? null}
        onSave={(next) => onSave({ pod_min_advance_days: next })}
        testId="pod-settings-min-advance-days"
      />
    </Stack>
  );
}
