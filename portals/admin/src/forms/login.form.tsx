import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, Stack } from '@mui/material';
import FormField from './FormField';

export const loginFormSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

export interface LoginFormValues {
  email: string;
  password: string;
}

const DEFAULTS: LoginFormValues = { email: '', password: '' };

interface Props {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: LoginFormValues) => Promise<void> | void;
  submitLabel?: string;
}

export default function LoginForm({
  loading,
  errorMessage,
  onSubmit,
  submitLabel = 'Sign in',
}: Readonly<Props>) {
  const { control, handleSubmit, setError, formState } = useForm<LoginFormValues>({
    defaultValues: DEFAULTS,
    resolver: zodResolver(loginFormSchema),
    mode: 'onTouched',
  });

  const status = formState.errors.root?.message ?? errorMessage;

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (e) {
      setError('root', { message: (e as Error)?.message ?? 'Something went wrong' });
    }
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <FormField
          control={control}
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          hint="Use your administrator email."
        />
        <FormField
          control={control}
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          hint="Minimum 8 characters."
        />
        <Button type="submit" variant="contained" size="large" disabled={loading}>
          {loading ? 'Signing in…' : submitLabel}
        </Button>
        {status && <Alert severity="error">{status}</Alert>}
      </Stack>
    </form>
  );
}
