import { Alert, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  firstName: string;
  lastName: string;
  onFirstName: (value: string) => void;
  onLastName: (value: string) => void;
  loading: boolean;
  /** The save mutation's own error — what renders the failure. */
  error?: Readonly<{ message: string }> | null;
  onSubmit: () => void;
  onCancel: () => void;
}

/** The two name fields, the failure a save came back with, and Save / Cancel. */
export function ProfileEditForm({
  firstName,
  lastName,
  onFirstName,
  onLastName,
  loading,
  error,
  onSubmit,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <TextField label={t('shell.profile.firstName')} value={firstName} onChange={(e) => onFirstName(e.target.value)} fullWidth size="small" slotProps={{ htmlInput: { 'data-testid': 'field-first_name' } }} />
      <TextField label={t('shell.profile.lastName')} value={lastName} onChange={(e) => onLastName(e.target.value)} fullWidth size="small" slotProps={{ htmlInput: { 'data-testid': 'field-last_name' } }} />
      {error && <Alert data-testid="account-edit-error" severity="error">{error.message}</Alert>}
      <Stack direction="row" spacing={1.5}>
        <DuncitButton data-testid="account-edit-submit" variant="contained" onClick={onSubmit} disabled={loading} sx={{ borderRadius: 999, fontWeight: 800 }}>
          {loading ? 'Saving…' : 'Save changes'}
        </DuncitButton>
        <DuncitButton onClick={onCancel} disabled={loading} sx={{ borderRadius: 999, fontWeight: 800 }}>
          Cancel
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
