import { DialogActions } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  /** A save is in flight: the submit spins and Cancel waits for it. */
  submitting: boolean;
  onCancel: () => void;
  saveTestId?: string;
}

/** Cancel + Save at the foot of a Support dialog form; Save is the form's submit. */
export default function FormDialogActions({ submitting, onCancel, saveTestId }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <DialogActions sx={{ px: 0, pt: 3 }}>
      <DuncitButton onClick={onCancel} disabled={submitting}>{t('shell.common.cancel')}</DuncitButton>
      <DuncitButton type="submit" variant="contained" loading={submitting} data-testid={saveTestId}>{t('shell.common.save')}</DuncitButton>
    </DialogActions>
  );
}
