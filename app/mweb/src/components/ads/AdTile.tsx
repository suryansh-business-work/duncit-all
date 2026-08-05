import type { KeyboardEvent } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import AdMedia from './AdMedia';
import type { PublicAd } from './useActiveAds';

/**
 * A sponsored tile shaped exactly like HomeStatusTile (70×90 with a 62px circle
 * in a 96px rail) so it blends into the status rail, plus a tiny "Sponsored"
 * badge over the circle.
 *
 * Tapping it opens the ad AS A STORY — it never leaves for the advertiser's
 * page. A tile in a story rail promises a story; the landing page, when the ad
 * has one, is offered as "Open details" at the bottom of that story.
 */
export default function AdTile({ ad, onOpen }: Readonly<{ ad: PublicAd; onOpen: () => void }>) {
  return (
    <Stack
      data-testid="ad-tile"
      role="button"
      tabIndex={0}
      aria-label={ad.ad_title ? `Sponsored: ${ad.ad_title}` : 'Sponsored ad'}
      onClick={onOpen}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') onOpen();
      }}
      spacing={0.6}
      alignItems="center"
      sx={{
        width: 70,
        minHeight: 90,
        flex: '0 0 auto',
        cursor: 'pointer',
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
            fontWeight: 600,
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
          fontWeight: 600,
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
