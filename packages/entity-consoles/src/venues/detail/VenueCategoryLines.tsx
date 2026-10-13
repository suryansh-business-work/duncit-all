import { Stack, Typography } from '@mui/material';
import { venueCategoryPaths, type VenueCategoryCarrier } from '@duncit/utils';
import { EMPTY } from './venue-values';

/**
 * Every category the venue is filed under, one path per line, primary first.
 *
 * A venue may host several, so this is a list rather than one line: the paths
 * come from `venueCategoryPaths`, which also reads the lone `venue_category` of
 * a record stored before the list existed. A venue with none reads as the dash.
 */
export default function VenueCategoryLines({
  venue,
  variant = 'body2',
  color,
}: Readonly<{
  venue: VenueCategoryCarrier;
  variant?: 'body2' | 'caption';
  color?: string;
}>) {
  const paths = venueCategoryPaths(venue);

  if (paths.length === 0) {
    return (
      <Typography variant={variant} component="span" sx={{ color }}>
        {EMPTY}
      </Typography>
    );
  }
  return (
    <Stack component="ul" spacing={0.25} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {paths.map((path) => (
        <Typography key={path} component="li" variant={variant} sx={{ color }}>
          {path}
        </Typography>
      ))}
    </Stack>
  );
}
