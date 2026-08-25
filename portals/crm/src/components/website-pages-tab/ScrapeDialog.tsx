import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from '@duncit/shell';

interface Props {
  open: boolean;
  website: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: (limit: number) => void;
}

const MIN = 1;
const MAX = 200;

/** Asks how many pages to discover, then triggers the scrape. */
export default function ScrapeDialog({ open, website, loading, onClose, onConfirm }: Readonly<Props>) {
  const { t } = useTranslation();
  const [value, setValue] = useState('20');
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
            Discovers pages from <strong>{website}</strong> (sitemap first, then homepage links) and saves them.
          </Typography>
          <TextField
            size="small"
            type="number"
            label={t('crm.components.maxPagesToDiscover')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            helperText={`Between ${MIN} and ${MAX}.`}
            error={!!value && !valid}
            autoFocus
            fullWidth
            slotProps={{
              htmlInput: { min: MIN, max: MAX, inputMode: 'numeric' }
            }}
          />
          {!valid && !!value && <Alert severity="warning" sx={{ py: 0 }}>Enter a number from {MIN} to {MAX}.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>{t('shell.common.cancel')}</Button>
        <Button variant="contained" onClick={() => onConfirm(parsed)} disabled={!valid || loading}>
          {loading ? 'Scraping…' : 'Scrape pages'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
