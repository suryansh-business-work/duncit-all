import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material';
import { RhfTextField, zodRules } from '@duncit/forms';
import { SUPPORT_CATEGORIES, supportInitialValues, type SupportFormValues } from './support.types';

const CATEGORY_VALUES = SUPPORT_CATEGORIES.map((item) => item.value) as [SupportFormValues['category'], ...SupportFormValues['category'][]];

export const supportSchema = z.object({
  name: zodRules.personName('Name'),
  email: zodRules.email('Email', { lengthFirst: true }),
  category: z.enum(CATEGORY_VALUES, { errorMap: () => ({ message: 'Select a valid category' }) }),
  subject: zodRules.requiredText('Subject', 3, 120),
  message: zodRules.requiredText('Message', 10, 2000),
});

interface Props {
  initialValues?: Partial<SupportFormValues>;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: SupportFormValues) => Promise<void> | void;
}

export default function SupportForm({ initialValues, loading, errorMessage, onSubmit }: Readonly<Props>) {
  const defaults = { ...supportInitialValues, ...initialValues };
  const { control, register, handleSubmit, reset, setError, formState } = useForm<SupportFormValues>({
    resolver: zodResolver(supportSchema),
    defaultValues: defaults,
    mode: 'onBlur',
  });
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    reset({ ...supportInitialValues, ...initialValues });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues?.name, initialValues?.email, initialValues?.category, initialValues?.subject, initialValues?.message]);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not submit support request.';
      setError('root', { message });
    }
  });

  const categoryError = Boolean(errors.category);
  const rootError = errors.root?.message;

  return (
    <Stack component="form" noValidate onSubmit={submit} spacing={2}>
      <RhfTextField control={control} name="name" label="Your name" autoComplete="name" />
      <RhfTextField control={control} name="email" label="Email" type="email" autoComplete="email" disabled InputProps={{ readOnly: true }} hint="Locked to your Duncit account" />
      <TextField select label="Category" defaultValue={defaults.category} error={categoryError} helperText={categoryError ? errors.category?.message : ' '} fullWidth {...register('category')}>
        {SUPPORT_CATEGORIES.map((category) => <MenuItem key={category.value} value={category.value}>{category.label}</MenuItem>)}
      </TextField>
      <RhfTextField control={control} name="subject" label="Subject" />
      <RhfTextField control={control} name="message" label="Message" multiline minRows={4} />
      {(errorMessage ?? rootError) && <Alert severity="error">{errorMessage ?? rootError}</Alert>}
      <Button type="submit" variant="contained" size="large" disabled={loading || isSubmitting}>{loading || isSubmitting ? 'Sending...' : 'Send to support'}</Button>
    </Stack>
  );
}

export function toContactInput(values: SupportFormValues) {
  const payload = supportSchema.parse(values);
  return { name: payload.name, email: payload.email, subject: `[${payload.category}] ${payload.subject}`, message: payload.message };
}
