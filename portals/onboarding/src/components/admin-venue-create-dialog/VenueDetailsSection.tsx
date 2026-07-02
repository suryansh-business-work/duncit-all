import { Box, MenuItem, Stack, TextField } from '@mui/material';
import MediaListField from '../MediaListField';
import MediaPickerField from '../MediaPickerField';
import { VENUE_TYPES, type Step1 } from './queries';
import VenueChecklistFields from './VenueChecklistFields';
import VenueLocationFields from './VenueLocationFields';
import { getVenueError, type VenueValidationErrors } from './venue.form';

interface Props {
  s1: Step1;
  setS1: (next: Step1) => void;
  locations: any[];
  errors?: VenueValidationErrors;
}

export default function VenueDetailsSection({ s1, setS1, locations, errors }: Readonly<Props>) {
  const set = (patch: Partial<Step1>) => setS1({ ...s1, ...patch });
  const err = (field: keyof Step1) => getVenueError(errors, `step1.${field}`);
  return (
    <Stack spacing={1.5}>
      <Box
        sx={{
          display: 'grid',
          columnGap: 1.5,
          rowGap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        }}
      >
        <TextField label="Venue name *" size="small" value={s1.venue_name} onChange={(e) => set({ venue_name: e.target.value })} error={!!err('venue_name')} helperText={err('venue_name') || undefined} />
        <TextField select label="Type" size="small" value={s1.venue_type} onChange={(e) => set({ venue_type: e.target.value })} error={!!err('venue_type')} helperText={err('venue_type') || undefined}>
          {VENUE_TYPES.map((t) => (
            <MenuItem key={t} value={t}>{t}</MenuItem>
          ))}
        </TextField>
        <TextField label="Capacity" type="number" size="small" value={s1.capacity} onChange={(e) => set({ capacity: Number(e.target.value) })} error={!!err('capacity')} helperText={err('capacity') || undefined} />
        <TextField sx={{ gridColumn: '1 / -1' }} label="Address line 1 *" size="small" value={s1.address_line1} onChange={(e) => set({ address_line1: e.target.value })} error={!!err('address_line1')} helperText={err('address_line1') || undefined} />
        <TextField sx={{ gridColumn: '1 / -1' }} label="Address line 2" size="small" value={s1.address_line2} onChange={(e) => set({ address_line2: e.target.value })} />
        <TextField sx={{ gridColumn: '1 / -1' }} label="Description" size="small" multiline minRows={2} value={s1.description} onChange={(e) => set({ description: e.target.value })} error={!!err('description')} helperText={err('description') || undefined} />
        <TextField
          sx={{ gridColumn: '1 / -1' }}
          label="Tags"
          size="small"
          value={s1.tags.join(', ')}
          onChange={(e) =>
            set({ tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })
          }
          helperText="Comma separated tags shown on approved venue cards."
        />
      </Box>
      <VenueChecklistFields s1={s1} set={set} />
      <VenueLocationFields s1={s1} locations={locations} set={set} errors={errors} />
      <MediaPickerField
        label="Cover image"
        value={s1.cover_image_url}
        onChange={(url) => set({ cover_image_url: url })}
        helperText={err('cover_image_url') || undefined}
        folder="/venues/cover"
      />
      <MediaListField
        label="Other images"
        value={s1.gallery.join('\n')}
        onChange={(value) => set({ gallery: value.split('\n').map((url) => url.trim()).filter(Boolean) })}
        folder="/venues/gallery"
        helperText="Additional venue photos shown on the public venue page."
      />
    </Stack>
  );
}
