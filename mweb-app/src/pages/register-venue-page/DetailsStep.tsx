import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VenueMapPreview from '../../components/VenueMapPreview';
import VenueLocationFields from './VenueLocationFields';
import VenueLocationFinder from './VenueLocationFinder';
import { VENUE_TYPES, type VenueStep1 } from './types';

interface Props {
  value: VenueStep1;
  locations: any[];
  onChange: (next: VenueStep1) => void;
  onCoverPick: () => void;
}

export default function DetailsStep({ value, locations, onChange, onCoverPick }: Props) {
  const set = (patch: Partial<VenueStep1>) => onChange({ ...value, ...patch });

  return (
    <Stack spacing={2}>
      <TextField
        label="Venue name"
        required
        value={value.venue_name}
        onChange={(e) => set({ venue_name: e.target.value })}
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
