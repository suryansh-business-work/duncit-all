import { Box, Stack, Typography } from '@mui/material';
import DeckIcon from '@mui/icons-material/Deck';
import ManagedOptionList from './ManagedOptionList';
import { useTranslation } from '@duncit/shell';

/** CRM → Data → Venues → Amenities management. Global, taxonomy-free list. */
export default function AmenitiesPage() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <DeckIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{
            fontWeight: 800
          }}>{t('shell.nav.amenitiesManagement')}</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Facilities a venue can offer (e.g. Parking, AC, Stage). Shown as checkboxes on the Venue Lead form. Not tied to any Super, Category or Sub Category.
          </Typography>
        </Box>
      </Stack>
      <ManagedOptionList
        group="AMENITY"
        addLabel="Add amenity"
        placeholder={t('crm.data.eGPowerBackup')}
        searchPlaceholder="Search amenities…"
      />
    </Stack>
  );
}
