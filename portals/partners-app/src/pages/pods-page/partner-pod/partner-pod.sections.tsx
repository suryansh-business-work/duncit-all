import { Alert, MenuItem, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Controller, useFormContext } from 'react-hook-form';
import RhfTextField from '../../../forms/components/RhfTextField';
import PartnerPodProductsField from './PartnerPodProductsField';
import VenueSlotPicker from './VenueSlotPicker';
import { OCCURRENCES, POD_TYPES, type PartnerPodFormValues } from './partner-pod.types';

export function BasicFields({ clubs }: Readonly<{ clubs: any[] }>) {
  const { control, register, watch, setValue, formState: { errors } } = useFormContext<PartnerPodFormValues>();
  return (
    <Stack spacing={2}>
      <RhfTextField control={control} name="pod_title" label="Pod title" required hint="A URL-friendly slug is generated from this title" />
      <ToggleButtonGroup exclusive fullWidth color="primary" value={watch('pod_mode')} onChange={(_, mode) => mode && setValue('pod_mode', mode)}>
        <ToggleButton value="PHYSICAL"><PlaceIcon fontSize="small" sx={{ mr: 1 }} /> Physical</ToggleButton>
        <ToggleButton value="VIRTUAL"><VideocamIcon fontSize="small" sx={{ mr: 1 }} /> Virtual</ToggleButton>
      </ToggleButtonGroup>
      <TextField select label="Club" value={watch('club_id')} onChange={(event) => { setValue('club_id', event.target.value, { shouldValidate: true }); setValue('venue_id', ''); }} required fullWidth error={!!errors.club_id} helperText={errors.club_id?.message}>
        {clubs.map((club) => <MenuItem key={club.id} value={club.id}>{club.club_name}</MenuItem>)}
      </TextField>
      <TextField label="Hashtags" fullWidth placeholder="#weekend #community" {...register('pod_hashtag_text')} />
      <TextField label="Media URLs" fullWidth multiline minRows={2} helperText="One image or video URL per line." {...register('media_text')} />
    </Stack>
  );
}

export function PlaceFields({ clubs, venues }: Readonly<{ clubs: any[]; venues: any[] }>) {
  const { control, register, watch, setValue, formState: { errors } } = useFormContext<PartnerPodFormValues>();
  const clubId = watch('club_id');
  const venueId = watch('venue_id');
  const linkedVenueIds = new Set(clubs.find((club) => club.id === clubId)?.meetup_venues_id ?? []);
  const clubVenues = venues.filter((venue) => linkedVenueIds.has(venue.id));

  const handleVenueChange = (nextVenueId: string) => {
    setValue('venue_id', nextVenueId, { shouldValidate: true });
    setValue('venue_slot_id', '');
    setValue('pod_date_time', null);
    setValue('pod_end_date_time', null);
  };

  const handleSlotPick = (slot: { id: string; start_at: string; end_at: string } | null) => {
    if (!slot) {
      setValue('venue_slot_id', '');
      setValue('pod_date_time', null);
      setValue('pod_end_date_time', null);
      return;
    }
    setValue('venue_slot_id', slot.id, { shouldValidate: true });
    setValue('pod_date_time', new Date(slot.start_at));
    setValue('pod_end_date_time', new Date(slot.end_at));
  };

  if (watch('pod_mode') === 'PHYSICAL') {
    const venueHint = clubVenues.length === 0 ? 'No approved venues linked to this club.' : 'Only your approved venues linked with this club are shown.';
    return (
      <Stack spacing={2}>
        <TextField select label="Venue" value={venueId} onChange={(event) => handleVenueChange(event.target.value)} required fullWidth disabled={!clubId} error={!!errors.venue_id} helperText={errors.venue_id?.message ?? venueHint}>
          {clubVenues.map((venue) => (
            <MenuItem key={venue.id} value={venue.id}>{venue.venue_name} - {[venue.locality, venue.city].filter(Boolean).join(', ')}</MenuItem>
          ))}
        </TextField>
        <VenueSlotPicker venueId={venueId} selectedSlotId={watch('venue_slot_id')} onSelect={handleSlotPick} />
        {errors.venue_slot_id && <Alert severity="error">{String(errors.venue_slot_id.message)}</Alert>}
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <TextField label="Meeting platform" fullWidth {...register('meeting_platform')} />
      <RhfTextField control={control} name="meeting_url" label="Meeting link" required />
      <TextField label="Meeting notes" fullWidth multiline minRows={2} {...register('meeting_notes')} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <DateTimeField control={control} name="pod_date_time" label="Start date & time" minBound={new Date()} required />
        <DateTimeField control={control} name="pod_end_date_time" label="End date & time" minBound={watch('pod_date_time') ?? new Date()} />
      </Stack>
    </Stack>
  );
}

interface DateTimeFieldProps {
  control: ReturnType<typeof useFormContext<PartnerPodFormValues>>['control'];
  name: 'pod_date_time' | 'pod_end_date_time';
  label: string;
  minBound: Date;
  required?: boolean;
}

function DateTimeField({ control, name, label, minBound, required }: Readonly<DateTimeFieldProps>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <DateTimePicker
          label={label}
          value={field.value}
          onChange={(date) => field.onChange(date)}
          minDateTime={minBound}
          slotProps={{ textField: { fullWidth: true, required, error: !!fieldState.error, helperText: fieldState.error?.message } }}
        />
      )}
    />
  );
}

