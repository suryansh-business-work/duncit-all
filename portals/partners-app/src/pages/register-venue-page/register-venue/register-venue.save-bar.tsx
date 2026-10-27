import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import type { EditableSectionKey } from './useRegisterVenueForm';
import type { RegisterVenueMode } from './register-venue.types';

interface SaveBarProps {
  mode: RegisterVenueMode;
  active: EditableSectionKey | 'review';
  busy: boolean;
  onSave: () => void;
  onSaveApproved: () => void;
  onSubmit: () => void;
}

/** The venue form's one action for the section on show: save an approved
 * venue's edit, submit the application from Review, or save and move on. */
export default function SaveBar({ mode, active, busy, onSave, onSaveApproved, onSubmit }: Readonly<SaveBarProps>) {
  if (mode === 'edit-approved') {
    return (
      <DuncitButton
        variant="contained"
        size="large"
        startIcon={<SaveIcon />}
        disabled={busy}
        onClick={onSaveApproved}
        data-testid="register-venue-save-approved"
        sx={{ flex: 1, borderRadius: 1, fontWeight: 800 }}
      >
        Save changes
      </DuncitButton>
    );
  }
  if (active === 'review') {
    return (
      <DuncitButton
        variant="contained"
        size="large"
        endIcon={<SendIcon />}
        disabled={busy}
        onClick={onSubmit}
        data-testid="register-venue-submit"
        sx={{ flex: 1, borderRadius: 1, fontWeight: 800 }}
      >
        Submit for review
      </DuncitButton>
    );
  }
  return (
    <DuncitButton
      variant="contained"
      size="large"
      startIcon={<SaveIcon />}
      disabled={busy}
      onClick={onSave}
      data-testid="register-venue-save"
      sx={{ flex: 1, borderRadius: 1, fontWeight: 800 }}
    >
      Save & continue
    </DuncitButton>
  );
}
