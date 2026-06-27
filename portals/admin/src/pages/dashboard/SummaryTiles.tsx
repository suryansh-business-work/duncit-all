import { Box, Card, CardActionArea, CardContent, Grid, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { SUMMARY_TILES, type SummaryTileKey } from './queries';
import type { SvgIconComponent } from '@mui/icons-material';

interface TileBodyProps {
  label: string;
  value: string | number;
  color: string;
  Icon: SvgIconComponent;
}

function TileBody({ label, value, color, Icon }: Readonly<TileBodyProps>) {
  return (
    <CardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="overline" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            bgcolor: `${color}1A`,
            color,
          }}
        >
          <Icon fontSize="small" />
        </Box>
      </Stack>
    </CardContent>
  );
}

interface Props {
  totals: Record<SummaryTileKey, number> | null | undefined;
  loading: boolean;
}

export default function SummaryTiles({ totals, loading }: Readonly<Props>) {
  return (
    <Grid container spacing={2}>
      {SUMMARY_TILES.map((t) => {
        const value = loading ? '…' : totals?.[t.key] ?? 0;
        const body = <TileBody label={t.label} value={value} color={t.color} Icon={t.icon} />;
        return (
          <Grid item xs={6} sm={4} md={2.4} key={t.key}>
            <Card sx={{ height: '100%' }}>
              {t.to ? (
                <CardActionArea component={RouterLink} to={t.to} sx={{ height: '100%' }}>
                  {body}
                </CardActionArea>
              ) : (
                body
              )}
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
