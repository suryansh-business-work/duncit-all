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
          <Typography component="h1" variant="h5" sx={{
            fontWeight: 800
          }}>{t('shell.nav.amenitiesManagement')}</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('crm.data.amenitiesIntro')}
          </Typography>
        </Box>
      </Stack>
      <ManagedOptionList
        group="AMENITY"
        addLabel={t('crm.data.addAmenity')}
        placeholder={t('crm.data.eGPowerBackup')}
        searchPlaceholder={t('crm.data.searchAmenities')}
      />
    </Stack>
  );
}
