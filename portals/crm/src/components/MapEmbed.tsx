import { Box, Stack, Typography } from '@mui/material';
import ExternalLink from './ExternalLink';

interface Props {
  /** Free-form address that drives the Google Maps query. */
  address: string;
  /**
   * Optional explicit map link (e.g. a shared Google Maps URL with a
   * specific pin). When present we'll surface it as a deeplink even when
   * the embed below uses the search query.
   */
  mapLink?: string | null;
  height?: number;
}

/**
 * Embedded Google Maps view of an address. Uses the no-API-key `?output=embed`
 * pattern — works without any browser-side API key, just `loading="lazy"` for
 * perf. When `mapLink` is also set, we surface it as an "Open in Maps"
 * deeplink so the user can jump to a curated pin.
 */
export default function MapEmbed({ address, mapLink, height = 220 }: Readonly<Props>) {
  const q = (address || '').trim();
  if (!q) {
    return (
      <Typography variant="body2" color="text.secondary">
        Add an address to preview the map.
      </Typography>
    );
  }
  const src = `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
  const fallbackLink = mapLink || `https://www.google.com/maps?q=${encodeURIComponent(q)}`;
  return (
    <Stack spacing={1}>
      <Box
        sx={(t) => ({
          width: '100%',
          height,
          borderRadius: 1,
          overflow: 'hidden',
          border: `1px solid ${t.palette.divider}`,
        })}
      >
        <iframe
          title={`Map of ${q}`}
          src={src}
          width="100%"
          height={height}
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </Box>
      <ExternalLink href={fallbackLink} variant="caption">
        Open in Google Maps
      </ExternalLink>
    </Stack>
  );
}
