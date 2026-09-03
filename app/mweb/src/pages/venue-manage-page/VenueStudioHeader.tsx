import { Link as RouterLink } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

/** Venue Studio page header — mark, title, and the "New venue" action. */
export default function VenueStudioHeader() {
  const { t } = useTranslation();

  return (
    <Stack direction="row" spacing={1.25} sx={{
      alignItems: "center"
    }}>
      <Box sx={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'primary.contrastText', background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)' }}>
        <StorefrontIcon fontSize="small" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
          {t('mweb.venueManage.venueStudio')}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 600
          }}>
          {t('mweb.venueManagePage.listYourSpace')}
        </Typography>
      </Box>
      <DuncitButton component={RouterLink} to="/register-venue" variant="contained" size="small" startIcon={<AddIcon />} sx={{ borderRadius: 999, fontWeight: 700 }}>
        {t('mweb.venueManagePage.newVenue')}
      </DuncitButton>
    </Stack>
  );
}
