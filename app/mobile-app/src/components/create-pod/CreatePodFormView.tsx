import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { CreatePodClub, CreatePodVenue } from '@/hooks/useCreatePod';
import { ChipSelectField } from './ChipSelectField';
import { createPodSchema } from './create-pod.form';
import {
  OCCURRENCES,
  POD_TYPES,
  blankCreatePodForm,
  type CreatePodFormValues,
} from './create-pod.types';

interface Props {
  clubs: CreatePodClub[];
  venues: CreatePodVenue[];
  onSubmit: (values: CreatePodFormValues) => Promise<void>;
}

const MODES = [
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'VIRTUAL', label: 'Virtual' },
];

/** The host Create Pod form (RHF + Zod): chips for pickers, themed text fields
 * for everything else — the mobile twin of mWeb's /create-pod form. */
export function CreatePodFormView({ clubs, venues, onSubmit }: Readonly<Props>) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { control, handleSubmit, watch, setValue, formState } = useForm<CreatePodFormValues>({
    resolver: zodResolver(createPodSchema),
    defaultValues: blankCreatePodForm,
    mode: 'onTouched',
  });

  const mode = watch('pod_mode');
  const clubId = watch('club_id');
  const linkedVenueIds = new Set(clubs.find((club) => club.id === clubId)?.meetup_venues_id ?? []);
  const clubVenues = venues.filter((venue) => linkedVenueIds.has(venue.id));

  const submit = handleSubmit(async (values) => {
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(values);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the pod.');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <YStack gap={14} padding={16} paddingBottom={48}>
      <Text fontSize={12.5} color="$muted">
        Your approved host profile is added as the pod host automatically.
      </Text>

      <FormTextField control={control} name="pod_title" label="Pod title" />
      <Controller
        control={control}
        name="pod_mode"
        render={({ field }) => (
          <ChipSelectField
            label="Mode"
            options={MODES}
            value={field.value}
            onChange={field.onChange}
            testID="create-pod-mode"
          />
        )}
      />
      <Controller
        control={control}
        name="club_id"
        render={({ field, fieldState }) => (
          <ChipSelectField
            label="Club"
            options={clubs.map((club) => ({ value: club.id, label: club.club_name }))}
            value={field.value}
            onChange={(next) => {
              field.onChange(next);
              setValue('venue_id', '');
            }}
            error={fieldState.error?.message}
            testID="create-pod-club"
          />
        )}
      />
      {mode === 'PHYSICAL' ? (
        <Controller
          control={control}
          name="venue_id"
          render={({ field, fieldState }) => (
            <ChipSelectField
              label="Venue"
              options={clubVenues.map((venue) => ({
                value: venue.id,
                label: [venue.venue_name, venue.city].filter(Boolean).join(' · '),
              }))}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              emptyHint="No approved venues linked to this club."
              testID="create-pod-venue"
            />
          )}
        />
      ) : (
        <>
          <FormTextField control={control} name="meeting_platform" label="Meeting platform" />
          <FormTextField control={control} name="meeting_url" label="Meeting link" />
          <FormTextField control={control} name="meeting_notes" label="Meeting notes" multiline />
        </>
      )}

      <FormTextField
        control={control}
        name="pod_date_time_text"
        label="Start (YYYY-MM-DD HH:mm)"
        placeholder="2026-07-01 18:30"
      />
      <FormTextField
        control={control}
        name="pod_end_date_time_text"
        label="End (optional)"
        placeholder="2026-07-01 20:30"
      />
      <FormTextField control={control} name="pod_description" label="Description" multiline />
      <FormTextField control={control} name="pod_info" label="Pod info" multiline />

      <Controller
        control={control}
        name="pod_type"
        render={({ field }) => (
          <ChipSelectField
            label="Pod type"
            options={[...POD_TYPES]}
            value={field.value}
            onChange={(next) => {
              field.onChange(next);
              if (next.includes('FREE')) setValue('pod_amount_text', '0');
            }}
            testID="create-pod-type"
          />
        )}
      />
      <Controller
        control={control}
        name="pod_occurrence"
        render={({ field }) => (
          <ChipSelectField
            label="Occurrence"
            options={[...OCCURRENCES]}
            value={field.value}
            onChange={field.onChange}
            testID="create-pod-occurrence"
          />
        )}
      />
      <FormTextField
        control={control}
        name="pod_amount_text"
        label="Amount (₹)"
        keyboardType="numeric"
      />
      <FormTextField
        control={control}
        name="no_of_spots_text"
        label="No. of spots"
        keyboardType="numeric"
      />
      <FormTextField
        control={control}
        name="pod_hashtag_text"
        label="Hashtags"
        placeholder="#weekend #community"
      />
      <FormTextField
        control={control}
        name="media_text"
        label="Media URLs (one per line)"
        multiline
      />
      <FormTextField
        control={control}
        name="what_this_pod_offers_text"
        label="What this pod offers"
        multiline
      />
      <FormTextField
        control={control}
        name="available_perks_text"
        label="Available perks"
        multiline
      />
      <FormTextField control={control} name="payment_terms" label="Payment terms" multiline />

      {error ? (
        <Text testID="create-pod-error" fontSize={12.5} color="$danger">
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        testID="create-pod-submit"
        label={formState.isSubmitting || submitting ? 'Creating…' : 'Create Pod'}
        loading={submitting}
        onPress={() => void submit()}
      />
    </YStack>
  );
}
