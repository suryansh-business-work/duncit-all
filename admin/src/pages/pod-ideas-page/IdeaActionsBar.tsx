import { Button, DialogActions } from '@mui/material';

interface Props {
  status: string;
  onSetStatus: (next: string) => void;
  onClose: () => void;
}

export default function IdeaActionsBar({ status, onSetStatus, onClose }: Props) {
  return (
    <DialogActions>
      {status !== 'PENDING' && (
        <Button onClick={() => onSetStatus('PENDING')}>Reset to Pending</Button>
      )}
      {status !== 'REJECTED' && (
        <Button color="warning" onClick={() => onSetStatus('REJECTED')}>
          Reject
        </Button>
      )}
      {status !== 'APPROVED' && (
        <Button
          variant="contained"
          color="success"
          onClick={() => onSetStatus('APPROVED')}
        >
          Approve
        </Button>
      )}
      <Button onClick={onClose}>Close</Button>
    </DialogActions>
  );
}
