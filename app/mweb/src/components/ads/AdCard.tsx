import { Box, Chip, Paper, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import AdMedia from './AdMedia';
import { adClickProps } from './adClick';
import type { PublicAd } from './useActiveAds';
import { SURFACE_SX } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';

export type AdCardVariant = 'banner' | 'card';

interface AdCardProps {
  ad: PublicAd;
  /** 'banner' = 16:9-ish media strip (lists, page bottoms); 'card' = the
   * shorter drawer-card footprint (VenuesCard parity). */
  variant?: AdCardVariant;
  sx?: SxProps<Theme>;
}

/** The standard sponsored card: a calm 24px card of cover media, a subtle
 * "Sponsored" chip and an optional title caption. Clickable (new tab) only
 * when the ad carries a redirect_url. */
export default function AdCard({ ad, variant = 'banner', sx }: Readonly<AdCardProps>) {
  const { t } = useTranslation();
  const clickable = Boolean(ad.redirect_url);
  const sizeSx = variant === 'card' ? { height: 132 } : { aspectRatio: '16 / 9' };
  return (
    <Paper
      data-testid="ad-card"
      {...adClickProps(ad)}
      sx={[
        {
          ...SURFACE_SX,
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          bgcolor: 'action.hover',
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
        label={t('mweb.ads.sponsored')}
        size="small"
        sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          height: 20,
          fontSize: 10.5,
          fontWeight: 600,
          color: 'common.white',
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
            fontWeight: 600,
            color: 'common.white',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
          }}
        >
          {ad.ad_title}
        </Typography>
      )}
    </Paper>
  );
}
