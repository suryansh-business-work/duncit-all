import { Controller } from 'react-hook-form';
import { MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import type { CreatePodForm } from './create-pod.form';
import { OCCURRENCES, POD_TYPES, type CreatePodClub, type CreatePodVenue } from './create-pod.types';

interface Props {
  form: CreatePodForm;
  clubs: CreatePodClub[];
  venues: CreatePodVenue[];
}

type TextFieldName =
  | 'pod_title'
  | 'meeting_platform'
  | 'meeting_url'
  | 'meeting_notes'
  | 'pod_description'
  | 'pod_info'
  | 'pod_hashtag_text';

const text = (form: CreatePodForm, name: TextFieldName) => ({
  ...form.register(name),
  error: !!form.formState.errors[name],
  helperText: form.formState.errors[name]?.message,
});

/** All Create Pod field groups: basics, where/when, about and payment. */
export default function CreatePodSections({ form, clubs, venues }: Readonly<Props>) {
  const mode = form.watch('pod_mode');
  const clubId = form.watch('club_id');
  const podType = form.watch('pod_type');
  const isFree = podType.includes('FREE');
  const linkedVenueIds = new Set(clubs.find((club) => club.id === clubId)?.meetup_venues_id ?? []);
  const clubVenues = venues.filter((venue) => linkedVenueIds.has(venue.id));
  const { errors } = form.formState;

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>1. Basic information</Typography>
      <TextField label="Pod title" required fullWidth {...text(form, 'pod_title')} />
      <Controller
        control={form.control}
        name="pod_mode"
        render={({ field }) => (
          <ToggleButtonGroup
            exclusive
            fullWidth
            color="primary"
            value={field.value}
            onChange={(_e, next) => next && field.onChange(next)}
          >
            <ToggleButton value="PHYSICAL"><PlaceIcon fontSize="small" sx={{ mr: 1 }} /> Physical</ToggleButton>
            <ToggleButton value="VIRTUAL"><VideocamIcon fontSize="small" sx={{ mr: 1 }} /> Virtual</ToggleButton>
          </ToggleButtonGroup>
        )}
      />
      <Controller
        control={form.control}
        name="club_id"
        render={({ field }) => (
          <TextField select label="Club" required fullWidth value={field.value}
            onChange={(e) => { field.onChange(e.target.value); form.setValue('venue_id', ''); }}
            error={!!errors.club_id} helperText={errors.club_id?.message}>
            {clubs.map((club) => <MenuItem key={club.id} value={club.id}>{club.club_name}</MenuItem>)}
          </TextField>
        )}
      />

      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
        {mode === 'VIRTUAL' ? '2. Meeting details' : '2. When & where'}
      </Typography>
      {mode === 'PHYSICAL' ? (
        <Controller
          control={form.control}
          name="venue_id"
          render={({ field }) => (
            <TextField select label="Venue" required fullWidth value={field.value}
              onChange={(e) => field.onChange(e.target.value)} disabled={!clubId}
              error={!!errors.venue_id}
              helperText={errors.venue_id?.message ?? 'Only your approved venues linked with this club are shown.'}>
              {clubVenues.map((venue) => (
                <MenuItem key={venue.id} value={venue.id}>
                  {venue.venue_name} - {[venue.locality, venue.city].filter(Boolean).join(', ')}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
      ) : (
        <>
          <TextField label="Meeting platform" fullWidth {...text(form, 'meeting_platform')} />
          <TextField label="Meeting link" required fullWidth {...text(form, 'meeting_url')} />
          <TextField label="Meeting notes" fullWidth multiline minRows={2} {...text(form, 'meeting_notes')} />
        </>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Controller
          control={form.control}
          name="pod_date_time"
          render={({ field }) => (
            <DateTimePicker label="Start date & time" value={field.value} onChange={field.onChange}
              minDateTime={new Date()}
              slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.pod_date_time, helperText: errors.pod_date_time?.message } }} />
          )}
        />
        <Controller
          control={form.control}
          name="pod_end_date_time"
          render={({ field }) => (
            <DateTimePicker label="End date & time" value={field.value} onChange={field.onChange}
              minDateTime={form.getValues('pod_date_time') ?? new Date()}
              slotProps={{ textField: { fullWidth: true, error: !!errors.pod_end_date_time, helperText: errors.pod_end_date_time?.message } }} />
          )}
        />
      </Stack>

      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>3. About this pod</Typography>
      <TextField label="Description" required fullWidth multiline minRows={4} {...text(form, 'pod_description')} />
      <TextField label="Pod info" fullWidth multiline minRows={2} {...text(form, 'pod_info')} />
      <TextField label="Hashtags" fullWidth placeholder="#weekend #community" {...text(form, 'pod_hashtag_text')} />
      <TextField label="Media URLs" fullWidth multiline minRows={2} helperText="One image or video URL per line." {...form.register('media_text')} />
      <TextField label="What this pod offers" fullWidth multiline minRows={2} helperText="One offer per line." {...form.register('what_this_pod_offers_text')} />
      <TextField label="Available perks" fullWidth multiline minRows={2} helperText="One perk per line." {...form.register('available_perks_text')} />

      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>4. Payment & spots</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Controller
          control={form.control}
          name="pod_type"
          render={({ field }) => (
            <TextField select label="Pod type" fullWidth value={field.value}
              onChange={(e) => { field.onChange(e.target.value); if (e.target.value.includes('FREE')) form.setValue('pod_amount', 0); }}>
              {POD_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>
          )}
        />
        <Controller
          control={form.control}
          name="pod_occurrence"
          render={({ field }) => (
            <TextField select label="Occurrence" fullWidth value={field.value} onChange={field.onChange}>
              {OCCURRENCES.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          )}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Amount" type="number" fullWidth disabled={isFree}
          error={!!errors.pod_amount}
          helperText={errors.pod_amount?.message ?? (isFree ? 'Free pod amount must be 0.' : 'Gross price, max 1999.')}
          {...form.register('pod_amount', { valueAsNumber: true })} />
        <TextField label="No. of spots" type="number" fullWidth
          error={!!errors.no_of_spots} helperText={errors.no_of_spots?.message}
          {...form.register('no_of_spots', { valueAsNumber: true })} />
      </Stack>
      <TextField label="Payment terms" fullWidth multiline minRows={3} {...form.register('payment_terms')} />
    </Stack>
  );
}
