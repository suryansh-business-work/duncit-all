import { Box, Stack, Typography } from '@mui/material';
import type { WaMediaRef } from '@duncit/communication';
import type { AisensyButtonInput, AisensyTemplate } from '../queries';
import BubbleMedia, { mediaFormatOf } from './BubbleMedia';
import { bodySegments, filledButtonUrl } from './helpers';

/**
 * The template as the recipient's WhatsApp will draw it: an incoming bubble on
 * the chat wallpaper, with the header, footer and buttons WhatsApp adds around
 * the body.
 *
 * With no send values it is the SHAPE of the message — the {{n}} variables stay
 * visible and highlighted, which is what a catalogue row wants. A send form
 * hands it the values, the asset and the link fills, and the same bubble becomes
 * the message that is about to go out. One preview, because a second one is a
 * second thing that can disagree with what actually arrives.
 */

/** WhatsApp's own colors — the sample is only recognisable in them. */
const WALLPAPER = { light: '#EFE7DE', dark: '#0B141A' };
const BUBBLE = { light: '#FFFFFF', dark: '#202C33' };
const BUTTON_INK = { light: '#027EB5', dark: '#53BDEB' };
const DIVIDER = { light: '#E9EDEF', dark: '#2A3942' };

function BubbleBody({ body, params }: Readonly<{ body: string; params?: string[] }>) {
  return (
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {bodySegments(body, params).map((segment) => (
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

function BubbleButton({ label, link }: Readonly<{ label: string; link: string }>) {
  return (
    <Box
      sx={{
        py: 1,
        px: 1.25,
        textAlign: 'center',
        borderTop: '1px solid',
        borderColor: (theme) => DIVIDER[theme.palette.mode],
        color: (theme) => BUTTON_INK[theme.palette.mode],
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {label}
      {link && (
        <Typography variant="caption" color="text.secondary" display="block" noWrap>
          {link}
        </Typography>
      )}
    </Box>
  );
}

interface Props {
  template: AisensyTemplate;
  /** What the operator typed for each {{n}}; absent leaves the placeholders. */
  params?: string[];
  /** The header asset this send will carry, when one has been chosen. */
  media?: WaMediaRef;
  /** What fills each dynamic CTA link, by the button's position in cta_buttons. */
  buttons?: AisensyButtonInput[];
}

export default function TemplateSample({ template, params, media, buttons }: Readonly<Props>) {
  const mediaFormat = mediaFormatOf(template.header_format);

  /** The link under a button, drawn only where there is a {{n}} to fill — that
   * is the one an operator can get wrong. Matched on the label rather than on a
   * position, because `template.buttons` also carries the quick replies. */
  const linkFor = (label: string): string => {
    const at = template.cta_buttons.findIndex(
      (button) => button.text === label && button.url_param > 0
    );
    if (at < 0) return '';
    const button = template.cta_buttons[at];
    const value = buttons?.find((row) => row.index === at)?.value ?? '';
    return filledButtonUrl(button.url, button.url_param, value);
  };

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
          {mediaFormat && <BubbleMedia format={mediaFormat} media={media} />}
          {template.header && (
            <Typography variant="body2" fontWeight={800} sx={{ mb: 0.5 }}>
              {template.header}
            </Typography>
          )}
          <BubbleBody body={template.body} params={params} />
          {template.footer && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
              {template.footer}
            </Typography>
          )}
        </Box>
        <Stack>
          {template.buttons.map((label) => (
            <BubbleButton key={label} label={label} link={linkFor(label)} />
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
