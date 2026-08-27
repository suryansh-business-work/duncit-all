import { DialogActions } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  status: string;
  onSetStatus: (next: string) => void;
  onClose: () => void;
}

export default function IdeaActionsBar({ status, onSetStatus, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <DialogActions>
      {status !== 'PENDING' && (
        <DuncitButton onClick={() => onSetStatus('PENDING')}>{t('admin.podIdeas.resetPending')}</DuncitButton>
      )}
      {status !== 'REJECTED' && (
        <DuncitButton color="warning" onClick={() => onSetStatus('REJECTED')}>
          {t('admin.podIdeas.reject')}
        </DuncitButton>
      )}
      {status !== 'APPROVED' && (
        <DuncitButton
          variant="contained"
          color="success"
          onClick={() => onSetStatus('APPROVED')}
        >
          {t('admin.podIdeas.approve')}
        </DuncitButton>
      )}
      <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
    </DialogActions>
  );
}
