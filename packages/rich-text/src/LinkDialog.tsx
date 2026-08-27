import { useEffect, useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  currentUrl: string;
  open: boolean;
  onApply: (url: string) => void;
  onClose: () => void;
}

const LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function isValidLink(value: string): boolean {
  try {
    return LINK_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function LinkDialog({ currentUrl, open, onApply, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(currentUrl);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUrl(currentUrl);
    setSubmitted(false);
  }, [currentUrl, open]);

  const valid = isValidLink(url.trim());
  const apply = () => {
    setSubmitted(true);
    if (valid) onApply(url.trim());
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('shell.richText.linkTitle')}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label={t('shell.richText.linkLabel')}
          value={url}
          error={submitted && !valid}
          helperText={t('shell.richText.linkHint')}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') apply();
          }}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.richText.cancel')}</DuncitButton>
        <DuncitButton variant="contained" onClick={apply}>
          {t('shell.richText.applyLink')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
