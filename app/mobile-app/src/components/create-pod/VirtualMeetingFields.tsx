import { Control, Controller } from 'react-hook-form';
import { addMinutes } from 'date-fns';
import { Text, YStack } from 'tamagui';
import { meetingPlatformOptions } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { FormTextField } from '@/components/FormTextField';
import { ChipSelectField } from './ChipSelectField';
import { DateTimeField } from './DateTimeField';
import { MIN_POD_DURATION_MINUTES } from './create-pod.form';
import type { CreatePodFormValues } from './create-pod.types';

/**
 * Meeting details + schedule for a virtual pod — the venue/slot twin.
 *
 * Lifted out of VenueSlotStep, which was well past the 200-line rule and is the
 * physical branch's home. The mWeb twin is
 * `app/mweb/.../create-pod/VirtualMeetingFields.tsx`: same fields, same order,
 * same minimum-duration rule, MUI there and Tamagui here.
 */
export function VirtualMeetingFields({
  control,
  startDateTime,
  duration,
}: Readonly<{
  control: Control<CreatePodFormValues>;
  startDateTime: Date | null;
  duration: string | null;
}>) {
  const { t } = useTranslation();
  // The end picker only opens times after the start — the first 30 minutes
  // are blocked too, since that is the minimum pod length.
  const minEndDateTime = startDateTime ? addMinutes(startDateTime, MIN_POD_DURATION_MINUTES) : null;
  // Product names come from the shared list; only "Other" is copy.
  const platformOptions = meetingPlatformOptions(t('mweb.createPod.meetingPlatformOther'));

  return (
    <YStack gap={14}>
      {/* Picked, not typed: the pod page decodes codes, so hand-typed text came
          back as "Google meet". mWeb renders the same list as a MUI select. */}
      <Controller
        control={control}
        name="meeting_platform"
        render={({ field, fieldState }) => (
          <ChipSelectField
            label={t('mweb.createPod.meetingPlatform')}
            required
            options={[...platformOptions]}
            value={field.value ?? ''}
            onChange={field.onChange}
            error={fieldState.error?.message}
            testID="meeting_platform"
          />
        )}
      />
      <FormTextField
        control={control}
        name="meeting_url"
        label={t('mweb.createPod.meetingLink')}
        required
        hint={t('mweb.createPod.meetingLinkHint')}
      />
      <FormTextField
        control={control}
        name="meeting_notes"
        label={t('mweb.createPod.meetingNotes')}
        multiline
      />
      <Controller
        control={control}
        name="pod_date_time_text"
        render={({ field, fieldState }) => (
          <DateTimeField
            label={t('mweb.createPod.startDateTime')}
            required
            value={field.value}
            onChange={field.onChange}
            minDateTime={new Date()}
            error={fieldState.error?.message}
            testID="pod_date_time_text"
          />
        )}
      />
      <Controller
        control={control}
        name="pod_end_date_time_text"
        render={({ field, fieldState }) => (
          <DateTimeField
            label={t('mweb.createPod.endDateTime')}
            required
            value={field.value}
            onChange={field.onChange}
            minDateTime={minEndDateTime}
            error={fieldState.error?.message}
            testID="pod_end_date_time_text"
          />
        )}
      />
      {duration ? (
        <Text testID="pod-duration" fontSize={12.5} fontWeight="600" color="$muted">
          {t('mweb.createPod.totalDuration', { vars: { duration } })}
        </Text>
      ) : null}
    </YStack>
  );
}
