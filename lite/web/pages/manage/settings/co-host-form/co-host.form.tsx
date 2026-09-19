import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';
import { useWebT } from '../../../../../shared/i18n';
import { LITE_ADD_CO_HOST } from '../../../../graphql/manage';
import { makeCoHostSchema, type CoHostValues } from './co-host.types';

/** Add a co-host by the email they sign in with. */
export function CoHostForm({ eventId, onAdded }: Readonly<{ eventId: string; onAdded: () => void }>) {
  const { t } = useWebT();
  const schema = useMemo(() => makeCoHostSchema(t), [t]);
  const [addCoHost] = useMutation(LITE_ADD_CO_HOST);
  const { control, handleSubmit, formState, reset } = useForm<CoHostValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const submit = handleSubmit(async ({ email }) => {
    try {
      await addCoHost({ variables: { event_id: eventId, email } });
      notifySuccess(t('liteWeb.manage.settings.coHostAdded'));
      reset({ email: '' });
      onAdded();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  });

  return (
    <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={1.5} onSubmit={submit} noValidate sx={{ alignItems: { sm: 'flex-start' } }} data-testid="co-host-form">
      <RhfTextField control={control} name="email" type="email" label={t('liteWeb.manage.settings.coHostEmail')} hint={t('liteWeb.manage.settings.coHostEmailHint')} slotProps={{ htmlInput: { 'data-testid': 'co-host-email' } }} />
      <DuncitButton type="submit" variant="outlined" loading={formState.isSubmitting} sx={{ flexShrink: 0 }} data-testid="co-host-add">
        {t('liteWeb.manage.settings.addCoHost')}
      </DuncitButton>
    </Stack>
  );
}
