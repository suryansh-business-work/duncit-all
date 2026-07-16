import { Box, Chip, Paper, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import AdMedia from './AdMedia';
import { adClickProps } from './adClick';
import type { PublicAd } from './useActiveAds';

export type AdCardVariant = 'banner' | 'card';

interface AdCardProps {
  ad: PublicAd;
  /** 'banner' = 16:9-ish media strip (lists, page bottoms); 'card' = the
   * shorter drawer-card footprint (VenuesCard parity). */
  variant?: AdCardVariant;
  sx?: SxProps<Theme>;
}

/** The standard sponsored card: rounded Paper, cover media, a subtle
 * "Sponsored" chip and an optional title caption. Clickable (new tab) only
 * when the ad carries a redirect_url. */
export default function AdCard({ ad, variant = 'banner', sx }: Readonly<AdCardProps>) {
  const clickable = Boolean(ad.redirect_url);
  const sizeSx = variant === 'card' ? { height: 132 } : { aspectRatio: '16 / 9' };
  return (
    <Paper
      variant="outlined"
      data-testid="ad-card"
      {...adClickProps(ad)}
      sx={[
        {
          position: 'relative',
          width: '100%',
          borderRadius: 4,
          overflow: 'hidden',
          bgcolor: 'grey.900',
          cursor: clickable ? 'pointer' : 'default',
          ...sizeSx,
        },
        ...(Array.isArray(sx) ? sx : [sx ?? false]),
      ]}
    >
      <Box sx={{ position: 'absolute', inset: 0 }}>
        <AdMedia ad={ad} />
      </Box>
      <Chip
        label="Sponsored"
        size="small"
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          height: 20,
          fontSize: 10.5,
          fontWeight: 800,
          color: '#fff',
          bgcolor: 'rgba(0,0,0,0.55)',
        }}
      />
      {ad.ad_title && (
        <Typography
          variant="caption"
          noWrap
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            px: 1.5,
            pt: 3,
            pb: 1,
            fontWeight: 800,
            color: '#fff',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
          }}
        >
          {ad.ad_title}
        </Typography>
      )}
    </Paper>
  );
}
