import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

export default function UserDataReloadDialog({ open }: Readonly<{ open: boolean }>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogTitle>{t('mweb.appHeader.userDataNotLoaded')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Please reload the application so your latest account data can load correctly.
        </Typography>
      </DialogContent>
      <DialogActions>
        <DuncitButton variant="contained" onClick={() => globalThis.window.location.reload()}>
          Reload application
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}