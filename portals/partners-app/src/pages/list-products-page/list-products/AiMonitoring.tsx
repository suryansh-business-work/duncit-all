import { useState } from 'react';
import { Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Fade, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

const scannedItems = (t: Translate) =>[
  { key: 'name', label: t('partners.listProductsPage.productTitle'), detail: 'checked for misleading, offensive or restricted wording.' },
  { key: 'descriptions', label: t('partners.listProductsPage.variantDescriptions'), detail: 'checked against the community guidelines.' },
  { key: 'images', label: t('partners.listProductsPage.variantImages'), detail: 'scanned for prohibited or unsafe content.' },
];

/** "AI monitoring" chip beside the submit row. Clicking it opens a dialog
 * explaining what the AI preflight scans before a listing is accepted. */
export function AiMonitoringChip() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Chip
        icon={<AutoAwesomeIcon />}
        label={t('partners.listProductsPage.aiMonitoring')}
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
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mb: 1.5
            }}>
            Every listing runs through an AI check before it is submitted, so only products that follow the
            community guidelines reach shoppers. The check reviews:
          </Typography>
          <Stack spacing={1.25}>
            {scannedItems(t).map((item) => (
              <Stack key={item.key} spacing={0.25} sx={{ p: 1.25, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Typography variant="body2" sx={{
                  fontWeight: 700
                }}>{item.label}</Typography>
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>{item.detail}</Typography>
              </Stack>
            ))}
          </Stack>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: 'block',
              mt: 1.5
            }}>
            If something is flagged you'll see exactly what to fix and where — nothing is submitted until the
            listing passes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={() => setOpen(false)}>{t('partners.listProductsPage.gotIt')}</DuncitButton>
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
        data-testid="ai-checking-indicator"
        sx={{
          alignItems: "center",
          p: 1.25,
          borderRadius: 2,
          bgcolor: 'action.hover'
        }}>
        <CircularProgress size={18} color="secondary" />
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            '@keyframes aiCheckPulse': { '0%': { opacity: 0.55 }, '50%': { opacity: 1 }, '100%': { opacity: 0.55 } },
            animation: 'aiCheckPulse 1.4s ease-in-out infinite'
          }}>
          AI is checking all your details…
        </Typography>
      </Stack>
    </Fade>
  );
}
