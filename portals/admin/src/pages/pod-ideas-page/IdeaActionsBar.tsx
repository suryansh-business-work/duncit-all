import { Button, DialogActions } from '@mui/material';
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
        <Button onClick={() => onSetStatus('PENDING')}>{t('admin.podIdeas.resetPending')}</Button>
      )}
      {status !== 'REJECTED' && (
        <Button color="warning" onClick={() => onSetStatus('REJECTED')}>
          {t('admin.podIdeas.reject')}
        </Button>
      )}
      {status !== 'APPROVED' && (
        <Button
          variant="contained"
          color="success"
          onClick={() => onSetStatus('APPROVED')}
        >
          {t('admin.podIdeas.approve')}
        </Button>
      )}
      <Button onClick={onClose}>Close</Button>
    </DialogActions>
  );
}
