import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

export default function UserDataReloadDialog({ open }: Readonly<{ open: boolean }>) {
  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogTitle>User data not loaded</DialogTitle>
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