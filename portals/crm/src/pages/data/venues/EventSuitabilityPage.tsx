import { Box, Stack, Typography } from '@mui/material';
import CelebrationIcon from '@mui/icons-material/Celebration';
import ManagedOptionList from './ManagedOptionList';
import { useTranslation } from '@duncit/shell';

/** CRM → Data → Venues → Event Suitability management. Global, taxonomy-free list. */
export default function EventSuitabilityPage() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <CelebrationIcon color="primary" />
        <Box>
          <Typography component="h1" variant="h5" sx={{
            fontWeight: 800
          }}>{t('shell.nav.eventSuitabilityManagement')}</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('crm.data.eventSuitabilityIntro')}
          </Typography>
        </Box>
      </Stack>
      <ManagedOptionList
        group="EVENT_SUITABILITY"
        addLabel={t('crm.data.addEventType')}
        placeholder={t('crm.data.eGCorporateMeetup')}
        searchPlaceholder={t('crm.data.searchEventTypes')}
      />
    </Stack>
  );
}
