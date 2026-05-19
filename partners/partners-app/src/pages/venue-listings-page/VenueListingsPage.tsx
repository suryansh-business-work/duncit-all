import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import VenueListingsTable from './VenueListingsTable';

export default function VenueListingsPage() {
  const navigate = useNavigate();

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 860, mx: 'auto' }}>
      <Box sx={{ p: 2.5, borderRadius: 2, color: '#fff', background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Box>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 900 }}>Venue registration</Typography>
            <Typography variant="h4" fontWeight={950}>Register your venue</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.76)', mt: 1 }}>
              Track review status and continue your venue application.
            </Typography>
          </Box>
          <Button component={RouterLink} to="/register-venue/new" variant="contained" startIcon={<AddBusinessIcon />} sx={{ bgcolor: '#fff', color: '#15111c', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}>
            Register Venue
          </Button>
        </Stack>
      </Box>
      <VenueListingsTable onEdit={() => navigate('/register-venue/current')} />
    </Stack>
  );
}