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
  Divider,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import HostAccordionForm from '../../components/host-form/HostAccordionForm';
import HostCategoriesSection from '../../components/host-form/HostCategoriesSection';
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

  const methods = useForm<HostEditValues>({
    resolver: zodResolver(hostEditSchema),
    mode: 'onChange',
    defaultValues: hostEditInitialValues(host),
  });
  const { control, formState } = methods;

  useEffect(() => {
    if (!host) return;
    setError('');
    methods.reset(hostEditInitialValues(host));
  }, [host, methods]);

  const onSubmit = methods.handleSubmit(async (values) => {
    if (!host) return;
    setError('');
    try {
      await updateHost({ variables: { id: host.id, ...toHostEditVariables(values) } });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save host');
    }
  });

  return (
    <Dialog open={!!host} onClose={state.loading ? undefined : onClose} fullWidth maxWidth="md">
      <FormProvider {...methods}>
        <form onSubmit={onSubmit} noValidate>
          <DialogTitle>Edit Host</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <HostAccordionForm mode="edit" />
              <Divider />
              <HostCategoriesSection />
              <Divider />
              <Controller
                control={control}
                name="status"
                render={({ field, fieldState }) => {
                  const statusError =
                    !!fieldState.error && (formState.submitCount > 0 || fieldState.isTouched || !!field.value);
                  return (
                    <TextField
                      select
                      label="Status"
                      {...field}
                      error={statusError}
                      helperText={statusError ? fieldState.error?.message : ' '}
                      sx={{ maxWidth: 280 }}
                    >
                      {STATUSES.filter(Boolean).map((item) => (
                        <MenuItem key={item} value={item}>
                          {item}
                        </MenuItem>
                      ))}
                    </TextField>
                  );
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={onClose} disabled={state.loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={state.loading}
              startIcon={state.loading ? <CircularProgress size={14} /> : undefined}
            >
              Save
            </Button>
          </DialogActions>
        </form>
      </FormProvider>
    </Dialog>
  );
}
