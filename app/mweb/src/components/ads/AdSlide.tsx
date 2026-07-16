import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AdMedia from './AdMedia';
import { openAdLink } from './adClick';
import type { PublicAd } from './useActiveAds';

/** A full-viewport sponsored slide for the Explore reel: cover media with a
 * bottom gradient carrying the Sponsored chip, title and an optional
 * "Learn more" CTA when the ad has a landing page. */
export default function AdSlide({ ad }: Readonly<{ ad: PublicAd }>) {
  return (
    <Box data-testid="ad-slide" sx={{ position: 'relative', height: '100%', width: '100%', bgcolor: '#000' }}>
      <Box sx={{ position: 'absolute', inset: 0 }}>
        <AdMedia ad={ad} />
      </Box>
      <Stack
        spacing={1}
        alignItems="flex-start"
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          px: 2,
          pt: 6,
          pb: 'calc(env(safe-area-inset-bottom) + 24px)',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
          color: '#fff',
        }}
      >
        <Chip
          label="Sponsored"
          size="small"
          sx={{ height: 20, fontSize: 10.5, fontWeight: 800, color: '#fff', bgcolor: 'rgba(255,255,255,0.22)' }}
        />
        {ad.ad_title && (
          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
            {ad.ad_title}
          </Typography>
        )}
        {ad.redirect_url && (
          <Button
            variant="contained"
            size="small"
            endIcon={<OpenInNewIcon />}
            onClick={() => openAdLink(ad.redirect_url)}
            sx={{ fontWeight: 800, borderRadius: 999 }}
          >
            Learn more
          </Button>
        )}
      </Stack>
    </Box>
  );
}
