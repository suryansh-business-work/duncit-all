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
import * as yup from 'yup';

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

const phoneRegex = /^[0-9]{6,15}$/;
const extRegex = /^\+?[0-9]{1,4}$/;

const schema = yup.object({
  first_name: yup.string().trim().min(1, 'Required').max(60).required('Required'),
  last_name: yup.string().trim().max(60).default(''),
  bio: yup.string().trim().max(500).default(''),
  city: yup.string().trim().max(80).default(''),
  zone: yup.string().trim().max(80).default(''),
  country: yup.string().trim().max(80).default(''),
  phone_extension: yup
    .string()
    .trim()
    .matches(extRegex, 'Invalid extension')
    .required('Required'),
  phone_number: yup
    .string()
    .trim()
    .matches(phoneRegex, 'Digits only (6-15)')
    .required('Required'),
  whatsapp_extension: yup
    .string()
    .trim()
    .when('whatsapp_number', {
      is: (v: string) => !!v,
      then: (s) => s.matches(extRegex, 'Invalid extension').required('Required'),
      otherwise: (s) => s.notRequired(),
    }),
  whatsapp_number: yup
    .string()
    .trim()
    .matches(/^$|^[0-9]{6,15}$/, 'Digits only (6-15)')
    .default(''),
});

type Values = yup.InferType<typeof schema>;

export interface EditAccountDialogProps {
  open: boolean;
  onClose: () => void;
  initial: Partial<Values>;
  onSaved: () => void;
}

export default function EditAccountDialog({ open, onClose, initial, onSaved }: EditAccountDialogProps) {
  const [updateProfile, { loading }] = useMutation(UPDATE_PROFILE);

  const formik = useFormik<Values>({
    initialValues: {
      first_name: '',
      last_name: '',
      bio: '',
      city: '',
      zone: '',
      country: '',
      phone_extension: '+91',
      phone_number: '',
      whatsapp_extension: '+91',
      whatsapp_number: '',
      ...initial,
    } as Values,
    validationSchema: schema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      await updateProfile({ variables: { input: values } });
      onSaved();
      onClose();
    },
  });

  useEffect(() => {
    if (!open) formik.setStatus(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const f = (name: keyof Values) => ({
    name,
    value: (formik.values as any)[name] ?? '',
    onChange: formik.handleChange,
    onBlur: formik.handleBlur,
    error: Boolean((formik.touched as any)[name] && (formik.errors as any)[name]),
    helperText: ((formik.touched as any)[name] && (formik.errors as any)[name]) || ' ',
    fullWidth: true,
    size: 'small' as const,
  });

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
