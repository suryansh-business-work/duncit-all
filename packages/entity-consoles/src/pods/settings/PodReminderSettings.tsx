import { useTranslation } from '@duncit/shell';
import { Stack } from '@mui/material';
import NumberSettingCard from './NumberSettingCard';
import type { PodSettingsSectionProps } from './queries';

/**
 * The clocks the reminder sweeps run on.
 *
 * Nothing in the server notices that a pod starts tomorrow, that a venue has
 * sat on a slot request, or that a pod has ended and the people who were there
 * could be asked how it went — those are the passage of time, so a half-hourly
 * sweep answers them. Its three windows lived as constants in the scheduler
 * while the reminder email itself told the admin "the reminder window is set in
 * Admin > Pods". These are that window.
 *
 * The fourth clock, how long after a pod ends its HOST is nudged to complete
 * it, sits with the completion timeout it has to stay under — a nudge and its
 * deadline are read together or not at all.
 */
export default function PodReminderSettings({
  settings,
  loading,
  onSave,
}: Readonly<PodSettingsSectionProps>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={3}>
      <NumberSettingCard
        title={t('admin.podSettings.podReminderLeadTitle')}
        description={t('admin.podSettings.podReminderLeadDesc')}
        label={t('admin.podSettings.podReminderLeadLabel')}
        helperText={t('admin.podSettings.podReminderLeadMin')}
        invalidText={t('admin.podSettings.podReminderLeadInvalid')}
        min={1}
        max={8760}
        loading={loading}
        value={settings?.pod_reminder_lead_hours ?? null}
        onSave={(next) => onSave({ pod_reminder_lead_hours: next })}
      />
      <NumberSettingCard
        title={t('admin.podSettings.slotReminderLeadTitle')}
        description={t('admin.podSettings.slotReminderLeadDesc')}
        label={t('admin.podSettings.slotReminderLeadLabel')}
        helperText={t('admin.podSettings.slotReminderLeadMin')}
        invalidText={t('admin.podSettings.slotReminderLeadInvalid')}
        min={1}
        max={8760}
        loading={loading}
        value={settings?.venue_slot_reminder_lead_hours ?? null}
        onSave={(next) => onSave({ venue_slot_reminder_lead_hours: next })}
      />
      <NumberSettingCard
        title={t('admin.podSettings.feedbackDelayTitle')}
        description={t('admin.podSettings.feedbackDelayDesc')}
        label={t('admin.podSettings.feedbackDelayLabel')}
        helperText={t('admin.podSettings.feedbackDelayMin')}
        invalidText={t('admin.podSettings.feedbackDelayInvalid')}
        min={0}
        max={8760}
        loading={loading}
        value={settings?.pod_feedback_delay_hours ?? null}
        onSave={(next) => onSave({ pod_feedback_delay_hours: next })}
      />
    </Stack>
  );
}
