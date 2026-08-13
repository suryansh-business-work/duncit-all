import { useNavigate } from 'react-router-dom';
import { Box, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import KeyIcon from '@mui/icons-material/Key';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';

const TILES = [
  {
    id: 'api-keys',
    to: '/keys',
    icon: <KeyIcon fontSize="large" color="primary" />,
    title: 'API Keys',
    text: 'Generate and revoke the keys your integrations authenticate with.',
  },
  {
    id: 'api-reference',
    to: '/docs',
    icon: <MenuBookIcon fontSize="large" color="primary" />,
    title: 'API Reference',
    text: 'Venue discovery, slot availability and slot booking endpoints — with a live Try-It console.',
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();

  const widgets: DashboardWidget[] = TILES.map((tile, index) => ({
    id: tile.id,
    bare: true,
    defaultLayout: { x: index * 6, y: 0, w: 6, h: 3 },
    minW: 3,
    minH: 2,
    content: (
      <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
        <CardActionArea onClick={() => navigate(tile.to)} sx={{ height: '100%' }}>
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
    ),
  }));

  return (
    <DuncitDashboard
      dashboardId="developers.overview"
      header={
        <Box>
          <Typography variant="h5" fontWeight={900}>
            Developers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Build on Duncit — venue APIs for slots, availability and bookings.
          </Typography>
        </Box>
      }
      widgets={widgets}
    />
  );
}
