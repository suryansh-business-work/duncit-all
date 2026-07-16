import type { ReactNode } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { TypographyProps } from '@mui/material/Typography';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { buildMapQuery, mapEmbedUrl, mapSearchUrl, type MapQueryPart } from './mapEmbed';

type Sx = SxProps<Theme>;

export interface MapEmbedCardProps {
  /** iframe title (accessibility). Also the default heading text. */
  title?: string;
  /** Address fragments joined with ", " (empty/blank entries dropped). */
  parts?: readonly MapQueryPart[];
  /** When BOTH are set, the query becomes "lat,lng" and `parts` is ignored. */
  lat?: number | null;
  lng?: number | null;
  /** Pre-built query string — overrides `parts`/`lat`/`lng` when non-empty. */
  query?: string | null;
  /**
   * Google Maps Embed API key. When set, the keyed Embed API is used.
   * When `keyless` is true the key is ignored and the always-working
   * `output=embed` map is used instead.
   */
  apiKey?: string | null;
  keyless?: boolean;
  /** Map zoom. Defaults: 15 (keyed) / 14 (keyless). */
  zoom?: number;
  /** Header label. Defaults to `title`. Pass a node for full control. */
  heading?: ReactNode;
  headingVariant?: TypographyProps['variant'];
  headingColor?: TypographyProps['color'];
  headingSx?: Sx;
  /** "Open in Maps" (default) / "Open Map" etc. */
  buttonLabel?: ReactNode;
  /** Where the open-in-new icon sits on the button. Default 'end'. */
  iconPosition?: 'start' | 'end';
  buttonSx?: Sx;
  /** Render null (instead of a fallback message) when the key is required but missing. */
  hideWhenKeyMissing?: boolean;
  /** Shown in place of the iframe when the key is required but missing. */
  missingKeyFallback?: ReactNode;
  allowFullScreen?: boolean;
  /** Root Box sx. Default { mt: 1.5 }. */
  sx?: Sx;
  /** Header Stack sx. Default { mb: 0.75 }. */
  stackSx?: Sx;
  stackSpacing?: number;
  /** iframe Box sx. Replaces the default frame styling entirely when given. */
  frameSx?: Sx;
}

const DEFAULT_FRAME_SX: Sx = {
  width: '100%',
  height: { xs: 240, sm: 280 },
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
};

const DEFAULT_MISSING_KEY_FALLBACK = (
  <Typography variant="body2" color="text.secondary">
    Add VITE_GOOGLE_MAP_API to preview the map here.
  </Typography>
);

/**
 * Read-only Google Maps embed preview card: heading + "Open in Maps" deep
 * link + embedded map iframe. Superset of the previous per-app copies
 * (admin/pod-form GoogleMapPreview, partners-app/mWeb VenueMapPreview,
 * mWeb LocationMapPreview) — see prop defaults above for the common style.
 */
export function MapEmbedCard({
  title = 'Map preview',
  parts = [],
  lat,
  lng,
  query,
  apiKey,
  keyless = false,
  zoom,
  heading,
  headingVariant = 'caption',
  headingColor = 'text.secondary',
  headingSx,
  buttonLabel = 'Open in Maps',
  iconPosition = 'end',
  buttonSx,
  hideWhenKeyMissing = false,
  missingKeyFallback = DEFAULT_MISSING_KEY_FALLBACK,
  allowFullScreen = true,
  sx,
  stackSx,
  stackSpacing,
  frameSx,
}: Readonly<MapEmbedCardProps>) {
  const resolvedQuery = query ?? buildMapQuery(parts, lat, lng);
  if (!resolvedQuery) return null;

  const keyMissing = !keyless && !apiKey;
  if (keyMissing && hideWhenKeyMissing) return null;

  let src = '';
  if (!keyMissing) {
    src = mapEmbedUrl(resolvedQuery, { apiKey: keyless ? undefined : apiKey, zoom });
  }
  const mapUrl = mapSearchUrl(resolvedQuery);

  const headingNode = heading ?? title;
  const icon = <OpenInNewIcon fontSize="small" />;

  return (
    <Box sx={sx ?? { mt: 1.5 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={stackSpacing}
        sx={stackSx ?? { mb: 0.75 }}
      >
        {typeof headingNode === 'string' ? (
          <Typography variant={headingVariant} color={headingColor} sx={headingSx}>
            {headingNode}
          </Typography>
        ) : (
          headingNode
        )}
        <Button
          size="small"
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          startIcon={iconPosition === 'start' ? icon : undefined}
          endIcon={iconPosition === 'end' ? icon : undefined}
          sx={buttonSx}
        >
          {buttonLabel}
        </Button>
      </Stack>
      {src ? (
        <Box
          component="iframe"
          title={title}
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen={allowFullScreen || undefined}
          sx={frameSx ?? DEFAULT_FRAME_SX}
        />
      ) : (
        missingKeyFallback
      )}
    </Box>
  );
}
