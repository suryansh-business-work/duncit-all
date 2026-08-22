import { Box, Stack, Typography } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useTranslation } from '@duncit/shell';

export default function LocationsToolbar() {
  const { t } = useTranslation();
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1}>
        <LocationOnIcon color="primary" />
        <Typography variant="h5">{t('admin.locations.title')}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Country, state, city and locality/PIN coverage served by the platform.
      </Typography>
    </Box>
  );
}
