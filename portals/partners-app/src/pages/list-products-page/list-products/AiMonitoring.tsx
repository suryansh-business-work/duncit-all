import { useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { AiMonitorGlyph, AiMonitorPill, AiProcessingInline } from '@duncit/ai-monitoring/mui';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

const scannedItems = (t: Translate) => [
  {
    key: 'name',
    label: t('partners.listProductsPage.productTitle'),
    detail: t('partners.listProductsPage.aiCheckNameDetail'),
  },
  {
    key: 'descriptions',
    label: t('partners.listProductsPage.variantDescriptions'),
    detail: t('partners.listProductsPage.aiCheckDescriptionsDetail'),
  },
  {
    key: 'images',
    label: t('partners.listProductsPage.variantImages'),
    detail: t('partners.listProductsPage.aiCheckImagesDetail'),
  },
];

/** "AI monitoring" pill beside the submit row. Clicking it opens a dialog
 * explaining what the AI preflight scans before a listing is accepted.
 *
 * The pill and the dialog's badge are `@duncit/ai-monitoring/mui`'s, so this
 * check shimmers and breathes exactly like the one on a pod row and the one
 * beside an upload field — one AI affordance, not a third look for products. */
export function AiMonitoringChip() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <AiMonitorPill
        label={t('partners.listProductsPage.aiMonitoring')}
        ariaLabel={t('partners.listProductsPage.aiCheckTitle')}
        onClick={() => setOpen(true)}
        testId="ai-monitoring-chip"
      />
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 900 }}>
          <AiMonitorGlyph size={26} /> {t('partners.listProductsPage.aiCheckTitle')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
            {t('partners.listProductsPage.aiCheckIntro')}
          </Typography>
          <Stack spacing={1.25}>
            {scannedItems(t).map((item) => (
              <Stack
                key={item.key}
                spacing={0.25}
                sx={{ p: 1.25, borderRadius: 2, bgcolor: 'action.hover' }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {item.label}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {item.detail}
                </Typography>
              </Stack>
            ))}
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5 }}>
            {t('partners.listProductsPage.aiCheckFootnote')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={() => setOpen(false)}>
            {t('partners.listProductsPage.gotIt')}
          </DuncitButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

/** The wait while the AI moderation preflight reads the listing — the same
 * badge and rings as the Create Pod overlay, at a line's height, because it
 * happens in place rather than over the page. */
export function AiCheckingIndicator({ visible }: Readonly<{ visible: boolean }>) {
  const { t } = useTranslation();
  return (
    <AiProcessingInline
      visible={visible}
      label={t('partners.listProductsPage.aiChecking')}
      testId="ai-checking-indicator"
    />
  );
}
