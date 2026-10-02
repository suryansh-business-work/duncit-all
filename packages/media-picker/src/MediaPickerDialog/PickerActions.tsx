import { CircularProgress, DialogActions } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

interface PickerActionsProps {
  /** Whether the finishing button is offered at all. */
  showDone: boolean;
  uploading: boolean;
  pickCount: number;
  buttonLabel: string;
  onCancel: () => void;
  onDone: () => Promise<void>;
}

/** Cancel, and the one button that finishes the pick. */
export default function PickerActions({
  showDone,
  uploading,
  pickCount,
  buttonLabel,
  onCancel,
  onDone,
}: Readonly<PickerActionsProps>) {
  return (
    <DialogActions>
      <DuncitButton onClick={onCancel} disabled={uploading} data-testid="media-picker-cancel">
        Cancel
      </DuncitButton>
      {showDone && (
        <DuncitButton
          data-testid="media-picker-done"
          variant="contained"
          onClick={onDone}
          disabled={pickCount === 0 || uploading}
          startIcon={uploading ? <CircularProgress size={16} /> : undefined}
        >
          {buttonLabel}
        </DuncitButton>
      )}
    </DialogActions>
  );
}
