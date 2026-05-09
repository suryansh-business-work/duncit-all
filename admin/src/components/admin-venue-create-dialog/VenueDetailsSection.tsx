import { Box, MenuItem, TextField, Typography } from '@mui/material';
import MediaPickerField from '../MediaPickerField';
import { VENUE_TYPES, type Step1 } from './queries';

interface Props {
  s1: Step1;
  setS1: (next: Step1) => void;
}

export default function VenueDetailsSection({ s1, setS1 }: Props) {
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
        <TextField label="City *" size="small" value={s1.city} onChange={(e) => set({ city: e.target.value })} />
        <TextField label="State *" size="small" value={s1.state} onChange={(e) => set({ state: e.target.value })} />
        <TextField label="Postal code *" size="small" value={s1.postal_code} onChange={(e) => set({ postal_code: e.target.value })} />
        <TextField sx={{ gridColumn: '1 / -1' }} label="Address line 1 *" size="small" value={s1.address_line1} onChange={(e) => set({ address_line1: e.target.value })} />
        <TextField sx={{ gridColumn: '1 / -1' }} label="Address line 2" size="small" value={s1.address_line2} onChange={(e) => set({ address_line2: e.target.value })} />
        <TextField sx={{ gridColumn: '1 / -1' }} label="Description" size="small" multiline minRows={2} value={s1.description} onChange={(e) => set({ description: e.target.value })} />
      </Box>
      <MediaPickerField
        label="Cover image"
        value={s1.cover_image_url}
        onChange={(url) => set({ cover_image_url: url })}
        folder="/venues/cover"
      />
    </>
  );
}
