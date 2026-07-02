import { Controller, type UseFormReturn } from 'react-hook-form';
import { Alert, Chip, Stack, Typography } from '@mui/material';
import type { RegisterVenueValues, VenueRegistrationConfig } from '../register-venue';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  config: VenueRegistrationConfig;
  disabled?: boolean;
}

interface GroupDef {
  name: 'amenities' | 'facilities' | 'security';
  label: string;
  hint: string;
  options: string[];
}

/** Toggle-chip checklist groups for Amenities, Facilities and Venue Security.
 * Options come from `venueRegistrationConfig` — never hardcoded. */
export default function AmenitiesSection({ form, config, disabled = false }: Readonly<Props>) {
  const groups: GroupDef[] = [
    {
      name: 'amenities',
      label: 'Amenities',
      hint: 'Comfort features guests get inside your venue',
      options: config.amenities,
    },
    {
      name: 'facilities',
      label: 'Facilities',
      hint: 'Infrastructure your premises offer',
      options: config.facilities,
    },
    {
      name: 'security',
      label: 'Venue Security',
      hint: 'Safety & security measures at the venue',
      options: config.security,
    },
  ];

  return (
    <Stack spacing={3}>
      {disabled && (
        <Alert severity="info">
          Amenities, facilities and security are locked after approval. Contact support to change them.
        </Alert>
      )}
      {groups.map((group) => (
        <Controller
          key={group.name}
          name={group.name}
          control={form.control}
          render={({ field }) => (
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={800}>{group.label}</Typography>
              <Typography variant="caption" color="text.secondary">{group.hint}</Typography>
              <Stack direction="row" flexWrap="wrap" sx={{ gap: 1 }} role="group" aria-label={group.label}>
                {group.options.map((option) => {
                  const selected = field.value.includes(option);
                  return (
                    <Chip
                      key={option}
                      label={option}
                      clickable={!disabled}
                      disabled={disabled}
                      color={selected ? 'primary' : 'default'}
                      variant={selected ? 'filled' : 'outlined'}
                      aria-pressed={selected}
                      onClick={
                        disabled
                          ? undefined
                          : () =>
                              field.onChange(
                                selected
                                  ? field.value.filter((item: string) => item !== option)
                                  : [...field.value, option]
                              )
                      }
                    />
                  );
                })}
              </Stack>
            </Stack>
          )}
        />
      ))}
      <Typography variant="caption" color="text.secondary">
        These appear on your public venue page and help hosts pick the right space.
      </Typography>
    </Stack>
  );
}
