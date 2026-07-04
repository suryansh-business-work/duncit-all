import { useState } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Autocomplete,
  Button,
  Card,
  CardContent,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  OVERRIDE_HOSTS,
  OVERRIDE_VENUES,
  SET_HOST_DEDUCTIONS,
  SET_VENUE_DEDUCTIONS,
} from '../queries';
import type {
  HostOption,
  OverrideEditorCardProps,
  OverrideFormValues,
  OverrideOption,
  VenueOption,
} from './deduction-overrides.types';

export const overrideSchema = z.object({
  entity_id: z.string().min(1, 'Pick one from the list'),
  commission_pct: z
    .number({ invalid_type_error: 'Enter a percentage', required_error: 'Commission % is required' })
    .min(0, 'Cannot be below 0')
    .max(100, 'Cannot exceed 100'),
});

function OverrideEditorCard({ title, subtitle, pickerLabel, options, loading, saving, onSave }: Readonly<OverrideEditorCardProps>) {
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, setValue } = useForm<OverrideFormValues>({
    defaultValues: { entity_id: '', commission_pct: 0 },
    resolver: zodResolver(overrideSchema),
  });

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      await onSave(values.entity_id, values.commission_pct);
    } catch (e: any) {
      setError(e.message ?? 'Could not save the override');
    }
  });

  return (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 280 }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        <form noValidate onSubmit={submit}>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Controller
              control={control}
              name="entity_id"
              render={({ field, fieldState }) => (
                <Autocomplete
                  options={options}
                  loading={loading}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  value={options.find((option) => option.id === field.value) ?? null}
                  onChange={(_, option: OverrideOption | null) => {
                    field.onChange(option?.id ?? '');
                    if (option?.current_pct !== undefined) setValue('commission_pct', option.current_pct);
                  }}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Stack>
                        <Typography variant="body2">{option.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{option.sublabel}</Typography>
                      </Stack>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField {...params} label={pickerLabel} error={!!fieldState.error} helperText={fieldState.error?.message} />
                  )}
                />
              )}
            />
            <Controller
              control={control}
              name="commission_pct"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(event.target.value === '' ? '' : Number(event.target.value))}
                  label="Commission %"
                  type="number"
                  inputProps={{ min: 0, max: 100, step: 0.5 }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? '0 = inherit default'}
                  fullWidth
                />
              )}
            />
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving…' : 'Save Override'}
            </Button>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}

/** Per-host / per-venue commission overrides (0 = inherit the global default). */
export default function DeductionOverridesSection() {
  const [toast, setToast] = useState<string | null>(null);
  const hosts = useQuery<{ publicHosts: HostOption[] }>(OVERRIDE_HOSTS, { fetchPolicy: 'cache-and-network' });
  const venues = useQuery<{ publicVenues: VenueOption[] }>(OVERRIDE_VENUES, { fetchPolicy: 'cache-and-network' });
  const [setHost, hostState] = useMutation(SET_HOST_DEDUCTIONS);
  const [setVenue, venueState] = useMutation(SET_VENUE_DEDUCTIONS);

  const hostOptions: OverrideOption[] = (hosts.data?.publicHosts ?? []).map((host) => ({
    id: host.user_id,
    label: host.full_name,
    sublabel: host.email,
  }));

  const venueList = venues.data?.publicVenues ?? [];
  const venueOptions: OverrideOption[] = venueList.map((venue) => ({
    id: venue.id,
    label: venue.venue_name,
    sublabel: venue.city,
    current_pct: venue.venue_commission_pct,
  }));

  const saveHost = async (userId: string, pct: number) => {
    await setHost({ variables: { user_id: userId, host_commission_pct: pct } });
    setToast('Host commission override saved');
  };

  const saveVenue = async (venueId: string, pct: number) => {
    const venue = venueList.find((v) => v.id === venueId);
    // venue_share_pct is required-but-dormant on the mutation — pass it back unchanged.
    await setVenue({
      variables: { id: venueId, venue_share_pct: venue?.venue_share_pct ?? 0, venue_commission_pct: pct },
    });
    await venues.refetch();
    setToast('Venue commission override saved');
  };

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
      <OverrideEditorCard
        title="Host Commission Override"
        subtitle="Duncit's commission on this host's pool remainder for their pods."
        pickerLabel="Pick a host"
        options={hostOptions}
        loading={hosts.loading}
        saving={hostState.loading}
        onSave={saveHost}
      />
      <OverrideEditorCard
        title="Venue Commission Override"
        subtitle="Duncit's commission on this venue's booked slot price."
        pickerLabel="Pick a venue"
        options={venueOptions}
        loading={venues.loading}
        saving={venueState.loading}
        onSave={saveVenue}
      />
      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast(null)} message={toast || ''} />
    </Stack>
  );
}