export function AboutFields() {
  const { control, register } = useFormContext<PartnerPodFormValues>();
  return (
    <Stack spacing={2}>
      <RhfTextField control={control} name="pod_description" label="Description" required multiline minRows={4} />
      <TextField label="Pod info" fullWidth multiline minRows={2} {...register('pod_info')} />
      <TextField label="What this pod offers" fullWidth multiline minRows={2} helperText="One offer per line." {...register('what_this_pod_offers_text')} />
      <TextField label="Available perks" fullWidth multiline minRows={2} helperText="One perk per line." {...register('available_perks_text')} />
    </Stack>
  );
}

export function ProductsFields({ products }: Readonly<{ products: any[] }>) {
  const { watch, setValue } = useFormContext<PartnerPodFormValues>();
  const enabled = watch('products_enabled');
  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Switch checked={enabled} onChange={(event) => { setValue('products_enabled', event.target.checked); if (!event.target.checked) setValue('product_requests', []); }} />
        <Typography fontWeight={900}>Enable approved products</Typography>
      </Stack>
      {enabled && <PartnerPodProductsField products={products} />}
    </Stack>
  );
}

export function PaymentFields() {
  const { control, register, watch, setValue, formState: { errors } } = useFormContext<PartnerPodFormValues>();
  const isFree = watch('pod_type').includes('FREE');
  const amountHint = isFree ? 'Free pod amount must be 0.' : 'Gross price, max 1999.';
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField select label="Pod type" value={watch('pod_type')} onChange={(event) => { setValue('pod_type', event.target.value); if (event.target.value.includes('FREE')) setValue('pod_amount', 0); }} fullWidth>
          {POD_TYPES.map((type) => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}
        </TextField>
        <TextField select label="Occurrence" value={watch('pod_occurrence')} onChange={(event) => setValue('pod_occurrence', event.target.value)} fullWidth>
          {OCCURRENCES.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
        </TextField>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Amount" type="number" value={watch('pod_amount')} onChange={(event) => setValue('pod_amount', Number(event.target.value) || 0, { shouldValidate: true })} disabled={isFree} fullWidth error={!!errors.pod_amount} helperText={errors.pod_amount?.message ?? amountHint} />
        <TextField label="No. of spots" type="number" value={watch('no_of_spots')} onChange={(event) => setValue('no_of_spots', Number(event.target.value) || 0, { shouldValidate: true })} fullWidth error={!!errors.no_of_spots} helperText={errors.no_of_spots?.message} />
      </Stack>
      <RhfTextField control={control} name="payment_terms" label="Payment terms" multiline minRows={3} hint=" " />
    </Stack>
  );
}
