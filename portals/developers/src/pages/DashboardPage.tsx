import { useNavigate } from 'react-router-dom';
import { Box, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import KeyIcon from '@mui/icons-material/Key';
import MenuBookIcon from '@mui/icons-material/MenuBook';

const TILES = [
  {
    to: '/keys',
    icon: <KeyIcon fontSize="large" color="primary" />,
    title: 'API Keys',
    text: 'Generate and revoke the keys your integrations authenticate with.',
  },
  {
    to: '/docs',
    icon: <MenuBookIcon fontSize="large" color="primary" />,
    title: 'API Reference',
    text: 'Venue discovery, slot availability and slot booking endpoints — with a live Try-It console.',
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" fontWeight={900}>
          Developers
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Build on Duncit — venue APIs for slots, availability and bookings.
        </Typography>
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {TILES.map((tile) => (
          <Card key={tile.to} variant="outlined" sx={{ flex: 1, borderRadius: 3 }}>
            <CardActionArea onClick={() => navigate(tile.to)}>
              <CardContent>
                <Stack spacing={1}>
                  {tile.icon}
                  <Typography variant="subtitle1" fontWeight={900}>
                    {tile.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tile.text}
                  </Typography>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
