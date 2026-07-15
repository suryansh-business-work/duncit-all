import { Box, Paper, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useBrandingAssets } from '../../../hooks/useBrandingAssets';

const CARD_HEIGHT = 132;

/** Full-width "Venues" discovery card — an autoplaying muted looping video
 * background with a big venue title; tapping opens the location-scoped Venues
 * page. Native twin: Sidebar/SidebarVenuesCard. */
export default function VenuesCard({ onNavigate }: Readonly<{ onNavigate: (to: string) => void }>) {
  const { venuesCardVideoUrl } = useBrandingAssets();
  return (
    <Box sx={{ px: 2, pb: 1.25 }}>
      <Paper
        data-testid="drawer-venues-card"
        variant="outlined"
        onClick={() => onNavigate('/venues')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onNavigate('/venues');
        }}
        aria-label="Explore venues"
        sx={{
          position: 'relative',
          height: CARD_HEIGHT,
          borderRadius: 4,
          overflow: 'hidden',
          cursor: 'pointer',
          bgcolor: 'grey.900',
        }}
      >
        {venuesCardVideoUrl && (
          <Box
            component="video"
            src={venuesCardVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
        <Stack
          direction="row"
          alignItems="flex-end"
          justifyContent="space-between"
          sx={{
            position: 'relative',
            height: '100%',
            p: 2,
            background: 'rgba(0,0,0,0.45)',
            color: '#fff',
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>Venues</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, opacity: 0.85 }}>
              Discover spaces to meet near you
            </Typography>
          </Box>
          <ArrowForwardIcon />
        </Stack>
      </Paper>
    </Box>
  );
}
