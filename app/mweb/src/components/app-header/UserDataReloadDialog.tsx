import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';

export default function UserDataReloadDialog({ open }: Readonly<{ open: boolean }>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogTitle>{t('mweb.appHeader.userDataNotLoaded')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Please reload the application so your latest account data can load correctly.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={() => globalThis.window.location.reload()}>
          Reload application
        </Button>
      </DialogActions>
    </Dialog>
  );
}