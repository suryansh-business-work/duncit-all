import { useTranslation } from '@duncit/shell';
import { Stack } from '@mui/material';
import NumberSettingCard from './NumberSettingCard';
import ToggleSettingCard from './ToggleSettingCard';
import type { PodSettingsSectionProps } from './queries';

/**
 * The platform defaults behind an ordinary pod's life: how long a draft is
 * kept, how often somebody may back out, what a venue cancellation costs,
 * whether a by-hand attendance mark needs a code, and the auto-cancel sweep.
 *
 * Split out of the page when it passed the 200-line ceiling (rule 9). Every
 * card is unchanged from where it sat before.
 */
export default function PodLifecycleSettings({
  settings,
  loading,
  onSave,
}: Readonly<PodSettingsSectionProps>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={3}>
      <NumberSettingCard
        title={t('admin.podSettings.retentionLabel')}
        description={t('admin.podSettings.retentionHint')}
        label={t('admin.podSettings.retentionLabel')}
        helperText={t('admin.podSettings.retentionMin')}
        invalidText={t('admin.podSettings.retentionInvalid')}
        min={1}
        loading={loading}
        value={settings?.draft_retention_days ?? null}
        onSave={(next) => onSave({ draft_retention_days: next })}
      />
      <NumberSettingCard
        title={t('admin.podSettings.backoutLabel')}
        description={t('admin.podSettings.backoutDesc')}
        label={t('admin.podSettings.backoutLabel')}
        helperText={t('admin.podSettings.backoutMin')}
        invalidText={t('admin.podSettings.backoutInvalid')}
        min={1}
        loading={loading}
        value={settings?.max_backout_attempts ?? null}
        onSave={(next) => onSave({ max_backout_attempts: next })}
      />
      <NumberSettingCard
        title={t('admin.podSettings.penaltyTitle')}
        description={t('admin.podSettings.penaltyDesc')}
        label={t('admin.podSettings.penaltyLabel')}
        helperText={t('admin.podSettings.penaltyMin')}
        invalidText={t('admin.podSettings.penaltyInvalid')}
        min={0}
        loading={loading}
        value={settings?.venue_cancel_health_penalty ?? null}
        onSave={(next) => onSave({ venue_cancel_health_penalty: next })}
      />
      <ToggleSettingCard
        title={t('admin.podSettings.otpTitle')}
        description={t('admin.podSettings.otpDesc')}
        onHint={t('admin.podSettings.otpOn')}
        offHint={t('admin.podSettings.otpOff')}
        loading={loading}
        value={settings?.attendance_otp_required ?? null}
        onSave={(next) => onSave({ attendance_otp_required: next })}
      />
      <ToggleSettingCard
        title={t('admin.podSettings.autoCancelTitle')}
        description={t('admin.podSettings.autoCancelDesc')}
        onHint={t('admin.podSettings.autoCancelOn')}
        offHint={t('admin.podSettings.autoCancelOff')}
        loading={loading}
        value={settings?.pod_auto_cancel_enabled ?? null}
        onSave={(next) => onSave({ pod_auto_cancel_enabled: next })}
      />
      <NumberSettingCard
        title={t('admin.podSettings.autoCancelLeadTitle')}
        description={t('admin.podSettings.autoCancelLeadDesc')}
        label={t('admin.podSettings.autoCancelLeadLabel')}
        helperText={t('admin.podSettings.autoCancelLeadMin')}
        invalidText={t('admin.podSettings.autoCancelLeadInvalid')}
        min={1}
        loading={loading}
        value={settings?.pod_auto_cancel_lead_hours ?? null}
        onSave={(next) => onSave({ pod_auto_cancel_lead_hours: next })}
      />
    </Stack>
  );
}
