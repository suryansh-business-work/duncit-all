import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
} from '@mui/material';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import { WA_CLEAN_DATA } from '../tools/whatsapp/whatsappQueries';

/** Database-level cleanup: drops invalid-phone records + de-duplicates leads. */
export default function CleanDataButton({ onCleaned }: Readonly<{ onCleaned: () => void }>) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [clean, { loading }] = useMutation(WA_CLEAN_DATA);

  const run = async () => {
    setOpen(false);
    const res = await clean().catch(() => null);
    const r = res?.data?.waCleanData;
    if (r) {
      setToast(
        `Cleaned: ${r.removed_invalid} invalid + ${r.removed_duplicates} duplicate leads removed · ${r.remaining} remain.`
      );
      onCleaned();
    }
  };

  return (
    <>
      <Button
        size="small"
        color="warning"
        startIcon={<CleaningServicesIcon />}
        disabled={loading}
        onClick={() => setOpen(true)}
      >
        {loading ? 'Cleaning…' : 'Clean'}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Clean lead data?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Removes leads and contacts with invalid phone numbers (regex-validated) and collapses
            duplicates by phone, keeping the earliest. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button color="warning" variant="contained" onClick={run}>
            Clean now
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!toast} autoHideDuration={6000} onClose={() => setToast('')} message={toast} />
    </>
  );
}
