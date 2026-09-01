import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { buildUsernameLabels, normalizeUsername, type ContactSnapshot } from '@duncit/utils';
import {
  AccountEditForm,
  accountEditDefaults,
  toUpdateProfileInput,
  type AccountEditValues,
} from './account-edit';
import { SET_MY_USERNAME } from './username-field';
import { useUnsavedGuard } from './useUnsavedGuard';
import { useTranslation } from '../../i18n/useTranslation';

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
  /** Email, phone and WhatsApp as the account holds them — read-only rows. */
  contacts: ContactSnapshot;
  onSaved: () => void;
}

export default function EditAccountDialog({
  open,
  onClose,
  initial,
  contacts,
  onSaved,
}: Readonly<EditAccountDialogProps>) {
  const { t } = useTranslation();
  const [updateProfile, { loading, error }] = useMutation<any>(UPDATE_PROFILE);
  const [setUsername, { loading: renaming, error: renameError }] = useMutation<any>(SET_MY_USERNAME);
  const guard = useUnsavedGuard(onClose);
  // A refused rename is reported in the app's own words: the server's sentence
  // is English-only, and the only thing the reader can act on is "pick another".
  const saveError = renameError ? buildUsernameLabels(t).saveFailed : (error?.message ?? null);

  const handleSubmit = async (values: AccountEditValues) => {
    // The handle goes FIRST and on its own mutation: it is the only field the
    // server can still refuse after the field said yes (somebody can take it in
    // the 400ms between the check and the tap), and a refusal there must leave
    // the rest of the profile untouched rather than half-written.
    // A refusal is swallowed rather than rethrown, because the form would then
    // render the server's raw sentence over the localized one `saveError` picks.
    const handle = normalizeUsername(values.username);
    if (handle && handle !== normalizeUsername(initial.username)) {
      const renamed = await setUsername({ variables: { username: handle } }).then(
        () => true,
        () => false,
      );
      if (!renamed) return;
    }
    await updateProfile({ variables: { input: toUpdateProfileInput(values) } });
    onSaved();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={guard.requestClose} fullWidth maxWidth="sm">
        <DialogTitle>{t('mweb.account.editProfile')}</DialogTitle>
        <DialogContent dividers>
          <AccountEditForm
            defaultValues={accountEditDefaults(initial)}
            contacts={contacts}
            loading={loading || renaming}
            errorMessage={saveError}
            onSubmit={handleSubmit}
            onDirtyChange={guard.setDirty}
            onRegisterReset={guard.registerReset}
            // A proved contact change is already stored, so the account behind
            // this dialog is refreshed the moment it lands rather than waiting
            // for a Save that will not carry it.
            onContactChanged={onSaved}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={guard.confirmOpen} onClose={guard.cancelDiscard} data-testid="discard-confirm">
        <DialogTitle>{t('mweb.account.discardUnsavedChanges')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved changes. Closing now will lose them.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={guard.cancelDiscard} data-testid="discard-cancel">
            Keep editing
          </DuncitButton>
          <DuncitButton onClick={guard.confirmDiscard} color="error" data-testid="discard-confirm-yes">
            Discard
          </DuncitButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
