import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { Form, Formik } from 'formik';
import HostAccordionForm from '../../components/host-form/HostAccordionForm';
import { STATUSES, UPDATE_HOST } from './queries';
import {
  hostEditInitialValues,
  hostEditSchema,
  toHostEditVariables,
  type HostEditValues,
} from '../../forms/host.form';

interface Props {
  host: any | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function HostEditDialog({ host, onClose, onSaved }: Readonly<Props>) {
  const [error, setError] = useState('');
  const [updateHost, state] = useMutation(UPDATE_HOST);

  useEffect(() => {
    if (!host) return;
    setError('');
  }, [host]);

  return (
    <Dialog open={!!host} onClose={state.loading ? undefined : onClose} fullWidth maxWidth="md">
      <Formik<HostEditValues>
        initialValues={hostEditInitialValues(host)}
        enableReinitialize
        validationSchema={hostEditSchema}
        validateOnBlur
        validateOnChange
        onSubmit={async (values) => {
          if (!host) return;
          setError('');
          try {
            await updateHost({ variables: { id: host.id, ...toHostEditVariables(values) } });
            onSaved();
            onClose();
          } catch (err: any) {
            setError(err?.message || 'Failed to save host');
          }
        }}
      >
        {({ values, errors, touched, submitCount, handleBlur, handleChange, submitForm }) => {
          const statusError =
            !!errors.status && (submitCount > 0 || touched.status || !!values.status);
          return (
            <Form noValidate>
              <DialogTitle>Edit Host</DialogTitle>
              <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  {error && <Alert severity="error">{error}</Alert>}
                  <HostAccordionForm mode="edit" />
                  <TextField
                    select
                    label="Status"
                    name="status"
                    value={values.status}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={statusError}
                    helperText={statusError ? (errors.status as string) : ' '}
                    sx={{ maxWidth: 280 }}
                  >
                    {STATUSES.filter(Boolean).map((item) => (
                      <MenuItem key={item} value={item}>
                        {item}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button type="button" onClick={onClose} disabled={state.loading}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="contained"
                  onClick={submitForm}
                  disabled={state.loading}
                  startIcon={state.loading ? <CircularProgress size={14} /> : undefined}
                >
                  Save
                </Button>
              </DialogActions>
            </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
}
