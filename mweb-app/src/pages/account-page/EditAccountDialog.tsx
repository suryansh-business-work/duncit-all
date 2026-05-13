import { gql, useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useFormik } from 'formik';
import { useEffect } from 'react';
import {
  accountEditInitialValues,
  accountEditSchema,
  toUpdateProfileInput,
  type AccountEditValues,
} from './account-edit.form';

const UPDATE_PROFILE = gql`
  mutation UpdateMyProfileFull($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      user_id
      first_name
      last_name
      bio
      city
      zone
      country
      phone_number
      phone_extension
      whatsapp_number
      whatsapp_extension
      dob
    }
  }
`;

export interface EditAccountDialogProps {
  open: boolean;
  onClose: () => void;
  initial: Partial<AccountEditValues>;
  onSaved: () => void;
}

export default function EditAccountDialog({ open, onClose, initial, onSaved }: EditAccountDialogProps) {
  const [updateProfile, { loading }] = useMutation(UPDATE_PROFILE);

  const formik = useFormik<AccountEditValues>({
    initialValues: accountEditInitialValues(initial),
    validationSchema: accountEditSchema,
    enableReinitialize: true,
    validateOnBlur: true,
    validateOnChange: true,
    onSubmit: async (values, { setStatus }) => {
      setStatus(undefined);
      try {
        await updateProfile({ variables: { input: toUpdateProfileInput(values) } });
        onSaved();
        onClose();
      } catch (error: any) {
        setStatus(error?.message || 'Could not save profile');
      }
    },
  });

  useEffect(() => {
    if (!open) formik.setStatus(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const f = (name: keyof AccountEditValues) => {
    const value = (formik.values as any)[name] ?? '';
    const error = (formik.errors as any)[name];
    const showError = Boolean(error && ((formik.touched as any)[name] || String(value).length > 0));
    return {
      name,
      value,
      onChange: formik.handleChange,
      onBlur: formik.handleBlur,
      error: showError,
      helperText: showError ? error : ' ',
      fullWidth: true,
      size: 'small' as const,
    };
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit profile</DialogTitle>
      <form onSubmit={formik.handleSubmit} noValidate>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            {formik.status && <Alert severity="error">{formik.status}</Alert>}
            <Stack direction="row" spacing={1}>
              <TextField label="First name" {...f('first_name')} />
              <TextField label="Last name" {...f('last_name')} />
            </Stack>
            <TextField label="Bio" {...f('bio')} multiline minRows={2} />
            <Stack direction="row" spacing={1}>
              <TextField label="City" {...f('city')} />
              <TextField label="Zone" {...f('zone')} />
            </Stack>
            <TextField label="Country" {...f('country')} />
            <Stack direction="row" spacing={1}>
              <TextField label="Phone code" {...f('phone_extension')} sx={{ maxWidth: 110 }} />
              <TextField label="Phone number" {...f('phone_number')} />
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField label="WhatsApp code" {...f('whatsapp_extension')} sx={{ maxWidth: 110 }} />
              <TextField label="WhatsApp number" {...f('whatsapp_number')} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
