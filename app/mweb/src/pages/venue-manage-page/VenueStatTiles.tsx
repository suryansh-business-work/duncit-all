import { Card, CardContent, Stack, Typography } from '@mui/material';
import ChairIcon from '@mui/icons-material/Chair';
import InsightsIcon from '@mui/icons-material/Insights';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useTranslation } from '../../i18n/useTranslation';

interface VenueStatTilesProps {
  /** Every venue the partner owns — the one figure that is not per-venue. */
  listed: number;
  capacity: number;
  status: string;
}

/** Listed / Capacity / Status strip. Capacity and Status belong to the venue
 * the switcher has selected; Listed counts them all. */
export default function VenueStatTiles({ listed, capacity, status }: Readonly<VenueStatTilesProps>) {
  const { t } = useTranslation();
  const tiles = [
    { label: t('mweb.venueManagePage.listed'), value: listed, icon: <StorefrontIcon fontSize="small" /> },
    { label: t('mweb.common.capacity'), value: capacity || '-', icon: <ChairIcon fontSize="small" /> },
    { label: t('mweb.venueManagePage.status'), value: status, icon: <InsightsIcon fontSize="small" /> },
  ];

  return (
    <Stack direction="row" spacing={1}>
      {tiles.map((item) => (
        <Card key={item.label} variant="outlined" sx={{ flex: 1, borderRadius: '16px' }}>
          <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{
                alignItems: "center",
                color: "primary.main"
              }}>
              {item.icon}
              <Typography variant="caption" sx={{ fontWeight: 700 }} noWrap>{item.label}</Typography>
            </Stack>
            <Typography variant="h6" sx={{ mt: 0.35, fontWeight: 700 }} noWrap>{item.value}</Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
