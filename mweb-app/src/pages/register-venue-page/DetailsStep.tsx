import { useMemo, useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VenueMapPreview from '../../components/VenueMapPreview';
import VenueLocationFields from './VenueLocationFields';
import VenueLocationFinder from './VenueLocationFinder';
import { VENUE_TYPES, type VenueStep1 } from './types';
import { getStepErrors, venueStep1Schema } from './register-venue.form';

interface Props {
  value: VenueStep1;
  locations: any[];
  onChange: (next: VenueStep1) => void;
  onCoverPick: () => void;
}

export default function DetailsStep({ value, locations, onChange, onCoverPick }: Props) {
  const [touched, setTouched] = useState<Partial<Record<keyof VenueStep1, boolean>>>({});
  const errors = useMemo(() => getStepErrors(venueStep1Schema, value), [value]);
  const set = (patch: Partial<VenueStep1>) => onChange({ ...value, ...patch });
  const touch = (key: keyof VenueStep1) => setTouched((prev) => ({ ...prev, [key]: true }));
  const showError = (key: keyof VenueStep1) => {
    if (!errors[key]) return false;
    const hasValue = String(value[key] ?? '').length > 0;
    return Boolean(touched[key] || hasValue);
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="Venue name"
        required
        value={value.venue_name}
        onChange={(e) => set({ venue_name: e.target.value })}
        onBlur={() => touch('venue_name')}
        error={showError('venue_name')}
        helperText={showError('venue_name') ? errors.venue_name : ' '}
      />
      <TextField
        select
        label="Type"
        value={value.venue_type}
        onChange={(e) => set({ venue_type: e.target.value })}
      >
        {VENUE_TYPES.map((type) => (
          <MenuItem key={type} value={type}>
            {type}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        type="number"
        label="Capacity"
        value={value.capacity}
        onChange={(e) => set({ capacity: Number(e.target.value) || 0 })}
        onBlur={() => touch('capacity')}
        error={showError('capacity')}
        helperText={showError('capacity') ? errors.capacity : ' '}
        inputProps={{ min: 1, step: 1 }}
      />
      <TextField
        label="Description"
        multiline
        minRows={3}
        value={value.description}
        onChange={(e) => set({ description: e.target.value })}
      />
      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary">
          Cover image
        </Typography>
        {value.cover_image_url && (
          <Box
            component="img"
            src={value.cover_image_url}
            sx={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 1 }}
          />
        )}
        <Button startIcon={<UploadFileIcon />} variant="outlined" onClick={onCoverPick}>
          {value.cover_image_url ? 'Change cover image' : 'Upload cover image'}
        </Button>
      </Stack>
      <TextField
        label="Address line 1"
        required
        value={value.address_line1}
        onChange={(e) => set({ address_line1: e.target.value })}
        onBlur={() => touch('address_line1')}
        error={showError('address_line1')}
        helperText={showError('address_line1') ? errors.address_line1 : ' '}
      />
      <TextField
        label="Address line 2"
        value={value.address_line2}
        onChange={(e) => set({ address_line2: e.target.value })}
      />
      <VenueLocationFinder locations={locations} value={value} onChange={onChange} />
      <VenueLocationFields value={value} locations={locations} onChange={onChange} />
      <VenueMapPreview
        parts={[
          value.address_line1,
          value.address_line2,
          value.locality,
          value.city,
          value.state,
          value.postal_code,
          value.country,
        ]}
      />
    </Stack>
  );
}
