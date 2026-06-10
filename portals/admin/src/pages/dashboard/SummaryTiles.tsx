import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { SUMMARY_TILES } from './queries';

interface Props {
  totals: any;
  loading: boolean;
}

export default function SummaryTiles({ totals, loading }: Readonly<Props>) {
  return (
    <Grid container spacing={2}>
      {SUMMARY_TILES.map((t) => (
        <Grid item xs={6} sm={4} md={2.4} key={t.key}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    {t.label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {loading ? '…' : totals?.[t.key] ?? 0}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: `${t.color}1A`,
                    color: t.color,
                  }}
                >
                  <t.icon fontSize="small" />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
