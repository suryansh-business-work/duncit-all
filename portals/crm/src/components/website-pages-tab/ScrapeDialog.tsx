import { useState } from 'react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { CRM_WEBSITE_SCRAPE_LIMIT } from '@duncit/utils';

interface Props {
  open: boolean;
  website: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: (limit: number) => void;
}

const { min: MIN, max: MAX, initial: INITIAL } = CRM_WEBSITE_SCRAPE_LIMIT;

/** Asks how many pages to discover, then triggers the scrape. */
export default function ScrapeDialog({ open, website, loading, onClose, onConfirm }: Readonly<Props>) {
  const { t } = useTranslation();
  const [value, setValue] = useState(String(INITIAL));
  const parsed = Number.parseInt(value, 10);
  const valid = Number.isFinite(parsed) && parsed >= MIN && parsed <= MAX;

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('crm.components.scrapeWebsitePages')}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              wordBreak: 'break-all'
            }}>
            {t('crm.websitePages.scrapeIntro', { vars: { website } })}
          </Typography>
          <TextField
            size="small"
            type="number"
            label={t('crm.components.maxPagesToDiscover')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            helperText={t('crm.websitePages.limitHint', { vars: { min: MIN, max: MAX } })}
            error={!!value && !valid}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- focus moves into the dialog the user just opened (WCAG 2.4.3)
            autoFocus
            fullWidth
            slotProps={{
              htmlInput: { min: MIN, max: MAX, inputMode: 'numeric' }
            }}
          />
          {!valid && !!value && <Alert severity="warning" sx={{ py: 0 }}>{t('crm.websitePages.limitInvalid', { vars: { min: MIN, max: MAX } })}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={loading}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton variant="contained" onClick={() => onConfirm(parsed)} disabled={!valid || loading}>
          {loading ? t('crm.websitePages.scraping') : t('crm.websitePages.scrape')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
