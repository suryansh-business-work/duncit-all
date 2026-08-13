import { Box, Stack, Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import type { AisensyTemplate } from '../queries';
import { bodySegments } from './helpers';

/**
 * The template as the recipient's WhatsApp will draw it: an incoming bubble on
 * the chat wallpaper, with the header, footer and buttons WhatsApp adds around
 * the body. The {{n}} variables stay visible and highlighted — this is the
 * shape of the message, not a filled-in send.
 */

/** A media header has no text to show, only its kind. */
const MEDIA_HEADERS = {
  IMAGE: { Icon: ImageIcon, label: 'Image header' },
  VIDEO: { Icon: VideocamIcon, label: 'Video header' },
  DOCUMENT: { Icon: DescriptionIcon, label: 'Document header' },
  LOCATION: { Icon: PlaceIcon, label: 'Location header' },
} as const;

/** WhatsApp's own colors — the sample is only recognisable in them. */
const WALLPAPER = { light: '#EFE7DE', dark: '#0B141A' };
const BUBBLE = { light: '#FFFFFF', dark: '#202C33' };
const BUTTON_INK = { light: '#027EB5', dark: '#53BDEB' };
const DIVIDER = { light: '#E9EDEF', dark: '#2A3942' };

function MediaHeader({ format }: Readonly<{ format: keyof typeof MEDIA_HEADERS }>) {
  const { Icon, label } = MEDIA_HEADERS[format];
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={0.5}
      sx={{
        height: 120,
        mb: 0.75,
        borderRadius: 1.5,
        color: 'text.secondary',
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#111B21' : '#F0F2F5'),
      }}
    >
      <Icon fontSize="large" />
      <Typography variant="caption">{label}</Typography>
    </Stack>
  );
}

function BubbleBody({ body }: Readonly<{ body: string }>) {
  return (
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {bodySegments(body).map((segment) => (
        <Box
          key={segment.id}
          component="span"
          sx={
            segment.variable
              ? {
                  px: 0.5,
                  borderRadius: 0.5,
                  fontWeight: 700,
                  bgcolor: 'action.selected',
                }
              : undefined
          }
        >
          {segment.text}
        </Box>
      ))}
    </Typography>
  );
}

function BubbleButton({ label }: Readonly<{ label: string }>) {
  return (
    <Box
      sx={{
        py: 1,
        textAlign: 'center',
        borderTop: '1px solid',
        borderColor: (theme) => DIVIDER[theme.palette.mode],
        color: (theme) => BUTTON_INK[theme.palette.mode],
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {label}
    </Box>
  );
}

export default function TemplateSample({ template }: Readonly<{ template: AisensyTemplate }>) {
  const mediaFormat =
    template.header_format in MEDIA_HEADERS
      ? (template.header_format as keyof typeof MEDIA_HEADERS)
      : null;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: (theme) => WALLPAPER[theme.palette.mode],
      }}
    >
      <Box
        sx={{
          maxWidth: 360,
          borderRadius: 2,
          borderTopLeftRadius: 0,
          overflow: 'hidden',
          boxShadow: 1,
          bgcolor: (theme) => BUBBLE[theme.palette.mode],
        }}
      >
        <Box sx={{ p: 1.25 }}>
          {mediaFormat && <MediaHeader format={mediaFormat} />}
          {template.header && (
            <Typography variant="body2" fontWeight={800} sx={{ mb: 0.5 }}>
              {template.header}
            </Typography>
          )}
          <BubbleBody body={template.body} />
          {template.footer && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
              {template.footer}
            </Typography>
          )}
        </Box>
        {template.buttons.map((label) => (
          <BubbleButton key={label} label={label} />
        ))}
      </Box>
    </Box>
  );
}
