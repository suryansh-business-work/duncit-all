import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

interface Props {
  loading?: boolean;
  /** Whether there is anything to discard. */
  canDiscard: boolean;
  /** Whether the form is valid, changed and unblocked. */
  canSave: boolean;
  onDiscard: () => void;
}

/**
 * The foot of the edit-profile form: a soft Discard beside the green Save
 * pill, both a full touch target. Save is the form's `type="submit"`.
 */
export default function AccountEditActions({ loading, canDiscard, canSave, onDiscard }: Readonly<Props>) {
  return (
    <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
      <DuncitButton
        type="button"
        color="inherit"
        size="large"
        onClick={onDiscard}
        disabled={loading || !canDiscard}
        data-testid="account-edit-discard"
        sx={{ flex: 1, px: 1.5, bgcolor: 'action.hover' }}
      >
        Discard changes
      </DuncitButton>
      <DuncitButton
        type="submit"
        variant="contained"
        size="large"
        disabled={loading || !canSave}
        sx={{ flex: 1, px: 1.5 }}
      >
        {loading ? 'Saving…' : 'Save'}
      </DuncitButton>
    </Stack>
  );
}
