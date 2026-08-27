import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
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
import { useTranslation } from '@duncit/app-settings';

interface Props {
  host: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function HostEditDialog({ host, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
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
          <DialogTitle>{t('onboarding.hosts.editHost')}</DialogTitle>
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
                      label={t('shell.common.status')}
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
            <DuncitButton type="button" onClick={onClose} disabled={state.loading}>
              Cancel
            </DuncitButton>
            <DuncitButton
              type="submit"
              variant="contained"
              disabled={state.loading}
              startIcon={state.loading ? <CircularProgress size={14} /> : undefined}
            >
              Save
            </DuncitButton>
          </DialogActions>
        </form>
      </FormProvider>
    </Dialog>
  );
}
