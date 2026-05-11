import { Box, MenuItem, TextField, Typography } from '@mui/material';
import MediaPickerField from '../MediaPickerField';
import { VENUE_TYPES, type Step1 } from './queries';
import VenueLocationFields from './VenueLocationFields';

interface Props {
  s1: Step1;
  setS1: (next: Step1) => void;
  locations: any[];
}

export default function VenueDetailsSection({ s1, setS1, locations }: Props) {
  const set = (patch: Partial<Step1>) => setS1({ ...s1, ...patch });
  return (
    <>
      <Typography variant="subtitle2">Venue details</Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        }}
      >
        <TextField label="Venue name *" size="small" value={s1.venue_name} onChange={(e) => set({ venue_name: e.target.value })} />
        <TextField select label="Type" size="small" value={s1.venue_type} onChange={(e) => set({ venue_type: e.target.value })}>
          {VENUE_TYPES.map((t) => (
            <MenuItem key={t} value={t}>{t}</MenuItem>
          ))}
        </TextField>
        <TextField label="Capacity" type="number" size="small" value={s1.capacity} onChange={(e) => set({ capacity: Number(e.target.value) })} />
        <TextField sx={{ gridColumn: '1 / -1' }} label="Address line 1 *" size="small" value={s1.address_line1} onChange={(e) => set({ address_line1: e.target.value })} />
        <TextField sx={{ gridColumn: '1 / -1' }} label="Address line 2" size="small" value={s1.address_line2} onChange={(e) => set({ address_line2: e.target.value })} />
        <TextField sx={{ gridColumn: '1 / -1' }} label="Description" size="small" multiline minRows={2} value={s1.description} onChange={(e) => set({ description: e.target.value })} />
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
      <VenueLocationFields s1={s1} locations={locations} set={set} />
      <MediaPickerField
        label="Cover image"
        value={s1.cover_image_url}
        onChange={(url) => set({ cover_image_url: url })}
        folder="/venues/cover"
      />
    </>
  );
}
