import { useState } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { Alert, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { DuncitIconButton } from '@duncit/buttons';
import type { RegisterVenueValues, VenueRegistrationConfig } from '../register-venue';
import { useTranslation } from '@duncit/shell';
import AmenityGroup, { type AmenityGroupDef } from './amenities/AmenityGroup';
import { ownOptionLimitsOf } from './amenities/amenity-options';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  config: VenueRegistrationConfig;
  disabled?: boolean;
}

/** Toggle-chip checklist groups for Amenities, Facilities and Venue Security,
 * with one search over all three. Options come from `venueRegistrationConfig` —
 * never hardcoded — and the venue may add a few entries of its own to each. */
export default function AmenitiesSection({ form, config, disabled = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const limits = ownOptionLimitsOf(config);
  const groups: AmenityGroupDef[] = [
    {
      name: 'amenities',
      label: t('partners.registerVenuePage.amenities'),
      hint: 'Comfort features guests get inside your venue',
      options: config.amenities,
    },
    {
      name: 'facilities',
      label: t('partners.registerVenuePage.facilities'),
      hint: 'Infrastructure your premises offer',
      options: config.facilities,
    },
    {
      name: 'security',
      label: t('partners.registerVenuePage.venueSecurity'),
      hint: 'Safety & security measures at the venue',
      options: config.security,
    },
  ];
  const clearSearch = search === '' ? undefined : (
    <InputAdornment position="end">
      <DuncitIconButton size="small" aria-label={t('partners.registerVenuePage.clearAmenitySearch')} onClick={() => setSearch('')}>
        <ClearIcon fontSize="small" />
      </DuncitIconButton>
    </InputAdornment>
  );

  return (
    <Stack spacing={3}>
      {disabled && (
        <Alert severity="info" data-testid="register-venue-amenities-locked">
          Amenities, facilities and security are locked after approval. Contact support to change them.
        </Alert>
      )}
      <TextField
        size="small"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        // Enter in a field of the setup page's form would save the page; a search only filters.
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault();
        }}
        label={t('partners.registerVenuePage.searchAmenities')}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: clearSearch,
          },
          htmlInput: { 'data-testid': 'register-venue-amenities-search' },
        }}
      />
      {groups.map((group) => (
        <Controller
          key={group.name}
          name={group.name}
          control={form.control}
          render={({ field }) => (
            <AmenityGroup
              group={group}
              value={field.value}
              onChange={field.onChange}
              search={search}
              disabled={disabled}
              limits={limits}
            />
          )}
        />
      ))}
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        These appear on your public venue page and help hosts pick the right space.
      </Typography>
    </Stack>
  );
}
