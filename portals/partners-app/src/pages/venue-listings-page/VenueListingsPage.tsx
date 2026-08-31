import { Link as RouterLink } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import { DuncitButton } from '@duncit/buttons';
import VenueListingsTable from './VenueListingsTable';
import { useTranslation } from '@duncit/shell';

export default function VenueListingsPage() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2.5} sx={{ width: '100%' }}>
      <Box sx={{ p: 2.5, borderRadius: 2, color: '#fff', background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: 'flex-start', sm: 'center' }
          }}>
          <Box>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 900 }}>{t('partners.venueListingsPage.venueRegistration')}</Typography>
            <Typography variant="h4" sx={{
              fontWeight: 950
            }}>{t('partners.common.registerYourVenue')}</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.76)', mt: 1 }}>
              Track review status and continue your venue application.
            </Typography>
          </Box>
          <DuncitButton component={RouterLink} to="/register-venue/new" variant="contained" startIcon={<AddBusinessIcon />} sx={{ bgcolor: '#fff', color: '#15111c', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}>
            Register Venue
          </DuncitButton>
        </Stack>
      </Box>
      <VenueListingsTable />
    </Stack>
  );
}