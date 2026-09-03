import { useTranslation } from '@duncit/shell';
import { Stack } from '@mui/material';
import NumberSettingCard from './NumberSettingCard';
import type { PodSettingsSectionProps } from './queries';

/**
 * The Auto Pods knobs. Split out of the page when it passed the 200-line
 * ceiling (rule 9); every card is unchanged from where it sat before.
 */
export default function AutoPodSettings({
  settings,
  loading,
  onSave,
}: Readonly<PodSettingsSectionProps>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={3}>
      <NumberSettingCard
        title={t('admin.podSettings.autoPodSlotWindowTitle')}
        description={t('admin.podSettings.autoPodSlotWindowDesc')}
        label={t('admin.podSettings.autoPodSlotWindowLabel')}
        helperText={t('admin.podSettings.autoPodSlotWindowMin')}
        invalidText={t('admin.podSettings.autoPodSlotWindowInvalid')}
        min={1}
        max={60}
        loading={loading}
        value={settings?.auto_pod_slot_window_days ?? null}
        onSave={(next) => onSave({ auto_pod_slot_window_days: next })}
      />
      <NumberSettingCard
        title={t('admin.podSettings.autoPodExpiryTitle')}
        description={t('admin.podSettings.autoPodExpiryDesc')}
        label={t('admin.podSettings.autoPodExpiryLabel')}
        helperText={t('admin.podSettings.autoPodExpiryMin')}
        invalidText={t('admin.podSettings.autoPodExpiryInvalid')}
        min={1}
        max={720}
        loading={loading}
        value={settings?.auto_pod_venue_expiry_hours ?? null}
        onSave={(next) => onSave({ auto_pod_venue_expiry_hours: next })}
      />
      <NumberSettingCard
        title={t('admin.podSettings.autoPodAssignmentTitle')}
        description={t('admin.podSettings.autoPodAssignmentDesc')}
        label={t('admin.podSettings.autoPodAssignmentLabel')}
        helperText={t('admin.podSettings.autoPodAssignmentMin')}
        invalidText={t('admin.podSettings.autoPodAssignmentInvalid')}
        min={1}
        max={720}
        loading={loading}
        value={settings?.auto_pod_assignment_expiry_hours ?? null}
        onSave={(next) => onSave({ auto_pod_assignment_expiry_hours: next })}
      />
      <NumberSettingCard
        title={t('admin.podSettings.autoPodPenaltyTitle')}
        description={t('admin.podSettings.autoPodPenaltyDesc')}
        label={t('admin.podSettings.autoPodPenaltyLabel')}
        helperText={t('admin.podSettings.autoPodPenaltyMin')}
        invalidText={t('admin.podSettings.autoPodPenaltyInvalid')}
        min={0}
        max={100}
        loading={loading}
        value={settings?.auto_pod_cancel_health_penalty ?? null}
        onSave={(next) => onSave({ auto_pod_cancel_health_penalty: next })}
      />
    </Stack>
  );
}
