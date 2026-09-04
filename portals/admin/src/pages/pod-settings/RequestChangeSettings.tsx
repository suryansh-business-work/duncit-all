import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import NumberSettingCard from './NumberSettingCard';
import type { PodSettingsSectionProps } from './queries';

/**
 * Request Change Setting — what each of a pod's three partners pays in Account
 * Health for asking Duncit to replace them.
 *
 * Three separate numbers rather than one, because the three asks are not
 * equally disruptive: a venue change moves the pod's address and time, a host
 * change moves nobody, and a club-admin change hands over a whole club. The
 * range is 0–10 in all three, and the server clamps to exactly that — so the
 * boxes refuse anything else rather than saving a number an admin never sees
 * applied.
 */
export default function RequestChangeSettings({
  settings,
  loading,
  onSave,
}: Readonly<PodSettingsSectionProps>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {t('admin.podSettings.changeRequestGroupTitle')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('admin.podSettings.changeRequestGroupDesc')}
        </Typography>
      </Box>
      <NumberSettingCard
        title={t('admin.podSettings.changeRequestVenueTitle')}
        description={t('admin.podSettings.changeRequestVenueDesc')}
        label={t('admin.podSettings.changeRequestLabel')}
        helperText={t('admin.podSettings.changeRequestMin')}
        invalidText={t('admin.podSettings.changeRequestInvalid')}
        min={0}
        max={10}
        loading={loading}
        value={settings?.venue_change_request_health_penalty ?? null}
        onSave={(next) => onSave({ venue_change_request_health_penalty: next })}
      />
      <NumberSettingCard
        title={t('admin.podSettings.changeRequestHostTitle')}
        description={t('admin.podSettings.changeRequestHostDesc')}
        label={t('admin.podSettings.changeRequestLabel')}
        helperText={t('admin.podSettings.changeRequestMin')}
        invalidText={t('admin.podSettings.changeRequestInvalid')}
        min={0}
        max={10}
        loading={loading}
        value={settings?.host_change_request_health_penalty ?? null}
        onSave={(next) => onSave({ host_change_request_health_penalty: next })}
      />
      <NumberSettingCard
        title={t('admin.podSettings.changeRequestClubAdminTitle')}
        description={t('admin.podSettings.changeRequestClubAdminDesc')}
        label={t('admin.podSettings.changeRequestLabel')}
        helperText={t('admin.podSettings.changeRequestMin')}
        invalidText={t('admin.podSettings.changeRequestInvalid')}
        min={0}
        max={10}
        loading={loading}
        value={settings?.club_admin_change_request_health_penalty ?? null}
        onSave={(next) => onSave({ club_admin_change_request_health_penalty: next })}
      />
    </Stack>
  );
}
