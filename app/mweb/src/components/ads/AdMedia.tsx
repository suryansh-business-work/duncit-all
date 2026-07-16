import { Box } from '@mui/material';
import type { PublicAd } from './useActiveAds';

const mediaSx = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
} as const;

/** The creative itself — a cover-fit image, or an autoplaying muted looping
 * inline video (same treatment as VenuesCard / HomeStatusTile media). */
export default function AdMedia({ ad }: Readonly<{ ad: PublicAd }>) {
  if (ad.ad_type === 'VIDEO') {
    return <Box component="video" src={ad.media_url} autoPlay muted loop playsInline sx={mediaSx} />;
  }
  return <Box component="img" src={ad.media_url} alt={ad.ad_title ?? 'Sponsored'} sx={mediaSx} />;
}
