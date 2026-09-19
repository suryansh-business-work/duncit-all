import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';
import type { LiteRegistration } from '../../../../shared/graphql/documents';
import { useWebT } from '../../../../shared/i18n';
import { LITE_HOST_CHECK_IN_BY_CODE } from '../../../graphql/manage';
import { makeCheckInSchema, type CheckInValues } from './check-in.types';

interface CheckInFormProps {
  eventId: string;
  onCheckedIn: (registration: LiteRegistration) => void;
}

/** Type the code from a guest's ticket to mark them present. */
export function CheckInForm({ eventId, onCheckedIn }: Readonly<CheckInFormProps>) {
  const { t } = useWebT();
  const [error, setError] = useState('');
  const schema = useMemo(() => makeCheckInSchema(t), [t]);
  const [checkIn] = useMutation(LITE_HOST_CHECK_IN_BY_CODE);
  const { control, handleSubmit, formState, reset, setFocus } = useForm<CheckInValues>({ resolver: zodResolver(schema), defaultValues: { code: '' } });

  const submit = handleSubmit(async ({ code }) => {
    setError('');
    try {
      const { data } = await checkIn({ variables: { event_id: eventId, code: code.toUpperCase() } });
      if (data?.liteHostCheckInByCode) onCheckedIn(data.liteHostCheckInByCode);
      reset({ code: '' });
      setFocus('code');
    } catch (err) {
      setError(parseApiError(err, t('liteWeb.manage.checkIn.failed')));
    }
  });

  return (
    <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={1.5} onSubmit={submit} noValidate sx={{ alignItems: { sm: 'flex-start' } }} data-testid="check-in-form">
      <RhfTextField
        control={control}
        name="code"
        label={t('liteWeb.manage.checkIn.code')}
        hint={t('liteWeb.manage.checkIn.codeHint')}
        autoComplete="off"
        autoFocus
        slotProps={{ htmlInput: { maxLength: 20, style: { textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.1em' }, 'data-testid': 'check-in-code' } }}
      />
      <DuncitButton type="submit" variant="contained" size="large" loading={formState.isSubmitting} sx={{ flexShrink: 0 }} data-testid="check-in-submit">
        {t('liteWeb.manage.checkIn.submit')}
      </DuncitButton>
      <Stack aria-live="assertive" sx={{ width: '100%' }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
    </Stack>
  );
}
