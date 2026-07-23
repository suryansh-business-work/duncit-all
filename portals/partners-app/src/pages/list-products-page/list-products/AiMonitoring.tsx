import { useState } from 'react';
import {
  Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Fade, Stack,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const SCANNED_ITEMS = [
  { key: 'name', label: 'Product title', detail: 'checked for misleading, offensive or restricted wording.' },
  { key: 'descriptions', label: 'Variant descriptions', detail: 'checked against the community guidelines.' },
  { key: 'images', label: 'Variant images', detail: 'scanned for prohibited or unsafe content.' },
];

/** "AI monitoring" chip beside the submit row. Clicking it opens a dialog
 * explaining what the AI preflight scans before a listing is accepted. */
export function AiMonitoringChip() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Chip
        icon={<AutoAwesomeIcon />}
        label="AI monitoring"
        color="secondary"
        variant="outlined"
        onClick={() => setOpen(true)}
        data-testid="ai-monitoring-chip"
      />
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 900 }}>
          <AutoAwesomeIcon color="secondary" /> AI content check
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Every listing runs through an AI check before it is submitted, so only products that follow the
            community guidelines reach shoppers. The check reviews:
          </Typography>
          <Stack spacing={1.25}>
            {SCANNED_ITEMS.map((item) => (
              <Stack key={item.key} spacing={0.25} sx={{ p: 1.25, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Typography variant="body2" fontWeight={700}>{item.label}</Typography>
                <Typography variant="caption" color="text.secondary">{item.detail}</Typography>
              </Stack>
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            If something is flagged you'll see exactly what to fix and where — nothing is submitted until the
            listing passes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Got it</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

/** Animated inline state shown while the AI moderation preflight runs. */
export function AiCheckingIndicator({ visible }: Readonly<{ visible: boolean }>) {
  return (
    <Fade in={visible} unmountOnExit>
      <Stack
        direction="row"
        spacing={1.25}
        alignItems="center"
        data-testid="ai-checking-indicator"
        sx={{ p: 1.25, borderRadius: 2, bgcolor: 'action.hover' }}
      >
        <CircularProgress size={18} color="secondary" />
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{
            '@keyframes aiCheckPulse': { '0%': { opacity: 0.55 }, '50%': { opacity: 1 }, '100%': { opacity: 0.55 } },
            animation: 'aiCheckPulse 1.4s ease-in-out infinite',
          }}
        >
          AI is checking all your details…
        </Typography>
      </Stack>
    </Fade>
  );
}
