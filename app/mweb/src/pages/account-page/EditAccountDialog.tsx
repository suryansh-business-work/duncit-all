import { gql, useMutation } from '@apollo/client';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import {
  AccountEditForm,
  accountEditDefaults,
  toUpdateProfileInput,
  type AccountEditValues,
} from './account-edit';
import { useUnsavedGuard } from './useUnsavedGuard';

const UPDATE_PROFILE = gql`
  mutation UpdateMyProfileFull($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      user_id
      first_name
      last_name
      bio
      city
      state
      country
      phone_number
      phone_extension
      whatsapp_number
      whatsapp_extension
      dob
      address {
        line1
        line2
        landmark
        city
        state
        pincode
        country
      }
    }
  }
`;

export interface EditAccountDialogProps {
  open: boolean;
  onClose: () => void;
  initial: Partial<AccountEditValues>;
  onSaved: () => void;
}

export default function EditAccountDialog({ open, onClose, initial, onSaved }: Readonly<EditAccountDialogProps>) {
  const [updateProfile, { loading, error }] = useMutation(UPDATE_PROFILE);
  const guard = useUnsavedGuard(onClose);

  const handleSubmit = async (values: AccountEditValues) => {
    await updateProfile({ variables: { input: toUpdateProfileInput(values) } });
    onSaved();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={guard.requestClose} fullWidth maxWidth="sm">
        <DialogTitle>Edit profile</DialogTitle>
        <DialogContent dividers>
          <AccountEditForm
            defaultValues={accountEditDefaults(initial)}
            loading={loading}
            errorMessage={error?.message ?? null}
            onSubmit={handleSubmit}
            onDirtyChange={guard.setDirty}
            onRegisterReset={guard.registerReset}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={guard.confirmOpen} onClose={guard.cancelDiscard} data-testid="discard-confirm">
        <DialogTitle>Discard unsaved changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved changes. Closing now will lose them.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={guard.cancelDiscard} data-testid="discard-cancel">
            Keep editing
          </Button>
          <Button onClick={guard.confirmDiscard} color="error" data-testid="discard-confirm-yes">
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
