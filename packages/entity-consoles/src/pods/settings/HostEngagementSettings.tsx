import { Box, Stack, Typography } from '@mui/material';
import {
  MAX_HOST_INACTIVITY_DAYS,
  MAX_HOST_MONTHLY_POD_TARGET,
  MAX_HOST_PERFORMANCE_NOTIFY_DAY,
  MAX_HOST_UNDERPERFORM_THRESHOLD_PCT,
  MIN_HOST_INACTIVITY_DAYS,
  MIN_HOST_MONTHLY_POD_TARGET,
  MIN_HOST_PERFORMANCE_NOTIFY_DAY,
  MIN_HOST_UNDERPERFORM_THRESHOLD_PCT,
} from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import NumberSettingCard from './NumberSettingCard';
import ToggleSettingCard from './ToggleSettingCard';
import HostEngagementStatusesForm from './host-engagement-statuses';
import type { PodSettingsSectionProps } from './queries';

/**
 * Host engagement & performance — what Club Admins see on Partners > Clubs >
 * Hosts and the monthly messages about it: the inactivity window (yellow
 * rows), the monthly pod target (the score), the engagement statuses, and the
 * monthly WhatsApp + email messages. Every number is held to the range the
 * server keeps, so a card refuses what would never apply.
 */
export default function HostEngagementSettings({ settings, loading, onSave }: Readonly<PodSettingsSectionProps>) {
  const { t } = useTranslation();
  const toggle = (field: string, title: string, description: string, onHint: string, offHint: string) => (
    <ToggleSettingCard
      title={title}
      description={description}
      onHint={onHint}
      offHint={offHint}
      loading={loading}
      value={settings?.[field] ?? null}
      onSave={(next) => onSave({ [field]: next })}
    />
  );

  return (
    <Stack spacing={3} data-testid="pod-settings-host-engagement">
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {t('admin.podSettings.hostEngagement.groupTitle')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('admin.podSettings.hostEngagement.groupDesc')}
        </Typography>
      </Box>
      <NumberSettingCard
        title={t('admin.podSettings.hostEngagement.inactivityTitle')}
        description={t('admin.podSettings.hostEngagement.inactivityDesc')}
        label={t('admin.podSettings.hostEngagement.inactivityLabel')}
        helperText={t('admin.podSettings.hostEngagement.inactivityHint')}
        invalidText={t('admin.podSettings.hostEngagement.inactivityInvalid')}
        min={MIN_HOST_INACTIVITY_DAYS}
        max={MAX_HOST_INACTIVITY_DAYS}
        loading={loading}
        value={settings?.host_inactivity_days ?? null}
        onSave={(next) => onSave({ host_inactivity_days: next })}
        testId="pod-settings-host-inactivity-days"
      />
      <NumberSettingCard
        title={t('admin.podSettings.hostEngagement.targetTitle')}
        description={t('admin.podSettings.hostEngagement.targetDesc')}
        label={t('admin.podSettings.hostEngagement.targetLabel')}
        helperText={t('admin.podSettings.hostEngagement.targetHint')}
        invalidText={t('admin.podSettings.hostEngagement.targetInvalid')}
        min={MIN_HOST_MONTHLY_POD_TARGET}
        max={MAX_HOST_MONTHLY_POD_TARGET}
        loading={loading}
        value={settings?.host_monthly_pod_target ?? null}
        onSave={(next) => onSave({ host_monthly_pod_target: next })}
        testId="pod-settings-host-monthly-pod-target"
      />
      <HostEngagementStatusesForm
        value={settings?.host_engagement_statuses ?? null}
        loading={loading}
        onSave={onSave}
      />
      {toggle(
        'host_performance_notify_enabled',
        t('admin.podSettings.hostEngagement.notifyEnabledTitle'),
        t('admin.podSettings.hostEngagement.notifyEnabledDesc'),
        t('admin.podSettings.hostEngagement.notifyOn'),
        t('admin.podSettings.hostEngagement.notifyOff'),
      )}
      <NumberSettingCard
        title={t('admin.podSettings.hostEngagement.notifyDayTitle')}
        description={t('admin.podSettings.hostEngagement.notifyDayDesc')}
        label={t('admin.podSettings.hostEngagement.notifyDayLabel')}
        helperText={t('admin.podSettings.hostEngagement.notifyDayHint')}
        invalidText={t('admin.podSettings.hostEngagement.notifyDayInvalid')}
        min={MIN_HOST_PERFORMANCE_NOTIFY_DAY}
        max={MAX_HOST_PERFORMANCE_NOTIFY_DAY}
        loading={loading}
        value={settings?.host_performance_notify_day ?? null}
        onSave={(next) => onSave({ host_performance_notify_day: next })}
        testId="pod-settings-host-notify-day"
      />
      <NumberSettingCard
        title={t('admin.podSettings.hostEngagement.thresholdTitle')}
        description={t('admin.podSettings.hostEngagement.thresholdDesc')}
        label={t('admin.podSettings.hostEngagement.thresholdLabel')}
        helperText={t('admin.podSettings.hostEngagement.thresholdHint')}
        invalidText={t('admin.podSettings.hostEngagement.thresholdInvalid')}
        min={MIN_HOST_UNDERPERFORM_THRESHOLD_PCT}
        max={MAX_HOST_UNDERPERFORM_THRESHOLD_PCT}
        loading={loading}
        value={settings?.host_underperform_threshold_pct ?? null}
        onSave={(next) => onSave({ host_underperform_threshold_pct: next })}
        testId="pod-settings-host-underperform-threshold"
      />
      {toggle(
        'host_performance_notify_hosts',
        t('admin.podSettings.hostEngagement.notifyHostsTitle'),
        t('admin.podSettings.hostEngagement.notifyHostsDesc'),
        t('admin.podSettings.hostEngagement.notifyHostsOn'),
        t('admin.podSettings.hostEngagement.notifyHostsOff'),
      )}
      {toggle(
        'host_performance_notify_club_admins',
        t('admin.podSettings.hostEngagement.notifyAdminsTitle'),
        t('admin.podSettings.hostEngagement.notifyAdminsDesc'),
        t('admin.podSettings.hostEngagement.notifyAdminsOn'),
        t('admin.podSettings.hostEngagement.notifyAdminsOff'),
      )}
    </Stack>
  );
}
