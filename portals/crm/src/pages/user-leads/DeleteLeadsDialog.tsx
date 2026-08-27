import { useMutation } from '@apollo/client';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { WA_DELETE_USER_LEADS } from '../tools/whatsapp/whatsappQueries';
import { useTranslation } from '@duncit/shell';

interface Props {
  /** Ids to delete; the dialog is open whenever this is non-empty. */
  ids: readonly string[];
  onClose: () => void;
  onDeleted: (count: number) => void;
}

/** Confirm + run a database delete of one or many user leads (MUI, no window.confirm). */
export default function DeleteLeadsDialog({ ids, onClose, onDeleted }: Readonly<Props>) {
  const { t } = useTranslation();
  const [del, { loading }] = useMutation(WA_DELETE_USER_LEADS);
  const count = ids.length;

  const run = async () => {
    const res = await del({ variables: { ids: [...ids] } });
    onDeleted(res.data?.waDeleteUserLeads ?? 0);
    onClose();
  };

  const noun = count === 1 ? 'this lead' : `these ${count} leads`;
  return (
    <Dialog open={count > 0} onClose={onClose}>
      <DialogTitle>Delete {count === 1 ? 'lead' : 'leads'}?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Permanently delete {noun} from the database. This cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={loading}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton color="error" variant="contained" onClick={run} disabled={loading}>
          {loading ? 'Deleting…' : t('shell.common.delete')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
