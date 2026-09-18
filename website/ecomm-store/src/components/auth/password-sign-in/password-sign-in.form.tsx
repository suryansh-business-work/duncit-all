import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';

import { LOGIN } from '../../../graphql/account';
import { useStoreT } from '../../../i18n';
import { makePasswordSignInSchema, type PasswordSignInValues } from './password-sign-in.types';

/** Email + password. Resolves the session token to `onToken`. */
export function PasswordSignInForm({ onToken }: Readonly<{ onToken: (token: string) => Promise<void> }>) {
  const { t } = useStoreT();
  const [error, setError] = useState('');
  const schema = useMemo(() => makePasswordSignInSchema(t), [t]);
  const [login] = useMutation(LOGIN);
  const { control, handleSubmit, formState } = useForm<PasswordSignInValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (values) => {
    setError('');
    try {
      const { data } = await login({ variables: { input: { channel: 'EMAIL', email: values.email, password: values.password } } });
      if (data?.login.token) await onToken(data.login.token);
    } catch (err) {
      setError(parseApiError(err, t('ecommStore.auth.failed')));
    }
  });

  return (
    <Stack component="form" spacing={1} onSubmit={submit} noValidate>
      <RhfTextField control={control} name="email" type="email" autoComplete="email" label={t('ecommStore.auth.email')} />
      <RhfTextField
        control={control}
        name="password"
        type="password"
        autoComplete="current-password"
        label={t('ecommStore.auth.password')}
      />
      <Stack aria-live="assertive">{error ? <Alert severity="error">{error}</Alert> : null}</Stack>
      <DuncitButton type="submit" variant="contained" size="large" loading={formState.isSubmitting}>
        {t('ecommStore.auth.signIn')}
      </DuncitButton>
    </Stack>
  );
}
