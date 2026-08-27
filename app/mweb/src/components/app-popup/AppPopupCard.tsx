import { Box, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';

export interface AppPopupCardProps {
  imageUrl: string;
  /** The art's own width/height ratio, so the card hugs the picture. */
  aspect: number;
  ctaLabel: string;
  showCta: boolean;
  closeLabel: string;
  showClose: boolean;
  /** Shown when the campaign turned the ✕ off — the backdrop still closes it. */
  closeHint: string;
  onClose: () => void;
  onCta: () => void;
  onImageLoad: (size: { width: number; height: number }) => void;
}

const CLOSE_SIZE = 34;

/**
 * The campaign card: the artwork, the ✕ floating over its top-right corner, and
 * a footer carrying the CTA. The Tamagui twin is
 * `app/mobile-app/src/components/AppPopup/AppPopupCard.tsx` (rule 27).
 *
 * The image fills the card's width at its own aspect, so the art meets the
 * card's edges on three sides with no letterbox bars — the dialog's width is
 * derived from that same ratio.
 */
export default function AppPopupCard({
  imageUrl,
  aspect,
  ctaLabel,
  showCta,
  closeLabel,
  showClose,
  closeHint,
  onClose,
  onCta,
  onImageLoad,
}: Readonly<AppPopupCardProps>) {
  const showHint = !showClose;
  return (
    <>
      <Box sx={{ position: 'relative', lineHeight: 0 }}>
        <Box
          component="img"
          src={imageUrl}
          alt=""
          onLoad={(event) =>
            onImageLoad({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            })
          }
          sx={{
            display: 'block',
            width: '100%',
            aspectRatio: String(aspect),
            // The box already matches the art's aspect, so `cover` fits exactly
            // and, unlike `contain`, cannot leave a hairline gap from rounding.
            objectFit: 'cover',
          }}
        />
        {showClose && (
          <DuncitIconButton
            aria-label={closeLabel}
            onClick={onClose}
            size="small"
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: CLOSE_SIZE,
              height: CLOSE_SIZE,
              bgcolor: 'rgba(0,0,0,0.55)',
              color: '#fff',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
            }}
          >
            <CloseIcon fontSize="small" />
          </DuncitIconButton>
        )}
      </Box>

      {(showCta || showHint) && (
        <Stack spacing={1} sx={{ p: 1.75 }}>
          {showCta && (
            <DuncitButton variant="contained" fullWidth onClick={onCta}>
              {ctaLabel}
            </DuncitButton>
          )}
          {showHint && (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                textAlign: "center"
              }}>
              {closeHint}
            </Typography>
          )}
        </Stack>
      )}
    </>
  );
}
