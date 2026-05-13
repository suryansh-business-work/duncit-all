import { useRef, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Autocomplete,
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Form, Formik, getIn, type FormikErrors, type FormikTouched } from 'formik';
import MediaPickerField from './MediaPickerField';
import {
  hostCreateInitialValues,
  hostCreateSchema,
  toHostCreateVariables,
  type HostCreateValues,
} from '../forms/host.form';

const USERS = gql`
  query UsersForHostCreate {
    users {
      user_id
      full_name
      email
      phone_number
    }
  }
`;

const ADMIN_CREATE_HOST = gql`
  mutation AdminCreateHost(
    $target_user_id: ID!
    $step1: HostStep1Input!
    $step2: HostStep2Input!
    $step3: HostStep3Input!
    $submit: Boolean
  ) {
    adminCreateHost(
      target_user_id: $target_user_id
      step1: $step1
      step2: $step2
      step3: $step3
      submit: $submit
    ) {
      id
      status
    }
  }
`;

const showError = (
  values: HostCreateValues,
  errors: FormikErrors<HostCreateValues>,
  touched: FormikTouched<HostCreateValues>,
  submitCount: number,
  name: string
) => {
  const value = getIn(values, name);
  const hasValue = Array.isArray(value) ? value.length > 0 : String(value ?? '').length > 0;
  return Boolean(getIn(errors, name) && (submitCount > 0 || getIn(touched, name) || hasValue));
};

export default function AdminHostCreateDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: usersData } = useQuery(USERS, { skip: !open });
  const [error, setError] = useState('');
  const submitForReviewRef = useRef(false);
  const [submitHost, { loading }] = useMutation(ADMIN_CREATE_HOST);

  const close = () => {
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : close} fullWidth maxWidth="sm">
      <Formik<HostCreateValues>
        initialValues={hostCreateInitialValues}
        validationSchema={hostCreateSchema}
        validateOnBlur
        validateOnChange
        onSubmit={async (values, { resetForm }) => {
          setError('');
          try {
            await submitHost({ variables: toHostCreateVariables(values, submitForReviewRef.current) });
            onSaved();
            resetForm();
            close();
          } catch (err: any) {
            setError(err?.message || 'Failed to create host');
          }
        }}
      >
        {({ values, errors, touched, submitCount, handleBlur, handleChange, resetForm, setFieldValue, submitForm }) => {
          const users = usersData?.users ?? [];
          const selectedUser = users.find((user: any) => user.user_id === values.target_user_id) ?? null;
          const hasError = (name: string) => showError(values, errors, touched, submitCount, name);
          const props = (name: string) => ({
            name,
            value: getIn(values, name) ?? '',
            onChange: handleChange,
            onBlur: handleBlur,
            error: hasError(name),
            helperText: hasError(name) ? getIn(errors, name) : ' ',
            fullWidth: true,
            size: 'small' as const,
          });
          const submitWithMode = (submitForReview: boolean) => {
            submitForReviewRef.current = submitForReview;
            submitForm();
          };
          return (
            <Form noValidate>
              <DialogTitle>Create Host (on behalf)</DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  {error && <Alert severity="error">{error}</Alert>}
                  <Autocomplete
                    options={users}
                    getOptionLabel={(option: any) => `${option.full_name} · ${option.email || option.phone_number || ''}`}
                    value={selectedUser}
                    onChange={(_, value) => setFieldValue('target_user_id', value?.user_id ?? '')}
                    renderInput={(params) => <TextField {...params} label="User" size="small" error={hasError('target_user_id')} helperText={hasError('target_user_id') ? errors.target_user_id : ' '} required />}
                  />
                  <Typography variant="subtitle2">Personal</Typography>
                  <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                    <TextField label="Full name" required {...props('step1.full_name')} />
                    <TextField label="Email" type="email" required {...props('step1.email')} />
                    <TextField label="Phone" required {...props('step1.phone')} />
                    <TextField label="DOB" type="date" InputLabelProps={{ shrink: true }} {...props('step1.dob')} />
                  </Box>
                  <Typography variant="subtitle2">Identity</Typography>
                  <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                    <TextField label="Aadhar number" required {...props('step2.aadhar_number')} />
                    <TextField label="PAN number" required {...props('step2.pan_number')} />
                  </Box>
                  <MediaPickerField label="Passport photo" value={values.step2.passport_photo_url} onChange={(url) => setFieldValue('step2.passport_photo_url', url)} helperText={hasError('step2.passport_photo_url') ? getIn(errors, 'step2.passport_photo_url') : ' '} folder="/hosts/photo" required />
                  <Typography variant="subtitle2">Verification</Typography>
                  <MediaPickerField label="Police verification document" value={values.step3.police_verification_url} onChange={(url) => setFieldValue('step3.police_verification_url', url)} helperText={hasError('step3.police_verification_url') ? getIn(errors, 'step3.police_verification_url') : ' '} folder="/hosts/docs" required />
                  <TextField label="Full address" multiline minRows={2} required {...props('step3.full_address')} />
                  <TextField label="Tags" value={values.step3.tags.join(', ')} onChange={(event) => setFieldValue('step3.tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} helperText="Comma separated host tags." fullWidth size="small" />
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button type="button" onClick={() => { resetForm(); close(); }} disabled={loading}>Cancel</Button>
                <Button type="button" onClick={() => submitWithMode(false)} disabled={loading}>Save Draft</Button>
                <Button type="button" variant="contained" onClick={() => submitWithMode(true)} disabled={loading}>Submit for Review</Button>
              </DialogActions>
            </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
}
