import { Box, Stack, Typography } from '@mui/material';
import DeckIcon from '@mui/icons-material/Deck';
import ManagedOptionList from './ManagedOptionList';

/** CRM → Data → Venues → Amenities management. Global, taxonomy-free list. */
export default function AmenitiesPage() {
  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <DeckIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={800}>Amenities management</Typography>
          <Typography variant="body2" color="text.secondary">
            Facilities a venue can offer (e.g. Parking, AC, Stage). Shown as checkboxes on the Venue Lead form. Not tied to any Super, Category or Sub Category.
          </Typography>
        </Box>
      </Stack>
      <ManagedOptionList
        group="AMENITY"
        addLabel="Add amenity"
        placeholder="e.g. Power Backup"
        searchPlaceholder="Search amenities…"
      />
    </Stack>
  );
}
