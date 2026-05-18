import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CelebrationIcon from '@mui/icons-material/Celebration';

const actions = [
  {
    title: 'Register your venue',
    text: 'Submit your space, documents, owner details, and photos for partner review.',
    path: '/register-venue',
    icon: <StorefrontIcon />,
  },
  {
    title: 'Be a host',
    text: 'Complete identity, verification, and address details to become a Duncit host.',
    path: '/become-host',
    icon: <CelebrationIcon />,
  },
];

export default function PartnerHomePage() {
  return (
    <Stack spacing={2.5}>
      <Box sx={{ p: 3, borderRadius: 4, color: '#fff', background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)' }}>
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.68)', fontWeight: 900 }}>Duncit Partners</Typography>
        <Typography variant="h4" fontWeight={950}>Choose your partner path</Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mt: 1 }}>Use the same Duncit account for venue and host applications.</Typography>
      </Box>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        {actions.map((action) => (
          <Card key={action.path} variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Box sx={{ width: 46, height: 46, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: '#fff' }}>{action.icon}</Box>
                <Typography variant="h6" fontWeight={900}>{action.title}</Typography>
                <Typography variant="body2" color="text.secondary">{action.text}</Typography>
                <Button component={RouterLink} to={action.path} variant="contained">Start</Button>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Stack>
  );
}