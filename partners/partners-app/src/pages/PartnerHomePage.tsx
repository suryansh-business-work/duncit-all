import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBoxOpen, faBuilding, faUserTie } from '@fortawesome/free-solid-svg-icons';

const actions = [
  {
    title: 'Register your venue',
    text: 'Submit your space, documents, owner details, and photos for partner review.',
    path: '/register-venue',
    icon: faBuilding,
  },
  {
    title: 'Be a host',
    text: 'Complete identity, verification, and address details to become a Duncit host.',
    path: '/become-host',
    icon: faUserTie,
  },
  {
    title: 'List your products',
    text: 'Sell your products via Duncit. Hosts can select approved products during pod creation.',
    path: '/list-products',
    icon: faBoxOpen,
  },
];

export default function PartnerHomePage() {
  return (
    <Stack spacing={2.5}>
      <Box sx={{ p: 2.5, borderRadius: 2, color: '#fff', background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)' }}>
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.68)', fontWeight: 900 }}>Duncit Partners</Typography>
        <Typography variant="h4" fontWeight={950}>Choose your partner path</Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mt: 1 }}>Use the same Duncit account for venue and host applications.</Typography>
      </Box>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
        {actions.map((action) => (
          <Card key={action.path} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack spacing={1.5}>
                <Box sx={{ height: 132, borderRadius: 1.25, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,87,87,0.08)', border: 1, borderColor: 'divider', color: 'primary.main' }}>
                  <FontAwesomeIcon icon={action.icon} style={{ fontSize: 62 }} />
                </Box>
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