import { Box, Stack, Typography } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusyRounded';
import { useTranslation } from '../../i18n/useTranslation';

/** Home's empty state: one accent icon on a soft disc and one line. Native
 * twin: HomeEmptyText. */
export default function HomeEmptyState() {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 4, px: 3 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'action.hover',
          color: 'secondary.main',
        }}
      >
        <EventBusyIcon />
      </Box>
      <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{t('mweb.home.homeEmpty')}</Typography>
    </Stack>
  );
}
