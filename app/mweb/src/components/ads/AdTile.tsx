import { Box, Stack, Typography } from '@mui/material';
import AdMedia from './AdMedia';
import { adClickProps } from './adClick';
import type { PublicAd } from './useActiveAds';

/** A sponsored tile shaped exactly like HomeStatusTile (70×90 with a 62px
 * circle in a 96px rail) so it blends into the status rail, plus a tiny
 * "Sponsored" badge over the circle. */
export default function AdTile({ ad }: Readonly<{ ad: PublicAd }>) {
  const clickable = Boolean(ad.redirect_url);
  return (
    <Stack
      data-testid="ad-tile"
      {...adClickProps(ad)}
      spacing={0.6}
      alignItems="center"
      sx={{
        width: 70,
        minHeight: 90,
        flex: '0 0 auto',
        cursor: clickable ? 'pointer' : 'default',
        overflow: 'visible',
      }}
    >
      <Box
        sx={{
          width: 62,
          height: 62,
          borderRadius: '50%',
          overflow: 'hidden',
          position: 'relative',
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <AdMedia ad={ad} />
        <Typography
          component="span"
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            textAlign: 'center',
            fontSize: 8.5,
            fontWeight: 800,
            lineHeight: '14px',
            color: '#fff',
            bgcolor: 'rgba(0,0,0,0.6)',
          }}
        >
          Sponsored
        </Typography>
      </Box>
      <Typography
        variant="caption"
        sx={{
          width: '100%',
          minHeight: 17,
          fontWeight: 800,
          lineHeight: 1.15,
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {ad.ad_title ?? 'Sponsored'}
      </Typography>
    </Stack>
  );
}
