import { useState } from 'react';
import { Box, ButtonBase, Dialog, Link, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import { DuncitIconButton } from '@duncit/buttons';

export interface ImagePreviewProps {
  /** Remote image URL. */
  src: string;
  /** Accessible name and caption — e.g. "Passport photo". */
  label: string;
  /** Thumbnail edge length in px. Default 96. */
  size?: number;
}

const DEFAULT_SIZE = 96;

/**
 * A remote image as a square thumbnail that opens full-screen when clicked —
 * the KYC/document viewer every review dialog needs instead of an
 * "open in new tab" button that throws the reviewer out of the flow.
 *
 * A URL that fails to load degrades to a plain external link rather than a
 * blank box: these point at uploaded documents, which can 404 or be replaced
 * server-side long after the record was written (same reasoning as the
 * bundled-fallback icon rule).
 */
export function ImagePreview({ src, label, size = DEFAULT_SIZE }: Readonly<ImagePreviewProps>) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <Link
        href={src}
        target="_blank"
        rel="noreferrer"
        variant="body2"
        underline="hover"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}
      >
        <OpenInNewIcon fontSize="small" />
        {label}
      </Link>
    );
  }

  return (
    <Stack spacing={0.5} sx={{
      alignItems: "flex-start"
    }}>
      <ButtonBase
        onClick={() => setOpen(true)}
        aria-label={`Enlarge ${label}`}
        sx={{
          width: size,
          height: size,
          borderRadius: 1.5,
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
          position: 'relative',
          '&:hover .zoom-hint': { opacity: 1 },
        }}
      >
        <Box
          component="img"
          src={src}
          alt={label}
          onError={() => setBroken(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <Box
          className="zoom-hint"
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.45)',
            color: 'common.white',
            opacity: 0,
            transition: 'opacity 150ms',
          }}
        >
          <ZoomOutMapIcon fontSize="small" />
        </Box>
      </ButtonBase>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {label}
      </Typography>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: { sx: { bgcolor: 'common.black' } }
        }}
      >
        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', p: 1 }}>
          <DuncitIconButton
            onClick={() => setOpen(false)}
            aria-label={`Close ${label}`}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              color: 'common.white',
              bgcolor: 'rgba(0,0,0,0.45)',
            }}
          >
            <CloseIcon />
          </DuncitIconButton>
          <Box
            component="img"
            src={src}
            alt={label}
            sx={{ maxWidth: '100%', maxHeight: '82vh', objectFit: 'contain', display: 'block' }}
          />
        </Box>
      </Dialog>
    </Stack>
  );
}
