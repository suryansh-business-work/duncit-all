import { Controller } from 'react-hook-form';
import { YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { MapEmbed } from '@/components/MapEmbed';
import { ChipSelectField } from '../ChipSelectField';
import type { CreatePodClub, CreatePodForm, CreatePodVenue } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  clubs: CreatePodClub[];
  venues: CreatePodVenue[];
}

/** Step 2 — venue (physical) or meeting details (virtual), schedule and map. */
export function WhenWhereStep({ form, clubs, venues }: Readonly<Props>) {
  const { control, watch } = form;
  const mode = watch('pod_mode');
  const clubId = watch('club_id');
  const venueId = watch('venue_id');
  const linkedVenueIds = new Set(clubs.find((club) => club.id === clubId)?.meetup_venues_id ?? []);
  const clubVenues = venues.filter((venue) => linkedVenueIds.has(venue.id));
  const selectedVenue = venues.find((venue) => venue.id === venueId);
  const mapQuery = selectedVenue
    ? [
        selectedVenue.venue_name,
        selectedVenue.address_line1,
        selectedVenue.locality,
        selectedVenue.city,
        selectedVenue.state,
        selectedVenue.postal_code,
        selectedVenue.country,
      ]
        .filter(Boolean)
        .join(', ')
    : '';

  return (
    <YStack gap={14}>
      {mode === 'PHYSICAL' ? (
        <>
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
          {mapQuery ? <MapEmbed query={mapQuery} height={200} /> : null}
        </>
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
    </YStack>
  );
}
