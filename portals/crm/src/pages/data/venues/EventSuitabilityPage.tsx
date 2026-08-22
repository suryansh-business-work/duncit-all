import { Box, Stack, Typography } from '@mui/material';
import CelebrationIcon from '@mui/icons-material/Celebration';
import ManagedOptionList from './ManagedOptionList';
import { useTranslation } from '@duncit/shell';

/** CRM → Data → Venues → Event Suitability management. Global, taxonomy-free list. */
export default function EventSuitabilityPage() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <CelebrationIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={800}>{t('shell.nav.eventSuitabilityManagement')}</Typography>
          <Typography variant="body2" color="text.secondary">
            Event types a venue is suitable for (e.g. Birthday Party, Workshop). Drives the suitability picker on the Venue Lead form. Not tied to any Super, Category or Sub Category.
          </Typography>
        </Box>
      </Stack>
      <ManagedOptionList
        group="EVENT_SUITABILITY"
        addLabel="Add event type"
        placeholder={t('crm.data.eGCorporateMeetup')}
        searchPlaceholder="Search event types…"
      />
    </Stack>
  );
}
