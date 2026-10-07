import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
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
import { DuncitButton } from '@duncit/buttons';
import { Controller, FormProvider, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import HostAccordionForm from '../../components/host-form/HostAccordionForm';
import HostRequestLimitPanel from './HostRequestLimitPanel';
import { HOST_ACCOUNT_PROFILE, STATUSES, UPDATE_HOST, type HostAccountProfile } from './queries';
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
  const [updateHost, state] = useMutation<any>(UPDATE_HOST);

  const methods = useForm<HostEditValues, any, HostEditValues>({
    resolver: zodResolver(hostEditSchema) as unknown as Resolver<HostEditValues, any, HostEditValues>,
    mode: 'onChange',
    defaultValues: hostEditInitialValues(host),
  });
  const { control, formState } = methods;

  const { data: accountData } = useQuery<{ host: { id: string; account_profile: HostAccountProfile | null } | null }>(
    HOST_ACCOUNT_PROFILE,
    { variables: { host_doc_id: host?.id }, skip: !host?.id, fetchPolicy: 'network-only' },
  );
  const account = accountData?.host?.id === host?.id ? accountData?.host?.account_profile : null;
  // Nothing submitted beyond what a meeting approval copies over.
  const detailsMissing = !!host && !host.aadhar_number && !host.pan_number && !host.bank_account?.payout_method;

  useEffect(() => {
    if (!host) return;
    setError('');
    methods.reset(hostEditInitialValues(host));
  }, [host, methods]);

  // The account answers after the dialog opens: fill the blanks it covers
  // without overwriting anything the admin has already typed.
  useEffect(() => {
    if (!host || !account) return;
    methods.reset(hostEditInitialValues(host, account), { keepDirtyValues: true });
  }, [host, account, methods]);

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
        {/* A flex column, so DialogContent is what scrolls and the actions stay
            pinned in view — a plain <form> let the whole Paper scroll and pushed
            Save below the fold. */}
        <Box
          component="form"
          onSubmit={onSubmit}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          <DialogTitle>{t('onboarding.hosts.editHost')}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              {detailsMissing && <Alert severity="info">{t('onboarding.hostForm.detailsNotSubmitted')}</Alert>}
              <HostAccordionForm mode="edit" />
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
              {host && <HostRequestLimitPanel host={host} onSaved={onSaved} />}
            </Stack>
          </DialogContent>
          <DialogActions>
            <DuncitButton type="button" onClick={onClose} disabled={state.loading}>
              Cancel
            </DuncitButton>
            <DuncitButton
              type="submit"
              variant="contained"
              loading={state.loading}
              startIcon={state.loading ? <CircularProgress size={14} /> : undefined}
            >
              Save
            </DuncitButton>
          </DialogActions>
        </Box>
      </FormProvider>
    </Dialog>
  );
}
