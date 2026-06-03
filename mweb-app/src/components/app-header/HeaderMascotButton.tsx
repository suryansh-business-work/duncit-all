import { useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface BrandingMascot {
  mascot_name?: string | null;
  mascot_description_html?: string | null;
  mascot_image_url?: string | null;
}

interface Props {
  branding?: BrandingMascot | null;
}

/** Mascot is an uploaded image (branding.mascot_image_url) — no longer a Lottie. */
export default function HeaderMascotButton({ branding }: Props) {
  const [open, setOpen] = useState(false);
  const imageUrl = branding?.mascot_image_url;
  const name = branding?.mascot_name || 'Duncit';
  const html = branding?.mascot_description_html || '';

  if (!imageUrl) return null;

  return (
    <>
      <Tooltip title={`Meet ${name}`}>
        <IconButton
          onClick={() => setOpen(true)}
          aria-label="About mascot"
          sx={{ p: 0.25, width: 44, height: 44 }}
        >
          <Box
            component="img"
            src={imageUrl}
            alt={name}
            sx={{ width: 36, height: 36, objectFit: 'contain' }}
          />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
          Meet {name}
          <IconButton
            aria-label="close"
            onClick={() => setOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              width: '100%',
              height: 220,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'action.hover',
              borderRadius: 3,
              mb: 2,
            }}
          >
            <Box
              component="img"
              src={imageUrl}
              alt={name}
              sx={{ maxWidth: 200, maxHeight: 200, objectFit: 'contain' }}
            />
          </Box>
          {html && (
            <Typography
              variant="body2"
              color="text.secondary"
              component="div"
              sx={{ '& p': { m: 0, mb: 1 } }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
