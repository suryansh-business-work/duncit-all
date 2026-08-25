import { useNavigate } from 'react-router-dom';
import { Box, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import KeyIcon from '@mui/icons-material/Key';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useTranslation } from '@duncit/shell';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';

/**
 * The tiles carry KEYS rather than sentences, so the copy lives in the shipped
 * bundle with the rest of the portal's (rule 38). They are written out as
 * literals rather than derived from `id`, because the build gate greps for
 * literal key strings and a composed one reads as copy nothing renders.
 */
const TILES = [
  {
    id: 'api-keys',
    to: '/keys',
    icon: <KeyIcon fontSize="large" color="primary" />,
    titleKey: 'developers.dashboard.apiKeysTitle',
    textKey: 'developers.dashboard.apiKeysText',
  },
  {
    id: 'api-reference',
    to: '/docs',
    icon: <MenuBookIcon fontSize="large" color="primary" />,
    titleKey: 'developers.dashboard.apiReferenceTitle',
    textKey: 'developers.dashboard.apiReferenceText',
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
              <Typography variant="subtitle1" sx={{
                fontWeight: 900
              }}>
                {t(tile.titleKey)}
              </Typography>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {t(tile.textKey)}
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
          <Typography variant="h5" sx={{
            fontWeight: 900
          }}>
            {t('developers.dashboard.title')}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('developers.dashboard.subtitle')}
          </Typography>
        </Box>
      }
      widgets={widgets}
    />
  );
}
