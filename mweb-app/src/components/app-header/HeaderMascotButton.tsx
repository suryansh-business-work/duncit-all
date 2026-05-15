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
import LottiePlayer from '../LottiePlayer';

interface BrandingMascot {
  mascot_name?: string | null;
  mascot_description_html?: string | null;
  mascot_lottie_url?: string | null;
}

interface Props {
  branding?: BrandingMascot | null;
}

export default function HeaderMascotButton({ branding }: Props) {
  const [open, setOpen] = useState(false);
  const lottieUrl = branding?.mascot_lottie_url || '/lotties/mascot.json';
  const name = branding?.mascot_name || 'Dunko';
  const html =
    branding?.mascot_description_html ||
    '<p><strong>Dunko</strong> is the mascot of this app — your friendly companion who guides you through pods, plans and celebrations.</p>';

  return (
    <>
      <Tooltip title={`Meet ${name}`}>
        <IconButton
          onClick={() => setOpen(true)}
          aria-label="About mascot"
          sx={{ p: 0.25, width: 44, height: 44 }}
        >
          <Box sx={{ width: 36, height: 36 }}>
            <LottiePlayer src={lottieUrl} />
          </Box>
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
            <Box sx={{ width: 200, height: 200 }}>
              <LottiePlayer src={lottieUrl} />
            </Box>
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            component="div"
            sx={{ '& p': { m: 0, mb: 1 } }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
