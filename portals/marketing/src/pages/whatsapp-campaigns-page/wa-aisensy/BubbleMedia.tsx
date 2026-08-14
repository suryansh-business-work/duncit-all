import { Box, Chip, Stack, Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import type { WaMediaRef } from '@duncit/communication';

/**
 * The asset above the message.
 *
 * With no asset chosen it is the placeholder a catalogue row shows: the kind of
 * header, which is all a template can say. With one, it is the asset itself —
 * and an image that will not load here is the operator's first sign that the
 * URL is not publicly reachable, which is the send's most common failure.
 */

/** AiSensy says FILE where WhatsApp draws a DOCUMENT; both land on the same
 * placeholder. LOCATION carries no asset but still occupies the header. */
const MEDIA_HEADERS = {
  IMAGE: { Icon: ImageIcon, label: 'Image header' },
  VIDEO: { Icon: VideocamIcon, label: 'Video header' },
  FILE: { Icon: DescriptionIcon, label: 'Document header' },
  DOCUMENT: { Icon: DescriptionIcon, label: 'Document header' },
  LOCATION: { Icon: PlaceIcon, label: 'Location header' },
} as const;

export type MediaFormat = keyof typeof MEDIA_HEADERS;

export const mediaFormatOf = (headerFormat: string): MediaFormat | null =>
  headerFormat in MEDIA_HEADERS ? (headerFormat as MediaFormat) : null;

/** A URL that ends in a picture, ignoring whatever query a CDN appends. */
const IMAGE_EXTENSION = /\.(?:jpe?g|png|gif|webp|bmp|avif)$/i;

const looksLikeImage = (url: string, format: MediaFormat) =>
  format === 'IMAGE' || IMAGE_EXTENSION.test(url.split('?')[0] ?? '');

const PLACEHOLDER_SX = {
  height: 120,
  mb: 0.75,
  borderRadius: 1.5,
  color: 'text.secondary',
} as const;

interface Props {
  format: MediaFormat;
  /** The asset this send will carry; absent draws the kind alone. */
  media?: WaMediaRef;
}

export default function BubbleMedia({ format, media }: Readonly<Props>) {
  const { Icon, label } = MEDIA_HEADERS[format];
  const url = media?.url ?? '';

  if (url && looksLikeImage(url, format)) {
    return (
      <Box
        component="img"
        src={url}
        alt={media?.filename || label}
        sx={{
          display: 'block',
          width: '100%',
          maxHeight: 220,
          objectFit: 'cover',
          borderRadius: 1.5,
          mb: 0.75,
        }}
      />
    );
  }

  if (url) {
    return (
      <Box sx={{ mb: 0.75 }}>
        <Chip
          icon={<Icon fontSize="small" />}
          label={media?.filename || url}
          size="small"
          sx={{ maxWidth: '100%' }}
        />
      </Box>
    );
  }

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={0.5}
      sx={{
        ...PLACEHOLDER_SX,
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#111B21' : '#F0F2F5'),
      }}
    >
      <Icon fontSize="large" />
      <Typography variant="caption">{label}</Typography>
    </Stack>
  );
}
